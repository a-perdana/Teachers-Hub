/* ================================================================
   Teachers Hub — Resend mail-service client
   ─────────────────────────────────────────────────────────────────
   Replaces the old `mail/{auto}` Firestore Trigger Email path with
   a direct POST to the Resend-backed Railway service. Sender is
   `noreply@eduversal.org` (verified domain, DKIM-signed) so emails
   no longer land in spam from `noreply@firebaseapp.com`.

   Used by:
     • careers-admin.html — interview scheduling, final decisions
     • careers-apply.html — application-received confirmation

   Public API (window.eduversalMailer):
     sendTransactional({ toEmail, toName?, subject, bodyHtml,
                         templateName?, replyTo?, footerNote?,
                         tags? }) → Promise<{ ok, id? }>

   Templates (templateName):
     • application_received — mor accent, "Application Received" eyebrow
     • interview            — mor accent, "Interview Scheduled" eyebrow
     • offer                — green accent, "Offer of Employment" eyebrow
     • reject               — neutral grey, "Application Update" eyebrow
     • default              — neutral mor/cyan brand

   All sends are NON-FATAL: failure logged to console + caller toast,
   never blocks the underlying Firestore write.
   ================================================================ */
(function () {
  'use strict';

  // 2026-08-01: sends now go through the CH mailRelay Cloud Function so
  // the Resend bearer secret stays in Secret Manager instead of shipping
  // to the browser via window.ENV. Signed-in callers (careers-admin) use
  // their Firebase ID token; the public /careers-apply confirmation uses
  // the unauthenticated 'applicationReceived' action (template pinned +
  // rate-limited server-side).
  function getRelayUrl() {
    const pid = window.ENV?.FIREBASE_PROJECT_ID || 'centralhub-8727b';
    return `https://asia-southeast1-${pid}.cloudfunctions.net/mailRelay`;
  }

  /**
   * Convert a plaintext message (with \n line breaks) into the same
   * paragraph-wrapped HTML that the careers templates render well with.
   * Existing callers pass plaintext-style copy with \n\n between paragraphs.
   */
  function plaintextToHtml(text) {
    if (!text) return '';
    return text
      .split(/\n{2,}/)            // paragraph breaks on blank lines
      .map(p => '<p>' + p.replace(/\n/g, '<br>') + '</p>')
      .join('');
  }

  async function sendTransactional({
    toEmail, toName, subject, bodyHtml, bodyText,
    templateName = 'default', replyTo, footerNote, tags,
  }) {
    if (!toEmail || !subject) {
      console.warn('[mailer] missing required fields', { toEmail, subject });
      return { ok: false, error: 'missing toEmail or subject' };
    }

    // Accept either pre-built HTML or plaintext (auto-wrapped).
    const html = bodyHtml || plaintextToHtml(bodyText || '');
    if (!html.trim()) {
      console.warn('[mailer] empty body — skipping send');
      return { ok: false, error: 'empty body' };
    }

    const payload = { toEmail, subject, bodyHtml: html, templateName };
    if (toName)     payload.toName     = toName;
    if (replyTo)    payload.replyTo    = replyTo;
    if (footerNote) payload.footerNote = footerNote;
    if (Array.isArray(tags) && tags.length) payload.tags = tags;

    // Signed-in caller → 'transactional' with ID token. Public caller
    // (careers-apply confirmation) → anonymous 'applicationReceived'.
    let idToken = null;
    try { idToken = await window.auth?.currentUser?.getIdToken?.(); } catch (_) {}
    const data = idToken
      ? { action: 'transactional', payload }
      : { action: 'applicationReceived', payload };

    try {
      const ctrl  = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 20000);
      const headers = { 'Content-Type': 'application/json' };
      if (idToken) headers['Authorization'] = 'Bearer ' + idToken;
      const res = await fetch(getRelayUrl(), {
        method: 'POST',
        headers,
        body: JSON.stringify({ data }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.error) {
        console.warn('[mailer] send failed', res.status, j);
        return { ok: false, error: j.error?.message || ('HTTP ' + res.status) };
      }
      return { ok: true, id: j.result?.id || null };
    } catch (err) {
      console.warn('[mailer] network error', err);
      return { ok: false, error: err.message };
    }
  }

  // Escape user-supplied strings before splicing into HTML body templates.
  function escHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  window.eduversalMailer = { sendTransactional, escHtml };
})();

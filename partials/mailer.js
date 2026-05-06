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

  function getServiceUrl() {
    return (window.ENV?.MAIL_SERVICE_URL || '').replace(/\/$/, '');
  }
  function getServiceSecret() {
    return window.ENV?.MAIL_SERVICE_SECRET || '';
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
    const url    = getServiceUrl();
    const secret = getServiceSecret();
    if (!url || !secret) {
      console.warn('[mailer] MAIL_SERVICE_URL / MAIL_SERVICE_SECRET not configured — skipping send');
      return { ok: false, error: 'mail-service not configured' };
    }
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

    try {
      const ctrl  = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 20000);
      const res = await fetch(url + '/send-transactional', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': 'Bearer ' + secret,
        },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.warn('[mailer] send failed', res.status, data);
        return { ok: false, error: data.error || ('HTTP ' + res.status) };
      }
      return { ok: true, id: data.id || null };
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

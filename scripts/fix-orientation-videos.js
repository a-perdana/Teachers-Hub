/**
 * fix-orientation-videos.js
 * Replaces broken video URLs and adds thumbnail fields to all resources.
 * Run once: node fix-orientation-videos.js
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

const KEY_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(__dirname, '../../keys/centralhub-service-account.json');

initializeApp({ credential: cert(KEY_PATH) });
const db = getFirestore();

// title -> { url, thumbnail }
const FIXES = {
  // ── VIDEOS (broken → replaced) ──────────────────────────────────────────────
  'What is the Cambridge Approach to Teaching & Learning?': {
    url: 'https://www.youtube.com/watch?v=DyCK_5kOGEc',
    thumbnail: 'https://img.youtube.com/vi/DyCK_5kOGEc/hqdefault.jpg',
  },
  'How to Read a Cambridge Syllabus': {
    url: 'https://www.youtube.com/watch?v=Mkg6BHlpY9s',
    thumbnail: 'https://img.youtube.com/vi/Mkg6BHlpY9s/hqdefault.jpg',
  },
  "Bloom's Taxonomy — Structuring Learning Objectives": {
    // confirmed working
    url: 'https://www.youtube.com/watch?v=ayefSTAnCR8',
    thumbnail: 'https://img.youtube.com/vi/ayefSTAnCR8/hqdefault.jpg',
  },
  'Formative Assessment Strategies That Actually Work': {
    url: 'https://www.youtube.com/watch?v=sYdVe5O7KBE',
    thumbnail: 'https://img.youtube.com/vi/sYdVe5O7KBE/hqdefault.jpg',
  },
  'The Science of Learning — What Every Teacher Should Know (TED-Ed)': {
    url: 'https://www.youtube.com/watch?v=O96fE1E-rf8',
    thumbnail: 'https://img.youtube.com/vi/O96fE1E-rf8/hqdefault.jpg',
  },
  'Teaching English Language Learners in the Mainstream Classroom': {
    url: 'https://www.youtube.com/watch?v=CO5rvn7EIsU',
    thumbnail: 'https://img.youtube.com/vi/CO5rvn7EIsU/hqdefault.jpg',
  },
  'Culturally Responsive Teaching — What It Is and Why It Matters': {
    url: 'https://www.youtube.com/watch?v=aFv6rka5870',
    thumbnail: 'https://img.youtube.com/vi/aFv6rka5870/hqdefault.jpg',
  },
  'Giving Effective Feedback to Students': {
    url: 'https://www.youtube.com/watch?v=R9-PSMhn2_s',
    thumbnail: 'https://img.youtube.com/vi/R9-PSMhn2_s/hqdefault.jpg',
  },

  // ── BOOKS (add thumbnails via Open Library covers API) ───────────────────────
  'Making Every Lesson Count — Shaun Allison & Andy Tharby': {
    thumbnail: 'https://covers.openlibrary.org/b/isbn/9781845909970-M.jpg',
  },
  'Visible Learning for Teachers — John Hattie': {
    thumbnail: 'https://books.google.com/books/content?id=xY-6MyDgks8C&printsec=frontcover&img=1&zoom=2',
  },
  'The Hidden Lives of Learners — Graham Nuthall': {
    thumbnail: 'https://covers.openlibrary.org/b/isbn/9781877398100-M.jpg',
  },
  "Why Don't Students Like School? — Daniel T. Willingham": {
    thumbnail: 'https://covers.openlibrary.org/b/isbn/9780470591963-M.jpg',
  },
  'Embedded Formative Assessment — Dylan Wiliam': {
    thumbnail: 'https://covers.openlibrary.org/b/isbn/9781934009307-M.jpg',
  },
};

async function fix() {
  const snap = await db.collection('orientation_resources').get();
  let updated = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const fix = FIXES[data.title];
    if (!fix) continue;

    const patch = {};
    if (fix.url && fix.url !== data.url) patch.url = fix.url;
    if (fix.thumbnail) patch.thumbnail = fix.thumbnail;

    if (Object.keys(patch).length > 0) {
      await doc.ref.update(patch);
      console.log(`✓ "${data.title}"`);
      if (patch.url) console.log(`  url → ${patch.url}`);
      if (patch.thumbnail) console.log(`  thumbnail → ${patch.thumbnail}`);
      updated++;
    }
  }

  console.log(`\nDone. ${updated} documents updated.`);
}

fix().catch(err => { console.error(err); process.exit(1); });

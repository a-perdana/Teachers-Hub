/**
 * update-orientation-links.js
 * Updates broken URLs in orientation_resources collection.
 * Run once: node update-orientation-links.js
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

const KEY_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(__dirname, '../../keys/centralhub-service-account.json');

initializeApp({ credential: cert(KEY_PATH) });
const db = getFirestore();

// Map: exact title -> new working URL
const URL_FIXES = {
  'Cambridge Teaching & Learning — Getting Started Guide':
    'https://www.cambridgeinternational.org/support-and-training-for-schools/leading-learning-and-teaching-with-cambridge/getting-started-with',

  'Cambridge Learner Attributes Framework':
    'https://www.cambridgeinternational.org/support-and-training-for-schools/leading-learning-and-teaching-with-cambridge/curriculum/cambridge-learner-attributes/',

  'Assessment for Learning — A Practical Guide (Cambridge)':
    'https://www.cambridgeinternational.org/Images/271179-assessment-for-learning.pdf',

  'Teaching Cambridge Programmes — A Guide for New Teachers':
    'https://www.cambridgeinternational.org/support-and-training-for-schools/leading-learning-and-teaching-with-cambridge/',

  'Inclusive Education in the Cambridge Classroom':
    'https://www.cambridgeinternational.org/support-and-training-for-schools/leading-learning-and-teaching-with-cambridge/',

  'Visible Learning for Teachers — John Hattie':
    'https://books.google.com/books/about/Visible_Learning_for_Teachers.html?id=xY-6MyDgks8C',

  'Why Don\'t Students Like School? — Daniel T. Willingham':
    'https://www.goodreads.com/book/show/4959061-why-don-t-students-like-school',

  'Embedded Formative Assessment — Dylan Wiliam':
    'https://www.solutiontree.com/embedded-formative-assessment-second-ed.html',

  'Cambridge Teacher Support Portal':
    'https://www.cambridgeinternational.org/support-and-training-for-schools/support-for-teachers/school-support-hub/',

  'Cambridge Professional Development Qualifications (PDQ)':
    'https://www.cambridgeinternational.org/support-and-training-for-schools/professional-development/professional-development-qualifications/',

  'Education Endowment Foundation — Teaching & Learning Toolkit':
    'https://educationendowmentfoundation.org.uk/education-evidence/teaching-learning-toolkit',
};

async function update() {
  const snap = await db.collection('orientation_resources').get();
  let updated = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const newUrl = URL_FIXES[data.title];
    if (newUrl && newUrl !== data.url) {
      await doc.ref.update({ url: newUrl });
      console.log(`✓ Updated: "${data.title}"\n  ${data.url}\n  → ${newUrl}\n`);
      updated++;
    }
  }

  console.log(`Done. ${updated} URLs updated.`);
}

update().catch(err => { console.error(err); process.exit(1); });

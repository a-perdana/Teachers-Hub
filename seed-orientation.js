/**
 * seed-orientation.js
 * Seeds orientation_resources and orientation_questions into Firestore.
 *
 * Usage:
 *   node seed-orientation.js
 *
 * Requires: a service account key at ../../keys/centralhub-service-account.json
 * (or set GOOGLE_APPLICATION_CREDENTIALS env var to point to it)
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const path = require('path');

// Service account key path
const KEY_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(__dirname, '../../keys/centralhub-service-account.json');

initializeApp({ credential: cert(KEY_PATH) });
const db = getFirestore();

// ── RESOURCES ────────────────────────────────────────────────────────────────

const RESOURCES = [
  // Handbooks
  {
    type: 'handbook',
    title: 'Eduversal Teacher Handbook 2025',
    description: 'Complete guide to teaching at an Eduversal partner school — expectations, processes, and culture.',
    url: 'https://drive.google.com/drive/folders/REPLACE_WITH_REAL_LINK',
    order: 1,
  },
  {
    type: 'handbook',
    title: 'Cambridge IGCSE Teaching Guide',
    description: 'Official Cambridge guide for IGCSE teachers — syllabus overview, assessment structure, and pedagogy principles.',
    url: 'https://drive.google.com/drive/folders/REPLACE_WITH_REAL_LINK',
    order: 2,
  },
  {
    type: 'handbook',
    title: 'Classroom Management & Wellbeing Handbook',
    description: 'Strategies for creating a positive, inclusive classroom environment.',
    url: 'https://drive.google.com/drive/folders/REPLACE_WITH_REAL_LINK',
    order: 3,
  },

  // Videos
  {
    type: 'video',
    title: 'Introduction to the Cambridge Approach',
    description: 'A 20-minute overview of inquiry-based learning and Cambridge pedagogy by Cambridge Assessment International Education.',
    url: 'https://www.youtube.com/watch?v=REPLACE_WITH_REAL_LINK',
    order: 10,
  },
  {
    type: 'video',
    title: 'Active Learning in the Classroom',
    description: 'Practical techniques for student-centred lessons — think-pair-share, gallery walks, and collaborative problem solving.',
    url: 'https://www.youtube.com/watch?v=REPLACE_WITH_REAL_LINK',
    order: 11,
  },
  {
    type: 'video',
    title: 'Assessment for Learning (AfL) Strategies',
    description: 'How to use formative assessment effectively — exit tickets, mini whiteboards, and targeted questioning.',
    url: 'https://www.youtube.com/watch?v=REPLACE_WITH_REAL_LINK',
    order: 12,
  },

  // Books
  {
    type: 'book',
    title: 'Making Every Lesson Count — Shaun Allison & Andy Tharby',
    description: 'Six principles for great teaching: challenge, explanation, modelling, practice, feedback, and questioning.',
    url: 'https://drive.google.com/drive/folders/REPLACE_WITH_REAL_LINK',
    order: 20,
  },
  {
    type: 'book',
    title: 'Visible Learning for Teachers — John Hattie',
    description: 'Evidence-based strategies with the highest impact on student achievement.',
    url: 'https://drive.google.com/drive/folders/REPLACE_WITH_REAL_LINK',
    order: 21,
  },
  {
    type: 'book',
    title: 'The Cambridge Guide to Pedagogy',
    description: 'Cambridge's own reference for teachers on curriculum design, assessment, and feedback.',
    url: 'https://drive.google.com/drive/folders/REPLACE_WITH_REAL_LINK',
    order: 22,
  },
];

// ── QUESTIONS ─────────────────────────────────────────────────────────────────

const QUESTIONS = [
  {
    question: 'How familiar are you with the Cambridge International curriculum (IGCSE / AS & A Level)?',
    options: [
      'Not familiar — this will be my first time teaching Cambridge',
      'Somewhat familiar — I have heard of it but have not taught it before',
      'Familiar — I have taught Cambridge before at a previous school',
      'Very familiar — I have several years of Cambridge teaching experience',
    ],
    order: 1,
  },
  {
    question: 'How would you describe your approach to lesson planning?',
    options: [
      'I follow the textbook closely and plan lessons around it',
      'I plan lessons around learning objectives but often rely on textbook activities',
      'I design most activities myself based on the syllabus and student needs',
      'I use a variety of sources and tailor every lesson to the specific class',
    ],
    order: 2,
  },
  {
    question: 'How comfortable are you with formative assessment (checking understanding during lessons)?',
    options: [
      'I am not very familiar with formative assessment techniques',
      'I use basic techniques like asking questions to the class',
      'I regularly use a range of formative strategies (exit tickets, mini whiteboards, etc.)',
      'I systematically plan formative assessment and adjust teaching based on the data',
    ],
    order: 3,
  },
  {
    question: 'How do you typically handle a topic that students find very difficult?',
    options: [
      'Re-teach the topic in the same way with more repetition',
      'Move on and address it later in revision',
      'Re-teach using a different explanation or approach',
      'Use diagnostic data to identify the specific misconception and target it precisely',
    ],
    order: 4,
  },
  {
    question: 'How experienced are you with collaborative or student-centred learning activities?',
    options: [
      'I rarely use group work — I prefer teacher-led instruction',
      'I use group work occasionally for selected tasks',
      'I regularly design collaborative activities as part of my lessons',
      'Student-centred learning is central to my teaching practice',
    ],
    order: 5,
  },
  {
    question: 'How do you currently use data or student performance information in your teaching?',
    options: [
      'I do not currently track student data in a systematic way',
      'I look at test scores to identify which students are struggling',
      'I use data to identify patterns and adjust my teaching accordingly',
      'I maintain detailed records and use data to plan individual student support',
    ],
    order: 6,
  },
  {
    question: 'How confident are you in using digital tools for teaching (presentations, online resources, learning management systems)?',
    options: [
      'Not confident — I prefer traditional methods',
      'I can use basic tools (PowerPoint, Google Docs) but nothing more advanced',
      'I use a range of digital tools regularly in my lessons',
      'I am very confident and often create my own digital learning materials',
    ],
    order: 7,
  },
  {
    question: 'How do you prefer to receive professional development support?',
    options: [
      'Structured workshops and training sessions',
      'Peer observation and feedback from colleagues',
      'Self-directed reading and online courses',
      'A mix of all of the above',
    ],
    order: 8,
  },
];

// ── SEED FUNCTION ─────────────────────────────────────────────────────────────

async function seed() {
  console.log('Seeding orientation_resources…');
  for (const res of RESOURCES) {
    const docRef = await db.collection('orientation_resources').add({
      ...res,
      createdAt: Timestamp.now(),
    });
    console.log(`  ✓ ${res.type}: "${res.title}" → ${docRef.id}`);
  }

  console.log('\nSeeding orientation_questions…');
  for (const q of QUESTIONS) {
    const docRef = await db.collection('orientation_questions').add({
      ...q,
      createdAt: Timestamp.now(),
    });
    console.log(`  ✓ Q${q.order}: "${q.question.slice(0, 55)}…" → ${docRef.id}`);
  }

  console.log('\nDone. Remember to update the placeholder URLs in orientation_resources!');
}

seed().catch(err => { console.error(err); process.exit(1); });

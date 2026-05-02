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

const KEY_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(__dirname, '../../keys/centralhub-service-account.json');

initializeApp({ credential: cert(KEY_PATH) });
const db = getFirestore();

// ── RESOURCES ────────────────────────────────────────────────────────────────
// Videos: real YouTube URLs (Cambridge, TED-Ed, public education channels)
// Books:  publicly accessible pages (publisher, Google Books preview, archive.org)
// Handbooks: Cambridge public PDFs and guides
// Links:  free online tools and references

const RESOURCES = [

  // ── HANDBOOKS ──
  {
    type: 'handbook',
    title: 'Cambridge Teaching & Learning — Getting Started Guide',
    description: 'Official Cambridge guide introducing the Cambridge approach to teaching, learning, and assessment for new teachers.',
    url: 'https://www.cambridgeinternational.org/Images/271174-getting-started-guide.pdf',
    order: 1,
  },
  {
    type: 'handbook',
    title: 'Cambridge Learner Attributes Framework',
    description: 'Describes the six Cambridge learner attributes (confident, responsible, reflective, innovative, engaged, and respectful) and how to develop them in K-12 students.',
    url: 'https://www.cambridgeinternational.org/Images/417069-cambridge-learner-and-teacher-attributes.pdf',
    order: 2,
  },
  {
    type: 'handbook',
    title: 'Assessment for Learning — A Practical Guide (Cambridge)',
    description: 'Cambridge\'s practical handbook on using formative assessment day-to-day: questioning, feedback, peer and self-assessment strategies.',
    url: 'https://www.cambridgeinternational.org/Images/272274-assessment-for-learning.pdf',
    order: 3,
  },
  {
    type: 'handbook',
    title: 'Teaching Cambridge Programmes — A Guide for New Teachers',
    description: 'Step-by-step orientation for teachers new to the Cambridge curriculum — lesson planning, syllabus reading, and exam technique.',
    url: 'https://www.cambridgeinternational.org/Images/415483-teaching-cambridge-programmes-guide-for-new-teachers.pdf',
    order: 4,
  },
  {
    type: 'handbook',
    title: 'Inclusive Education in the Cambridge Classroom',
    description: 'Strategies for supporting diverse learners, including EAL students, in an international K-12 setting.',
    url: 'https://www.cambridgeinternational.org/Images/584596-inclusive-education.pdf',
    order: 5,
  },

  // ── VIDEOS ──
  {
    type: 'video',
    title: 'What is the Cambridge Approach to Teaching & Learning?',
    description: 'Cambridge International Education explains the inquiry-based, student-centred philosophy behind the Cambridge curriculum. ~8 min.',
    url: 'https://www.youtube.com/watch?v=p8qd3OxOHSk',
    order: 10,
  },
  {
    type: 'video',
    title: 'How to Read a Cambridge Syllabus',
    description: 'A practical walkthrough of how Cambridge syllabuses are structured — learning objectives, assessment objectives, and weighting. ~12 min.',
    url: 'https://www.youtube.com/watch?v=N7REi1DGRpI',
    order: 11,
  },
  {
    type: 'video',
    title: 'Bloom\'s Taxonomy — Structuring Learning Objectives',
    description: 'How to use Bloom\'s Taxonomy to write clear learning objectives and design activities at the right cognitive level. ~10 min.',
    url: 'https://www.youtube.com/watch?v=ayefSTAnCR8',
    order: 12,
  },
  {
    type: 'video',
    title: 'Formative Assessment Strategies That Actually Work',
    description: 'Classroom-tested techniques — exit tickets, cold calling, mini whiteboards, think-pair-share, and traffic lights. ~15 min.',
    url: 'https://www.youtube.com/watch?v=7Oc_cwepZh0',
    order: 13,
  },
  {
    type: 'video',
    title: 'The Science of Learning — What Every Teacher Should Know (TED-Ed)',
    description: 'Neuroscience-backed strategies: spaced practice, retrieval practice, interleaving, and elaboration. ~5 min.',
    url: 'https://www.youtube.com/watch?v=9O7y7XEC66M',
    order: 14,
  },
  {
    type: 'video',
    title: 'Teaching English Language Learners in the Mainstream Classroom',
    description: 'Practical strategies for supporting EAL/ELL students in content lessons — scaffolding, visuals, and language frames. Relevant for Indonesian context. ~20 min.',
    url: 'https://www.youtube.com/watch?v=oMnXi6YUQDA',
    order: 15,
  },
  {
    type: 'video',
    title: 'Culturally Responsive Teaching — What It Is and Why It Matters',
    description: 'How to connect curriculum to students\' cultural backgrounds and lived experiences — essential for teaching in diverse Indonesian schools. ~18 min.',
    url: 'https://www.youtube.com/watch?v=XY5__wGxNg4',
    order: 16,
  },
  {
    type: 'video',
    title: 'Giving Effective Feedback to Students',
    description: 'Evidence-based feedback practices: how to make feedback specific, actionable, and timely. Based on Dylan Wiliam\'s research. ~14 min.',
    url: 'https://www.youtube.com/watch?v=1iD6Zadhg4M',
    order: 17,
  },

  // ── BOOKS ──
  {
    type: 'book',
    title: 'Making Every Lesson Count — Shaun Allison & Andy Tharby',
    description: 'Six principles of great teaching: challenge, explanation, modelling, practice, feedback, and questioning. Highly practical for daily classroom use.',
    url: 'https://www.crownhouse.co.uk/making-every-lesson-count',
    order: 20,
  },
  {
    type: 'book',
    title: 'Visible Learning for Teachers — John Hattie',
    description: 'What the largest ever educational research synthesis tells us about which teaching strategies have the most impact. Essential reading for evidence-informed teaching.',
    url: 'https://www.routledge.com/Visible-Learning-for-Teachers-Maximizing-Impact-on-Learning/Hattie/p/book/9780415690157',
    order: 21,
  },
  {
    type: 'book',
    title: 'The Hidden Lives of Learners — Graham Nuthall',
    description: 'A landmark study revealing what students actually learn versus what teachers think they learn. Challenges assumptions about lesson delivery and student engagement.',
    url: 'https://www.nzcer.org.nz/nzcerpress/hidden-lives-learners',
    order: 22,
  },
  {
    type: 'book',
    title: 'Why Don\'t Students Like School? — Daniel T. Willingham',
    description: 'A cognitive scientist answers classroom questions about memory, attention, and knowledge — written accessibly for practicing teachers.',
    url: 'https://www.wiley.com/en-us/Why+Don%27t+Students+Like+School%3F%2C+2nd+Edition-p-9781119715665',
    order: 23,
  },
  {
    type: 'book',
    title: 'Embedded Formative Assessment — Dylan Wiliam',
    description: 'Practical strategies for integrating assessment into everyday teaching — one of the most influential books on AfL for K-12 teachers.',
    url: 'https://www.solutiontree.com/embedded-formative-assessment.html',
    order: 24,
  },

  // ── LINKS ──
  {
    type: 'link',
    title: 'Cambridge Teacher Support Portal',
    description: 'Official hub for Cambridge teachers — syllabuses, specimen papers, mark schemes, past papers, and professional development resources.',
    url: 'https://www.cambridgeinternational.org/teaching-and-learning/teacher-support/',
    order: 30,
  },
  {
    type: 'link',
    title: 'Cambridge Professional Development Qualifications (PDQ)',
    description: 'Information on Cambridge\'s internationally recognised teaching qualifications — PDQ Certificate and Diploma in Teaching.',
    url: 'https://www.cambridge-community.org.uk/professional-development/',
    order: 31,
  },
  {
    type: 'link',
    title: 'Education Endowment Foundation — Teaching & Learning Toolkit',
    description: 'Free, evidence-ranked summaries of 50+ teaching approaches showing their impact on student outcomes. Filter by cost, evidence strength, and months\' progress gained.',
    url: 'https://educationendowmentfoundation.org.uk/education-evidence/teaching-learning-toolkit',
    order: 32,
  },
];

// ── QUESTIONS ─────────────────────────────────────────────────────────────────

const QUESTIONS = [
  {
    question: 'How familiar are you with the Cambridge International curriculum (IGCSE / AS & A Level / Cambridge Primary & Lower Secondary)?',
    options: [
      'Not familiar — this will be my first time teaching a Cambridge programme',
      'Somewhat familiar — I have studied or observed Cambridge lessons but not taught them',
      'Familiar — I have taught one or two Cambridge programmes at a previous school',
      'Very familiar — I have several years of Cambridge teaching experience across multiple levels',
    ],
    order: 1,
  },
  {
    question: 'How do you approach writing lesson learning objectives?',
    options: [
      'I copy objectives directly from the textbook or teacher\'s guide',
      'I write general objectives like "students will understand photosynthesis"',
      'I write specific, measurable objectives aligned to the syllabus learning outcomes',
      'I write differentiated objectives at different cognitive levels (recall, apply, evaluate) for different learners',
    ],
    order: 2,
  },
  {
    question: 'Which of the following best describes how you use formative assessment during lessons?',
    options: [
      'I ask "does everyone understand?" and move on if no one raises concerns',
      'I give short quizzes at the end of lessons to check understanding',
      'I use a variety of in-lesson checks (mini whiteboards, exit tickets, cold calling, pair discussion) and adapt based on responses',
      'I have a systematic approach: I plan assessment checkpoints into every lesson, track responses, and use the data to inform next steps',
    ],
    order: 3,
  },
  {
    question: 'When giving written feedback on student work, what is your usual approach?',
    options: [
      'I write a mark or grade and a brief general comment (e.g. "Good effort")',
      'I highlight errors and correct them for the student',
      'I write specific comments identifying what was done well and what to improve, with a clear action point',
      'I write targeted comments, require students to respond or act on feedback, and follow up in the next lesson',
    ],
    order: 4,
  },
  {
    question: 'How do you currently differentiate instruction for students with different ability levels in the same class?',
    options: [
      'I teach the whole class the same content in the same way',
      'I give stronger students extension tasks after they finish the main activity',
      'I plan tiered activities or scaffolded resources that allow all students to access the content at different levels',
      'I use pre-assessment data to group students flexibly and design targeted tasks for each group within every lesson',
    ],
    order: 5,
  },
  {
    question: 'How would you handle a student who is clearly disengaged and refuses to participate in lessons?',
    options: [
      'I would note the behaviour and report it to the homeroom teacher or counsellor',
      'I would speak to the student privately after class to understand the reason',
      'I would proactively investigate whether the issue is academic (content is too hard/easy), social, or personal, and address the root cause',
      'I would use a structured approach: observe patterns, consult colleagues, involve the student in designing a solution, and monitor progress',
    ],
    order: 6,
  },
  {
    question: 'How comfortable are you teaching in English as the medium of instruction, given that most students\' first language is Indonesian (Bahasa Indonesia)?',
    options: [
      'I find it challenging — I am not sure how to support students who struggle with English academic language',
      'I manage it by speaking slowly and clearly, but I don\'t have specific EAL strategies',
      'I use scaffolding strategies such as visual supports, sentence frames, glossaries, and modelled language',
      'I actively teach academic language alongside subject content, plan for language objectives in every lesson, and support bilingual learners strategically',
    ],
    order: 7,
  },
  {
    question: 'How familiar are you with Cambridge\'s assessment objectives and mark scheme conventions (e.g., what "describe", "explain", and "evaluate" mean in exam questions)?',
    options: [
      'Not familiar — I have not worked with Cambridge mark schemes before',
      'Somewhat familiar — I know they differ from other curricula but I have not studied them closely',
      'Familiar — I have used Cambridge mark schemes and understand the command word hierarchy',
      'Very familiar — I explicitly teach students how to interpret command words and structure responses to score full marks',
    ],
    order: 8,
  },
  {
    question: 'How do you approach lesson planning for a topic you are teaching for the first time?',
    options: [
      'I use the textbook lesson plan as-is and follow it during the lesson',
      'I read the textbook chapter, prepare some questions, and plan roughly what I will cover',
      'I start from the syllabus learning objectives, identify common misconceptions, plan activities to address them, and prepare formative checks',
      'I research the topic deeply, consult multiple sources including past exam papers and mark schemes, map the lesson to prior and future learning, and build in multiple checkpoints',
    ],
    order: 9,
  },
  {
    question: 'Thinking about your professional development, what is your current priority as you join this school?',
    options: [
      'Understanding the Cambridge curriculum structure and assessment requirements',
      'Developing stronger classroom management strategies for Indonesian secondary students',
      'Improving my use of formative assessment and data-informed teaching',
      'Building skills in differentiation, EAL support, and culturally responsive pedagogy',
    ],
    order: 10,
  },
  {
    question: 'How do you typically plan for students who finish tasks significantly faster than the rest of the class?',
    options: [
      'I ask them to help slower classmates',
      'I have a set of generic extension activities they can work on',
      'I prepare subject-specific extension tasks that deepen the same concept at a higher level',
      'I use this group\'s responses as live formative data — I adjust the whole class\'s pacing or ask them to share their thinking to enrich the lesson',
    ],
    order: 11,
  },
  {
    question: 'How confident are you in supporting students\' higher-order thinking skills (analysis, evaluation, synthesis) as required by Cambridge programmes?',
    options: [
      'Not very confident — most of my lessons focus on knowledge and comprehension',
      'Somewhat confident — I include some analytical questions but find it hard to scaffold them effectively',
      'Confident — I regularly design tasks that require students to analyse, evaluate, and construct arguments',
      'Very confident — I systematically build HOT skills through question sequencing, Socratic discussion, and open-ended project work, and I can show this in student outcomes',
    ],
    order: 12,
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
    console.log(`  ✓ Q${q.order}: "${q.question.slice(0, 60)}…" → ${docRef.id}`);
  }

  console.log(`\nDone. ${RESOURCES.length} resources + ${QUESTIONS.length} questions seeded.`);
}

seed().catch(err => { console.error(err); process.exit(1); });

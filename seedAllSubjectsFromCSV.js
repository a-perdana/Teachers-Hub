/**
 * seedAllSubjectsFromCSV.js
 * ─────────────────────────────────────────────────────────────────
 * Reads "Cambridge Curriculum Learning Objectives.csv" from the
 * Desktop, parses it, and seeds the following Firestore collections:
 *
 *   biology_pacing/year9-10           — IGCSE Biology  (Year 9 & 10)
 *   asalevel_biology_pacing/year11-12 — AS&A Biology  (Year 11 & 12)
 *   chemistry_pacing/year9-10         — IGCSE Chemistry (Year 9 & 10)
 *   asalevel_chemistry_pacing/year11-12— AS&A Chemistry (Year 11 & 12)
 *   physics_pacing/year9-10           — IGCSE Physics  (Year 9 & 10)
 *   asalevel_physics_pacing/year11-12 — AS&A Physics  (Year 11 & 12)
 *   religion_pacing/year7             — Kurikulum Merdeka Religion (Year 7)
 *
 * Mathematics rows are SKIPPED (already seeded).
 *
 * Prerequisites:
 *   npm install firebase-admin
 *   serviceAccountKey.json in this folder (download from Firebase Console →
 *   Project Settings → Service Accounts → Generate new private key)
 *
 * Usage:
 *   node seedAllSubjectsFromCSV.js
 *
 * Idempotent — re-running overwrites existing data.
 * ─────────────────────────────────────────────────────────────────
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// ── Firebase init ─────────────────────────────────────────────────
const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// ── CSV path ──────────────────────────────────────────────────────
const CSV_PATH = path.join(
  process.env.USERPROFILE || process.env.HOME || "C:/Users/maliu",
  "Desktop",
  "Cambridge Curriculum Learning Objectives.csv"
);

// ── Minimal RFC-4180-compliant CSV parser (no dependencies) ───────
function parseCSV(text) {
  // Normalise line endings
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const lines = [];
  let i = 0;
  const len = text.length;

  function parseField() {
    if (text[i] === '"') {
      // quoted field
      i++; // skip opening quote
      let val = "";
      while (i < len) {
        if (text[i] === '"') {
          if (text[i + 1] === '"') {
            val += '"';
            i += 2;
          } else {
            i++; // skip closing quote
            break;
          }
        } else {
          val += text[i++];
        }
      }
      return val;
    } else {
      // unquoted field
      let val = "";
      while (i < len && text[i] !== "," && text[i] !== "\n") {
        val += text[i++];
      }
      return val;
    }
  }

  while (i < len) {
    const row = [];
    while (true) {
      row.push(parseField());
      if (i >= len || text[i] === "\n") {
        i++;
        break;
      }
      i++; // skip comma
    }
    lines.push(row);
  }

  if (lines.length === 0) return [];

  // First row is header; strip trailing empty columns from header
  const rawHeader = lines[0];
  let headerLen = rawHeader.length;
  while (headerLen > 0 && rawHeader[headerLen - 1].trim() === "") headerLen--;
  const header = rawHeader.slice(0, headerLen).map((h) => h.trim());

  return lines.slice(1).map((cols) => {
    const obj = {};
    for (let j = 0; j < header.length; j++) {
      obj[header[j]] = (cols[j] || "").trim();
    }
    return obj;
  });
}

// ── Collection routing ────────────────────────────────────────────
function routeRow(row) {
  const subject = (row.Subject || "").trim();
  const qual = (row.Qualification || "").trim();
  const csvYear = (row.Year || "").trim();

  if (subject === "Mathematics") return null; // already seeded

  if (subject === "Biology") {
    if (qual === "Cambridge IGCSE")
      return { collection: "biology_pacing", docId: "year9-10", year: csvYear };
    if (qual === "Cambridge AS and A Level")
      return {
        collection: "asalevel_biology_pacing",
        docId: "year11-12",
        year: csvYear,
      };
  }
  if (subject === "Chemistry") {
    if (qual === "Cambridge IGCSE")
      return {
        collection: "chemistry_pacing",
        docId: "year9-10",
        year: csvYear,
      };
    if (qual === "Cambridge AS and A Level")
      return {
        collection: "asalevel_chemistry_pacing",
        docId: "year11-12",
        year: csvYear,
      };
  }
  if (subject === "Physics") {
    if (qual === "Cambridge IGCSE")
      return { collection: "physics_pacing", docId: "year9-10", year: csvYear };
    if (qual === "Cambridge AS and A Level")
      return {
        collection: "asalevel_physics_pacing",
        docId: "year11-12",
        year: csvYear,
      };
  }
  if (subject === "Religion") {
    return { collection: "religion_pacing", docId: "year7", year: csvYear };
  }

  return null;
}

// ── Parse & group rows into Firestore-ready chapter arrays ────────
function buildCollectionData(rows) {
  // collKey → { collection, docId, chapters: OrderedMap }
  const collectionMap = new Map();

  for (const row of rows) {
    const route = routeRow(row);
    if (!route) continue;

    const { collection, docId, year } = route;
    const chapterName = (row.Chapter || "").trim();
    const topicName = (row.Topics || "").trim();
    const objective = (row.Objectives || "").trim();
    const coursebook = (row.Coursebook || "").trim();

    if (!chapterName || !topicName) continue;

    const collKey = `${collection}||${docId}`;
    if (!collectionMap.has(collKey)) {
      collectionMap.set(collKey, { collection, docId, chapters: new Map() });
    }
    const colEntry = collectionMap.get(collKey);

    // Include year in chapter key so same chapter name in Year 9 vs Year 10 stays separate
    const chapKey = `${year}||${chapterName}`;
    if (!colEntry.chapters.has(chapKey)) {
      const chapObj = {
        chapter: chapterName,
        year,
        topics: new Map(),
      };
      // Include coursebook only when it's meaningful (AS level subjects)
      if (coursebook && coursebook !== "") {
        chapObj.coursebook = coursebook;
      }
      colEntry.chapters.set(chapKey, chapObj);
    }
    const chapEntry = colEntry.chapters.get(chapKey);

    if (!chapEntry.topics.has(topicName)) {
      chapEntry.topics.set(topicName, {
        topic: topicName,
        objective: "",
        week: null,
        hour: 1,
        resources: [],
      });
    }
    const topicEntry = chapEntry.topics.get(topicName);

    // Multiple CSV rows per topic → join objectives with "; "
    if (objective) {
      topicEntry.objective = topicEntry.objective
        ? `${topicEntry.objective}; ${objective}`
        : objective;
    }
  }

  return collectionMap;
}

// ── Main ──────────────────────────────────────────────────────────
async function seed() {
  console.log(`Reading: ${CSV_PATH}`);
  const raw = fs.readFileSync(CSV_PATH, "utf8");
  const rows = parseCSV(raw);
  console.log(`Parsed ${rows.length} rows.\n`);

  const collectionMap = buildCollectionData(rows);
  console.log(`Collections to seed: ${collectionMap.size}\n`);

  for (const [, entry] of collectionMap) {
    const { collection, docId, chapters } = entry;

    const chaptersArray = Array.from(chapters.values()).map((chap) => {
      const out = {
        chapter: chap.chapter,
        year: chap.year,
        topics: Array.from(chap.topics.values()),
      };
      if (chap.coursebook) out.coursebook = chap.coursebook;
      return out;
    });

    const topicCount = chaptersArray.reduce(
      (s, c) => s + c.topics.length,
      0
    );
    console.log(
      `Seeding ${collection}/${docId} — ${chaptersArray.length} chapters, ${topicCount} topics …`
    );

    await db
      .collection(collection)
      .doc(docId)
      .set({
        chapters: chaptersArray,
        seededAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    console.log(`  ✓ Done`);
  }

  console.log("\nAll subjects seeded successfully.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});

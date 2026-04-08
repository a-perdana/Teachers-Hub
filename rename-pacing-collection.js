/**
 * rename-pacing-collection.js
 * ─────────────────────────────────────────────────────────────────
 * Copies igcse_pacing/year9-10 → math_pacing/year9-10 in Firestore.
 * Does NOT delete the old document — delete igcse_pacing manually
 * from Firebase Console after verifying the copy looks correct.
 *
 * Prerequisites:
 *   1. npm install firebase-admin  (already done if seedFirestore ran)
 *   2. serviceAccountKey.json next to this file
 *
 * Usage:
 *   node rename-pacing-collection.js
 * ─────────────────────────────────────────────────────────────────
 */

const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function run() {
  const srcRef = db.collection("igcse_pacing").doc("year9-10");
  const dstRef = db.collection("math_pacing").doc("year9-10");

  console.log("Reading igcse_pacing/year9-10 …");
  const snap = await srcRef.get();

  if (!snap.exists) {
    console.error("Source document igcse_pacing/year9-10 does not exist.");
    process.exit(1);
  }

  const data = snap.data();
  console.log(`Read OK — top-level keys: ${Object.keys(data).join(", ")}`);

  console.log("Writing math_pacing/year9-10 …");
  await dstRef.set(data);
  console.log("Done! math_pacing/year9-10 written.");

  console.log("Deleting igcse_pacing/year9-10 …");
  await srcRef.delete();
  console.log("Deleted igcse_pacing/year9-10.");

  process.exit(0);
}

run().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});

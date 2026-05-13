// Backfill KISFS IDs for all existing candidates that don't have one.
// Usage: node scripts/backfill-kisfs.cjs

const admin = require("C:/Users/BHANU/AppData/Roaming/npm/node_modules/firebase-admin");

const serviceAccount = require("C:/Users/BHANU/Downloads/koundinya-wms-firebase-adminsdk-fbsvc-a95d5f6efd.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "koundinya-wms",
});

const db = admin.firestore();

async function main() {
  const snapshot = await db.collection("candidates").get();
  const missing = snapshot.docs.filter((d) => !d.data().kisfs_id);

  if (missing.length === 0) {
    console.log("All candidates already have KISFS IDs.");
    return;
  }

  console.log(`Assigning KISFS IDs to ${missing.length} candidates...`);

  // Get current counter
  const counterRef = db.collection("counters").doc("candidates");
  const counterSnap = await counterRef.get();
  let count = counterSnap.exists ? counterSnap.data().count || 0 : 0;

  const batch = db.batch();

  for (const docSnap of missing) {
    count++;
    const kisfs_id = `KISFS${String(count).padStart(4, "0")}`;
    batch.update(docSnap.ref, { kisfs_id });
    console.log(`  ${docSnap.data().name} -> ${kisfs_id}`);
  }

  batch.set(counterRef, { count }, { merge: true });
  await batch.commit();

  console.log(`Done. Counter is now at ${count}.`);
}

main().catch(console.error).finally(() => process.exit());

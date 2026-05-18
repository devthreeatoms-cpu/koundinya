import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp({
  credential: cert("C:/Users/BHANU/Downloads/workforce-management-sys-f3960-firebase-adminsdk-fbsvc-e6564c2d1e.json"),
});
const db = getFirestore();

(async () => {
  const snap = await db.collection("internal_partners").get();
  console.log(`\ninternal_partners: ${snap.size} document(s)`);
  snap.docs.forEach((d) => console.log(" •", d.id, "→", JSON.stringify(d.data())));
  process.exit(0);
})();

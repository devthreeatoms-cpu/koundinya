// Add bank details to 5 of the KYC-pending candidates (KISFS0011–KISFS0015)
const admin = require("C:/Users/BHANU/AppData/Roaming/npm/node_modules/firebase-admin");
const sa = require("C:/Users/BHANU/Downloads/workforce-management-sys-f3960-firebase-adminsdk-fbsvc-7e3bd94bcb.json");

admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const bankData = {
  "KISFS0011": { // Ravi Kumar
    bank_account_name: "Ravi Kumar",
    bank_name: "State Bank of India",
    bank_account_number: "31245678901",
    bank_ifsc: "SBIN0001111",
  },
  "KISFS0012": { // Anjali Singh
    bank_account_name: "Anjali Singh",
    bank_name: "HDFC Bank",
    bank_account_number: "50100987654",
    bank_ifsc: "HDFC0002222",
  },
  "KISFS0013": { // Venkat Naidu
    bank_account_name: "Venkat Naidu",
    bank_name: "ICICI Bank",
    bank_account_number: "004701234890",
    bank_ifsc: "ICIC0003333",
  },
  "KISFS0014": { // Meera Kulkarni
    bank_account_name: "Meera Kulkarni",
    bank_name: "Axis Bank",
    bank_account_number: "9170123456789",
    bank_ifsc: "UTIB0004444",
  },
  "KISFS0015": { // Suresh Yadav
    bank_account_name: "Suresh Yadav",
    bank_name: "Kotak Mahindra Bank",
    bank_account_number: "1234509876",
    bank_ifsc: "KKBK0005555",
  },
};

async function main() {
  const snap = await db.collection("candidates").get();
  const batch = db.batch();
  let updated = 0;

  for (const docSnap of snap.docs) {
    const kisfs_id = docSnap.data().kisfs_id;
    if (bankData[kisfs_id]) {
      batch.update(docSnap.ref, bankData[kisfs_id]);
      console.log(`  ${kisfs_id} (${docSnap.data().name}) — bank details added`);
      updated++;
    }
  }

  await batch.commit();
  console.log(`\nDone. Updated ${updated} candidates with bank details.`);
}

main().catch(console.error).finally(() => process.exit());

// Seed script: clears ALL candidates and inserts 20 fresh ones.
//   - 10 with full KYC + bank details (verified)
//   - 10 with pending KYC (no documents)
// Usage: node scripts/seed-candidates.cjs

const admin = require("C:/Users/BHANU/AppData/Roaming/npm/node_modules/firebase-admin");
const serviceAccount = require("C:/Users/BHANU/Downloads/koundinya-wms-firebase-adminsdk-fbsvc-a95d5f6efd.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "koundinya-wms",
});

const db = admin.firestore();

// ─── Seed data ──────────────────────────────────────────────────────────────

const COMPLETE_CANDIDATES = [
  {
    name: "Ravi Kumar",
    phone: "9876543201",
    location: "Hyderabad",
    has_bike: true,
    source: "Internal Team",
    status: "Assigned",
    notes: "Experienced delivery executive, 3 years.",
    aadhar_number: "234567890123",
    pan_number: "ABCPK1234R",
    aadhar_verified: true,
    pan_verified: true,
    bank_account_name: "Ravi Kumar",
    bank_name: "State Bank of India",
    bank_account_number: "32145678901",
    bank_ifsc: "SBIN0001234",
  },
  {
    name: "Priya Sharma",
    phone: "9876543202",
    location: "Bangalore",
    has_bike: false,
    source: "Supplier Partners",
    status: "Contacted",
    notes: "Available from next month.",
    aadhar_number: "345678901234",
    pan_number: "BCDQL2345S",
    aadhar_verified: true,
    pan_verified: true,
    bank_account_name: "Priya Sharma",
    bank_name: "HDFC Bank",
    bank_account_number: "50100234567",
    bank_ifsc: "HDFC0002345",
  },
  {
    name: "Ankit Reddy",
    phone: "9876543203",
    location: "Chennai",
    has_bike: true,
    source: "Internal Team",
    status: "New",
    notes: "",
    aadhar_number: "456789012345",
    pan_number: "CDERM3456T",
    aadhar_verified: true,
    pan_verified: true,
    bank_account_name: "Ankit Reddy",
    bank_name: "ICICI Bank",
    bank_account_number: "623456789012",
    bank_ifsc: "ICIC0003456",
  },
  {
    name: "Sneha Patel",
    phone: "9876543204",
    location: "Pune",
    has_bike: false,
    source: "Internal Team",
    status: "Assigned",
    notes: "Bilingual – Hindi and Marathi.",
    aadhar_number: "567890123456",
    pan_number: "DEFSN4567U",
    aadhar_verified: true,
    pan_verified: true,
    bank_account_name: "Sneha Patel",
    bank_name: "Axis Bank",
    bank_account_number: "914567890123",
    bank_ifsc: "UTIB0004567",
  },
  {
    name: "Arjun Singh",
    phone: "9876543205",
    location: "Mumbai",
    has_bike: true,
    source: "Supplier Partners",
    status: "Contacted",
    notes: "",
    aadhar_number: "678901234567",
    pan_number: "EFGTO5678V",
    aadhar_verified: true,
    pan_verified: true,
    bank_account_name: "Arjun Singh",
    bank_name: "Punjab National Bank",
    bank_account_number: "3456789012345",
    bank_ifsc: "PUNB0005678",
  },
  {
    name: "Divya Nair",
    phone: "9876543206",
    location: "Kochi",
    has_bike: false,
    source: "Internal Team",
    status: "New",
    notes: "Preferred zone: Ernakulam.",
    aadhar_number: "789012345678",
    pan_number: "FGHUP6789W",
    aadhar_verified: true,
    pan_verified: true,
    bank_account_name: "Divya Nair",
    bank_name: "Canara Bank",
    bank_account_number: "45678901234",
    bank_ifsc: "CNRB0006789",
  },
  {
    name: "Suresh Menon",
    phone: "9876543207",
    location: "Coimbatore",
    has_bike: true,
    source: "Supplier Partners",
    status: "Assigned",
    notes: "",
    aadhar_number: "890123456789",
    pan_number: "GHIVQ7890X",
    aadhar_verified: true,
    pan_verified: true,
    bank_account_name: "Suresh Menon",
    bank_name: "Kotak Mahindra Bank",
    bank_account_number: "1234567890123",
    bank_ifsc: "KKBK0007890",
  },
  {
    name: "Kavitha Rao",
    phone: "9876543208",
    location: "Visakhapatnam",
    has_bike: true,
    source: "Internal Team",
    status: "New",
    notes: "Ready to relocate within AP.",
    aadhar_number: "901234567890",
    pan_number: "HIJWR8901Y",
    aadhar_verified: true,
    pan_verified: true,
    bank_account_name: "Kavitha Rao",
    bank_name: "Bank of Baroda",
    bank_account_number: "23456789012",
    bank_ifsc: "BARB0008901",
  },
  {
    name: "Rahul Gupta",
    phone: "9876543209",
    location: "Hyderabad",
    has_bike: false,
    source: "Internal Team",
    status: "Contacted",
    notes: "Part-time availability on weekends.",
    aadhar_number: "234509876543",
    pan_number: "IJKXS9012Z",
    aadhar_verified: true,
    pan_verified: true,
    bank_account_name: "Rahul Gupta",
    bank_name: "Union Bank of India",
    bank_account_number: "567890123456",
    bank_ifsc: "UBIN0009012",
  },
  {
    name: "Pooja Iyer",
    phone: "9876543210",
    location: "Tirupati",
    has_bike: true,
    source: "Supplier Partners",
    status: "New",
    notes: "",
    aadhar_number: "345609876543",
    pan_number: "JKLYT0123A",
    aadhar_verified: true,
    pan_verified: true,
    bank_account_name: "Pooja Iyer",
    bank_name: "Indian Bank",
    bank_account_number: "6789012345678",
    bank_ifsc: "IDIB0000123",
  },
];

const PENDING_KYC_CANDIDATES = [
  {
    name: "Manoj Kumar",
    phone: "9812345601",
    location: "Hyderabad",
    has_bike: false,
    source: "Internal Team",
    status: "New",
    notes: "",
    aadhar_number: null,
    pan_number: null,
    aadhar_verified: false,
    pan_verified: false,
    bank_account_name: null,
    bank_name: null,
    bank_account_number: null,
    bank_ifsc: null,
  },
  {
    name: "Lakshmi Devi",
    phone: "9812345602",
    location: "Bangalore",
    has_bike: true,
    source: "Supplier Partners",
    status: "New",
    notes: "Documents submission in progress.",
    aadhar_number: null,
    pan_number: null,
    aadhar_verified: false,
    pan_verified: false,
    bank_account_name: null,
    bank_name: null,
    bank_account_number: null,
    bank_ifsc: null,
  },
  {
    name: "Venkatesh Reddy",
    phone: "9812345603",
    location: "Chennai",
    has_bike: false,
    source: "Internal Team",
    status: "Contacted",
    notes: "",
    aadhar_number: null,
    pan_number: null,
    aadhar_verified: false,
    pan_verified: false,
    bank_account_name: null,
    bank_name: null,
    bank_account_number: null,
    bank_ifsc: null,
  },
  {
    name: "Sunita Sharma",
    phone: "9812345604",
    location: "Pune",
    has_bike: true,
    source: "Internal Team",
    status: "New",
    notes: "Aadhar applied, awaiting card.",
    aadhar_number: null,
    pan_number: null,
    aadhar_verified: false,
    pan_verified: false,
    bank_account_name: null,
    bank_name: null,
    bank_account_number: null,
    bank_ifsc: null,
  },
  {
    name: "Kiran Patel",
    phone: "9812345605",
    location: "Ahmedabad",
    has_bike: false,
    source: "Supplier Partners",
    status: "New",
    notes: "",
    aadhar_number: null,
    pan_number: null,
    aadhar_verified: false,
    pan_verified: false,
    bank_account_name: null,
    bank_name: null,
    bank_account_number: null,
    bank_ifsc: null,
  },
  {
    name: "Deepak Singh",
    phone: "9812345606",
    location: "Jaipur",
    has_bike: true,
    source: "Internal Team",
    status: "Contacted",
    notes: "Will provide documents next week.",
    aadhar_number: null,
    pan_number: null,
    aadhar_verified: false,
    pan_verified: false,
    bank_account_name: null,
    bank_name: null,
    bank_account_number: null,
    bank_ifsc: null,
  },
  {
    name: "Meena Nair",
    phone: "9812345607",
    location: "Trivandrum",
    has_bike: false,
    source: "Supplier Partners",
    status: "New",
    notes: "",
    aadhar_number: null,
    pan_number: null,
    aadhar_verified: false,
    pan_verified: false,
    bank_account_name: null,
    bank_name: null,
    bank_account_number: null,
    bank_ifsc: null,
  },
  {
    name: "Vijay Kumar",
    phone: "9812345608",
    location: "Mysore",
    has_bike: true,
    source: "Internal Team",
    status: "New",
    notes: "",
    aadhar_number: null,
    pan_number: null,
    aadhar_verified: false,
    pan_verified: false,
    bank_account_name: null,
    bank_name: null,
    bank_account_number: null,
    bank_ifsc: null,
  },
  {
    name: "Asha Reddy",
    phone: "9812345609",
    location: "Warangal",
    has_bike: false,
    source: "Supplier Partners",
    status: "New",
    notes: "Submitted form, pending verification.",
    aadhar_number: null,
    pan_number: null,
    aadhar_verified: false,
    pan_verified: false,
    bank_account_name: null,
    bank_name: null,
    bank_account_number: null,
    bank_ifsc: null,
  },
  {
    name: "Sanjay Mishra",
    phone: "9812345610",
    location: "Nagpur",
    has_bike: true,
    source: "Internal Team",
    status: "Contacted",
    notes: "",
    aadhar_number: null,
    pan_number: null,
    aadhar_verified: false,
    pan_verified: false,
    bank_account_name: null,
    bank_name: null,
    bank_account_number: null,
    bank_ifsc: null,
  },
];

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Delete all existing candidates
  console.log("Deleting all existing candidates...");
  const snapshot = await db.collection("candidates").get();
  if (!snapshot.empty) {
    const deleteBatch = db.batch();
    snapshot.docs.forEach((d) => deleteBatch.delete(d.ref));
    await deleteBatch.commit();
    console.log(`  Deleted ${snapshot.size} candidate(s).`);
  } else {
    console.log("  No existing candidates found.");
  }

  // 2. Reset the counter
  console.log("Resetting counter...");
  await db.collection("counters").doc("candidates").set({ count: 0 });

  // 3. Insert new candidates
  const allCandidates = [...COMPLETE_CANDIDATES, ...PENDING_KYC_CANDIDATES];
  console.log(`\nInserting ${allCandidates.length} candidates...`);

  let counter = 0;
  const insertBatch = db.batch();
  const counterRef = db.collection("counters").doc("candidates");

  for (const c of allCandidates) {
    counter++;
    const kisfs_id = `KISFS${String(counter).padStart(4, "0")}`;
    const ref = db.collection("candidates").doc();
    insertBatch.set(ref, {
      ...c,
      kisfs_id,
      is_deleted: false,
      agency_id: null,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    const kycStatus = c.aadhar_verified ? "KYC Complete" : "KYC Pending";
    console.log(`  [${kisfs_id}] ${c.name} (${c.location}) — ${kycStatus}`);
  }

  insertBatch.set(counterRef, { count: counter }, { merge: true });
  await insertBatch.commit();

  console.log(`\nDone. ${COMPLETE_CANDIDATES.length} complete + ${PENDING_KYC_CANDIDATES.length} pending KYC candidates inserted.`);
}

main().catch(console.error).finally(() => process.exit());

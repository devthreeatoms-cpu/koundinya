// Wipe all candidates, reset counter, reseed 20 realistic candidates.
// 10 fully detailed (all KYC + bank) + 10 KYC pending.
const admin = require("C:/Users/BHANU/AppData/Roaming/npm/node_modules/firebase-admin");
const sa = require("C:/Users/BHANU/Downloads/workforce-management-sys-f3960-firebase-adminsdk-fbsvc-7e3bd94bcb.json");

admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// ── helpers ────────────────────────────────────────────────────────────────
function kisfs(n) {
  return "KISFS" + String(n).padStart(4, "0");
}

// ── 10 fully-detailed candidates ───────────────────────────────────────────
const fullCandidates = [
  {
    name: "Rahul Sharma",
    phone: "9876543201",
    location: "Hyderabad",
    has_bike: true,
    source: "Internal Team",
    status: "New",
    notes: "Experienced delivery executive. Available immediately.",
    aadhar_number: "234567891234",
    pan_number: "ABCPS1234R",
    aadhar_verified: true,
    pan_verified: true,
    bank_account_name: "Rahul Sharma",
    bank_name: "State Bank of India",
    bank_account_number: "30456781234",
    bank_ifsc: "SBIN0004321",
  },
  {
    name: "Priya Nair",
    phone: "9876543202",
    location: "Bangalore",
    has_bike: false,
    source: "Supplier Partners",
    status: "Contacted",
    notes: "Strong communication skills. Looking for field work.",
    aadhar_number: "345678912345",
    pan_number: "BCDQT5678S",
    aadhar_verified: true,
    pan_verified: true,
    bank_account_name: "Priya Nair",
    bank_name: "HDFC Bank",
    bank_account_number: "50100234567",
    bank_ifsc: "HDFC0001234",
  },
  {
    name: "Arjun Reddy",
    phone: "9876543203",
    location: "Chennai",
    has_bike: true,
    source: "Internal Team",
    status: "Assigned",
    notes: "Reliable and punctual. Has prior logistics experience.",
    aadhar_number: "456789123456",
    pan_number: "CDERS6789T",
    aadhar_verified: true,
    pan_verified: true,
    bank_account_name: "Arjun Reddy",
    bank_name: "ICICI Bank",
    bank_account_number: "004701234567",
    bank_ifsc: "ICIC0002345",
  },
  {
    name: "Sunita Menon",
    phone: "9876543204",
    location: "Mumbai",
    has_bike: false,
    source: "Supplier Partners",
    status: "New",
    notes: "Graduate fresher. Eager to work in field operations.",
    aadhar_number: "567891234567",
    pan_number: "DEFTU7890U",
    aadhar_verified: true,
    pan_verified: true,
    bank_account_name: "Sunita Menon",
    bank_name: "Axis Bank",
    bank_account_number: "9170234567891",
    bank_ifsc: "UTIB0003456",
  },
  {
    name: "Kiran Babu",
    phone: "9876543205",
    location: "Pune",
    has_bike: true,
    source: "Internal Team",
    status: "Contacted",
    notes: "Two-wheeler rider with 3 years delivery experience.",
    aadhar_number: "678912345678",
    pan_number: "EFGUV8901V",
    aadhar_verified: true,
    pan_verified: true,
    bank_account_name: "Kiran Babu",
    bank_name: "Kotak Mahindra Bank",
    bank_account_number: "1234567890",
    bank_ifsc: "KKBK0004567",
  },
  {
    name: "Deepa Krishnan",
    phone: "9876543206",
    location: "Hyderabad",
    has_bike: false,
    source: "Supplier Partners",
    status: "New",
    notes: "Available for both indoor and outdoor assignments.",
    aadhar_number: "789123456789",
    pan_number: "FGHVW9012W",
    aadhar_verified: true,
    pan_verified: true,
    bank_account_name: "Deepa Krishnan",
    bank_name: "Punjab National Bank",
    bank_account_number: "0193000123456",
    bank_ifsc: "PUNB0005678",
  },
  {
    name: "Sanjay Patil",
    phone: "9876543207",
    location: "Nagpur",
    has_bike: true,
    source: "Internal Team",
    status: "Assigned",
    notes: "Hardworking. Previously worked with e-commerce delivery.",
    aadhar_number: "891234567891",
    pan_number: "GHIWX0123X",
    aadhar_verified: true,
    pan_verified: true,
    bank_account_name: "Sanjay Patil",
    bank_name: "Bank of Baroda",
    bank_account_number: "29130200001234",
    bank_ifsc: "BARB0006789",
  },
  {
    name: "Kavya Reddy",
    phone: "9876543208",
    location: "Vijayawada",
    has_bike: false,
    source: "Supplier Partners",
    status: "Contacted",
    notes: "Experienced in customer-facing roles.",
    aadhar_number: "912345678912",
    pan_number: "HIJXY1234Y",
    aadhar_verified: true,
    pan_verified: true,
    bank_account_name: "Kavya Reddy",
    bank_name: "Canara Bank",
    bank_account_number: "0341101234567",
    bank_ifsc: "CNRB0007890",
  },
  {
    name: "Manoj Verma",
    phone: "9876543209",
    location: "Jaipur",
    has_bike: true,
    source: "Internal Team",
    status: "New",
    notes: "Quick learner. Holds valid driving licence.",
    aadhar_number: "123456789123",
    pan_number: "IJKYZ2345Z",
    aadhar_verified: true,
    pan_verified: true,
    bank_account_name: "Manoj Verma",
    bank_name: "Union Bank of India",
    bank_account_number: "5102345678901",
    bank_ifsc: "UBIN0008901",
  },
  {
    name: "Lakshmi Devi",
    phone: "9876543210",
    location: "Visakhapatnam",
    has_bike: false,
    source: "Supplier Partners",
    status: "New",
    notes: "Dependable and detail-oriented worker.",
    aadhar_number: "234512345678",
    pan_number: "JKLZA3456A",
    aadhar_verified: true,
    pan_verified: true,
    bank_account_name: "Lakshmi Devi",
    bank_name: "Indian Bank",
    bank_account_number: "6378901234567",
    bank_ifsc: "IDIB0009012",
  },
];

// ── 10 KYC-pending candidates ──────────────────────────────────────────────
const kycPendingCandidates = [
  {
    name: "Ravi Kumar",
    phone: "9876543211",
    location: "Delhi",
    has_bike: true,
    source: "Internal Team",
    status: "New",
    notes: "",
  },
  {
    name: "Anjali Singh",
    phone: "9876543212",
    location: "Lucknow",
    has_bike: false,
    source: "Supplier Partners",
    status: "Contacted",
    notes: "",
  },
  {
    name: "Venkat Naidu",
    phone: "9876543213",
    location: "Guntur",
    has_bike: true,
    source: "Internal Team",
    status: "New",
    notes: "",
  },
  {
    name: "Meera Kulkarni",
    phone: "9876543214",
    location: "Nashik",
    has_bike: false,
    source: "Supplier Partners",
    status: "New",
    notes: "",
  },
  {
    name: "Suresh Yadav",
    phone: "9876543215",
    location: "Ahmedabad",
    has_bike: true,
    source: "Internal Team",
    status: "Contacted",
    notes: "",
  },
  {
    name: "Pooja Desai",
    phone: "9876543216",
    location: "Surat",
    has_bike: false,
    source: "Supplier Partners",
    status: "New",
    notes: "",
  },
  {
    name: "Arun Pillai",
    phone: "9876543217",
    location: "Kochi",
    has_bike: true,
    source: "Internal Team",
    status: "New",
    notes: "",
  },
  {
    name: "Nandini Rao",
    phone: "9876543218",
    location: "Mysore",
    has_bike: false,
    source: "Supplier Partners",
    status: "Contacted",
    notes: "",
  },
  {
    name: "Rajesh Iyer",
    phone: "9876543219",
    location: "Coimbatore",
    has_bike: true,
    source: "Internal Team",
    status: "New",
    notes: "",
  },
  {
    name: "Divya Lakshmi",
    phone: "9876543220",
    location: "Tirupati",
    has_bike: false,
    source: "Supplier Partners",
    status: "New",
    notes: "",
  },
];

async function deleteAllCandidates() {
  const snap = await db.collection("candidates").get();
  if (snap.empty) { console.log("No candidates to delete."); return; }
  const chunkSize = 400;
  for (let i = 0; i < snap.docs.length; i += chunkSize) {
    const batch = db.batch();
    snap.docs.slice(i, i + chunkSize).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  console.log(`Deleted ${snap.docs.length} candidates.`);
}

async function resetCounter() {
  await db.collection("counters").doc("candidates").set({ count: 0 });
  console.log("Counter reset to 0.");
}

async function seedCandidates() {
  const now = FieldValue.serverTimestamp();
  let count = 0;

  // Seed fully detailed
  const batch1 = db.batch();
  for (const c of fullCandidates) {
    count++;
    const ref = db.collection("candidates").doc();
    batch1.set(ref, {
      ...c,
      kisfs_id: kisfs(count),
      is_deleted: false,
      agency_id: null,
      created_at: now,
    });
  }
  await batch1.commit();
  console.log("Seeded 10 fully-detailed candidates (KISFS0001–KISFS0010).");

  // Seed KYC pending
  const batch2 = db.batch();
  for (const c of kycPendingCandidates) {
    count++;
    const ref = db.collection("candidates").doc();
    batch2.set(ref, {
      ...c,
      aadhar_number: null,
      pan_number: null,
      aadhar_verified: false,
      pan_verified: false,
      bank_account_name: null,
      bank_name: null,
      bank_account_number: null,
      bank_ifsc: null,
      kisfs_id: kisfs(count),
      is_deleted: false,
      agency_id: null,
      created_at: now,
    });
  }
  await batch2.commit();
  console.log("Seeded 10 KYC-pending candidates (KISFS0011–KISFS0020).");

  // Update counter
  await db.collection("counters").doc("candidates").set({ count }, { merge: true });
  console.log(`Counter set to ${count}.`);
}

async function main() {
  console.log("── Step 1: Delete all candidates ──");
  await deleteAllCandidates();

  console.log("── Step 2: Reset counter ──");
  await resetCounter();

  console.log("── Step 3: Seed new candidates ──");
  await seedCandidates();

  console.log("\nDone! 20 candidates seeded.");
}

main().catch(console.error).finally(() => process.exit());

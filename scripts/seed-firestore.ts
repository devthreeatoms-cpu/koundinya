import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
  "C:/Users/BHANU/Downloads/workforce-management-sys-f3960-firebase-adminsdk-fbsvc-e6564c2d1e.json";

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ── data ──────────────────────────────────────────────────────────────────────

const SUPPLY_PARTNERS = [
  {
    name: "Kumar Field Services",
    full_name: "Rajesh Kumar",
    email: "rajesh@kumarfield.in",
    phone: "+91 98765 43210",
    partner_type: "Proprietorship",
    city_name: "Hyderabad",
    aadhar_number: "234567891234",
    aadhar_name: "Rajesh Kumar",
    aadhar_dob: "1985-06-15",
    aadhar_address: "H.No 12-3-456, Banjara Hills, Hyderabad, Telangana 500034",
    pan_number: "ABCPK1234R",
    pan_name: "Rajesh Kumar",
    bank_account_name: "Rajesh Kumar",
    bank_name: "State Bank of India",
    bank_account_number: "32456789012",
    bank_ifsc: "SBIN0040253",
    bank_branch_name: "Banjara Hills Branch",
    bank_account_type: "Savings",
    company_name: "Kumar Field Services",
    company_gst: "36ABCPK1234R1Z5",
    is_deleted: false,
  },
  {
    name: "Sharma Associates",
    full_name: "Suresh Sharma",
    email: "suresh@sharmaassociates.in",
    phone: "+91 87654 32109",
    partner_type: "Partnership Firm",
    city_name: "Mumbai",
    aadhar_number: "345678901234",
    aadhar_name: "Suresh Sharma",
    aadhar_dob: "1979-03-22",
    aadhar_address: "Flat 4B, Sector 12, Andheri West, Mumbai, Maharashtra 400053",
    pan_number: "BCDPS5678M",
    pan_name: "Suresh Sharma",
    bank_account_name: "Sharma Associates",
    bank_name: "HDFC Bank",
    bank_account_number: "50123456789",
    bank_ifsc: "HDFC0001234",
    bank_branch_name: "Andheri West Branch",
    bank_account_type: "Current",
    company_name: "Sharma Associates",
    company_gst: "27BCDPS5678M1Z3",
    is_deleted: false,
  },
  {
    name: "Reddy Workforce Solutions",
    full_name: "Venkata Reddy",
    email: "venkata@reddyworkforce.in",
    phone: "+91 76543 21098",
    partner_type: "Private Limited Company",
    city_name: "Bangalore",
    aadhar_number: "456789012345",
    aadhar_name: "Venkata Reddy",
    aadhar_dob: "1990-11-08",
    aadhar_address: "No. 45, 3rd Cross, Koramangala 4th Block, Bangalore, Karnataka 560034",
    pan_number: "CDEFR7890N",
    pan_name: "Venkata Reddy",
    bank_account_name: "Reddy Workforce Solutions Pvt Ltd",
    bank_name: "Axis Bank",
    bank_account_number: "918010123456789",
    bank_ifsc: "UTIB0001234",
    bank_branch_name: "Koramangala Branch",
    bank_account_type: "Current",
    company_name: "Reddy Workforce Solutions Pvt Ltd",
    company_gst: "29CDEFR7890N1Z1",
    is_deleted: false,
  },
  {
    name: "Patel Manpower Agency",
    full_name: "Kiran Patel",
    email: "kiran@patelmanpower.in",
    phone: "+91 91234 56789",
    partner_type: "Proprietorship",
    city_name: "Ahmedabad",
    aadhar_number: "567890123456",
    aadhar_name: "Kiran Patel",
    aadhar_dob: "1988-07-30",
    aadhar_address: "B-12, Satellite Road, Ahmedabad, Gujarat 380015",
    pan_number: "DEFGP2345K",
    pan_name: "Kiran Patel",
    bank_account_name: "Kiran Patel",
    bank_name: "Bank of Baroda",
    bank_account_number: "12345678901",
    bank_ifsc: "BARB0SATELL",
    bank_branch_name: "Satellite Road Branch",
    bank_account_type: "Savings",
    company_name: "Patel Manpower Agency",
    company_gst: "24DEFGP2345K1Z8",
    is_deleted: false,
  },
];

const INTERNAL_TEAM = [
  { full_name: "Arun Kumar",   position: "Operations Manager",      phone: "+91 99999 11111", employee_id: "EMP-001", is_deleted: false },
  { full_name: "Priya Reddy",  position: "HR Manager",              phone: "+91 99999 22222", employee_id: "EMP-002", is_deleted: false },
  { full_name: "Kiran Rao",    position: "Field Coordinator",       phone: "+91 99999 33333", employee_id: "EMP-003", is_deleted: false },
  { full_name: "Meena Singh",  position: "Finance Lead",            phone: "+91 99999 44444", employee_id: "EMP-004", is_deleted: false },
  { full_name: "Deepak Nair",  position: "Recruitment Executive",   phone: "+91 99999 55555", employee_id: "EMP-005", is_deleted: false },
];

// ── helpers ───────────────────────────────────────────────────────────────────

async function clearCollection(name: string) {
  const snap = await db.collection(name).get();
  if (snap.empty) { console.log(`  ${name}: already empty`); return 0; }
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  console.log(`  ${name}: deleted ${snap.size} document(s)`);
  return snap.size;
}

async function insertAll(colName: string, docs: object[]) {
  const batch = db.batch();
  docs.forEach((data) => {
    const ref = db.collection(colName).doc();
    batch.set(ref, { ...data, created_at: new Date(), updated_at: new Date() });
  });
  await batch.commit();
  console.log(`  ${colName}: inserted ${docs.length} document(s)`);
}

// ── main ──────────────────────────────────────────────────────────────────────

(async () => {
  console.log("\n🔥 Connecting to Firestore project: workforce-management-sys-f3960\n");

  console.log("1. Clearing existing data…");
  await clearCollection("agencies");
  await clearCollection("internal_partners");

  console.log("\n2. Seeding supply partners…");
  await insertAll("agencies", SUPPLY_PARTNERS);

  console.log("\n3. Seeding internal team…");
  await insertAll("internal_partners", INTERNAL_TEAM);

  console.log("\n✅ Done! Seeded:");
  console.log(`   ${SUPPLY_PARTNERS.length} supply partners`);
  console.log(`   ${INTERNAL_TEAM.length} internal team members\n`);
  process.exit(0);
})();

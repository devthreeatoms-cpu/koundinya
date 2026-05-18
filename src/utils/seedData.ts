import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

async function clearCollection(name: string) {
  const snap = await getDocs(collection(db, name));
  await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, name, d.id))));
}

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
  {
    full_name: "Arun Kumar",
    position: "Operations Manager",
    phone: "+91 99999 11111",
    employee_id: "EMP-001",
    is_deleted: false,
  },
  {
    full_name: "Priya Reddy",
    position: "HR Manager",
    phone: "+91 99999 22222",
    employee_id: "EMP-002",
    is_deleted: false,
  },
  {
    full_name: "Kiran Rao",
    position: "Field Coordinator",
    phone: "+91 99999 33333",
    employee_id: "EMP-003",
    is_deleted: false,
  },
  {
    full_name: "Meena Singh",
    position: "Finance Lead",
    phone: "+91 99999 44444",
    employee_id: "EMP-004",
    is_deleted: false,
  },
  {
    full_name: "Deepak Nair",
    position: "Recruitment Executive",
    phone: "+91 99999 55555",
    employee_id: "EMP-005",
    is_deleted: false,
  },
];

export async function seedDemoData() {
  // 1. Clear existing supply partners & internal team
  await clearCollection("agencies");
  await clearCollection("internal_partners");

  // 2. Seed supply partners
  const partnerCol = collection(db, "agencies");
  await Promise.all(
    SUPPLY_PARTNERS.map((p) =>
      addDoc(partnerCol, { ...p, created_at: serverTimestamp(), updated_at: serverTimestamp() })
    )
  );

  // 3. Seed internal team
  const teamCol = collection(db, "internal_partners");
  await Promise.all(
    INTERNAL_TEAM.map((m) =>
      addDoc(teamCol, { ...m, created_at: serverTimestamp(), updated_at: serverTimestamp() })
    )
  );

  return {
    partners: SUPPLY_PARTNERS.length,
    team: INTERNAL_TEAM.length,
  };
}

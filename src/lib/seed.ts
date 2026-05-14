import { collection, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

const testClients = [
  {
    name: "Rajesh Sharma",
    company_name: "Tata Consultancy Services",
    company_address: "Gate No. 5, TCS House, MIDC Industrial Area, Andheri East, Mumbai, Maharashtra 400093",
    gst_number: "27AABCT1234C1Z5",
  },
  {
    name: "Priya Patel",
    company_name: "Reliance Industries Ltd",
    company_address: "Near Palsana Village, NH-8, Surat, Gujarat 394510",
    gst_number: "24AABCT1234C1Z5",
  },
  {
    name: "Amit Kumar",
    company_name: "Infosys Limited",
    company_address: "Electronics City, Hosur Road, Bangalore, Karnataka 560100",
    gst_number: "29AABCT1234C1Z5",
  },
  {
    name: "Sneha Reddy",
    company_name: "Wipro Limited",
    company_address: "Gachibowli, Hitech City, Hyderabad, Telangana 500032",
    gst_number: "36AABCT1234C1Z5",
  },
  {
    name: "Vikram Singh",
    company_name: "HDFC Bank Ltd",
    company_address: "Tower B, Sector 16A, Noida, New Delhi 110001",
    gst_number: "07AABCT1234C1Z5",
  },
];

const testProjects = [
  { name: "Warehouse Operations - Mumbai", location: "Mumbai, Maharashtra", status: "Active" as const, clientIndex: 0 },
  { name: "Retail Staffing - Surat", location: "Surat, Gujarat", status: "Active" as const, clientIndex: 1 },
  { name: "IT Support Bangalore", location: "Bangalore, Karnataka", status: "Active" as const, clientIndex: 2 },
  { name: "Security Personnel - Hyderabad", location: "Hyderabad, Telangana", status: "Completed" as const, clientIndex: 3 },
  { name: "Banking Operations Delhi", location: "New Delhi, Delhi", status: "Active" as const, clientIndex: 4 },
  { name: "Manufacturing Floor Staff", location: "Pune, Maharashtra", status: "Active" as const, clientIndex: 0 },
];

export async function seedTestData() {
  const createdClientIds: string[] = [];

  // Create clients
  for (const client of testClients) {
    const ref = await addDoc(collection(db, "clients"), {
      ...client,
      created_at: serverTimestamp(),
    });
    createdClientIds.push(ref.id);
  }

  // Create projects linked to clients
  for (const project of testProjects) {
    const clientId = createdClientIds[project.clientIndex];
    const client = testClients[project.clientIndex];
    await addDoc(collection(db, "projects"), {
      name: project.name,
      client_name: client.name,
      client_id: clientId,
      location: project.location,
      start_date: Timestamp.fromDate(new Date()),
      status: project.status,
      agency_id: null,
      created_at: serverTimestamp(),
    });
  }

  return { clientCount: testClients.length, projectCount: testProjects.length };
}

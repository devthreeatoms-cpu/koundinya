import type { Timestamp } from "firebase/firestore";

export type CandidateStatus = "New" | "Contacted" | "Assigned" | "Rejected";
export type ProjectStatus = "Active" | "Completed";
export type AssignmentStatus = "Active" | "Completed" | "Dropped";
export type UserRole = "admin" | "agency";

export interface Candidate {
  id: string;
  name: string;
  phone: string;
  location: string;
  has_bike: boolean;
  source: string;
  status: CandidateStatus;
  notes?: string;
  is_deleted?: boolean;
  created_at?: Timestamp | null;
  agency_id?: string | null;
  aadhar_number?: string | null;
  pan_number?: string | null;
  aadhar_verified?: boolean;
  pan_verified?: boolean;
}

export interface Project {
  id: string;
  name: string;
  client_name?: string;
  location: string;
  start_date?: Timestamp | null;
  status: ProjectStatus;
  created_at?: Timestamp | null;
  agency_id?: string | null;
}

export interface Assignment {
  id: string;
  candidate_id: string;
  project_id: string;
  assigned_at?: Timestamp | null;
  removed_at?: Timestamp | null;
  status: AssignmentStatus;
  agency_id?: string | null;
}

export interface Agency {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  is_deleted?: boolean;
  created_at?: Timestamp | null;
  updated_at?: Timestamp | null;
}

export interface AppUser {
  id: string;          // == auth uid
  email: string;
  role: UserRole;
  agency_id: string | null;
  created_at?: Timestamp | null;
}

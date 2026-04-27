import type { Timestamp } from "firebase/firestore";

export type CandidateStatus = "New" | "Contacted" | "Assigned" | "Rejected";
export type ProjectStatus = "Active" | "Completed";
export type AssignmentStatus = "Active" | "Completed" | "Dropped";

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
}

export interface Project {
  id: string;
  name: string;
  client_name?: string;
  location: string;
  start_date?: Timestamp | null;
  status: ProjectStatus;
  created_at?: Timestamp | null;
}

export interface Assignment {
  id: string;
  candidate_id: string;
  project_id: string;
  assigned_at?: Timestamp | null;
  removed_at?: Timestamp | null;
  status: AssignmentStatus;
}

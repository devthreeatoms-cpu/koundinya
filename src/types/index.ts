import type { Timestamp } from "firebase/firestore";

export type CandidateStatus =
  | "New"
  | "Contacted"
  | "Assigned"
  | "Rejected"
  | "Call Back"
  | "Follow Up"
  | "On Hold"
  | "Interview Pending"
  | "Not Answering"
  | "Not Interested"
  | "Not Responding";
export type ProjectStatus = string;
export type AssignmentStatus = "Active" | "Completed" | "Dropped";
export type OnboardingStatus = "Onboarding" | "MovedToProject";
export type UserRole = "admin" | "agency";

export interface Candidate {
  id: string;
  kisfs_id?: string | null;
  name: string;
  phone: string;
  location?: string;
  state?: string;
  district?: string;
  area_name?: string;
  has_bike: boolean;
  source: string;
  status: CandidateStatus;
  notes?: string;
  source_member_id?: string | null;
  source_member_name?: string | null;
  is_deleted?: boolean;
  is_blocklisted?: boolean;
  created_at?: Timestamp | null;
  agency_id?: string | null;
  aadhar_number?: string | null;
  pan_number?: string | null;
  aadhar_verified?: boolean;
  pan_verified?: boolean;
  age?: number | null;
  gender?: "Male" | "Female" | "Other" | null;
  qualification?: string | null;
  pincode?: string | null;
  bank_account_name?: string | null;
  bank_name?: string | null;
  bank_account_number?: string | null;
  bank_ifsc?: string | null;
}

export interface Project {
  id: string;
  name: string;
  client_name?: string;
  client_id?: string | null;
  location: string;
  start_date?: Timestamp | null;
  status: ProjectStatus;
  custom_statuses?: string[];
  onboarding_statuses?: string[];
  created_at?: Timestamp | null;
  agency_id?: string | null;
}

export interface Client {
  id: string;
  name: string;
  company_name: string;
  company_address: string;
  gst_number: string;
  created_at?: Timestamp | null;
}

export interface Assignment {
  id: string;
  candidate_id: string;
  project_id: string;
  assigned_at?: Timestamp | null;
  removed_at?: Timestamp | null;
  status: AssignmentStatus;
  project_status?: string | null;
  agency_id?: string | null;
}

export interface OnboardingCandidate {
  id: string;
  project_id: string;
  candidate_id: string;
  agency_id?: string | null;
  onboarding_status: string;
  notes?: string | null;
  status: OnboardingStatus;
  moved_to_project_at?: Timestamp | null;
  assignment_id?: string | null;
  created_at?: Timestamp | null;
  updated_at?: Timestamp | null;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface InternalPartner {
  id: string;
  full_name: string;
  position: string;
  phone: string;
  employee_id: string;
  is_deleted?: boolean;
  created_at?: Timestamp | null;
  updated_at?: Timestamp | null;
}

export interface Agency {
  id: string;
  kissp_id?: string | null;
  name: string;
  is_internal?: boolean;
  // Internal-team-only fields
  position?: string | null;
  employee_id?: string | null;
  // Basic
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  partner_type?: string | null;
  city_name?: string | null;
  // Aadhaar
  aadhar_number?: string | null;
  aadhar_name?: string | null;
  aadhar_dob?: string | null;
  aadhar_address?: string | null;
  // PAN
  pan_number?: string | null;
  pan_name?: string | null;
  // Bank
  bank_account_name?: string | null;
  bank_name?: string | null;
  bank_account_number?: string | null;
  bank_ifsc?: string | null;
  bank_branch_name?: string | null;
  bank_account_type?: string | null;
  // Company
  company_name?: string | null;
  company_gst?: string | null;
  /** Admin-controlled toggle: whether this supply partner can edit/delete their own candidates. */
  can_edit_candidates?: boolean;
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

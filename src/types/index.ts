// ============================================================
// Global TypeScript Types & Interfaces
// ============================================================

export type UserRole = 'ADMIN' | 'OPERATOR';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface ElectoralDivision {
  id: string;
  division_name: string;
  member_count?: number;
  created_at?: string;
}

export interface Category {
  id: string;
  category_name: string;
  member_count?: number;
  created_at?: string;
}

export interface Member {
  id: string;
  member_no: string;
  name: string;
  address: string;
  email?: string;
  phone?: string;
  joined_date: string;
  nic: string;
  share_amount: number;
  electoral_division_id: string;
  category_id: string;
  created_at: string;
  electoral_division?: ElectoralDivision;
  category?: Category;
}

export interface MemberFilters {
  search?: string;
  division_id?: string;
  category_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Settings {
  id?: string;
  society_name: string;
  address: string;
  telephone: string;
  email: string;
  logo_url?: string;
  theme_color: string;
  resend_api_key?: string;
  twilio_sid?: string;
  twilio_auth_token?: string;
  twilio_from_number?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  created_at: string;
}

// Import types
export interface RawImportRow {
  [key: string]: string | number | null | undefined;
}

export interface ParsedMember {
  member_no: string;
  name: string;
  address: string;
  email?: string;
  phone?: string;
  joined_date: string;
  nic: string;
  share_amount: number;
  electoral_division_id: string;
  category_id: string;
}

export type ImportRowStatus = 'valid' | 'duplicate' | 'invalid';

export interface ImportRow {
  rowIndex: number;
  raw: RawImportRow;
  parsed?: ParsedMember;
  status: ImportRowStatus;
  errors: string[];
}

export interface ImportSummary {
  totalRows: number;
  imported: number;
  duplicates: number;
  failed: number;
  durationMs: number;
}

export type ImportStep = 'upload' | 'select' | 'preview' | 'validate' | 'import' | 'summary';

export interface ImportState {
  step: ImportStep;
  file: File | null;
  divisionId: string;
  categoryId: string;
  rows: ImportRow[];
  summary: ImportSummary | null;
  progress: number;
  isProcessing: boolean;
  error: string | null;
}

// Report types
export type ReportType =
  | 'member_list'
  | 'share_capital'
  | 'monthly_registration'
  | 'annual_summary'
  | 'division_wise'
  | 'category_wise';

export interface ReportConfig {
  type: ReportType;
  title: string;
  filters?: MemberFilters;
  dateFrom?: string;
  dateTo?: string;
}

// Dashboard
export interface DashboardStats {
  totalMembers: number;
  totalShareCapital: number;
  newMembersThisMonth: number;
  totalDivisions: number;
}

export interface MonthlyRegistration {
  month: string;
  count: number;
}


// types.ts

// --- KPI & METRICS ---
export interface KPIMetric {
  id: string;
  title: string;
  value: string | number;
  change: number; // percentage
  target: string | number;
  icon?: string;
  link?: string;
}

export interface SubKPI {
  id: string;
  code: string;
  description: string;
  targetMidYear: string;
  targetEndYear: string;
  achievement: string; // New field for actual achievement
  manualStatus?: string; // New: 'Perlu Tumpuan' | 'Sedang Berjalan' | 'Dalam Pantauan' | 'Selesai'
}

export interface KPI {
  id: string;
  code: string;
  description: string;
  subKPIs: SubKPI[];
}

export interface KRA {
  id: string;
  no: number;
  description: string;
  kpis: KPI[];
}

export interface Perspective {
  id: string;
  no: number;
  description: string;
  kras: KRA[];
}

export interface KPISheet {
  id: string;
  title: string;
  data: Perspective[];
}

// --- DAILY REPORT TYPES ---
export interface ReportMetrics {
  bil: number | string; 
  amount: number | string;
}

export interface SchemeRow {
  id: string;
  name: string;
  terimaBorang: ReportMetrics;
  kelulusan: ReportMetrics;
  pengeluaran: ReportMetrics;
}

export interface SideTableRow {
    negeri: string;
    bil: number | string;
    amount: number | string;
    percent: number | string;
}

export interface DailyReportData {
  date: string;
  notes: string[];
  headers: Record<string, string>;
  table10: SchemeRow[];
  table11: SchemeRow[];
  table12: SchemeRow[];
  table13: SchemeRow[];
  table14: SchemeRow[];
  table15: SchemeRow[];
  table15Side: SideTableRow[];
  table16: SchemeRow[];
  table17: SchemeRow[];
}

// --- FINANCING REPORT TYPES ---
export interface MonthlyPerformanceRow {
  id: string;
  month: string;
  targetBil: number;
  actualBil: number;
  targetRM: number;
  actualRM: number;
}

export interface BranchPerformanceRow {
  id: string;
  negeri: string;
  bilPeminjam: number;
  bilPembiayaan: number;
  nilaiRM: number;
  targetBil: number;
  targetRM: number;
}

export interface RankingItem {
  id: string;
  name: string;
  value: number;
  label?: string;
}

export interface UnprocessedBranch {
  id: string;
  negeri: string;
  cawangan: string;
}

export interface FinancingReportFullData {
  year: number;
  monthlyPerformance: MonthlyPerformanceRow[];
  branchPerformance: BranchPerformanceRow[];
  topRankingBil: RankingItem[];
  topRankingRM: RankingItem[];
  bottomRankingBil: RankingItem[];
  bottomRankingRM: RankingItem[];
  unprocessedBranches: UnprocessedBranch[];
  unprocessedDate: string;
}

// --- COLLECTION REPORT TYPES ---
export interface CollectionSchemeMetrics {
    pk: number;
    dk: number;
}

export interface CollectionMonthData {
    id: string;
    month: string;
    schemes: Record<string, CollectionSchemeMetrics>;
}

export interface CollectionReportFullData {
    year: number;
    months: CollectionMonthData[];
}

// --- NPF REPORT TYPES ---
export interface NPFMonthRow {
    id: string;
    month: string;
    schemes: Record<string, number>;
}

export interface NPFReportFullData {
    year: number;
    dataBil: NPFMonthRow[];
    dataRM: NPFMonthRow[];
}

// --- AUTH & ADMIN TYPES ---

export type UserRole = 'superadmin' | 'admin' | 'user' | 'viewer';
export type UserStatus = 'active' | 'inactive' | 'pending';

export interface User {
  id?: string;
  email: string; // backend uses 'email'
  username?: string; // legacy support
  name: string;
  role: UserRole;
  status?: UserStatus;
  createdAt?: string;
  lastLogin?: string;
}

export interface SystemSettings {
  activeYear: number;
  maintenanceMode: boolean;
  availableYears: {
    year: number;
    isActive: boolean;
    createdAt: string;
    createdBy: string;
  }[];
  lastUpdated?: string;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalAdmins: number;
  pendingUsers: number;
}

export interface ApiResponse {
  status?: 'success' | 'error';
  result?: 'success' | 'error'; // legacy support
  data?: any;
  message?: string;
  error?: string;
  user?: User;
  users?: User[]; // for getAllUsers
  settings?: SystemSettings; // for getSettings
  stats?: AdminStats; // for getStats
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  error: string | null;
  loading: boolean;
}

export type ReportType = 'daily' | 'financing' | 'collection' | 'npf';

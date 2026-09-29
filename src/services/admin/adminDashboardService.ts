import apiClient from "../../utils/axios";

// ── Filter Types ──
export type TimeFilter = "--" | "DAY" | "WEEK" | "MONTH";
export type LevelFilter = "--" | "INTERN" | "FRESHER";
export type ActionTypeFilter =
  | "--"
  | "CREATE_MANUAL_QUESTION"
  | "GENERATE_AI_QUESTIONS"
  | "CREATE_PROMPT"
  | "CREATE_PROMPT_VERSION"
  | "ACTIVATE_PROMPT_VERSION";

// ── Overview Response ──
export interface UserStats {
  total: number;
  newCount: number;
}

export interface InterviewStats {
  total: number;
  newCount: number;
}

export interface AiGradingStats {
  total: number;
  newCount: number;
}

export interface RevenueStats {
  totalRevenue: number;
  percentageChange: number;
}

export interface TrendItem {
  date: string;
  time?: string;
  count: number;
}

export interface InterviewTrendsData {
  interactiveInterviewTrends: TrendItem[];
  stressInterviewTrends: TrendItem[];
}

export interface OverviewData {
  userStats: UserStats;
  interviewStats: InterviewStats;
  aiGradingStats: AiGradingStats;
  revenueStats: RevenueStats;
  interviewTrends: InterviewTrendsData;
  revenueTrends: TrendItem[];
}

export interface OverviewResponse {
  code: number;
  message?: string;
  data: OverviewData;
  timestamp: string;
}

// ── Positions Response ──
export interface PositionItem {
  position: string;
  totalInterviews: number;
}

export interface PositionsResponse {
  code: number;
  data: PositionItem[];
  timestamp: string;
}

// ── Activities Response ──
export interface ActivityItem {
  id: number;
  actionType: string;
  description: string;
  adminEmail: string | null;
  createdAt: string;
}

export interface SortInfo {
  empty: boolean;
  sorted: boolean;
  unsorted: boolean;
}

export interface PageableInfo {
  offset: number;
  pageNumber: number;
  pageSize: number;
  paged: boolean;
  sort: SortInfo;
  unpaged: boolean;
}

export interface PaginatedActivities {
  content: ActivityItem[];
  empty: boolean;
  first: boolean;
  last: boolean;
  number: number;
  numberOfElements: number;
  pageable: PageableInfo;
  size: number;
  sort: SortInfo;
  totalElements: number;
  totalPages: number;
}

export interface ActivitiesResponse {
  code: number;
  data: PaginatedActivities;
  timestamp: string;
}

// ── Request Params ──
export interface OverviewParams {
  timeFilter: TimeFilter;
}

export interface PositionsParams {
  timeFilter: TimeFilter;
  level: LevelFilter;
}

export interface ActivitiesParams {
  actionType: ActionTypeFilter;
  page: number;
}

// ── Helper: strip "--" values from params so the backend doesn't receive an unknown enum ──
const cleanParams = <T extends object>(params: T): Partial<T> => {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    if (value !== "--") {
      cleaned[key] = value;
    }
  }
  return cleaned as Partial<T>;
};

// ── Admin Dashboard Service ──
const adminDashboardService = {
  getOverview: (params: OverviewParams) =>
    apiClient.get<OverviewResponse>("/admin/dashboard/overview", {
      params: cleanParams(params),
    }),

  getPositions: (params: PositionsParams) =>
    apiClient.get<PositionsResponse>("/admin/dashboard/positions", {
      params: cleanParams(params),
    }),

  getActivities: (params: ActivitiesParams) =>
    apiClient.get<ActivitiesResponse>("/admin/dashboard/activities", {
      params: cleanParams(params),
    }),
};

export default adminDashboardService;

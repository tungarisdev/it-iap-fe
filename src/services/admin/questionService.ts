import apiClient from "../../utils/axios";
import type { ApiResponse } from "../common/apiResponse";
import type { PaginatedData } from "./userService";

// ── Enums ──
export const POSITION_OPTIONS = ["FRONTEND", "BACKEND", "TESTER", "DATA_ANALYST"] as const;
export type Position = (typeof POSITION_OPTIONS)[number];

export const LEVEL_OPTIONS = ["INTERN", "FRESHER"] as const;
export type Level = (typeof LEVEL_OPTIONS)[number];

export const CATEGORY_OPTIONS = ["TECHNICAL", "SITUATIONAL", "BEHAVIORAL"] as const;
export type Category = (typeof CATEGORY_OPTIONS)[number];

export const SOURCE_OPTIONS = ["ADMIN", "AI"] as const;
export type Source = (typeof SOURCE_OPTIONS)[number];

export const STATUS_OPTIONS = ["REJECTED", "PENDING", "APPROVED"] as const;
export type QuestionStatus = (typeof STATUS_OPTIONS)[number];

// ── Question Entity ──
export interface QuestionEntity {
  id: number;
  content: string;
  suggestedAnswer: string;
  hintContent: string;
  position: Position;
  level: Level;
  category: Category;
  skillTag: string[];
  timeLimitSeconds: number;
  source: Source;
  status: QuestionStatus;
  deleteAt: string | null;
}

// ── GET /questions Request Params ──
export interface GetQuestionsParams {
  content?: string;
  position?: string;
  level?: string;
  category?: string;
  source?: string;
  status?: string;
  isDeleted?: boolean;
  page?: number;
  size?: number;
}

// ── POST /questions Request ──
export interface CreateQuestionRequest {
  content: string;
  suggestedAnswer: string;
  hintContent: string;
  position: string;
  level: string;
  category: string;
  skillTag: string[];
  timeLimitSeconds: number;
  status: string;
  delete?: boolean;
}

// ── PUT /questions/{id} Request ──
export interface UpdateQuestionRequest {
  content: string;
  suggestedAnswer: string;
  hintContent: string;
  position: string;
  level: string;
  category: string;
  skillTag: string[];
  timeLimitSeconds: number;
  status: string;
  delete?: boolean;
}

// ── POST /api/v1/ai/generate-question Request ──
export interface AIGenerateQuestionRequest {
  quantity: number;
  level: string;
  position: string;
}

export interface AIGenerateQuestionErrorData {
  quantity?: string;
  level?: string;
  position?: string;
}

// ── Admin Question Service ──
const adminQuestionService = {
  getQuestions: (params: GetQuestionsParams) =>
    apiClient.get<ApiResponse<PaginatedData<QuestionEntity>>>("/questions", { params }),

  createQuestion: (payload: CreateQuestionRequest) =>
    apiClient.post<ApiResponse<QuestionEntity>>("/questions", payload),

  updateQuestion: (questionId: number, payload: UpdateQuestionRequest) =>
    apiClient.put<ApiResponse<QuestionEntity>>(`/questions/${questionId}`, payload),

  generateQuestionByAI: (payload: AIGenerateQuestionRequest) =>
    apiClient.post<ApiResponse<null>>("/ai/generate-question", payload),
};

export default adminQuestionService;

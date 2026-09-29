import apiClient from "../../utils/axios";
import type { ApiResponse } from "../common/apiResponse";

export type { ApiResponse };

// ── Validation Error Data (field → message) ──
export interface ValidationErrorData {
  [key: string]: string;
}

// ── Pageable / Sort (from Spring Boot) ──
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

export interface PaginatedData<T> {
  content: T[];
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

// ── Prompt List Item (from GET /admin-prompts) ──
export interface PromptListItem {
  id: number;
  promptKey: string;
  version: string;
  provider: string;
  model: string;
  applyFor: string;
  active: boolean;
}

// ── Prompt Version Detail (from GET /prompt-versions/detail) ──
export interface PromptVersionDetail {
  id: number;
  promptKey: string;
  description: string;
  version: string;
  provider: string;
  model: string;
  promptContent: string;
  note: string;
  applyFor: string;
  active: boolean;
}

// ── GET /admin-prompts Request Params ──
export interface GetPromptsParams {
  promptKey?: string;
  applyFor?: string;
  active?: boolean;
  pages?: number;
}

// ── POST /admin-prompts Request ──
export interface PromptVersionRequest {
  version: string;
  provider: string;
  model: string;
  promptContent: string;
  note: string;
  active: boolean;
}

export interface CreatePromptRequest {
  promptKey: string;
  description: string;
  applyFor: string;
  promptVersionRequest: PromptVersionRequest;
}

// ── PATCH /prompt-versions/active Request ──
export interface ActivateVersionRequest {
  promptKey: string;
  version: string;
}

// ── GET /prompt-versions/detail Request ──
export interface GetVersionDetailParams {
  promptKey: string;
  version: string;
}

// ── POST /admin-prompts/{id}/versions Request ──
export interface AddVersionRequest {
  adminPromptId: number;
  version: string;
  provider: string;
  model: string;
  promptContent: string;
  note: string;
  active: boolean;
}

// ── Enums ──
export const AI_MODELS = [
  "GEMINI_2_5_FLASH_LITE",
  "GEMINI_3_FLASH",
  "GEMINI_3_1_PRO",
  "GEMINI_3_1_FLASH",
  "GEMINI_3_1_FLASH_LITE",
  "GEMINI_3_5_FLASH",
  "GEMMA_4_26B_A4B_IT",
  "GEMMA_4_31B_IT",
] as const;

export const APPLY_FOR_OPTIONS = [
  "CUSTOMER_SUPPORT",
  "QUESTION_GENERATOR",
  "INTERACTIVE_INTERVIEW",
  "STRESS_INTERVIEW",
  "GENERAL_FEEDBACK",
] as const;

export const PROVIDERS = ["GOOGLE"] as const;

// ── Admin Prompt Service ──
const adminPromptService = {
  // GET /admin-prompts — List all prompts
  getPrompts: (params: GetPromptsParams) => {
    // Build clean params: omit `active` when undefined to get all results
    const cleanParams: Record<string, string | number | boolean> = {};
    if (params.promptKey) cleanParams.promptKey = params.promptKey;
    if (params.applyFor) cleanParams.applyFor = params.applyFor;
    if (params.active !== undefined) cleanParams.active = params.active;
    if (params.pages !== undefined) cleanParams.pages = params.pages;

    return apiClient.get<ApiResponse<PaginatedData<PromptListItem>>>(
      "/admin-prompts",
      { params: cleanParams }
    );
  },

  // POST /admin-prompts — Create a new prompt with first version
  createPrompt: (payload: CreatePromptRequest) =>
    apiClient.post<ApiResponse<PromptListItem>>("/admin-prompts", payload),

  // PATCH /prompt-versions/active — Activate a specific version
  activateVersion: (payload: ActivateVersionRequest) =>
    apiClient.patch<ApiResponse>("/prompt-versions/active", payload),

  // GET /prompt-versions/detail — Get version detail
  getVersionDetail: (params: GetVersionDetailParams) =>
    apiClient.get<ApiResponse<PromptVersionDetail>>(
      "/prompt-versions/detail",
      { params }
    ),

  // POST /admin-prompts/{id}/versions — Add a new version to existing prompt
  addVersion: (adminPromptId: number, payload: Omit<AddVersionRequest, "adminPromptId">) =>
    apiClient.post<ApiResponse<PromptVersionDetail>>(
      `/admin-prompts/versions`,
      { adminPromptId, ...payload }
    ),
};

export default adminPromptService;

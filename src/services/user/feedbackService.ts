import apiClient from "../../utils/axios";
import type { ApiResponse } from "../common/apiResponse";
import type { PaginatedResponse } from "./interviewService";

// ── Types ──

export interface FeedbackItem {
  id: number;
  content?: string;
  imageUrl?: string;
  rating: number;
  adminReply?: string;
  name: string;
  email?: string;
  createdAt: string;
}

export interface FeedbackListResponse {
  feedbacks: PaginatedResponse<FeedbackItem>;
  totalFeedbacks: number;
  averageRating: number;
}

export interface GetFeedbacksParams {
  page?: number;
  rating?: number;
  onlyMine?: boolean;
  hasAdminReply?: boolean;
  hasImageUrl?: boolean;
}

// ── Service ──

const userFeedbackService = {
  // Get feedbacks with optional filters
  getFeedbacks: (params: GetFeedbacksParams) =>
    apiClient.get<ApiResponse<FeedbackListResponse>>("/feedbacks", {
      params,
    }),

  // Create a new feedback (multipart/form-data)
  createFeedback: (formData: FormData) =>
    apiClient.post<ApiResponse<FeedbackItem>>("/feedbacks", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  // Delete own feedback
  deleteFeedback: (feedbackId: number) =>
    apiClient.delete<ApiResponse<null>>(`/feedbacks/${feedbackId}`),
};

export default userFeedbackService;

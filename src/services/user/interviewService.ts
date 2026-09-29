import apiClient from "../../utils/axios";
import type { ApiResponse, ApiErrorResponse } from "../common/apiResponse";

export type { ApiResponse, ApiErrorResponse };

// ── Types ──

export type InterviewMode = "INTERACTIVE_INTERVIEW" | "STRESS_INTERVIEW";
export type QuestionCategory = "BEHAVIORAL" | "SITUATIONAL" | "TECHNICAL";
export type MessageRole = "USER" | "ASSISTANT";

export interface CreateInterviewPayload {
  mode: InterviewMode;
  title: string;
  profileId: number;
}

export interface CreateInterviewResult {
  interviewId: number;
}

export interface InterviewQuestion {
  interviewQuestionId: number;
  questionContent: string;
  category: string;
  timeEnd: string | null;
  hasNext: boolean;
  interviewMode: InterviewMode;
  isComplete?: boolean; // Returned by current-question API to indicate if interview is already finished
}

export interface InteractiveAnswerResult {
  content: string;
  isComplete: boolean;
  point: number | null;
}

export interface ChatMessage {
  role: MessageRole;
  content: string;
}

export interface QuestionHint {
  hint: string;
}

export interface QuestionFeedback {
  point: number;
  feedback: string;
}

export interface FeedbackQuestion {
  feedback: QuestionFeedback;
  interviewQuestionId: number;
  orderIndex: number;
  questionContent: string;
  questionType: string;
  userAnswer: string;
}

export interface OverallResult {
  appliedExperience?: number;
  coreKnowledge?: number;
  feedback: string;
  focusAndCompleteness?: number;
  logicalArticulation?: number;
  problemSolving?: number;
  totalPoint: number;
}

export interface InterviewFeedbackData {
  interviewMode: InterviewMode;
  feedbackForQuestions: FeedbackQuestion[];
  overallResult: OverallResult;
  processing: boolean;
}

// ── Interview History ──

export type InterviewStatus = "COMPLETED" | "IN_PROGRESS" | "PENDING";

export interface InterviewHistoryItem {
  title: string;
  mode: InterviewMode;
  status: InterviewStatus;
  startAt: string;
  completedAt: string | null;
  profileId: number;
  profileTitle: string;
  interviewId: number;
  totalPoint?: number | null;
}

export interface InterviewHistoryParams {
  profileId?: number;
  mode?: string;
  status?: string;
  pages?: number;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  empty: boolean;
  numberOfElements: number;
}

// ── Service ──

const interviewService = {
  // Create a new interview session
  createInterview: (payload: CreateInterviewPayload) =>
    apiClient.post<ApiResponse<CreateInterviewResult>>("/interviews", payload),

  // Start an interview (returns first question)
  startInterview: (interviewId: number) =>
    apiClient.post<ApiResponse<InterviewQuestion>>(
      `/interviews/${interviewId}/start`
    ),

  // Get current question (for page reload recovery)
  getCurrentQuestion: (interviewId: number) =>
    apiClient.get<ApiResponse<InterviewQuestion>>(
      `/interviews/${interviewId}/current-question`
    ),

  // ── Interactive Mode ──

  // Answer a question in interactive mode
  answerInteractive: (interviewQuestionId: number, userAnswer: string) =>
    apiClient.post<ApiResponse<InteractiveAnswerResult>>(
      `/interviews/interactive/questions/${interviewQuestionId}/answers`,
      { userAnswer }
    ),

  // Move to next question in interactive mode
  nextInteractive: (interviewQuestionId: number) =>
    apiClient.post<ApiResponse<InterviewQuestion>>(
      `/interviews/interactive/questions/${interviewQuestionId}/next`
    ),

  // Get chat history for an interactive question
  getInteractiveMessages: (interviewQuestionId: number) =>
    apiClient.get<ApiResponse<ChatMessage[]>>(
      `/interviews/interactive/questions/${interviewQuestionId}/messages`
    ),

  // ── Stress Mode ──

  // Answer a question in stress mode (returns next question)
  answerStress: (interviewQuestionId: number, userAnswer: string) =>
    apiClient.post<ApiResponse<InterviewQuestion>>(
      `/interviews/stress/questions/${interviewQuestionId}/answers`,
      { userAnswer }
    ),

  // ── Common ──

  // Get hint for a question
  getQuestionHint: (interviewQuestionId: number) =>
    apiClient.get<ApiResponse<QuestionHint>>(
      `/interviews/interview-question/${interviewQuestionId}/hint`
    ),

  // Get interview feedback/results
  getInterviewFeedback: (interviewId: number) =>
    apiClient.get<ApiResponse<InterviewFeedbackData>>(
      `/interviews/${interviewId}/feedback`
    ),

  // Get interview history
  getInterviewHistory: (params: InterviewHistoryParams) =>
    apiClient.get<ApiResponse<PaginatedResponse<InterviewHistoryItem>>>(
      "/interviews/history",
      { params }
    ),
};

export default interviewService;

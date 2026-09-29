import apiClient from "../../utils/axios";
import type { ApiResponse } from "../common/apiResponse";

export type { ApiResponse };

// ── Types ──

export interface ChatSession {
  id: number;
  title: string;
}

export interface ChatBotResponse {
  aiResponse: string;
}

export interface SendMessagePayload {
  sessionId: number;
  userMessage: string;
}

export interface CreateSessionPayload {
  title: string;
}

export interface SessionMessage {
  role: "USER" | "ASSISTANT";
  content: string;
}

// ── Service ──

const chatBotService = {
  // Send a message to the chatbot
  sendMessage: (payload: SendMessagePayload) =>
    apiClient.post<ApiResponse<ChatBotResponse>>("/chatbot", payload),

  // Get all chat sessions
  getSessions: () =>
    apiClient.get<ApiResponse<ChatSession[]>>("/chat-sessions"),

  // Create a new chat session
  createSession: (payload: CreateSessionPayload) =>
    apiClient.post<ApiResponse<ChatSession>>("/chat-sessions", payload),

  // Delete a chat session
  deleteSession: (chatSessionId: number) =>
    apiClient.delete<ApiResponse<string>>(
      `/chat-sessions/${chatSessionId}`
    ),

  // Get messages for a specific chat session
  getMessages: (chatSessionId: number) =>
    apiClient.get<ApiResponse<SessionMessage[]>>(
      `/chat-sessions/${chatSessionId}/messages`
    ),
};

export default chatBotService;

import apiClient from "../../utils/axios";
import type { ApiResponse } from "../common/apiResponse";

export type { ApiResponse };

// ── User Entity ──
export interface UserEntity {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  avatarUrl: string;
  activeTier?: string;
  subscriptionEndDate?: string | null;
  createAt: string;
  deletedAt: string | null;
  active: boolean;
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

// ── GET /users Request Params ──
export interface GetUsersParams {
  email?: string;
  phoneNumber?: string;
  fullName?: string;
  pages?: number;
}

// ── POST /users Request ──
export interface CreateUserRequest {
  email: string;
  fullName: string;
  phoneNumber: string;
}

// ── PUT /users/{id} Request ──
export interface UpdateUserRequest {
  email: string;
  fullName: string;
  phoneNumber: string;
  avatarUrl: string;
  active: boolean;
}

// ── Validation Error Data (field → message) ──
export interface ValidationErrorData {
  email?: string;
  fullName?: string;
  phoneNumber?: string;
  avatarUrl?: string;
}

// ── Admin User Service ──
const adminUserService = {
  getUsers: (params: GetUsersParams) =>
    apiClient.get<ApiResponse<PaginatedData<UserEntity>>>("/users", { params }),

  createUser: (payload: CreateUserRequest) =>
    apiClient.post<ApiResponse<UserEntity>>("/users", payload),

  updateUser: (userId: string, payload: UpdateUserRequest) =>
    apiClient.put<ApiResponse<UserEntity>>(`/users/${userId}`, payload),
};

export default adminUserService;

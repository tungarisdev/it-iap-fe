import apiClient from "../../utils/axios";
import type { ApiResponse } from "../common/apiResponse";

export type { ApiResponse };

export interface AdminBannerItem {
  id: number;
  title: string;
  content: string;
  imageUrl?: string;
  isActive: boolean;
  marquee?: string;
}

export interface AdminBannerPageData {
  content: AdminBannerItem[];
  empty: boolean;
  first: boolean;
  last: boolean;
  number: number;
  numberOfElements: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

const adminBannerService = {
  getBanners: (page: number = 1) =>
    apiClient.get<ApiResponse<AdminBannerPageData>>(`/banners`, {
      params: { page },
    }),

  createBanner: (formData: FormData) =>
    apiClient.post<ApiResponse<AdminBannerItem>>("/banners", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  updateBanner: (bannerId: number, formData: FormData) =>
    apiClient.put<ApiResponse<AdminBannerItem>>(`/banners/${bannerId}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  toggleBannerStatus: (bannerId: number, isActive: boolean) =>
    apiClient.patch<ApiResponse<string>>(`/banners/${bannerId}/status`, null, {
      params: { isActive },
    }),
};

export default adminBannerService;

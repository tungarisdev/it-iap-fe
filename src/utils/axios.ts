import axios, { type AxiosResponse } from "axios";

const apiClient = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Send cookies with every request
});

// ── Singleton Refresh Promise ──
// Guarantees only ONE /auth/refresh HTTP request is active at any given moment.
// All concurrent 401 requests share this single Promise and retry upon completion.
let refreshPromise: Promise<AxiosResponse<unknown>> | null = null;

export const refreshAuthToken = <T = unknown>(): Promise<AxiosResponse<T>> => {
  if (!refreshPromise) {
    refreshPromise = apiClient
      .post<T>("/auth/refresh")
      .finally(() => {
        refreshPromise = null;
      }) as Promise<AxiosResponse<unknown>>;
  }
  return refreshPromise as Promise<AxiosResponse<T>>;
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Do not intercept if:
    // 1. Not a 401 Unauthorized status
    // 2. Request was already retried once
    // 3. The failing endpoint itself is an auth endpoint (/auth/refresh, /auth/login, etc.)
    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.includes("/auth/refresh") ||
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/register")
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      // Wait for the single in-flight refresh request
      await refreshAuthToken();
      // Retry the original request with refreshed cookies
      return apiClient(originalRequest);
    } catch (refreshError) {
      // Refresh failed → session is truly expired
      window.dispatchEvent(new CustomEvent("auth:session-expired"));
      return Promise.reject(refreshError);
    }
  }
);

export default apiClient;

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import {
  Loader2,
  AlertCircle,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Flag,
  Star,
} from "lucide-react";
import userReportService from "../../../services/user/reportService";
import type { ReportItem } from "../../../services/user/reportService";
import type { ApiErrorResponse } from "../../../services/user/interviewService";
import type { AxiosError } from "axios";
import Pagination from "../../../components/Pagination";
import UserFeedbacksSection from "./UserFeedbacksSection";

type StatusFilter = "" | "PENDING" | "APPROVED" | "REJECTED";
type TypeFilter = "" | string;

const STATUS_OPTIONS: StatusFilter[] = ["", "PENDING", "APPROVED", "REJECTED"];
const TYPE_OPTIONS = [
  "",
  "INACCURATE_CONTENT",
  "OUTDATED",
  "DUPLICATE",
  "POOR_FORMATTING",
  "SPAM_OR_IRRELEVANT",
  "INAPPROPRIATE",
  "OTHER",
];

function getStatusConfig(status: string) {
  switch (status) {
    case "APPROVED":
      return {
        bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: CheckCircle2,
      };
    case "REJECTED":
      return {
        bg: "bg-rose-50 text-rose-700 border-rose-200",
        icon: XCircle,
      };
    case "PENDING":
    default:
      return {
        bg: "bg-amber-50 text-amber-700 border-amber-200",
        icon: Clock,
      };
  }
}

function getTypeBadge(type: string) {
  switch (type) {
    case "INACCURATE_CONTENT":
      return "bg-rose-50 text-rose-700";
    case "OUTDATED":
      return "bg-amber-50 text-amber-700";
    case "DUPLICATE":
      return "bg-indigo-50 text-indigo-700";
    case "POOR_FORMATTING":
      return "bg-zinc-100 text-zinc-600";
    case "SPAM_OR_IRRELEVANT":
      return "bg-orange-50 text-orange-700";
    case "INAPPROPRIATE":
      return "bg-red-50 text-red-700";
    default:
      return "bg-zinc-100 text-zinc-600";
  }
}

// ── Reports Section (extracted from original page) ──
const ReportsSection = () => {
  const { t } = useTranslation("Report");

  const [items, setItems] = useState<ReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("");

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const params: Record<string, string | number> = { pages: currentPage };
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.reportType = typeFilter;

      const res = await userReportService.getMyReports(params);
      const data = res.data.data;
      if (!data) throw new Error("Report response data is missing");
      setItems(data.content);
      setTotalPages(data.totalPages);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorResponse>;
      setError(axiosErr.response?.data?.message || "Đã xảy ra lỗi");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, statusFilter, typeFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, typeFilter]);

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none transition focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400"
        >
          <option value="">
            {t("filterByStatus")}: {t("filterAll")}
          </option>
          {STATUS_OPTIONS.filter(Boolean).map((s) => (
            <option key={s} value={s}>
              {t(`status.${s}`)}
            </option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none transition focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400"
        >
          <option value="">
            {t("filterByType")}: {t("filterAll")}
          </option>
          {TYPE_OPTIONS.filter(Boolean).map((tp) => (
            <option key={tp} value={tp}>
              {t(`reportType.${tp}`)}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="h-10 w-10 text-blue-500" />
          </motion.div>
        </div>
      ) : error ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mx-auto max-w-md rounded-xl border border-rose-200 bg-rose-50 p-6 text-center"
        >
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-rose-500" />
          <p className="text-sm text-rose-700">{error}</p>
        </motion.div>
      ) : items.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100">
            <FileText className="h-8 w-8 text-zinc-400" />
          </div>
          <h3 className="text-base font-semibold text-zinc-900">
            {t("emptyTitle")}
          </h3>
          <p className="mt-1 max-w-sm text-center text-sm text-zinc-500">
            {t("emptyDescription")}
          </p>
        </motion.div>
      ) : (
        <>
          <div className="space-y-3">
            {items.map((item, index) => {
              const statusCfg = getStatusConfig(item.status);
              const StatusIcon = statusCfg.icon;

              return (
                <motion.div
                  key={item.reportId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5"
                >
                  {/* Top row */}
                  <div className="flex flex-wrap items-start gap-2 mb-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getTypeBadge(item.reportType)}`}
                    >
                      {t(`reportType.${item.reportType}`)}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${statusCfg.bg}`}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {t(`status.${item.status}`)}
                    </span>
                    <span className="ml-auto text-xs text-zinc-400">
                      {item.createdAt}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-zinc-700 mb-2">{item.description}</p>

                  {/* Interview ref */}
                  <p className="text-xs text-zinc-400 mb-3">
                    {t("interviewId", { id: item.interviewId })} · Q#{item.interviewQuestionId}
                  </p>

                  {/* Admin reply */}
                  {item.adminReply && (
                    <div className="rounded-lg border border-cyan-100 bg-cyan-50/50 p-3">
                      <div className="mb-1 flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-cyan-500" />
                        <span className="text-xs font-semibold text-cyan-600">
                          {t("adminReply")}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-700">{item.adminReply}</p>
                    </div>
                  )}

                  {!item.adminReply && item.status === "PENDING" && (
                    <p className="text-xs italic text-zinc-400">{t("noReply")}</p>
                  )}
                </motion.div>
              );
            })}
          </div>

          <div className="mt-6">
            <Pagination
              currentPage={currentPage - 1}
              totalPages={totalPages}
              onPageChange={(zeroBasedPage) => setCurrentPage(zeroBasedPage + 1)}
            />
          </div>
        </>
      )}
    </div>
  );
};

// ── Helper Hook for Responsive Viewport ──
const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    setIsDesktop(mediaQuery.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return isDesktop;
};

// ── Main Page (Split Screen) ──
const UserReportsPage = () => {
  const { t: tFeedback } = useTranslation("Feedback");
  const { t: tReport } = useTranslation("Report");
  const isDesktop = useIsDesktop();

  // Tab state for mobile
  const [activeTab, setActiveTab] = useState<"reports" | "feedbacks">("reports");

  return (
    <div className="w-full">
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            {tReport("title")} & {tFeedback("title")}
          </h1>
          <p className="mt-2 text-base text-zinc-600">
            {tReport("subtitle")} · {tFeedback("subtitle")}
          </p>
        </motion.div>

        {isDesktop ? (
          /* Desktop Split View (≥ lg) */
          <div className="grid grid-cols-2 gap-6">
            {/* Left: Reports */}
            <div>
              <div className="mb-4 flex items-center gap-2">
                <Flag className="h-4 w-4 text-red-500" />
                <h2 className="text-lg font-semibold text-zinc-900">
                  {tFeedback("tabReports")}
                </h2>
              </div>
              <ReportsSection />
            </div>

            {/* Right: Feedbacks */}
            <div>
              <div className="mb-4 flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                <h2 className="text-lg font-semibold text-zinc-900">
                  {tFeedback("tabFeedbacks")}
                </h2>
              </div>
              <UserFeedbacksSection />
            </div>
          </div>
        ) : (
          /* Mobile Tab View (< lg) */
          <div>
            {/* Mobile Tab Switcher */}
            <div className="mb-6">
              <div className="flex rounded-xl border border-zinc-200 bg-white p-1">
                <button
                  onClick={() => setActiveTab("reports")}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    activeTab === "reports"
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  <Flag className="h-4 w-4" />
                  {tFeedback("tabReports")}
                </button>
                <button
                  onClick={() => setActiveTab("feedbacks")}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    activeTab === "feedbacks"
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  <Star className="h-4 w-4" />
                  {tFeedback("tabFeedbacks")}
                </button>
              </div>
            </div>

            {/* Mobile Tab Content */}
            <div>
              {activeTab === "reports" ? (
                <ReportsSection />
              ) : (
                <UserFeedbacksSection />
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default UserReportsPage;

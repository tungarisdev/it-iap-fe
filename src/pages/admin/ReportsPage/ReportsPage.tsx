import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import {
  Loader2,
  AlertCircle,
  Search,
  Eye,
  X,
  RefreshCw,
  RotateCcw,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
} from "lucide-react";
import adminReportService from "../../../services/admin/reportService";
import type { ReportItem, ReportStatus } from "../../../services/user/reportService";
import type { ApiErrorResponse } from "../../../services/user/interviewService";
import type { AxiosError } from "axios";
import Pagination from "../../../components/Pagination";

type StatusFilter = "" | "PENDING" | "APPROVED" | "REJECTED";
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

const AdminReportsPage = () => {
  const { t } = useTranslation("AdminReports");

  const [items, setItems] = useState<ReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [typeFilter, setTypeFilter] = useState("");
  const [emailSearch, setEmailSearch] = useState("");
  const [debouncedEmail, setDebouncedEmail] = useState("");

  // Detail modal
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [editStatus, setEditStatus] = useState<ReportStatus>("PENDING");
  const [editReply, setEditReply] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Debounce email search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedEmail(emailSearch);
    }, 500);
    return () => clearTimeout(timer);
  }, [emailSearch]);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const params: Record<string, string | number> = { pages: currentPage };
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.reportType = typeFilter;
      if (debouncedEmail) params.email = debouncedEmail;

      const res = await adminReportService.getReports(params);
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
  }, [currentPage, statusFilter, typeFilter, debouncedEmail]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, typeFilter, debouncedEmail]);

  const openDetail = (report: ReportItem) => {
    setSelectedReport(report);
    setEditStatus(report.status);
    setEditReply(report.adminReply || "");
    setSaveError("");
    setSaveSuccess(false);
  };

  const closeDetail = () => {
    setSelectedReport(null);
    setSaveError("");
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!selectedReport) return;

    setIsSaving(true);
    setSaveError("");

    try {
      const res = await adminReportService.updateReport(selectedReport.reportId, {
        status: editStatus,
        adminReply: editReply,
      });

      // Update local state
      const updated = res.data.data;
      if (!updated) throw new Error("Report response data is missing");
      setItems((prev) =>
        prev.map((item) =>
          item.reportId === updated.reportId ? updated : item
        )
      );
      setSelectedReport(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorResponse>;
      const fieldErrors = axiosErr.response?.data?.data;
      if (fieldErrors) {
        setSaveError(Object.values(fieldErrors).join(". "));
      } else {
        setSaveError(axiosErr.response?.data?.message || "Đã xảy ra lỗi");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetFilters = () => {
    setStatusFilter("");
    setTypeFilter("");
    setEmailSearch("");
    setDebouncedEmail("");
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(statusFilter || typeFilter || emailSearch);

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {/* <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50">
              <Flag className="h-4.5 w-4.5 text-amber-600" />
            </div> */}
            <div>
              <h1 className="text-xl font-semibold text-zinc-900">{t("title")}</h1>
              <p className="text-sm text-zinc-500">{t("subtitle")}</p>
            </div>
          </div>
          <button
            onClick={fetchReports}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 active:scale-[0.98] disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              strokeWidth={2}
            />
            <span>{t("reload")}</span>
          </button>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap"
      >
        {/* Email search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={emailSearch}
            onChange={(e) => setEmailSearch(e.target.value)}
            placeholder={t("searchByEmail")}
            className="w-full sm:w-64 rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-zinc-700 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400"
          />
        </div>

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

        {hasActiveFilters && (
          <button
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 active:scale-[0.98]"
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
            <span>{t("resetFilters")}</span>
          </button>
        )}
      </motion.div>

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
          <p className="mt-1 text-sm text-zinc-500">{t("emptyDescription")}</p>
        </motion.div>
      ) : (
        <>
          {/* Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="rounded-xl border border-zinc-200 bg-white overflow-hidden"
          >
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 text-left">
                    <th className="px-4 py-3 font-medium text-zinc-500">{t("table.email")}</th>
                    <th className="px-4 py-3 font-medium text-zinc-500">{t("table.type")}</th>
                    <th className="px-4 py-3 font-medium text-zinc-500">{t("table.description")}</th>
                    <th className="px-4 py-3 font-medium text-zinc-500">{t("table.status")}</th>
                    <th className="px-4 py-3 font-medium text-zinc-500">{t("table.createdAt")}</th>
                    <th className="px-4 py-3 font-medium text-zinc-500">{t("table.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {items.map((item) => {
                    const statusCfg = getStatusConfig(item.status);
                    const StatusIcon = statusCfg.icon;
                    return (
                      <tr key={item.reportId} className="transition hover:bg-zinc-50">
                        <td className="px-4 py-3 text-zinc-700 max-w-[160px] truncate">
                          {item.userEmail}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-zinc-600">
                            {t(`reportType.${item.reportType}`)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-600 max-w-[200px] truncate">
                          {item.description}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${statusCfg.bg}`}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {t(`status.${item.status}`)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">
                          {item.createdAt}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => openDetail(item)}
                            className="inline-flex items-center gap-1 rounded-full border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-900 hover:text-white hover:border-zinc-900"
                          >
                            <Eye className="h-3 w-3" />
                            {t("viewDetail")}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-zinc-100">
              {items.map((item) => {
                const statusCfg = getStatusConfig(item.status);
                const StatusIcon = statusCfg.icon;
                return (
                  <div key={item.reportId} className="p-4 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-zinc-700 truncate max-w-[180px]">
                        {item.userEmail}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${statusCfg.bg}`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {t(`status.${item.status}`)}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-600 line-clamp-2">
                      {item.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400">{item.createdAt}</span>
                      <button
                        type="button"
                        onClick={() => openDetail(item)}
                        className="inline-flex items-center gap-1 rounded-full border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-900 hover:text-white hover:border-zinc-900"
                      >
                        <Eye className="h-3 w-3" />
                        {t("viewDetail")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          <div className="mt-6">
            <Pagination
              currentPage={currentPage - 1}
              totalPages={totalPages}
              onPageChange={(zeroBasedPage) =>
                setCurrentPage(zeroBasedPage + 1)
              }
            />
          </div>
        </>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
            onClick={closeDetail}
          >
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ duration: 0.25 }}
              className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-xl border border-zinc-200 bg-white shadow-xl max-h-[85dvh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 flex items-center justify-between border-b border-zinc-100 bg-white px-5 py-4 rounded-t-2xl sm:rounded-t-xl">
                <h3 className="text-base font-semibold text-zinc-900">
                  {t("detailModal.title")}
                </h3>
                <button
                  type="button"
                  onClick={closeDetail}
                  className="rounded-full p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Meta info */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-zinc-400">{t("detailModal.reporterEmail")}</span>
                    <p className="text-zinc-700 font-medium truncate">{selectedReport.userEmail}</p>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-400">{t("detailModal.reportType")}</span>
                    <p className="text-zinc-700">{t(`reportType.${selectedReport.reportType}`)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-400">{t("detailModal.interviewId", { id: selectedReport.interviewId })}</span>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-400">{t("detailModal.questionId", { id: selectedReport.interviewQuestionId })}</span>
                  </div>
                </div>

                {/* View Context Button */}
                <div className="flex">
                  <a
                    href={`/history/${selectedReport.interviewId}/result?highlightQuestionId=${selectedReport.interviewQuestionId}&viewMode=admin`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    {t("detailModal.viewInterviewContext", { defaultValue: "Xem chi tiết ngữ cảnh" })}
                  </a>
                </div>

                {/* Description */}
                <div>
                  <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    {t("detailModal.description")}
                  </span>
                  <div className="mt-1.5 rounded-lg bg-zinc-50 p-3">
                    <p className="text-sm text-zinc-700 whitespace-pre-wrap">
                      {selectedReport.description}
                    </p>
                  </div>
                </div>

                {/* Change Status */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    {t("detailModal.changeStatus")}
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as ReportStatus)}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400"
                  >
                    <option value="PENDING">{t("status.PENDING")}</option>
                    <option value="APPROVED">{t("status.APPROVED")}</option>
                    <option value="REJECTED">{t("status.REJECTED")}</option>
                  </select>
                </div>

                {/* Admin Reply */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    {t("detailModal.adminReply")}
                  </label>
                  <textarea
                    value={editReply}
                    onChange={(e) => setEditReply(e.target.value)}
                    placeholder={t("detailModal.adminReplyPlaceholder")}
                    rows={3}
                    className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400"
                  />
                </div>

                {/* Error / Success */}
                {saveError && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm text-rose-600"
                  >
                    {saveError}
                  </motion.p>
                )}
                {saveSuccess && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="inline-flex items-center gap-1 text-sm text-emerald-600"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {t("detailModal.success")}
                  </motion.p>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={closeDetail}
                    className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                  >
                    {t("detailModal.close")}
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60"
                  >
                    {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isSaving ? t("detailModal.saving") : t("detailModal.save")}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminReportsPage;

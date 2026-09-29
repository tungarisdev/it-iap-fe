import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import {
  Loader2,
  AlertCircle,
  Star,
  MessageSquare,
  Trash2,
  Reply,
  X,
  RefreshCw,
  RotateCcw,
  Image as ImageIcon,
  Search,
} from "lucide-react";
import adminFeedbackService from "../../../services/admin/feedbackService";
import type { FeedbackItem } from "../../../services/user/feedbackService";
import type { ApiErrorResponse } from "../../../services/user/interviewService";
import type { AxiosError } from "axios";
import Pagination from "../../../components/Pagination";

// ── Star Rating Display ──
const StarRatingDisplay = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        className={`h-3.5 w-3.5 ${
          star <= rating
            ? "fill-amber-400 text-amber-400"
            : "text-zinc-200"
        }`}
      />
    ))}
  </div>
);

type ReplyStatusFilter = "" | "replied" | "noReply";

// ── Reply Modal ──
const ReplyModal = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  feedback,
  onPreviewImage,
  t,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void;
  isSubmitting: boolean;
  feedback: FeedbackItem | null;
  onPreviewImage?: (url: string) => void;
  t: (key: string) => string;
}) => {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setValue(feedback?.adminReply || "");
    setError("");
  }, [feedback, isOpen]);

  if (!isOpen || !feedback) return null;

  const handleSubmit = () => {
    if (!value.trim()) {
      setError(t("replyEmpty"));
      return;
    }
    onSubmit(value.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-xs"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <MessageSquare className="h-4 w-4" />
            </div>
            <h3 className="text-base font-semibold text-zinc-900">
              {feedback.adminReply ? t("editReply") : t("replyModalTitle")}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="overflow-y-auto px-6 py-5 space-y-5">
          {/* User Feedback Detail Box */}
          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200/60 pb-3 mb-3">
              <div>
                <p className="text-sm font-semibold text-zinc-900">
                  {feedback.name}
                </p>
                {feedback.email && (
                  <p className="text-xs text-zinc-500">{feedback.email}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <StarRatingDisplay rating={feedback.rating} />
                <span className="text-[11px] text-zinc-400">
                  {feedback.createdAt}
                </span>
              </div>
            </div>

            {/* Content full view */}
            <div className="mb-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                {t("userFeedbackDetails")}
              </p>
              <div className="text-sm text-zinc-800 leading-relaxed whitespace-pre-wrap bg-white p-3.5 rounded-lg border border-zinc-200/70 max-h-48 overflow-y-auto">
                {feedback.content ? (
                  feedback.content
                ) : (
                  <span className="italic text-zinc-400">
                    {t("noContent")}
                  </span>
                )}
              </div>
            </div>

            {/* Image attachment in modal if exists */}
            {feedback.imageUrl && (
              <div className="mt-3 pt-2.5 border-t border-zinc-200/60 flex items-center gap-3">
                <span className="text-xs text-zinc-500 font-medium">
                  {t("tableImage")}:
                </span>
                <button
                  type="button"
                  onClick={() => onPreviewImage?.(feedback.imageUrl!)}
                  className="group inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white p-1 pr-2.5 text-xs text-zinc-600 transition hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer"
                >
                  <img
                    src={feedback.imageUrl}
                    alt="Attachment thumbnail"
                    className="h-8 w-8 rounded object-cover"
                  />
                  <span className="text-[11px] font-medium text-blue-600 group-hover:underline">
                    {t("viewImage")}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Admin Reply Input Area */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
              {t("replySectionTitle")}
            </label>

            {/* Quick templates */}
            <div className="mb-3">
              <label className="mb-1.5 block text-xs text-zinc-500 font-medium">
                {t("quickTemplatesTitle")}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { tagKey: "template1Tag", textKey: "template1" },
                  { tagKey: "template2Tag", textKey: "template2" },
                  { tagKey: "template3Tag", textKey: "template3" },
                ].map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setValue(t(tmpl.textKey));
                      if (error) setError("");
                    }}
                    className="rounded-full border border-blue-100 bg-blue-50/70 px-2.5 py-1 text-xs font-medium text-blue-700 transition hover:bg-blue-100 hover:text-blue-800 active:scale-95 cursor-pointer"
                  >
                    + {t(tmpl.tagKey)}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError("");
              }}
              placeholder={t("replyPlaceholder")}
              rows={4}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 p-3.5 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-900/5 resize-none"
              autoFocus
            />
            {error && (
              <p className="mt-1.5 text-xs text-rose-600 font-medium">{error}</p>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-zinc-100 px-6 py-4 bg-zinc-50/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {t("deleteCancel")}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Reply className="h-4 w-4" />
            )}
            {isSubmitting ? t("replySubmitting") : t("replySubmit")}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ── Confirm Modal ──
const ConfirmModal = ({
  isOpen,
  title,
  message,
  onClose,
  onConfirm,
  isLoading,
  t,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  t: (key: string) => string;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 mx-4 w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-lg"
      >
        <h3 className="text-lg font-semibold text-zinc-900">{title}</h3>
        <p className="mt-2 text-sm text-zinc-600">{message}</p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50"
          >
            {t("deleteCancel")}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
            ) : (
              t("deleteConfirm")
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ── Image Preview Modal ──
const ImagePreviewModal = ({
  imageUrl,
  onClose,
}: {
  imageUrl: string | null;
  onClose: () => void;
}) => {
  if (!imageUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 mx-4 max-h-[85vh] max-w-3xl overflow-hidden rounded-xl"
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full bg-black/50 p-1.5 text-white transition hover:bg-black/70"
        >
          <X className="h-5 w-5" />
        </button>
        <img
          src={imageUrl}
          alt="Feedback attachment"
          className="max-h-[85vh] w-auto object-contain"
        />
      </motion.div>
    </div>
  );
};

// ── Main Page ──
const FeedbacksPage = () => {
  const { t } = useTranslation("AdminFeedbacks");

  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalFeedbacks, setTotalFeedbacks] = useState<number | null>(null);
  const [averageRating, setAverageRating] = useState<number | null>(null);

  // Filters
  const [ratingFilter, setRatingFilter] = useState<number | undefined>(undefined);
  const [replyStatusFilter, setReplyStatusFilter] = useState<ReplyStatusFilter>("");
  const [hasImageFilter, setHasImageFilter] = useState<boolean | undefined>(undefined);

  // Reply modal
  const [replyTarget, setReplyTarget] = useState<FeedbackItem | null>(null);
  const [isReplying, setIsReplying] = useState(false);

  // Delete feedback modal
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Delete reply modal
  const [deleteReplyTarget, setDeleteReplyTarget] = useState<FeedbackItem | null>(null);
  const [isDeletingReply, setIsDeletingReply] = useState(false);

  // Image preview
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Toast messages
  const [toast, setToast] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchFeedbacks = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const params: Record<string, unknown> = { page: currentPage };
      if (ratingFilter !== undefined) params.rating = ratingFilter;
      if (replyStatusFilter === "replied") params.hasAdminReply = true;
      if (replyStatusFilter === "noReply") params.hasAdminReply = false;
      if (hasImageFilter !== undefined) params.hasImageUrl = hasImageFilter;

      const res = await adminFeedbackService.getFeedbacks(params as never);
      const data = res.data.data;
      if (!data) throw new Error("Feedback response data is missing");
      const pageData = data.feedbacks;

      setItems(pageData?.content || []);
      setTotalPages(pageData?.totalPages || 0);
      setTotalFeedbacks(data.totalFeedbacks ?? null);
      setAverageRating(data.averageRating ?? null);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorResponse>;
      setError(axiosErr.response?.data?.message || "Đã xảy ra lỗi");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, ratingFilter, replyStatusFilter, hasImageFilter]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  useEffect(() => {
    setCurrentPage(1);
  }, [ratingFilter, replyStatusFilter, hasImageFilter]);

  // Handle reply submit
  const handleReplySubmit = async (replyContent: string) => {
    if (!replyTarget) return;
    setIsReplying(true);
    try {
      const res = await adminFeedbackService.replyFeedback(replyTarget.id, {
        adminReply: replyContent,
      });
      const updatedFeedback = res.data.data;
      if (!updatedFeedback) throw new Error("Feedback response data is missing");
      // Update item in list
      setItems((prev) =>
        prev.map((item) =>
          item.id === replyTarget.id
            ? { ...item, adminReply: updatedFeedback.adminReply }
            : item
        )
      );
      setReplyTarget(null);
      setToast({ type: "success", text: t("replySuccess") });
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorResponse>;
      setToast({
        type: "error",
        text: axiosErr.response?.data?.message || t("replyError"),
      });
    } finally {
      setIsReplying(false);
    }
  };

  // Handle delete reply (send empty {})
  const handleDeleteReply = async () => {
    if (!deleteReplyTarget) return;
    setIsDeletingReply(true);
    try {
      await adminFeedbackService.replyFeedback(deleteReplyTarget.id, {});
      setItems((prev) =>
        prev.map((item) =>
          item.id === deleteReplyTarget.id
            ? { ...item, adminReply: undefined }
            : item
        )
      );
      setDeleteReplyTarget(null);
      setToast({ type: "success", text: t("deleteReplySuccess") });
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorResponse>;
      setToast({
        type: "error",
        text: axiosErr.response?.data?.message || t("deleteReplyError"),
      });
    } finally {
      setIsDeletingReply(false);
    }
  };

  // Handle delete feedback
  const handleDeleteFeedback = async () => {
    if (deleteTarget === null) return;
    setIsDeleting(true);
    try {
      await adminFeedbackService.deleteFeedback(deleteTarget);
      setItems((prev) => prev.filter((item) => item.id !== deleteTarget));
      setDeleteTarget(null);
      setToast({ type: "success", text: t("deleteSuccess") });
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorResponse>;
      setToast({
        type: "error",
        text: axiosErr.response?.data?.message || t("deleteError"),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetFilters = () => {
    setRatingFilter(undefined);
    setReplyStatusFilter("");
    setHasImageFilter(undefined);
    setCurrentPage(1);
  };

  const hasActiveFilters =
    ratingFilter !== undefined ||
    replyStatusFilter !== "" ||
    hasImageFilter !== undefined;

  return (
    <div className="w-full">
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
              {t("title")}
            </h1>
            <p className="mt-2 text-base text-zinc-600">{t("subtitle")}</p>
          </div>
          <button
            onClick={fetchFeedbacks}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 active:scale-[0.98] disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              strokeWidth={2}
            />
            <span>{t("reload")}</span>
          </button>
        </motion.div>

        {/* Stats Overview */}
        {(totalFeedbacks !== null || averageRating !== null) && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-xs font-medium text-zinc-500">{t("statsTotal") || "Tổng số đánh giá"}</p>
              <p className="mt-1 text-2xl font-bold text-zinc-900">{totalFeedbacks ?? 0}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-xs font-medium text-zinc-500">{t("statsAvgRating") || "Điểm trung bình"}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-2xl font-bold text-zinc-900">{averageRating?.toFixed(1) ?? "0.0"}</span>
                <StarRatingDisplay rating={Math.round(averageRating ?? 0)} />
              </div>
            </div>
          </motion.div>
        )}

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-6 flex flex-wrap items-center gap-3"
        >
          {/* Rating */}
          <select
            value={ratingFilter ?? ""}
            onChange={(e) =>
              setRatingFilter(
                e.target.value ? Number(e.target.value) : undefined
              )
            }
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none transition focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400"
          >
            <option value="">
              {t("filterRating")}: {t("filterAll")}
            </option>
            {[5, 4, 3, 2, 1].map((s) => (
              <option key={s} value={s}>
                {s} {t("stars")}
              </option>
            ))}
          </select>

          {/* Reply status */}
          <select
            value={replyStatusFilter}
            onChange={(e) =>
              setReplyStatusFilter(e.target.value as ReplyStatusFilter)
            }
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none transition focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400"
          >
            <option value="">
              {t("filterReplyStatus")}: {t("filterAll")}
            </option>
            <option value="replied">{t("filterHasReply")}</option>
            <option value="noReply">{t("filterNoReply")}</option>
          </select>

          {/* Has image */}
          <button
            onClick={() =>
              setHasImageFilter(
                hasImageFilter === undefined
                  ? true
                  : hasImageFilter
                    ? false
                    : undefined
              )
            }
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition ${
              hasImageFilter !== undefined
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            {t("filterHasImage")}
            {hasImageFilter !== undefined && (
              <span className="text-xs">({hasImageFilter ? "✓" : "✗"})</span>
            )}
          </button>

          {/* Reset filters */}
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 active:scale-[0.98]"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
              <span>{t("resetFilters")}</span>
            </button>
          )}
        </motion.div>

        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mb-4 rounded-xl border p-3 text-sm ${
                toast.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {toast.text}
            </motion.div>
          )}
        </AnimatePresence>

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
              <Search className="h-8 w-8 text-zinc-400" />
            </div>
            <h3 className="text-base font-semibold text-zinc-900">
              {t("noFeedbacks")}
            </h3>
            <p className="mt-1 max-w-sm text-center text-sm text-zinc-500">
              {t("noFeedbacksDesc")}
            </p>
          </motion.div>
        ) : (
          <>
            {/* Table-like card list */}
            <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white overflow-hidden">
              {/* Table Header */}
              <div className="hidden md:grid md:grid-cols-12 gap-3 px-5 py-3 bg-zinc-50 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                <div className="col-span-2">{t("tableUser")}</div>
                <div className="col-span-1">{t("tableRating")}</div>
                <div className="col-span-3">{t("tableContent")}</div>
                <div className="col-span-1">{t("tableImage")}</div>
                <div className="col-span-2">{t("tableReply")}</div>
                <div className="col-span-1">{t("tableDate")}</div>
                <div className="col-span-2 text-right">{t("tableActions")}</div>
              </div>

              {/* Table Rows */}
              {items.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  className="px-5 py-4"
                >
                  {/* Desktop row */}
                  <div className="hidden md:grid md:grid-cols-12 gap-3 items-center">
                    {/* User */}
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-zinc-900 truncate">
                        {item.name}
                      </p>
                      {item.email && (
                        <p className="text-[11px] text-zinc-400 truncate">
                          {item.email}
                        </p>
                      )}
                    </div>

                    {/* Rating */}
                    <div className="col-span-1">
                      <StarRatingDisplay rating={item.rating} />
                    </div>

                    {/* Content */}
                    <div className="col-span-3">
                      <div
                        onClick={() => setReplyTarget(item)}
                        className="cursor-pointer group/content"
                        title={t("viewDetailTooltip")}
                      >
                        <p className="text-sm text-zinc-700 line-clamp-2 group-hover/content:text-blue-600 transition-colors">
                          {item.content || (
                            <span className="italic text-zinc-400">
                              {t("noContent")}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Image */}
                    <div className="col-span-1">
                      {item.imageUrl ? (
                        <button
                          onClick={() => setPreviewImage(item.imageUrl!)}
                          className="rounded-lg border border-zinc-200 overflow-hidden transition hover:border-zinc-300"
                        >
                          <img
                            src={item.imageUrl}
                            alt="Attachment"
                            className="h-10 w-10 object-cover"
                            loading="lazy"
                          />
                        </button>
                      ) : (
                        <span className="text-xs text-zinc-300">—</span>
                      )}
                    </div>

                    {/* Reply status */}
                    <div className="col-span-2">
                      {item.adminReply ? (
                        <div>
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                            <MessageSquare className="h-3 w-3" />
                            {t("replied")}
                          </span>
                          <p className="mt-1 text-xs text-zinc-500 line-clamp-1">
                            {item.adminReply}
                          </p>
                        </div>
                      ) : (
                        <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-medium text-zinc-500">
                          {t("noReply")}
                        </span>
                      )}
                    </div>

                    {/* Date */}
                    <div className="col-span-1">
                      <span className="text-xs text-zinc-400">
                        {item.createdAt}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="col-span-2 flex items-center justify-end gap-1">
                      <button
                        onClick={() => setReplyTarget(item)}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-blue-50 hover:text-blue-700"
                        title={item.adminReply ? t("editReply") : t("replyAction")}
                      >
                        <Reply className="h-3.5 w-3.5" />
                        {item.adminReply ? t("editReply") : t("replyAction")}
                      </button>
                      {item.adminReply && (
                        <button
                          onClick={() => setDeleteReplyTarget(item)}
                          className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-amber-50 hover:text-amber-600"
                          title={t("deleteReply")}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => setDeleteTarget(item.id)}
                        className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600"
                        title={t("deleteFeedback")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Mobile card */}
                  <div className="md:hidden">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-sm font-medium text-zinc-900">
                          {item.name}
                        </p>
                        {item.email && (
                          <p className="text-[11px] text-zinc-400">
                            {item.email}
                          </p>
                        )}
                      </div>
                      <span className="text-[11px] text-zinc-400">
                        {item.createdAt}
                      </span>
                    </div>

                    <div className="mb-2">
                      <StarRatingDisplay rating={item.rating} />
                    </div>

                    {item.content && (
                      <div
                        onClick={() => setReplyTarget(item)}
                        className="cursor-pointer mb-2"
                        title={t("viewDetailTooltip")}
                      >
                        <p className="text-sm text-zinc-700 line-clamp-3 active:text-blue-600 transition-colors">
                          {item.content}
                        </p>
                      </div>
                    )}

                    {item.imageUrl && (
                      <button
                        onClick={() => setPreviewImage(item.imageUrl!)}
                        className="mb-2 block rounded-lg border border-zinc-200 overflow-hidden"
                      >
                        <img
                          src={item.imageUrl}
                          alt="Attachment"
                          className="max-h-32 w-auto object-cover"
                          loading="lazy"
                        />
                      </button>
                    )}

                    {item.adminReply && (
                      <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50/50 p-2.5">
                        <div className="mb-1 flex items-center gap-1.5">
                          <MessageSquare className="h-3 w-3 text-blue-500" />
                          <span className="text-[11px] font-semibold text-blue-600">
                            {t("tableReply")}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-700">
                          {item.adminReply}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setReplyTarget(item)}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-blue-50 hover:text-blue-700"
                      >
                        <Reply className="h-3.5 w-3.5" />
                        {item.adminReply ? t("editReply") : t("replyAction")}
                      </button>
                      {item.adminReply && (
                        <button
                          onClick={() => setDeleteReplyTarget(item)}
                          className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-amber-50 hover:text-amber-600"
                          title={t("deleteReply")}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => setDeleteTarget(item.id)}
                        className="ml-auto rounded-lg p-1.5 text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600"
                        title={t("deleteFeedback")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
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
      </section>

      {/* Reply Modal */}
      <ReplyModal
        isOpen={replyTarget !== null}
        onClose={() => setReplyTarget(null)}
        onSubmit={handleReplySubmit}
        isSubmitting={isReplying}
        feedback={replyTarget}
        onPreviewImage={(url) => setPreviewImage(url)}
        t={t}
      />

      {/* Delete Feedback Modal */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        title={t("deleteConfirmTitle")}
        message={t("deleteConfirmMessage")}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteFeedback}
        isLoading={isDeleting}
        t={t}
      />

      {/* Delete Reply Modal */}
      <ConfirmModal
        isOpen={deleteReplyTarget !== null}
        title={t("deleteReplyConfirmTitle")}
        message={t("deleteReplyConfirmMessage")}
        onClose={() => setDeleteReplyTarget(null)}
        onConfirm={handleDeleteReply}
        isLoading={isDeletingReply}
        t={t}
      />

      {/* Image Preview */}
      <ImagePreviewModal
        imageUrl={previewImage}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
};

export default FeedbacksPage;

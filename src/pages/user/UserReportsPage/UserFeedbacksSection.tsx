import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import {
  Loader2,
  AlertCircle,
  Star,
  ImagePlus,
  X,
  MessageSquare,
  Trash2,
  Send,
  ToggleLeft,
  ToggleRight,
  Image as ImageIcon,
  StarIcon,
  RotateCcw,
} from "lucide-react";
import userFeedbackService from "../../../services/user/feedbackService";
import type { FeedbackItem } from "../../../services/user/feedbackService";
import type { ApiErrorResponse } from "../../../services/user/interviewService";
import type { AxiosError } from "axios";

// ── Star Rating Input ──
const StarRatingInput = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) => {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="p-0.5 transition-transform hover:scale-110"
        >
          <Star
            className={`h-6 w-6 transition-colors ${
              star <= (hovered || value)
                ? "fill-amber-400 text-amber-400"
                : "text-amber-300"
            }`}
          />
        </button>
      ))}
    </div>
  );
};

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

// ── Delete Confirmation Modal ──
const DeleteModal = ({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  t,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
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
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 mx-4 w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-lg"
      >
        <h3 className="text-lg font-semibold text-zinc-900">
          {t("deleteConfirmTitle")}
        </h3>
        <p className="mt-2 text-sm text-zinc-600">
          {t("deleteConfirmMessage")}
        </p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50"
          >
            {t("deleteCancel")}
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-50"
          >
            {isDeleting ? (
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

// ── Main Component ──
const UserFeedbacksSection = () => {
  const { t } = useTranslation("Feedback");

  // Form state
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // List state
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Filters
  const [ratingFilter, setRatingFilter] = useState<number | undefined>(
    undefined
  );
  const [onlyMine, setOnlyMine] = useState(false);
  const [hasAdminReply, setHasAdminReply] = useState<boolean | undefined>(
    undefined
  );
  const [hasImageUrl, setHasImageUrl] = useState<boolean | undefined>(
    undefined
  );

  // Toggle admin reply visibility
  const [showAdminReplies, setShowAdminReplies] = useState(true);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Image preview modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Infinite scroll sentinel ref
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Stats state
  const [totalFeedbacks, setTotalFeedbacks] = useState<number | null>(null);
  const [averageRating, setAverageRating] = useState<number | null>(null);

  // Fetch feedbacks
  const fetchFeedbacks = useCallback(
    async (page: number, append: boolean = false) => {
      if (!append) setIsLoading(true);
      else setIsLoadingMore(true);
      setError("");

      try {
        const params: Record<string, unknown> = { page: page + 1 };
        if (ratingFilter !== undefined) params.rating = ratingFilter;
        if (onlyMine) params.onlyMine = true;
        if (hasAdminReply !== undefined)
          params.hasAdminReply = hasAdminReply;
        if (hasImageUrl !== undefined) params.hasImageUrl = hasImageUrl;

        const res = await userFeedbackService.getFeedbacks(params as never);
        const data = res.data.data;
        if (!data) throw new Error("Feedback response data is missing");
        const pageData = data.feedbacks;

        if (append) {
          setItems((prev) => [...prev, ...(pageData?.content || [])]);
        } else {
          setItems(pageData?.content || []);
        }
        setHasMore(!pageData?.last);
        setTotalFeedbacks(data.totalFeedbacks ?? null);
        setAverageRating(data.averageRating ?? null);
      } catch (err) {
        const axiosErr = err as AxiosError<ApiErrorResponse>;
        setError(axiosErr.response?.data?.message || "Đã xảy ra lỗi");
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [ratingFilter, onlyMine, hasAdminReply, hasImageUrl]
  );

  // Initial load & filter changes
  useEffect(() => {
    setCurrentPage(0);
    setItems([]);
    setHasMore(true);
    fetchFeedbacks(0, false);
  }, [fetchFeedbacks]);

  // Infinite scroll observer
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) {
          const nextPage = currentPage + 1;
          setCurrentPage(nextPage);
          fetchFeedbacks(nextPage, true);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, isLoading, currentPage, fetchFeedbacks]);

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Submit feedback
  const handleSubmit = async () => {
    if (rating === 0) {
      setSubmitMsg({ type: "error", text: t("ratingRequired") });
      return;
    }

    setIsSubmitting(true);
    setSubmitMsg(null);

    try {
      const formData = new FormData();
      formData.append("rating", rating.toString());
      if (content.trim()) formData.append("content", content.trim());
      if (imageFile) formData.append("image", imageFile);

      await userFeedbackService.createFeedback(formData);
      setSubmitMsg({ type: "success", text: t("submitSuccess") });

      // Reset form
      setRating(0);
      setContent("");
      clearImage();

      // Refresh list
      setCurrentPage(0);
      setItems([]);
      setHasMore(true);
      fetchFeedbacks(0, false);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorResponse>;
      const msg =
        axiosErr.response?.data?.message ||
        (axiosErr.response?.data?.data
          ? Object.values(axiosErr.response.data.data).join(", ")
          : t("submitError"));
      setSubmitMsg({ type: "error", text: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete feedback
  const handleDelete = async () => {
    if (deleteTarget === null) return;
    setIsDeleting(true);
    try {
      await userFeedbackService.deleteFeedback(deleteTarget);
      setItems((prev) => prev.filter((item) => item.id !== deleteTarget));
      setDeleteTarget(null);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorResponse>;
      setSubmitMsg({
        type: "error",
        text: axiosErr.response?.data?.message || t("deleteError"),
      });
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Create Feedback Form */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-xl border border-zinc-200 bg-white p-5 mb-5"
      >
        <h3 className="text-sm font-semibold text-zinc-900 mb-3">
          {t("createTitle")}
        </h3>

        {/* Star Rating */}
        <div className="mb-3">
          <p className="text-xs text-blue-500 mb-1.5">{t("ratingLabel")}</p>
          <StarRatingInput value={rating} onChange={setRating} />
        </div>

        {/* Content */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t("contentPlaceholder")}
          rows={3}
          className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 resize-none"
        />

        {/* Image Upload */}
        <div className="mt-3 flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50"
          >
            <ImagePlus className="h-3.5 w-3.5" />
            {t("imagePlaceholder")}
          </button>

          {imagePreview && (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Preview"
                className="h-10 w-10 rounded-lg border border-zinc-200 object-cover"
              />
              <button
                onClick={clearImage}
                className="absolute -right-1.5 -top-1.5 rounded-full bg-zinc-900 p-0.5 text-white transition hover:bg-zinc-700"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="mt-4 flex items-center justify-between gap-3">
          {submitMsg && (
            <p
              className={`text-xs ${
                submitMsg.type === "success"
                  ? "text-emerald-600"
                  : "text-rose-600"
              }`}
            >
              {submitMsg.text}
            </p>
          )}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || rating === 0}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            {isSubmitting ? t("submitting") : t("submitFeedback")}
          </button>
        </div>
      </motion.div>

      {/* Stats Summary Badges */}
      {(totalFeedbacks !== null || averageRating !== null) && (
        <div className="mb-3 flex flex-wrap items-center gap-3 text-xs">
          {totalFeedbacks !== null && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 font-medium text-zinc-700">
              {t("totalFeedbacksCount")}: <strong className="text-zinc-900">{totalFeedbacks}</strong>
            </span>
          )}
          {averageRating !== null && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-800 border border-amber-200">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {t("avgRating")}: <strong className="text-amber-900">{averageRating.toFixed(1)}</strong>
            </span>
          )}
        </div>
      )}

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="mb-4 flex flex-wrap items-center gap-2"
      >
        {/* Rating filter */}
        <select
          value={ratingFilter ?? ""}
          onChange={(e) =>
            setRatingFilter(e.target.value ? Number(e.target.value) : undefined)
          }
          className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-700 outline-none transition focus:border-zinc-400"
        >
          <option value="">{t("filterRating")}: {t("filterAll")}</option>
          {[5, 4, 3, 2, 1].map((s) => (
            <option key={s} value={s}>
              {s} {t("stars")}
            </option>
          ))}
        </select>

        {/* Only mine toggle */}
        <button
          onClick={() => setOnlyMine(!onlyMine)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
            onlyMine
              ? "border-blue-200 bg-blue-50 text-blue-700"
              : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
          }`}
        >
          <StarIcon className="h-3 w-3" />
          {t("filterOnlyMine")}
        </button>

        {/* Has admin reply toggle */}
        <button
          onClick={() =>
            setHasAdminReply(
              hasAdminReply === undefined
                ? true
                : hasAdminReply
                  ? false
                  : undefined
            )
          }
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
            hasAdminReply !== undefined
              ? "border-blue-200 bg-blue-50 text-blue-700"
              : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
          }`}
        >
          <MessageSquare className="h-3 w-3" />
          {t("filterHasReply")}
          {hasAdminReply !== undefined && (
            <span className="text-[10px]">
              ({hasAdminReply ? "✓" : "✗"})
            </span>
          )}
        </button>

        {/* Has image toggle */}
        <button
          onClick={() =>
            setHasImageUrl(
              hasImageUrl === undefined ? true : hasImageUrl ? false : undefined
            )
          }
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
            hasImageUrl !== undefined
              ? "border-blue-200 bg-blue-50 text-blue-700"
              : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
          }`}
        >
          <ImageIcon className="h-3 w-3" />
          {t("filterHasImage")}
          {hasImageUrl !== undefined && (
            <span className="text-[10px]">
              ({hasImageUrl ? "✓" : "✗"})
            </span>
          )}
        </button>

        {/* Clear filters */}
        {(ratingFilter !== undefined ||
          onlyMine ||
          hasAdminReply !== undefined ||
          hasImageUrl !== undefined) && (
          <button
            onClick={() => {
              setRatingFilter(undefined);
              setOnlyMine(false);
              setHasAdminReply(undefined);
              setHasImageUrl(undefined);
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100"
          >
            <RotateCcw className="h-3 w-3" />
            {t("clearFilters")}
          </button>
        )}

        {/* Show/hide admin replies toggle */}
        <button
          onClick={() => setShowAdminReplies(!showAdminReplies)}
          className={`ml-auto inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
            showAdminReplies
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
          }`}
        >
          {showAdminReplies ? (
            <ToggleRight className="h-3.5 w-3.5" />
          ) : (
            <ToggleLeft className="h-3.5 w-3.5" />
          )}
          {showAdminReplies ? t("toggleHideReplies") : t("toggleShowReplies")}
        </button>
      </motion.div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="h-8 w-8 text-blue-500" />
          </motion.div>
        </div>
      ) : error ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-center"
        >
          <AlertCircle className="mx-auto mb-2 h-7 w-7 text-rose-500" />
          <p className="text-sm text-rose-700">{error}</p>
        </motion.div>
      ) : items.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16"
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100">
            <Star className="h-7 w-7 text-zinc-400" />
          </div>
          <h3 className="text-base font-semibold text-zinc-900">
            {t("noFeedbacks")}
          </h3>
          <p className="mt-1 max-w-xs text-center text-sm text-zinc-500">
            {t("noFeedbacksDesc")}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {items.map((item, index) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: index < 10 ? index * 0.03 : 0 }}
                className="rounded-xl border border-zinc-200 bg-white p-4"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600">
                      {item.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-900">
                        {item.name || t("anonymous")}
                      </p>
                      <div className="flex items-center gap-2">
                        <StarRatingDisplay rating={item.rating} />
                        <span className="text-[11px] text-zinc-400">
                          {item.createdAt}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Delete button (only for own feedbacks - shown when onlyMine filter is active) */}
                  {onlyMine && (
                    <button
                      onClick={() => setDeleteTarget(item.id)}
                      className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600"
                      title={t("deleteFeedback")}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Content */}
                {item.content && (
                  <p className="text-sm text-zinc-700 mb-2">{item.content}</p>
                )}

                {/* Image */}
                {item.imageUrl && (
                  <button
                    onClick={() => setPreviewImage(item.imageUrl!)}
                    className="mb-2 block overflow-hidden rounded-lg border border-zinc-200 transition hover:border-zinc-300"
                  >
                    <img
                      src={item.imageUrl}
                      alt="Feedback attachment"
                      className="max-h-40 w-auto object-cover"
                      loading="lazy"
                    />
                  </button>
                )}

                {/* Admin Reply */}
                {showAdminReplies && item.adminReply && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 rounded-lg border border-cyan-100 bg-cyan-50/50 p-3"
                  >
                    <div className="mb-1 flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-cyan-500" />
                      <span className="text-xs font-semibold text-cyan-600">
                        {t("adminReply")}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-700">{item.adminReply}</p>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-4" />
          {isLoadingMore && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              <span className="ml-2 text-xs text-zinc-500">
                {t("loadMore")}
              </span>
            </div>
          )}
          {!hasMore && items.length > 0 && (
            <p className="text-center text-xs text-zinc-400 py-3">
              {t("noMoreFeedbacks")}
            </p>
          )}
        </div>
      )}

      {/* Delete Modal */}
      <DeleteModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
        t={t}
      />

      {/* Image Preview Modal */}
      <ImagePreviewModal
        imageUrl={previewImage}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
};

export default UserFeedbacksSection;

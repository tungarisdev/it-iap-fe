import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Edit2,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Upload,
  X,
  Loader2,
  Sparkles,
  RefreshCw,
  ZoomIn,
} from "lucide-react";
import adminBannerService, {
  type AdminBannerItem,
} from "../../../services/admin/adminBannerService";

const BannersPage: React.FC = () => {
  const { t } = useTranslation("AdminBanners");

  const [banners, setBanners] = useState<AdminBannerItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingBanner, setEditingBanner] = useState<AdminBannerItem | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form Fields
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [marquee, setMarquee] = useState<string>("");
  const [isActive, setIsActive] = useState<boolean>(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Toast / Error
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Full Image Preview Modal (Lightbox)
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);

  const fetchBanners = (page: number) => {
    setLoading(true);
    adminBannerService
      .getBanners(page)
      .then((res) => {
        if (res.data?.data) {
          setBanners(res.data.data.content || []);
          setTotalPages(res.data.data.totalPages || 1);
        }
      })
      .catch((err) => {
        console.error(err);
        setErrorMsg(t("toast.fetchError"));
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchBanners(currentPage);
  }, [currentPage]);

  const openCreateModal = () => {
    setEditingBanner(null);
    setTitle("");
    setContent("");
    setMarquee("");
    setIsActive(true);
    setImageFile(null);
    setImagePreview(null);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (banner: AdminBannerItem) => {
    setEditingBanner(banner);
    setTitle(banner.title || "");
    setContent(banner.content || "");
    setMarquee(banner.marquee || "");
    setIsActive(banner.isActive);
    setImageFile(null);
    setImagePreview(banner.imageUrl || null);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBanner(null);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleToggleStatus = (banner: AdminBannerItem) => {
    const newStatus = !banner.isActive;
    adminBannerService
      .toggleBannerStatus(banner.id, newStatus)
      .then(() => {
        setSuccessMsg(t("toast.toggleSuccess"));
        fetchBanners(currentPage);
        setTimeout(() => setSuccessMsg(null), 3000);
      })
      .catch((err) => {
        console.error(err);
        setErrorMsg(t("toast.toggleError"));
        setTimeout(() => setErrorMsg(null), 3000);
      });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitting(true);
    setErrorMsg(null);

    const finalTitle = title.trim();
    const finalContent = content.trim();

    const formData = new FormData();
    formData.append("title", finalTitle);
    formData.append("content", finalContent);
    formData.append("active", String(isActive));
    if (marquee.trim()) {
      formData.append("marquee", marquee.trim());
    }
    if (imageFile) {
      formData.append("image", imageFile);
    }

    const action = editingBanner
      ? adminBannerService.updateBanner(editingBanner.id, formData)
      : adminBannerService.createBanner(formData);

    action
      .then(() => {
        setSuccessMsg(
          editingBanner ? t("toast.updateSuccess") : t("toast.createSuccess")
        );
        closeModal();
        fetchBanners(currentPage);
        setTimeout(() => setSuccessMsg(null), 3000);
      })
      .catch((err) => {
        console.error(err);
        setErrorMsg(
          editingBanner ? t("toast.updateError") : t("toast.createError")
        );
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  return (
    <div className="space-y-6">
      {/* Toast Notifications */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm font-medium text-emerald-800 shadow-sm animate-fadeIn">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && !isModalOpen && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm font-medium text-rose-800 shadow-sm animate-fadeIn">
          <XCircle className="h-5 w-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Header & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
            {/* <Megaphone className="h-6 w-6 text-600" /> */}
            <span>{t("title")}</span>
          </h2>
          <p className="mt-1 text-sm text-zinc-600">{t("subtitle")}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fetchBanners(currentPage)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 active:scale-[0.98] disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              strokeWidth={2}
            />
            <span>{t("reload")}</span>
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            <span>{t("createButton")}</span>
          </button>
        </div>
      </div>

      {/* Main Table / List Container */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm font-medium">Đang tải danh sách banner...</p>
          </div>
        ) : banners.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 mb-3">
              <Sparkles className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-zinc-900">{t("emptyState")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-600">
              <thead className="border-b border-zinc-200 bg-zinc-50/70 text-xs uppercase font-semibold text-zinc-700">
                <tr>
                  <th scope="col" className="px-4 py-3.5 w-14 text-center">
                    {t("table.id")}
                  </th>
                  <th scope="col" className="px-4 py-3.5 w-20 text-center">
                    {t("table.image")}
                  </th>
                  <th scope="col" className="px-4 py-3.5 w-48 lg:w-56">
                    {t("table.title")}
                  </th>
                  <th scope="col" className="px-4 py-3.5 min-w-[220px]">
                    {t("table.content")}
                  </th>
                  <th scope="col" className="px-4 py-3.5 w-48">
                    {t("table.marquee")}
                  </th>
                  <th scope="col" className="px-4 py-3.5 w-32 text-center">
                    {t("table.status")}
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-right w-20">
                    {t("table.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {banners.map((banner) => (
                  <tr
                    key={banner.id}
                    className="hover:bg-zinc-50/80 transition-colors"
                  >
                    {/* ID */}
                    <td className="px-4 py-3.5 text-center font-mono text-xs font-semibold text-zinc-500">
                      #{banner.id}
                    </td>

                    {/* Image */}
                    <td className="px-4 py-3.5 text-center">
                      {banner.imageUrl ? (
                        <button
                          type="button"
                          onClick={() => setPreviewModalUrl(banner.imageUrl || null)}
                          className="group relative inline-block overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                          title="Click để phóng to ảnh"
                        >
                          <img
                            src={banner.imageUrl}
                            alt={banner.title}
                            className="h-10 w-14 object-cover transition-transform duration-200 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/40 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ZoomIn className="h-3.5 w-3.5 text-white" />
                          </div>
                        </button>
                      ) : (
                        <div className="flex h-10 w-14 mx-auto items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50 text-zinc-400">
                          <ImageIcon className="h-4 w-4" />
                        </div>
                      )}
                    </td>

                    {/* Title */}
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-zinc-900 line-clamp-2 text-sm leading-snug">
                        {banner.title}
                      </div>
                    </td>

                    {/* Content */}
                    <td className="px-4 py-3.5">
                      <div className="text-xs text-zinc-600 line-clamp-2 leading-relaxed">
                        {banner.content}
                      </div>
                    </td>

                    {/* Marquee */}
                    <td className="px-4 py-3.5">
                      {banner.marquee ? (
                        <span className="inline-block max-w-[180px] truncate rounded-md bg-blue-50 border border-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                          {banner.marquee}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-400 italic">
                          (Không có)
                        </span>
                      )}
                    </td>

                    {/* Status Toggle Switch */}
                    <td className="px-4 py-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(banner)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all ${
                          banner.isActive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : "bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-200"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            banner.isActive ? "bg-emerald-500" : "bg-zinc-400"
                          }`}
                        />
                        <span>
                          {banner.isActive
                            ? t("status.active")
                            : t("status.inactive")}
                        </span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => openEditModal(banner)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors shadow-xs"
                        title="Chỉnh sửa Banner"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-zinc-200 px-6 py-3 bg-zinc-50/50">
            <span className="text-xs text-zinc-500">
              Trang <span className="font-semibold text-zinc-900">{currentPage}</span> / {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Trước</span>
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Sau</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Banner Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div
            className="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm transition-opacity"
            onClick={closeModal}
          />

          <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl transition-all">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 bg-zinc-50/80">
              <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-600" />
                <span>
                  {editingBanner
                    ? t("modal.editTitle")
                    : t("modal.createTitle")}
                </span>
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {errorMsg && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-medium text-rose-800">
                  {errorMsg}
                </div>
              )}

              {/* Title Input */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1">
                  {t("modal.fields.title")}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("modal.fields.titlePlaceholder")}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-600"
                />
              </div>

              {/* Content Input */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1">
                  {t("modal.fields.content")}
                </label>
                <textarea
                  rows={3}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={t("modal.fields.contentPlaceholder")}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-600"
                />
              </div>

              {/* Marquee Input */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1">
                  {t("modal.fields.marquee")}
                </label>
                <input
                  type="text"
                  value={marquee}
                  onChange={(e) => setMarquee(e.target.value)}
                  placeholder={t("modal.fields.marqueePlaceholder")}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-600"
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1">
                  {t("modal.fields.image")}
                </label>

                {imagePreview ? (
                  <div className="relative rounded-xl border border-zinc-200 overflow-hidden bg-zinc-50 group">
                    <img
                      src={imagePreview}
                      alt="Banner Preview"
                      className="h-40 w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-zinc-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <label
                        htmlFor="banner-image-upload"
                        className="cursor-pointer rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-100"
                      >
                        {t("modal.changeImagePrompt")}
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview(null);
                        }}
                        className="rounded-full bg-rose-600 p-1.5 text-white hover:bg-rose-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label
                    htmlFor="banner-image-upload"
                    className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 p-6 text-center cursor-pointer hover:border-slate-600 hover:bg-slate-50/40 transition-colors"
                  >
                    <Upload className="h-8 w-8 text-zinc-400 mb-2" />
                    <span className="text-xs font-semibold text-zinc-700">
                      {t("modal.uploadPrompt")}
                    </span>
                  </label>
                )}

                <input
                  id="banner-image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>

              {/* Active Toggle Switch */}
              <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50/60 p-3.5">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">
                    {t("modal.fields.active")}
                  </p>
                  <p className="text-xs text-zinc-500">
                    Bật banner này lên giao diện người dùng
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isActive ? "bg-green-600" : "bg-zinc-300"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isActive ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                >
                  {t("modal.buttons.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-6 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>
                    {submitting
                      ? t("modal.buttons.saving")
                      : t("modal.buttons.save")}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Image Preview Modal (Lightbox) */}
      {previewModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-zinc-900/80 backdrop-blur-md transition-opacity">
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 p-2 shadow-2xl">
            <button
              type="button"
              onClick={() => setPreviewModalUrl(null)}
              className="absolute top-4 right-4 z-10 rounded-full bg-zinc-800/80 p-2 text-zinc-300 hover:bg-zinc-700 hover:text-white transition"
              title="Đóng"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={previewModalUrl}
              alt="Enlarged Banner Preview"
              className="max-h-[85vh] max-w-full rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default BannersPage;

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Tag,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Percent,
  Coins,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Loader2,
  AlertCircle,
  Layers,
} from "lucide-react";
import adminPromotionService, {
  type PromotionItem,
  calculateDiscountPrice,
} from "../../../services/admin/adminPromotionService";
import useTierStore from "../../../store/tierStore";
import CreatePromotionModal from "./components/CreatePromotionModal";
import UpgradeTierModal from "../../../components/user/UpgradeTierModal";

const formatVND = (amount: number): string => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

export const parseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  // Match "DD/MM/YYYY HH:mm:ss", "DD/MM/YYYY HH:mm", or "DD/MM/YYYY"
  const ddmmyyyyMatch = dateStr.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (ddmmyyyyMatch) {
    const day = parseInt(ddmmyyyyMatch[1], 10);
    const month = parseInt(ddmmyyyyMatch[2], 10) - 1;
    const year = parseInt(ddmmyyyyMatch[3], 10);
    const hours = ddmmyyyyMatch[4] ? parseInt(ddmmyyyyMatch[4], 10) : 0;
    const minutes = ddmmyyyyMatch[5] ? parseInt(ddmmyyyyMatch[5], 10) : 0;
    const seconds = ddmmyyyyMatch[6] ? parseInt(ddmmyyyyMatch[6], 10) : 0;
    const d = new Date(year, month, day, hours, minutes, seconds);
    if (!isNaN(d.getTime())) return d;
  }
  const isoDate = new Date(dateStr);
  return isNaN(isoDate.getTime()) ? null : isoDate;
};

export const isPromotionExpired = (endDateStr: string): boolean => {
  const parsed = parseDate(endDateStr);
  if (!parsed) return false;
  return parsed.getTime() < Date.now();
};

const formatDate = (dateStr: string): string => {
  if (!dateStr) return "--";
  // If dateStr is already in "DD/MM/YYYY HH:mm:ss" format, return as is
  const ddmmyyyyMatch = dateStr.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (ddmmyyyyMatch) {
    return dateStr;
  }
  const d = parseDate(dateStr);
  if (d) {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }
  return dateStr;
};

// ── Status Badge ──
const StatusBadge = ({
  isActive,
  isExpired,
  label,
}: {
  isActive: boolean;
  isExpired?: boolean;
  label: string;
}) => {
  if (isExpired) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
        <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
        {label}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        isActive
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-zinc-200 bg-zinc-100 text-zinc-600"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isActive ? "bg-emerald-500" : "bg-zinc-400"
        }`}
      />
      {label}
    </span>
  );
};

// ── Applicable Tier Badge ──
const TierBadge = ({ tierCode, label }: { tierCode: string; label: string }) => {
  const isPro = tierCode?.toUpperCase().includes("PRO");
  const isYear = tierCode?.toUpperCase().includes("YEAR");

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        isPro
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : "border-rose-200 bg-rose-50 text-rose-700"
      }`}
    >
      <Layers className="h-3 w-3" />
      <span>{label}</span>
      {isYear && (
        <span className="rounded-full bg-zinc-900/10 px-1 py-0.2 text-[10px] font-bold">
          1Y
        </span>
      )}
    </span>
  );
};

const PromotionsPage: React.FC = () => {
  const { t } = useTranslation("AdminPromotions");
  const location = useLocation();

  // Zustand tier store
  const { fetchTiers, getOriginalPrice } = useTierStore();

  // Promotions data & pagination state
  const [promotions, setPromotions] = useState<PromotionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState<number>(0);

  // Filters state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [tierFilter, setTierFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState<boolean>(
    () => typeof window !== "undefined" && window.location.hash === "#pricing"
  );

  useEffect(() => {
    if (location.hash === "#pricing") {
      setIsUpgradeModalOpen(true);
    }
  }, [location.hash]);

  // Status toggle in-progress tracking
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Toast / Alerts
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Go to page input
  const [goToInput, setGoToInput] = useState<string>("");

  const showToast = (type: "success" | "error", text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => {
      setToastMsg(null);
    }, 4000);
  };

  // Fetch promotions list from API
  const fetchPromotions = useCallback(
    async (page: number) => {
      setLoading(true);
      try {
        const res = await adminPromotionService.getPromotions(page);
        if (res.data?.data) {
          const pageData = res.data.data;
          setPromotions(pageData.content || []);
          setTotalPages(pageData.totalPages || 1);
          setTotalElements(pageData.totalElements || 0);
        }
      } catch (err: unknown) {
        console.error("Failed to load promotions", err);
        showToast("error", t("toast.fetchError"));
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  // Load tiers and promotions on mount and page change
  useEffect(() => {
    fetchTiers();
    fetchPromotions(currentPage);
  }, [currentPage, fetchTiers, fetchPromotions]);

  // Toggle promotion status
  const handleToggleStatus = async (promo: PromotionItem) => {
    if (togglingId !== null) return;
    setTogglingId(promo.id);

    try {
      const res = await adminPromotionService.togglePromotionStatus(promo.id);
      if (res.data?.code === 200 || res.status === 200) {
        // Optimistically or safely update local item status
        setPromotions((prev) =>
          prev.map((item) =>
            item.id === promo.id
              ? {
                  ...item,
                  isActive: res.data?.data?.isActive !== undefined ? res.data.data.isActive : !item.isActive,
                }
              : item
          )
        );
        showToast("success", t("toast.toggleSuccess"));
      } else {
        showToast("error", res.data?.message || t("toast.toggleError"));
      }
    } catch (err: unknown) {
      console.error("Failed to toggle status", err);
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
      const detailedMessage = axiosErr.response?.data?.message || axiosErr.message || t("toast.toggleError");
      showToast("error", detailedMessage);
    } finally {
      setTogglingId(null);
    }
  };

  // Copy promotion code
  const handleCopyCode = (codeText: string) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCode(codeText);
    setTimeout(() => {
      setCopiedCode(null);
    }, 2000);
  };

  // Filtered promotions for client-side search & filtering
  const filteredPromotions = useMemo(() => {
    return promotions.filter((promo) => {
      // Search match
      const query = searchQuery.trim().toLowerCase();
      const matchSearch =
        !query ||
        promo.code.toLowerCase().includes(query) ||
        promo.name.toLowerCase().includes(query) ||
        (promo.description && promo.description.toLowerCase().includes(query));

      // Tier match
      const matchTier =
        tierFilter === "ALL" ||
        promo.applicableTier.toUpperCase() === tierFilter.toUpperCase();

      // Type match
      const matchType =
        typeFilter === "ALL" ||
        promo.discountType.toUpperCase() === typeFilter.toUpperCase();

      // Status match
      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && promo.isActive) ||
        (statusFilter === "INACTIVE" && !promo.isActive);

      return matchSearch && matchTier && matchType && matchStatus;
    });
  }, [promotions, searchQuery, tierFilter, typeFilter, statusFilter]);

  // KPI Metrics
  const stats = useMemo(() => {
    const total = totalElements || promotions.length;
    const active = promotions.filter((p) => p.isActive).length;
    const inactive = promotions.filter((p) => !p.isActive).length;
    const percentage = promotions.filter((p) => p.discountType === "PERCENTAGE").length;
    const fixed = promotions.filter((p) => p.discountType === "FIXED_AMOUNT").length;
    return { total, active, inactive, percentage, fixed };
  }, [promotions, totalElements]);

  // Visible pages for pagination
  const visiblePages = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | "ellipsis")[] = [1];
    if (currentPage > 3) pages.push("ellipsis");
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push("ellipsis");
    if (totalPages > 1) pages.push(totalPages);
    return pages;
  }, [currentPage, totalPages]);

  const handleGoTo = () => {
    const p = parseInt(goToInput, 10);
    if (p >= 1 && p <= totalPages) {
      setCurrentPage(p);
      setGoToInput("");
    }
  };

  const getTierLabel = (tierCode: string) => {
    const key = tierCode as keyof typeof t;
    return t(`tiers.${key}`, { defaultValue: tierCode });
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg transition-all animate-in fade-in slide-in-from-bottom-5 ${
            toastMsg.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          {toastMsg.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          )}
          <span className="text-xs font-medium">{toastMsg.text}</span>
        </div>
      )}

      {/* Header Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">{t("title")}</h1>
          <p className="text-xs text-zinc-500 mt-1">{t("subtitle")}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => fetchPromotions(currentPage)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3.5 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 transition-all active:scale-[0.98] disabled:opacity-50"
            title={t("buttons.refresh")}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>{t("buttons.refresh")}</span>
          </button>

          {/* Preview User Upgrade Modal Button */}
          <button
            type="button"
            onClick={() => setIsUpgradeModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/70 px-4 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-all active:scale-[0.98]"
            title={t("buttons.previewUserModalTooltip")}
          >
            <Eye className="h-3.5 w-3.5 text-blue-600" />
            <span>{t("buttons.previewUserModal")}</span>
          </button>

          {/* Create Promotion Button */}
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 transition-all shadow-sm active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            <span>{t("buttons.create")}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:border-zinc-300">
          <div className="flex items-center justify-between text-zinc-500 mb-1.5">
            <span className="text-xs font-medium">{t("kpi.total")}</span>
            <Tag className="h-4 w-4 text-zinc-400" />
          </div>
          <p className="text-xl font-bold text-zinc-900">{stats.total}</p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:border-zinc-300">
          <div className="flex items-center justify-between text-zinc-500 mb-1.5">
            <span className="text-xs font-medium">{t("kpi.active")}</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-xl font-bold text-emerald-700">{stats.active}</p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:border-zinc-300">
          <div className="flex items-center justify-between text-zinc-500 mb-1.5">
            <span className="text-xs font-medium">{t("kpi.percentage")}</span>
            <Percent className="h-4 w-4 text-rose-500" />
          </div>
          <p className="text-xl font-bold text-rose-700">{stats.percentage}</p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:border-zinc-300">
          <div className="flex items-center justify-between text-zinc-500 mb-1.5">
            <span className="text-xs font-medium">{t("kpi.fixedAmount")}</span>
            <Coins className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-xl font-bold text-amber-700">{stats.fixed}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
          {/* Search */}
          <div className="sm:col-span-5 relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("filters.searchPlaceholder")}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 pl-10 pr-4 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 transition-all"
            />
          </div>

          {/* Tier Filter */}
          <div className="sm:col-span-3">
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-xs font-medium text-zinc-700 focus:bg-white focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 transition-all"
            >
              <option value="ALL">{t("filters.tierPlaceholder")}</option>
              <option value="PLUS_MONTH">{t("tiers.PLUS_MONTH")}</option>
              <option value="PRO_MONTH">{t("tiers.PRO_MONTH")}</option>
            </select>
          </div>

          {/* Discount Type Filter */}
          <div className="sm:col-span-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-xs font-medium text-zinc-700 focus:bg-white focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 transition-all"
            >
              <option value="ALL">{t("filters.typePlaceholder")}</option>
              <option value="PERCENTAGE">{t("filters.percentage")}</option>
              <option value="FIXED_AMOUNT">{t("filters.fixedAmount")}</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-xs font-medium text-zinc-700 focus:bg-white focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 transition-all"
            >
              <option value="ALL">{t("filters.statusPlaceholder")}</option>
              <option value="ACTIVE">{t("filters.active")}</option>
              <option value="INACTIVE">{t("filters.inactive")}</option>
            </select>
          </div>
        </div>

        {/* Active Filter Indicators & Reset */}
        {(searchQuery || tierFilter !== "ALL" || typeFilter !== "ALL" || statusFilter !== "ALL") && (
          <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3 text-xs text-zinc-500">
            <span>
              {t("table.from")}: {filteredPromotions.length} / {promotions.length}{" "}
              {t("pagination.items")}
            </span>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setTierFilter("ALL");
                setTypeFilter("ALL");
                setStatusFilter("ALL");
              }}
              className="font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              {t("buttons.resetFilter")}
            </button>
          </div>
        )}
      </div>

      {/* Main Promotions Table */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-600 divide-y divide-zinc-200">
            <thead className="bg-zinc-50/80 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              <tr>
                <th scope="col" className="px-4 py-3.5">
                  {t("table.codeAndName")}
                </th>
                <th scope="col" className="px-4 py-3.5">
                  {t("table.applicableTier")}
                </th>
                <th scope="col" className="px-4 py-3.5">
                  {t("table.discount")}
                </th>
                <th scope="col" className="px-4 py-3.5">
                  {t("table.estimatedPrice")}
                </th>
                <th scope="col" className="px-4 py-3.5">
                  {t("table.duration")}
                </th>
                <th scope="col" className="px-4 py-3.5 text-center">
                  {t("table.status")}
                </th>
                <th scope="col" className="px-4 py-3.5 text-right">
                  {t("table.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-zinc-400">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-zinc-400 mb-2" />
                    <p>{t("toast.fetchError") ? "Đang tải dữ liệu..." : "Loading..."}</p>
                  </td>
                </tr>
              ) : filteredPromotions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-zinc-400">
                    <Tag className="mx-auto h-8 w-8 text-zinc-300 mb-2" />
                    <p className="font-medium text-zinc-600">
                      {searchQuery || tierFilter !== "ALL"
                        ? t("table.emptyFiltered")
                        : t("table.empty")}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPromotions.map((promo) => {
                  const originalPrice = getOriginalPrice(promo.applicableTier);
                  const discountedPrice = calculateDiscountPrice(
                    originalPrice,
                    promo.discountType,
                    promo.discountValue
                  );
                  const isExpired = isPromotionExpired(promo.endDate);
                  const isToggling = togglingId === promo.id;

                  return (
                    <tr
                      key={promo.id || promo.code}
                      className="hover:bg-zinc-50/60 transition-colors"
                    >
                      {/* Code and Name */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-zinc-900 tracking-wider bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200/80">
                            {promo.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(promo.code)}
                            className="text-zinc-400 hover:text-zinc-700 transition-colors p-1"
                            title={t("buttons.copyCode")}
                          >
                            {copiedCode === promo.code ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                        <p className="font-semibold text-zinc-800 mt-1">{promo.name}</p>
                        {promo.description && (
                          <p className="text-[11px] text-zinc-500 truncate max-w-xs mt-0.5">
                            {promo.description}
                          </p>
                        )}
                      </td>

                      {/* Applicable Tier */}
                      <td className="px-4 py-3.5">
                        <TierBadge
                          tierCode={promo.applicableTier}
                          label={getTierLabel(promo.applicableTier)}
                        />
                      </td>

                      {/* Discount Value */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 font-semibold text-zinc-900">
                          {promo.discountType === "PERCENTAGE" ? (
                            <>
                              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-rose-50 text-rose-700">
                                <Percent className="h-3 w-3" />
                              </span>
                              <span className="text-rose-700 text-sm">
                                -{promo.discountValue}%
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-amber-50 text-amber-700">
                                <Coins className="h-3 w-3" />
                              </span>
                              <span className="text-amber-700 text-sm">
                                -{formatVND(promo.discountValue)}
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Estimated Price (Calculated with original price from store) */}
                      <td className="px-4 py-3.5">
                        {discountedPrice !== null ? (
                          <div>
                            <p className="font-bold text-emerald-700 text-sm">
                              {formatVND(discountedPrice)}
                            </p>
                            {originalPrice !== null && (
                              <p className="text-[10px] text-zinc-400 line-through">
                                {formatVND(originalPrice)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-zinc-400 italic">
                            {promo.discountType === "PERCENTAGE"
                              ? `Giảm ${promo.discountValue}%`
                              : `Giảm ${formatVND(promo.discountValue)}`}
                          </span>
                        )}
                      </td>

                      {/* Duration */}
                      <td className="px-4 py-3.5 text-[11px]">
                        <div className="flex items-center gap-1 text-zinc-700">
                          <Clock className="h-3 w-3 text-zinc-400 shrink-0" />
                          <span>{formatDate(promo.startDate)}</span>
                        </div>
                        <div className="text-zinc-400 mt-0.5 pl-4">
                          → {formatDate(promo.endDate)}
                        </div>
                      </td>

                      {/* Status Badge & Toggle */}
                      <td className="px-4 py-3.5 text-center">
                        <StatusBadge
                          isActive={promo.isActive}
                          isExpired={isExpired}
                          label={
                            isExpired
                              ? t("table.expired")
                              : promo.isActive
                              ? t("filters.active")
                              : t("filters.inactive")
                          }
                        />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        {isExpired ? (
                          <span className="inline-block px-3 py-1 text-xs text-zinc-400 italic">
                            --
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={isToggling}
                            onClick={() => handleToggleStatus(promo)}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all active:scale-[0.98] ${
                              promo.isActive
                                ? "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                            }`}
                          >
                            {isToggling ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : promo.isActive ? (
                              <>
                                <XCircle className="h-3.5 w-3.5" />
                                <span>{t("buttons.toggleInactive")}</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>{t("buttons.toggleActive")}</span>
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-zinc-200 bg-zinc-50/50 px-4 py-3 text-xs text-zinc-600">
          <div>
            {t("pagination.total")}{" "}
            <span className="font-semibold text-zinc-900">{totalElements}</span>{" "}
            {t("pagination.items")} ({t("pagination.page")}{" "}
            <span className="font-semibold text-zinc-900">{currentPage}</span>{" "}
            {t("pagination.of")} {totalPages})
          </div>

          <div className="flex items-center gap-2">
            {/* Jump to page */}
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={1}
                max={totalPages}
                value={goToInput}
                onChange={(e) => setGoToInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGoTo()}
                placeholder={t("pagination.goTo")}
                className="w-16 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-center text-xs text-zinc-900 focus:border-zinc-900 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleGoTo}
                className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
              >
                {t("pagination.jump")}
              </button>
            </div>

            {/* Prev / Page numbers / Next */}
            <div className="flex items-center gap-1 ml-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(1)}
                className="rounded-lg border border-zinc-200 bg-white p-1 text-zinc-600 hover:bg-zinc-100 disabled:opacity-30"
                title="First Page"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>

              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-zinc-200 bg-white p-1 text-zinc-600 hover:bg-zinc-100 disabled:opacity-30"
                title="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {visiblePages.map((p, idx) =>
                p === "ellipsis" ? (
                  <span key={`ellipsis-${idx}`} className="px-1 text-zinc-400">
                    ...
                  </span>
                ) : (
                  <button
                    key={`page-${p}`}
                    type="button"
                    onClick={() => setCurrentPage(p)}
                    className={`h-7 w-7 rounded-lg text-xs font-medium transition-colors ${
                      currentPage === p
                        ? "bg-zinc-900 text-white"
                        : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-zinc-200 bg-white p-1 text-zinc-600 hover:bg-zinc-100 disabled:opacity-30"
                title="Next Page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="rounded-lg border border-zinc-200 bg-white p-1 text-zinc-600 hover:bg-zinc-100 disabled:opacity-30"
                title="Last Page"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Create Promotion Modal */}
      <CreatePromotionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          showToast("success", t("toast.createSuccess"));
          fetchPromotions(1);
          setCurrentPage(1);
        }}
      />

      {/* Upgrade Tier Modal (Preview user modal for admin) */}
      <UpgradeTierModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        currentTier="BASIC"
      />
    </div>
  );
};

export default PromotionsPage;

import { useEffect, useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Flame,
  Trophy,
  Loader2,
  Eye,
  EyeOff,
  MessageCircle,
  ChevronDown,
  Crown,
  Heart,
  Zap,
  Filter,
  X,
  RotateCcw,
  Trash2,
  Briefcase,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import useForumStore from "../../../store/forumStore";
import { RadarChart } from "../DashboardPage/DashboardPage";
import { getBenchmarkByTitleOrRole } from "../../../utils/benchmark";
import type {
  ForumPost,
  ReactionType,
  GradeSharedData,
  StreakSharedData,
  UserRank,
  SkillOverviewDTO,
} from "../../../services/user/forumService";

// ── Capitalize Helper (Title Case) ──
const formatCapitalize = (text: string | null | undefined): string => {
  if (!text) return "";
  return text
    .toLowerCase()
    .split(/[_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// ── Time Ago Helper ──
const useTimeAgo = () => {
  const { t } = useTranslation("Forum");

  return useCallback(
    (dateStr: string) => {
      const now = new Date();
      const date = new Date(dateStr);
      const diffMs = now.getTime() - date.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      const diffHr = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHr / 24);

      if (diffMin < 1) return t("justNow");
      if (diffMin < 60) return t("minutesAgo", { count: diffMin });
      if (diffHr < 24) return t("hoursAgo", { count: diffHr });
      return t("daysAgo", { count: diffDay });
    },
    [t]
  );
};

// ── Rank Helpers ──
const getRankBadgeStyle = (rank: UserRank | string | null | undefined): string => {
  switch (rank?.toUpperCase()) {
    case "BRONZE":
      return "text-amber-700 bg-amber-50 border-amber-200";
    case "SILVER":
      return "text-zinc-600 bg-zinc-100 border-zinc-300";
    case "GOLD":
      return "text-yellow-700 bg-yellow-50 border-yellow-200";
    case "PLATINUM":
      return "text-neutral-700 bg-neutral-50 border-neutral-200";
    case "DIAMOND":
      return "text-sky-700 bg-sky-50 border-sky-200";
    default:
      return "text-zinc-600 bg-zinc-100 border-zinc-200";
  }
};

// ── Streak Content Card (With Special Effects for Large Streaks) ──
const StreakCard = ({ data, t }: { data: StreakSharedData; t: (key: string, opts?: Record<string, unknown>) => string }) => {
  const streak = data.currentStreak;

  // Determine streak tier for special styling
  let containerStyle = "border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50";
  let badgeTitle = t("streakTitle");
  let badgeTag: string | null = null;
  let iconEffect = "text-orange-500";

  if (streak >= 30) {
    containerStyle = "border-purple-300 bg-gradient-to-br from-purple-900 via-indigo-950 to-slate-950 text-white shadow-xl shadow-purple-500/20 ring-2 ring-purple-400/50";
    badgeTitle = t("streakTitle");
    badgeTag = t("masterStreak");
    iconEffect = "text-amber-400 animate-bounce";
  } else if (streak >= 14) {
    containerStyle = "border-amber-300 bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 text-white shadow-lg shadow-orange-500/20 ring-2 ring-amber-300/60";
    badgeTitle = t("streakTitle");
    badgeTag = t("legendaryStreak");
    iconEffect = "text-yellow-200 animate-pulse";
  } else if (streak >= 7) {
    containerStyle = "border-orange-300 bg-gradient-to-br from-orange-100 via-amber-50 to-orange-50 text-orange-950 shadow-md shadow-orange-300/30";
    badgeTag = t("superStreak");
    iconEffect = "text-orange-600 animate-pulse";
  }

  const isDark = streak >= 14;

  return (
    <div className={`relative overflow-hidden rounded-xl border p-5 transition-all ${containerStyle}`}>
      {/* Background glow effect for large streaks */}
      {streak >= 14 && (
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-yellow-400/20 blur-2xl pointer-events-none" />
      )}

      {/* Special Badge Tag */}
      {badgeTag && (
        <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-amber-300 border border-white/30">
          <Zap className="h-3.5 w-3.5 fill-current" />
          {badgeTag}
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className={`flex h-14 w-14 items-center justify-center rounded-full ${isDark ? "bg-white/20 backdrop-blur-md" : "bg-orange-100"}`}>
          <Flame className={`h-8 w-8 ${iconEffect}`} />
        </div>
        <div className="flex-1">
          <p className={`text-xs font-medium uppercase tracking-wider ${isDark ? "text-orange-200" : "text-orange-600/90"}`}>
            {badgeTitle}
          </p>
          <p className={`text-3xl font-extrabold ${isDark ? "text-white" : "text-orange-700"}`}>
            {t("streakDays", { count: streak })}
          </p>
        </div>
      </div>

      {/* Streak visual progress bar */}
      <div className="mt-4 flex items-center gap-1.5">
        {Array.from({ length: Math.min(streak, 14) }).map((_, i) => (
          <div
            key={i}
            className={`h-2.5 flex-1 rounded-full transition-all ${isDark ? "bg-amber-300" : "bg-orange-400"}`}
            style={{ opacity: 0.4 + (i / Math.min(streak, 14)) * 0.6 }}
          />
        ))}
        {streak > 14 && (
          <span className={`ml-1 text-xs font-bold ${isDark ? "text-amber-300" : "text-orange-600"}`}>
            +{streak - 14}
          </span>
        )}
      </div>
    </div>
  );
};

// ── Grade Content Card (Using Radar Chart) ──
const GradeCard = ({
  data,
  t,
}: {
  data: GradeSharedData;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) => {
  const rank: UserRank = data.userRank ?? "BRONZE";
  const rankLower = rank.charAt(0) + rank.slice(1).toLowerCase();
  const rankKey = `rank${rankLower}` as
    | "rankDiamond"
    | "rankGold"
    | "rankSilver"
    | "rankBronze";

  const skills: SkillOverviewDTO | null = data.profileSkillsOverview;

  const radarLabels = [
    t("Interview:skills.coreKnowledge", { defaultValue: "Kiến thức nền" }),
    t("Interview:skills.problemSolving", { defaultValue: "Giải quyết vấn đề" }),
    t("Interview:skills.appliedExperience", { defaultValue: "Kinh nghiệm thực tiễn" }),
    t("Interview:skills.logicalArticulation", { defaultValue: "Diễn đạt logic" }),
    t("Interview:skills.focusAndCompleteness", { defaultValue: "Tập trung & hoàn thiện" }),
  ];

  const userValues = skills
    ? [
        skills.coreKnowledge ?? 0,
        skills.problemSolving ?? 0,
        skills.appliedExperience ?? 0,
        skills.logicalArticulation ?? 0,
        skills.focusAndCompleteness ?? 0,
      ]
    : [0, 0, 0, 0, 0];

  const benchmarkRole =
    data.level && data.position
      ? `${data.level}_${data.position}`
      : data.position || data.level || "default";
  const benchmarkValues = getBenchmarkByTitleOrRole(benchmarkRole);

  const hasProfileDetails =
    Boolean(data.position) ||
    Boolean(data.level) ||
    (data.totalCompletedInterviewsProfile !== undefined &&
      data.totalCompletedInterviewsProfile !== null);

  return (
    <div className="rounded-xl border border-zinc-200 bg-gradient-to-br from-indigo-50/30 via-white to-zinc-50/50 p-5 shadow-xs">
      {/* Top: GPA Header & Profile Specific Info */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: GPA Score */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100 shadow-xs shrink-0">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-500">
              {t("gradeTitle")}
            </p>
            <p className="text-xl sm:text-2xl font-extrabold text-zinc-900">
              {t("gradeScore", { score: (data.profileGpa ?? 0).toFixed(1) })}
            </p>
          </div>
        </div>

        {/* Right: Profile Position, Level & Profile Interviews */}
        {hasProfileDetails && (
          <div className="flex flex-col items-end gap-1 text-right">
            <div className="flex flex-wrap items-center gap-1.5 justify-end">
              {data.position && (
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200/60">
                  {formatCapitalize(data.position)}
                </span>
              )}
              {data.level && (
                <span className="inline-flex items-center rounded-full bg-fuchsia-50 px-2.5 py-0.5 text-xs font-semibold text-fuchsia-700 border border-fuchsia-200/60">
                  {formatCapitalize(data.level)}
                </span>
              )}
            </div>
            {data.totalCompletedInterviewsProfile !== undefined &&
              data.totalCompletedInterviewsProfile !== null && (
                <div className="flex items-center gap-1 text-xs text-zinc-500 font-medium">
                  <Briefcase className="h-3.5 w-3.5 text-zinc-400" />
                  <span>
                    {t("profileCompletedInterviews", {
                      count: data.totalCompletedInterviewsProfile,
                    })}
                  </span>
                </div>
              )}
          </div>
        )}
      </div>

      {/* Radar Chart Display */}
      {skills && (
        <div className="mt-4 rounded-xl border border-zinc-200/80 bg-white/80 p-3.5 shadow-2xs backdrop-blur-xs">
          <p className="text-center text-xs font-semibold text-zinc-700 mb-1">
            {t("radarTitle", { defaultValue: "Biểu đồ tổng quan năng lực" })}
          </p>
          <div className="flex justify-center">
            <RadarChart
              userValues={userValues}
              benchmarkValues={benchmarkValues}
              labels={radarLabels}
              benchmarkLabel={t("Interview:radar.benchmark", {
                defaultValue: "Chuẩn mục tiêu",
              })}
              userScoreLabel={t("Interview:radar.userScore", {
                defaultValue: "Điểm của bạn",
              })}
            />
          </div>

          {/* 2 Legend Notes */}
          <div className="mt-2 flex items-center justify-center gap-5 text-xs text-zinc-500">
            <div className="flex items-center gap-1.5">
              <svg width="20" height="8">
                <line
                  x1="0"
                  y1="4"
                  x2="20"
                  y2="4"
                  stroke="#eab308"
                  strokeWidth="2"
                  strokeDasharray="4,3"
                />
                <circle cx="10" cy="4" r="3" fill="#eab308" />
              </svg>
              <span className="font-medium text-zinc-600">
                {t("Interview:radar.benchmark", {
                  defaultValue: "Chuẩn mục tiêu",
                })}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg width="20" height="8">
                <line
                  x1="0"
                  y1="4"
                  x2="20"
                  y2="4"
                  stroke="#7c3aed"
                  strokeWidth="2.5"
                />
                <circle cx="10" cy="4" r="3" fill="#7c3aed" />
              </svg>
              <span className="font-medium text-zinc-600">
                {t("Interview:radar.userScore", {
                  defaultValue: "Điểm của bạn",
                })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Account Info Stats: userRank & totalCompletedInterviews của tài khoản */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 border-t border-zinc-100 pt-3 text-xs">
        {/* Account Rank Badge */}
        <div className="flex items-center gap-2">
          <span className="text-zinc-500 font-medium">{t("accountRank")}:</span>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${getRankBadgeStyle(
              rank
            )}`}
          >
            {t(rankKey)}
          </span>
        </div>

        {/* Total Completed Interviews of Account */}
        <div className="flex items-center gap-1.5 font-medium text-zinc-600">
          <MessageCircle className="h-3.5 w-3.5 text-zinc-400" />
          <span>
            {t("accountCompletedInterviews", {
              count: data.totalCompletedInterviews ?? 0,
            })}
          </span>
        </div>
      </div>
    </div>
  );
};

// ── Facebook-style Reaction Hover Popover Component ──
interface FacebookReactionPopoverProps {
  myReaction: ReactionType | null;
  totalLove: number;
  totalHaha: number;
  totalWow: number;
  onReact: (type: ReactionType | "") => void;
}

const FacebookReactionPopover = ({
  myReaction,
  totalLove,
  totalHaha,
  totalWow,
  onReact,
}: FacebookReactionPopoverProps) => {
  const { t } = useTranslation("Forum");
  const [showPopover, setShowPopover] = useState(false);
  const popoverTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click / tap
  useEffect(() => {
    if (!showPopover) return;
    const handleOutsideInteraction = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowPopover(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideInteraction);
    document.addEventListener("touchstart", handleOutsideInteraction);
    return () => {
      document.removeEventListener("mousedown", handleOutsideInteraction);
      document.removeEventListener("touchstart", handleOutsideInteraction);
    };
  }, [showPopover]);

  const handleMouseEnter = () => {
    // Only open on hover on devices that actually support hover (desktops)
    if (typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches) {
      if (popoverTimeoutRef.current) clearTimeout(popoverTimeoutRef.current);
      setShowPopover(true);
    }
  };

  const handleMouseLeave = () => {
    if (typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches) {
      popoverTimeoutRef.current = setTimeout(() => {
        setShowPopover(false);
      }, 250);
    }
  };

  const reactionsList: Array<{
    type: ReactionType;
    icon: string;
    label: string;
  }> = [
    { type: "LOVE", icon: "❤️", label: t("reactLove") },
    { type: "HAHA", icon: "😂", label: t("reactHaha") },
    { type: "WOW", icon: "😮", label: t("reactHaha") === "Haha" ? "Wow" : t("reactWow") },
  ];

  const totalCount = totalLove + totalHaha + totalWow;

  // Lấy 1 icon và 1 label, KHÔNG lặp lại emoji trong label!
  const getReactionDisplay = () => {
    switch (myReaction) {
      case "LOVE":
        return { label: "Love", icon: "❤️", color: "text-rose-600 font-bold" };
      case "HAHA":
        return { label: "Haha", icon: "😂", color: "text-amber-600 font-bold" };
      case "WOW":
        return { label: "Wow", icon: "😮", color: "text-blue-600 font-bold" };
      default:
        return { label: "Love", icon: null, color: "text-zinc-600 font-medium" };
    }
  };

  const currentDisplay = getReactionDisplay();

  const handleMainButtonClick = () => {
    // Luôn đóng popover khi người dùng bấm trực tiếp vào nút Love
    setShowPopover(false);
    if (popoverTimeoutRef.current) clearTimeout(popoverTimeoutRef.current);

    // Nếu đã có reaction -> click để hủy (gửi "")
    // Nếu chưa có -> click để thả LOVE
    if (myReaction) {
      onReact("");
    } else {
      onReact("LOVE");
    }
  };

  const handleSelectReaction = (type: ReactionType) => {
    if (myReaction === type) {
      // Click lại đúng loại đang chọn -> hủy
      onReact("");
    } else {
      onReact(type);
    }
    setShowPopover(false);
  };

  return (
    <div className="flex items-center justify-between w-full border-t border-zinc-100 pt-2.5">
      {/* Reaction Hover / Touch Container */}
      <div
        ref={containerRef}
        className="relative inline-block"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Floating Facebook Popover */}
        {showPopover && (
          <div
            className="absolute bottom-full left-0 mb-2 z-40 flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white/95 px-3 py-1.5 shadow-2xl backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {reactionsList.map((r) => {
              const isSelected = myReaction === r.type;
              return (
                <button
                  key={r.type}
                  type="button"
                  onClick={() => handleSelectReaction(r.type)}
                  className={`group relative text-2xl p-1 rounded-full transition-transform duration-200 hover:scale-130 active:scale-110 cursor-pointer ${
                    isSelected ? "bg-stone-200 ring-2 ring-stone-200" : ""
                  }`}
                  title={r.label}
                >
                  <span>{r.icon}</span>
                  <span className="absolute -top-7 left-1/2 -translate-x-1/2 rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-sm pointer-events-none">
                    {r.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Main React Action Button */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={handleMainButtonClick}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs sm:text-sm transition-all active:scale-95 cursor-pointer ${
              myReaction
                ? "border-zinc-300 bg-zinc-100/90 shadow-2xs"
                : "border-zinc-200 bg-white hover:bg-zinc-50"
            }`}
          >
            {currentDisplay.icon ? (
              <span className="text-base leading-none">{currentDisplay.icon}</span>
            ) : (
              <Heart className="h-4 w-4 text-zinc-500" />
            )}
            <span className={currentDisplay.color}>{currentDisplay.label}</span>
          </button>

          {/* Trigger button cho mobile tiện bấm mở picker */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowPopover((prev) => !prev);
            }}
            className="sm:hidden ml-1 flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 cursor-pointer active:scale-95"
            title={t("react")}
          >
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform duration-200 ${showPopover ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Reactions Summary Counters */}
      {totalCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
          {totalLove > 0 && (
            <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full border border-rose-200">
              ❤️ {totalLove}
            </span>
          )}
          {totalHaha > 0 && (
            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
              😂 {totalHaha}
            </span>
          )}
          {totalWow > 0 && (
            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
              😮 {totalWow}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// ── Delete Confirmation Modal ──
const DeletePostModal = ({
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
        className="absolute inset-0 bg-black/40 backdrop-blur-xs"
        onClick={onClose}
      />
      <div className="relative z-10 mx-4 w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
        <h3 className="text-base font-semibold text-zinc-900">
          {t("deleteConfirmTitle")}
        </h3>
        <p className="mt-2 text-sm text-zinc-500">
          {t("deleteConfirmMessage")}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 cursor-pointer"
          >
            {t("deleteCancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
          >
            {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {t("deleteConfirm")}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Toast Notification Component ──
interface ToastProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}

const Toast = ({ message, type, onClose }: ToastProps) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 left-6 z-50 flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-xl animate-in slide-in-from-bottom-5 fade-in duration-200">
      {type === "success" ? (
        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
      ) : (
        <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
      )}
      <p className="text-sm font-medium text-zinc-800">{message}</p>
      <button
        type="button"
        onClick={onClose}
        className="ml-2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

// ── Forum Post Card ──
interface PostCardProps {
  post: ForumPost;
  isMineTab: boolean;
  lang: string;
  onReact: (postId: number, type: ReactionType | "") => void;
  onToggleVisibility: (postId: number) => void;
  onDelete: (postId: number) => void;
}

const PostCard = ({
  post,
  isMineTab,
  onReact,
  onToggleVisibility,
  onDelete,
}: PostCardProps) => {
  const { t } = useTranslation("Forum");
  const timeAgo = useTimeAgo();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const isStreak = post.postType === "STREAK";
  const authorName = post.userFullName || t("anonymousUser");

  return (
    <article className="rounded-xl border border-zinc-200 bg-white transition-shadow hover:shadow-md">
      {/* Header with User Info */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar */}
          <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 shadow-xs">
            {post.userAvatarUrl ? (
              <img
                src={post.userAvatarUrl}
                alt={authorName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-zinc-400 bg-zinc-100 font-bold text-sm">
                {authorName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          {/* User Name + Badge + Time */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-zinc-900 truncate max-w-[180px]">
                {authorName}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  isStreak
                    ? "bg-orange-100 text-orange-700"
                    : "bg-pink-100 text-rose-700"
                }`}
              >
                {isStreak ? (
                  <Flame className="h-3 w-3" />
                ) : (
                  <Trophy className="h-3 w-3" />
                )}
                {isStreak ? t("streakTitle") : t("gradeTitle")}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              {timeAgo(post.createdAt)}
            </p>
          </div>
        </div>

        {/* Visibility toggle & Delete button (only for own posts) */}
        {isMineTab && (
          <div className="flex items-center gap-1 shrink-0">
            {/* Delete button */}
            <button
              type="button"
              onClick={() => onDelete(post.postId)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
              title={t("deletePost")}
            >
              <Trash2 className="h-4 w-4" />
            </button>

            {/* Visibility toggle dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 cursor-pointer"
                title={t("toggleVisibility")}
              >
                {post.visible ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4 text-rose-500" />
                )}
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full z-20 mt-1 min-w-[180px] rounded-xl border border-zinc-200 bg-white py-1.5 shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      onToggleVisibility(post.postId);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-zinc-700 transition hover:bg-zinc-50 cursor-pointer"
                  >
                    {post.visible ? (
                      <>
                        <EyeOff className="h-4 w-4 text-zinc-400" />
                        <span>{t("hidePost")}</span>
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 text-zinc-400" />
                        <span>{t("showPost")}</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className={`px-4 pb-3 ${!post.visible && isMineTab ? "opacity-50" : ""}`}>
        {isStreak ? (
          <StreakCard data={post.sharedData as StreakSharedData} t={t} />
        ) : (
          <GradeCard data={post.sharedData as GradeSharedData} t={t} />
        )}
      </div>

      {/* Facebook Reaction Hover Popover Bar */}
      <div className="px-4 pb-3">
        <FacebookReactionPopover
          myReaction={post.myReaction}
          totalLove={post.totalLove}
          totalHaha={post.totalHaha}
          totalWow={post.totalWow}
          onReact={(type) => onReact(post.postId, type)}
        />
      </div>
    </article>
  );
};

// ── Skeleton Loader ──
const PostSkeleton = () => (
  <div className="animate-pulse rounded-xl border border-zinc-200 bg-white">
    <div className="flex items-center gap-3 px-4 pt-4 pb-3">
      <div className="h-10 w-10 rounded-full bg-zinc-200" />
      <div className="flex-1">
        <div className="h-5 w-24 rounded-full bg-zinc-200" />
        <div className="mt-1 h-3 w-16 rounded bg-zinc-100" />
      </div>
    </div>
    <div className="px-4 pb-3">
      <div className="h-28 rounded-xl bg-zinc-100" />
    </div>
    <div className="flex items-center gap-2 border-t border-zinc-100 px-4 py-3">
      <div className="h-8 w-16 rounded-full bg-zinc-100" />
      <div className="h-8 w-16 rounded-full bg-zinc-100" />
    </div>
  </div>
);

// ── Empty State ──
const EmptyState = ({ isMine }: { isMine: boolean }) => {
  const { t } = useTranslation("Forum");
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
        <MessageCircle className="h-7 w-7 text-zinc-400" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-zinc-700">
        {isMine ? t("noMyPostsYet") : t("noPostsYet")}
      </h3>
      <p className="mt-1 text-sm text-zinc-500">
        {isMine ? t("noMyPostsYetDesc") : t("noPostsYetDesc")}
      </p>
    </div>
  );
};

// ── Streak Leaderboard ──
const StreakLeaderboard = ({ hideHeader = false }: { hideHeader?: boolean }) => {
  const { t } = useTranslation("Forum");
  const { leaderboard, isLoadingLeaderboard } = useForumStore();

  if (isLoadingLeaderboard) {
    return (
      <div className={`rounded-xl border border-zinc-200 bg-white p-5 shadow-xs ${hideHeader ? "border-0 shadow-none p-2" : ""}`}>
        <div className="animate-pulse space-y-3">
          {!hideHeader && <div className="h-5 w-32 rounded bg-zinc-200" />}
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-zinc-200" />
              <div className="h-4 flex-1 rounded bg-zinc-100" />
              <div className="h-4 w-10 rounded bg-zinc-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const getMedalIcon = (index: number) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return null;
  };

  return (
    <div className={`rounded-xl border border-zinc-200 bg-white shadow-xs ${hideHeader ? "border-0 shadow-none" : ""}`}>
      {!hideHeader && (
        <div className="flex items-center gap-2 border-b border-zinc-100 px-5 py-4">
          <Crown className="h-5 w-5 text-amber-500" />
          <h3 className="text-sm font-bold text-zinc-900">
            {t("leaderboardTitle")}
          </h3>
        </div>
      )}
      {leaderboard.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 mb-3">
            <Flame className="h-6 w-6 text-amber-500" />
          </div>
          <p className="text-sm font-semibold text-zinc-800">
            {t("leaderboardEmpty")}
          </p>
          <p className="mt-1 text-xs text-zinc-500 max-w-[220px]">
            {t("leaderboardEmptyDesc")}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100">
          {leaderboard.map((entry, index) => (
            <div
              key={`${entry.fullName}-${index}`}
              className={`flex items-center gap-3 px-4 py-3 transition hover:bg-zinc-50 ${index < 3 ? "bg-amber-50/20" : ""}`}
            >
              {/* Rank number / medal */}
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center">
                {getMedalIcon(index) ? (
                  <span className="text-base">{getMedalIcon(index)}</span>
                ) : (
                  <span className="text-xs font-bold text-zinc-400">
                    {index + 1}
                  </span>
                )}
              </div>
              {/* Avatar */}
              <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100">
                {entry.avatarUrl ? (
                  <img
                    src={entry.avatarUrl}
                    alt={entry.fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-zinc-400 font-bold text-xs">
                    {entry.fullName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {/* Name */}
              <span className="flex-1 truncate text-sm font-semibold text-zinc-800">
                {entry.fullName}
              </span>
              {/* Streak */}
              <div className="flex items-center gap-1 text-sm font-extrabold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                <Flame className="h-3.5 w-3.5" />
                {entry.currentStreak}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main Forum Page ──
const ForumPage = () => {
  const { t, i18n } = useTranslation(["Forum", "Interview"]);
  const [isMobileLeaderboardOpen, setIsMobileLeaderboardOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const observerRef = useRef<HTMLDivElement | null>(null);

  const {
    posts,
    hasNext,
    filter,
    visibleFilter,
    isLoading,
    isLoadingMore,
    fetchPosts,
    refreshPosts,
    loadMore,
    setFilter,
    setVisibleFilter,
    reactPost,
    toggleVisibility,
    deletePost,
    fetchLeaderboard,
    reset,
  } = useForumStore();

  // Fetch on mount
  useEffect(() => {
    fetchPosts();
    fetchLeaderboard();
    return () => reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Infinite scroll observer: Automatically triggers loadMore when sentinel enters viewport
  useEffect(() => {
    if (!hasNext || isLoading || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          void loadMore();
        }
      },
      { threshold: 0.1, rootMargin: "250px" }
    );

    const currentTarget = observerRef.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasNext, isLoading, isLoadingMore, loadMore]);

  const handleReact = useCallback(
    (postId: number, reactType: ReactionType | "") => {
      reactPost(postId, reactType);
    },
    [reactPost]
  );

  const handleToggleVisibility = useCallback(
    (postId: number) => {
      toggleVisibility(postId);
    },
    [toggleVisibility]
  );

  const handleDeletePost = useCallback((postId: number) => {
    setDeleteTarget(postId);
  }, []);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const res = await deletePost(deleteTarget);
    setIsDeleting(false);
    setDeleteTarget(null);
    if (res.success) {
      setToast({ message: t("deleteSuccess"), type: "success" });
    } else {
      setToast({
        message: res.message || t("deleteError"),
        type: "error",
      });
    }
  };

  const handleRefresh = async () => {
    await refreshPosts();
  };

  return (
    <div className="w-full">
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* ── Main Feed Column ── */}
          <div className="flex-1 min-w-0 max-w-xl mx-auto lg:mx-0 w-full">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
                {t("title")}
              </h1>
            </div>

            {/* Filter Tabs, Sub-filter & Refresh Button */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-0.5">
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className={`relative px-4 py-3 text-sm font-semibold transition cursor-pointer ${
                    filter === "all"
                      ? "text-zinc-900"
                      : "text-zinc-500 hover:text-zinc-700"
                  }`}
                >
                  {t("filterAll")}
                  {filter === "all" && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-zinc-900" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("mine")}
                  className={`relative px-4 py-3 text-sm font-semibold transition cursor-pointer ${
                    filter === "mine"
                      ? "text-zinc-900"
                      : "text-zinc-500 hover:text-zinc-700"
                  }`}
                >
                  {t("filterMine")}
                  {filter === "mine" && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-zinc-900" />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2 pb-1">
                {/* Sub-filter for My Posts (Visible / Hidden) */}
                {filter === "mine" && (
                  <div className="flex items-center gap-1">
                    <Filter className="h-3.5 w-3.5 text-zinc-400" />
                    <select
                      value={visibleFilter === undefined ? "all" : visibleFilter ? "true" : "false"}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "all") setVisibleFilter(undefined);
                        else if (val === "true") setVisibleFilter(true);
                        else if (val === "false") setVisibleFilter(false);
                      }}
                      className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 shadow-2xs hover:bg-zinc-50 cursor-pointer focus:outline-hidden"
                    >
                      <option value="all">{t("allVisible")}</option>
                      <option value="true">{t("onlyVisible")}</option>
                      <option value="false">{t("onlyHidden")}</option>
                    </select>
                  </div>
                )}

                {/* Refresh Public Posts Button */}
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-2xs transition hover:bg-zinc-50 active:scale-95 disabled:opacity-60 cursor-pointer"
                  title={t("refreshTooltip")}
                >
                  <RotateCcw
                    className={`h-3.5 w-3.5 text-zinc-600 transition-transform ${
                      isLoading ? "animate-spin [animation-direction:reverse]" : ""
                    }`}
                  />
                  <span>{t("refresh")}</span>
                </button>
              </div>
            </div>

            {/* Feed */}
            <div className="flex flex-col gap-5">
              {isLoading ? (
                <>
                  <PostSkeleton />
                  <PostSkeleton />
                  <PostSkeleton />
                </>
              ) : posts.length === 0 ? (
                <EmptyState isMine={filter === "mine"} />
              ) : (
                posts.map((post) => (
                  <PostCard
                    key={post.postId}
                    post={post}
                    isMineTab={filter === "mine"}
                    lang={i18n.language}
                    onReact={handleReact}
                    onToggleVisibility={handleToggleVisibility}
                    onDelete={handleDeletePost}
                  />
                ))
              )}
            </div>

            {/* Infinite Scroll Sentinel & Loading Indicator */}
            {hasNext && (
              <div ref={observerRef} className="py-6 flex justify-center">
                {isLoadingMore && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-600 shadow-xs">
                    <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                    <span>{t("loading")}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Desktop Sidebar: Leaderboard (Hidden on mobile) ── */}
          <aside className="hidden lg:block w-80 lg:flex-shrink-0">
            <div className="sticky top-20">
              <StreakLeaderboard />
            </div>
          </aside>
        </div>
      </section>

      {/* ── Mobile Floating Action Button (FAB) for Leaderboard ── */}
      <div className="fixed bottom-6 right-6 z-40 lg:hidden">
        <button
          type="button"
          onClick={() => setIsMobileLeaderboardOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-3 text-xs font-bold text-white shadow-xl shadow-zinc-900/30 transition hover:bg-zinc-800 active:scale-95 cursor-pointer border border-zinc-700/50"
          title={t("mobileLeaderboardBtn")}
        >
          <Crown className="h-4 w-4 text-amber-400 fill-amber-400" />
          <span>{t("mobileLeaderboardBtn")}</span>
        </button>
      </div>

      {/* ── Mobile Leaderboard Modal / Bottom Sheet ── */}
      {isMobileLeaderboardOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200 lg:hidden"
          onClick={() => setIsMobileLeaderboardOpen(false)}
        >
          <div
            className="w-full sm:max-w-md max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                <h3 className="text-base font-bold text-zinc-900">
                  {t("leaderboardTitle")}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileLeaderboardOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition cursor-pointer"
                title={t("close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Render Leaderboard content */}
            <div className="overflow-y-auto max-h-[60vh]">
              <StreakLeaderboard hideHeader />
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      <DeletePostModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
        t={t}
      />

      {/* ── Toast Notification ── */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default ForumPage;

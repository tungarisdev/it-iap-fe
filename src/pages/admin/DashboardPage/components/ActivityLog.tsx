import { useState } from "react";
import { RefreshCw, ChevronLeft, ChevronRight, Activity } from "lucide-react";
import { useTranslation } from "react-i18next";
import type {
  PaginatedActivities,
  ActionTypeFilter,
} from "../../../../services/admin/adminDashboardService";
import CustomDropdown from "../../../../components/CustomDropdown";

interface ActivityLogProps {
  data: PaginatedActivities | null;
  actionTypeFilter: ActionTypeFilter;
  onActionTypeChange: (type: ActionTypeFilter) => void;
  onRefresh: () => void;
  onPageChange: (page: number) => void;
  currentPage: number;
  isLoading: boolean;
}

const ACTION_TYPE_OPTIONS: { value: ActionTypeFilter; labelKey: string }[] = [
  { value: "--", labelKey: "activity.actionTypes.all" },
  { value: "CREATE_MANUAL_QUESTION", labelKey: "activity.actionTypes.CREATE_MANUAL_QUESTION" },
  { value: "GENERATE_AI_QUESTIONS", labelKey: "activity.actionTypes.GENERATE_AI_QUESTIONS" },
  { value: "CREATE_PROMPT", labelKey: "activity.actionTypes.CREATE_PROMPT" },
  { value: "CREATE_PROMPT_VERSION", labelKey: "activity.actionTypes.CREATE_PROMPT_VERSION" },
  { value: "ACTIVATE_PROMPT_VERSION", labelKey: "activity.actionTypes.ACTIVATE_PROMPT_VERSION" },
];

const ACTION_TYPE_COLORS: Record<string, string> = {
  CREATE_MANUAL_QUESTION: "bg-indigo-50 text-indigo-700 border-indigo-200",
  GENERATE_AI_QUESTIONS: "bg-violet-50 text-violet-700 border-violet-200",
  CREATE_PROMPT: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CREATE_PROMPT_VERSION: "bg-amber-50 text-amber-700 border-amber-200",
  ACTIVATE_PROMPT_VERSION: "bg-sky-50 text-sky-700 border-sky-200",
};

const ActivityLog = ({
  data,
  actionTypeFilter,
  onActionTypeChange,
  onRefresh,
  onPageChange,
  currentPage,
  isLoading,
}: ActivityLogProps) => {
  const { t } = useTranslation("AdminDashboard");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
            <Activity size={18} />
          </div>
          <h3 className="text-base font-semibold text-zinc-900">
            {t("activity.title")}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <CustomDropdown
            value={actionTypeFilter}
            options={ACTION_TYPE_OPTIONS.map((opt) => ({
              value: opt.value,
              label: t(opt.labelKey),
            }))}
            onChange={onActionTypeChange}
            menuClassName="min-w-[200px]"
          />

          <button
            onClick={onRefresh}
            disabled={isLoading}
            title={t("activity.refresh")}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 transition-all hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-700 disabled:opacity-50"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Table */}
      {isLoading && !data ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex animate-pulse items-center gap-4">
              <div className="h-4 w-6 rounded bg-zinc-100" />
              <div className="h-5 w-28 rounded-full bg-zinc-100" />
              <div className="h-4 w-48 flex-1 rounded bg-zinc-100" />
              <div className="h-4 w-28 rounded bg-zinc-100" />
              <div className="h-4 w-20 rounded bg-zinc-100" />
            </div>
          ))}
        </div>
      ) : data && data.content.length > 0 ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="pb-3 pr-4 text-xs font-medium uppercase tracking-wider text-zinc-400">
                    {t("activity.columns.id")}
                  </th>
                  <th className="pb-3 pr-4 text-xs font-medium uppercase tracking-wider text-zinc-400">
                    {t("activity.columns.actionType")}
                  </th>
                  <th className="pb-3 pr-4 text-xs font-medium uppercase tracking-wider text-zinc-400">
                    {t("activity.columns.description")}
                  </th>
                  <th className="pb-3 pr-4 text-xs font-medium uppercase tracking-wider text-zinc-400">
                    {t("activity.columns.admin")}
                  </th>
                  <th className="pb-3 text-xs font-medium uppercase tracking-wider text-zinc-400">
                    {t("activity.columns.time")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {data.content.map((item) => (
                  <tr key={item.id} className="group transition-colors hover:bg-zinc-50/50">
                    <td className="py-3 pr-4 text-sm text-zinc-500">
                      {item.id}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                          ACTION_TYPE_COLORS[item.actionType] ??
                          "bg-zinc-50 text-zinc-600 border-zinc-200"
                        }`}
                      >
                        {t(
                          `activity.actionTypes.${item.actionType}`,
                          { defaultValue: item.actionType }
                        )}
                      </span>
                    </td>
                    <td
                      className={`max-w-xs py-3 pr-4 text-sm text-zinc-600 cursor-pointer ${
                        expandedIds.has(item.id) ? "whitespace-normal break-words" : "truncate"
                      }`}
                      onClick={() => toggleExpand(item.id)}
                      title={item.description}
                    >
                      {item.description}
                    </td>
                    <td className="py-3 pr-4 text-sm text-zinc-600">
                      {item.adminEmail?.split("@")[0] ?? "—"}
                    </td>
                    <td className="py-3 text-sm text-zinc-400 whitespace-nowrap">
                      {item.createdAt}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-4">
              <span className="text-xs text-zinc-500">
                {t("activity.page", {
                  current: currentPage,
                  total: totalPages,
                })}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={data.first || isLoading}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition-all hover:bg-zinc-50 disabled:opacity-40"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={data.last || isLoading}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition-all hover:bg-zinc-50 disabled:opacity-40"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex h-32 items-center justify-center text-sm text-zinc-400">
          {t("activity.empty")}
        </div>
      )}
    </div>
  );
};

export default ActivityLog;

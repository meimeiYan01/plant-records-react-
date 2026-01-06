import { useMemo, useState } from "react";
import { Badge, Button, ImageFromIdb } from "../ui";
import { formatDateTime, formatDate, LOG_TYPES } from "../../utils";
import { ImageViewer } from "../ui/ImageViewer";
import { AdvancedFilter } from "../ui/AdvancedFilter";

export function LogsTab({ logs, plants, getUrlForKey, onAdd, onEdit, onDelete, openImageViewer, onUpdate }) {
  const [filterType, setFilterType] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [viewMode, setViewMode] = useState("list"); // "list" | "timeline"
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({});

  // 获取所有使用的标签
  const allTags = useMemo(() => {
    const tagSet = new Set();
    logs.forEach((log) => {
      if (log.tags && Array.isArray(log.tags)) {
        log.tags.forEach((tag) => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    let result = [...logs];

    // 基础类型筛选（包括待办类型）
    if (filterType !== "all" && filterType !== "pinned") {
      result = result.filter((log) => log.type === filterType);
    }

    // 置顶筛选
    if (filterType === "pinned") {
      result = result.filter((log) => log.isPinned === true);
    }

    // 文本搜索
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      result = result.filter(
        (log) =>
          log.title.toLowerCase().includes(search) ||
          log.content?.toLowerCase().includes(search) ||
          log.tags?.some((t) => t.toLowerCase().includes(search))
      );
    }

    // 高级筛选
    if (advancedFilters.dateFrom) {
      result = result.filter((log) => formatDate(log.date) >= advancedFilters.dateFrom);
    }
    if (advancedFilters.dateTo) {
      result = result.filter((log) => formatDate(log.date) <= advancedFilters.dateTo);
    }
    if (advancedFilters.selectedTags && advancedFilters.selectedTags.length > 0) {
      result = result.filter((log) =>
        advancedFilters.selectedTags.some((tag) => log.tags?.includes(tag))
      );
    }
    if (advancedFilters.selectedPlants && advancedFilters.selectedPlants.length > 0) {
      result = result.filter((log) =>
        advancedFilters.selectedPlants.some((plantId) =>
          log.relatedPlants?.includes(plantId)
        )
      );
    }
    if (advancedFilters.hasPhotos === "yes") {
      result = result.filter((log) => log.photos && log.photos.length > 0);
    } else if (advancedFilters.hasPhotos === "no") {
      result = result.filter((log) => !log.photos || log.photos.length === 0);
    }

    // 排序逻辑：置顶优先，然后按时间倒序
    return result.sort((a, b) => {
      // 置顶优先
      const aPinned = a.isPinned ?? false;
      const bPinned = b.isPinned ?? false;
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      
      // 如果都是置顶，按置顶时间倒序
      if (aPinned && bPinned) {
        const aPinnedAt = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
        const bPinnedAt = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
        if (bPinnedAt !== aPinnedAt) return bPinnedAt - aPinnedAt;
      }
      
      // 按日期倒序
      return new Date(b.date) - new Date(a.date);
    });
  }, [logs, filterType, searchText, advancedFilters]);

  // 按日期分组（用于时间线视图）
  const groupedLogs = useMemo(() => {
    if (viewMode !== "timeline") return null;

    const groups = {};
    filteredLogs.forEach((log) => {
      const dateKey = formatDate(log.date);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(log);
    });

    return Object.entries(groups)
      .sort((a, b) => new Date(b[0]) - new Date(a[0]))
      .map(([date, logs]) => ({ date, logs }));
  }, [filteredLogs, viewMode]);

  function getPlantNames(plantIds) {
    if (!plantIds || plantIds.length === 0) return [];
    return plantIds.map((id) => plants.find((p) => p.id === id)?.name).filter(Boolean);
  }

  function handleImageClick(log, photoIndex = 0) {
    if (log.photos && log.photos.length > 0) {
      const images = log.photos.map((key) => ({
        key,
        ext: "jpg",
        filename: `${log.title}-${formatDateTime(log.date).replace(/[:\s]/g, "-")}.jpg`,
      }));
      openImageViewer(images, photoIndex);
    }
  }

  function formatDateDisplay(dateStr) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // 使用本地时区的日期进行比较
    const dateStrFormatted = formatDate(dateStr);
    const todayStr = formatDate(today.toISOString());
    const yesterdayStr = formatDate(yesterday.toISOString());

    if (dateStrFormatted === todayStr) {
      return "今天";
    } else if (dateStrFormatted === yesterdayStr) {
      return "昨天";
    } else {
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${month}月${day}日`;
    }
  }

  const hasActiveFilters = Object.keys(advancedFilters).some(
    (key) =>
      advancedFilters[key] &&
      (Array.isArray(advancedFilters[key]) ? advancedFilters[key].length > 0 : advancedFilters[key] !== "all")
  );

  return (
    <div className="space-y-4 pb-20">
      {/* 筛选和搜索 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 gap-2 overflow-x-auto">
            <button
              onClick={() => setFilterType("all")}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs transition ${
                filterType === "all"
                  ? "border-zinc-900 dark:border-zinc-600 bg-zinc-900 dark:bg-zinc-700 text-white dark:text-zinc-100"
                  : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
              }`}
            >
              全部
            </button>
            {LOG_TYPES.map((t) => (
              <button
                key={t.key}
                onClick={() => setFilterType(t.key)}
                className={`shrink-0 rounded-full border px-3 py-1 text-xs transition ${
                  filterType === t.key
                    ? "border-zinc-900 dark:border-zinc-600 bg-zinc-900 dark:bg-zinc-700 text-white dark:text-zinc-100"
                    : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowAdvancedFilter(true)}
            className={`shrink-0 rounded-lg border px-3 py-1 text-xs transition ${
              hasActiveFilters
                ? "border-zinc-900 dark:border-zinc-600 bg-zinc-900 dark:bg-zinc-700 text-white dark:text-zinc-100"
                : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
            }`}
            title="高级筛选"
          >
            🔍
          </button>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="搜索日志..."
            className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:focus:border-zinc-600"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <div className="flex rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-2 text-xs transition ${
                viewMode === "list"
                  ? "bg-zinc-900 dark:bg-zinc-700 text-white dark:text-zinc-100"
                  : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
              }`}
            >
              列表
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={`px-3 py-2 text-xs transition ${
                viewMode === "timeline"
                  ? "bg-zinc-900 dark:bg-zinc-700 text-white dark:text-zinc-100"
                  : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
              }`}
            >
              时间线
            </button>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
            <span>已应用筛选：</span>
            <button
              onClick={() => setAdvancedFilters({})}
              className="text-zinc-900 dark:text-zinc-200 underline hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              清除
            </button>
          </div>
        )}
      </div>

      {/* 日志列表 */}
      {filteredLogs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-8 text-center">
          <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">还没有日志</div>
          <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">点击下方按钮创建第一条日志</div>
        </div>
      ) : viewMode === "timeline" && groupedLogs ? (
        // 时间线视图
        <div className="space-y-6">
          {groupedLogs.map(({ date, logs }) => (
            <div key={date} className="relative">
              {/* 日期分隔线 */}
              <div className="sticky top-0 z-10 mb-4 flex items-center gap-3 bg-zinc-50 dark:bg-zinc-800 py-2">
                <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700"></div>
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{formatDateDisplay(date)}</div>
                <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700"></div>
              </div>

              {/* 该日期的日志 */}
              <div className="space-y-3">
                {logs.map((log) => (
                  <LogCard
                    key={log.id}
                    log={log}
                    plants={plants}
                    getPlantNames={getPlantNames}
                    getUrlForKey={getUrlForKey}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onUpdate={onUpdate}
                    handleImageClick={handleImageClick}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // 列表视图
        <div className="space-y-3">
          {filteredLogs.map((log) => (
            <LogCard
              key={log.id}
              log={log}
              plants={plants}
              getPlantNames={getPlantNames}
              getUrlForKey={getUrlForKey}
              onEdit={onEdit}
              onDelete={onDelete}
              onUpdate={onUpdate}
              handleImageClick={handleImageClick}
            />
          ))}
        </div>
      )}

      {/* 高级筛选弹窗 */}
      <AdvancedFilter
        isOpen={showAdvancedFilter}
        onClose={() => setShowAdvancedFilter(false)}
        onApply={setAdvancedFilters}
        tags={allTags}
        plants={plants}
        initialFilters={advancedFilters}
      />

      {/* 浮动添加按钮 */}
      <div className="fixed bottom-20 right-4 z-40 md:hidden">
        <button
          onClick={onAdd}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 dark:bg-zinc-700 text-2xl text-white dark:text-zinc-100 shadow-lg transition hover:bg-zinc-800 dark:hover:bg-zinc-600 active:scale-95"
        >
          +
        </button>
      </div>
    </div>
  );
}

// 日志卡片组件（优化后的布局）
function LogCard({ log, plants, getPlantNames, getUrlForKey, onEdit, onDelete, onUpdate, handleImageClick }) {
  const [expanded, setExpanded] = useState(false);
  const relatedPlantNames = getPlantNames(log.relatedPlants);
  const logType = LOG_TYPES.find((t) => t.key === log.type);
  const contentPreview = log.content && log.content.length > 100 ? log.content.slice(0, 100) + "..." : log.content;
  const isTodo = log.type === "todo";
  const isCompleted = log.isCompleted ?? false;
  const isPinned = log.isPinned ?? false;

  function handleTogglePinned() {
    if (!onUpdate) return;
    const updated = {
      ...log,
      isPinned: !isPinned,
      pinnedAt: !isPinned ? new Date().toISOString() : undefined,
    };
    onUpdate(updated);
  }

  function handleToggleCompleted() {
    if (!onUpdate || !isTodo) return;
    const updated = {
      ...log,
      isCompleted: !isCompleted,
      completedAt: !isCompleted ? new Date().toISOString() : undefined,
    };
    onUpdate(updated);
  }

  return (
    <div className={`rounded-2xl border p-4 shadow-sm transition hover:shadow-md ${
      isPinned 
        ? "border-blue-400 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-900/20" 
        : isTodo && !isCompleted
        ? "border-orange-300 dark:border-orange-600 bg-orange-50/50 dark:bg-orange-900/20"
        : isTodo && isCompleted
        ? "border-zinc-300 dark:border-zinc-600 bg-zinc-100/50 dark:bg-zinc-700/50"
        : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
    }`}>
      {/* 头部 */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {isPinned && <span className="text-sm" title="已置顶">📌</span>}
              {isTodo && (
                <span className="text-sm" title={isCompleted ? "已完成" : "待办事项"}>
                  {isCompleted ? "✅" : "📋"}
                </span>
              )}
              <Badge>{logType?.label || log.type}</Badge>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{formatDateTime(log.date)}</span>
              {isTodo && (
                <button
                  onClick={handleToggleCompleted}
                  className="text-xs px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
                  title={isCompleted ? "标记为未完成" : "标记为已完成"}
                >
                  {isCompleted ? "↩️" : "✅"}
                </button>
              )}
              <button
                onClick={handleTogglePinned}
                className="text-xs px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
                title={isPinned ? "取消置顶" : "置顶"}
              >
                {isPinned ? "📌" : "📌"}
              </button>
              {log.photos && log.photos.length > 0 && (
                <span className="text-xs text-zinc-400 dark:text-zinc-500">📷 {log.photos.length}</span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onEdit(log.id)}
                className="text-xs px-2.5 py-1 rounded-md bg-slate-400 hover:bg-slate-500 dark:bg-slate-500 dark:hover:bg-slate-600 text-white transition-colors font-medium"
                title="编辑"
              >
                编辑
              </button>
              <button
                onClick={() => onDelete(log.id)}
                className="text-xs px-2.5 py-1 rounded-md bg-rose-400 hover:bg-rose-500 dark:bg-rose-500 dark:hover:bg-rose-600 text-white transition-colors font-medium"
                title="删除"
              >
                删除
              </button>
            </div>
          </div>
          {log.title && (
            <div className={`mt-2 text-base font-semibold ${
              isTodo && isCompleted 
                ? "text-zinc-500 dark:text-zinc-400 line-through" 
                : "text-zinc-900 dark:text-zinc-100"
            }`}>
              {log.title}
            </div>
          )}
          {log.content && (
            <div className={`mt-2 text-sm whitespace-pre-wrap ${
              isTodo && isCompleted 
                ? "text-zinc-500 dark:text-zinc-400 line-through" 
                : "text-zinc-700 dark:text-zinc-300"
            }`}>
              {expanded ? log.content : contentPreview}
              {log.content.length > 100 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="ml-1 text-xs text-zinc-500 dark:text-zinc-400 underline hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  {expanded ? "收起" : "展开全文"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 元信息 */}
      {((log.weather && (Array.isArray(log.weather) ? log.weather.length > 0 : log.weather)) ||
        (log.mood && (Array.isArray(log.mood) ? log.mood.length > 0 : log.mood)) ||
        log.tags?.length > 0 ||
        relatedPlantNames.length > 0) && (
        <div className="mt-3 space-y-2">
          {(log.weather || log.mood) && (
            <div className="flex gap-3 text-xs text-zinc-500">
              {/* 兼容旧数据：数组格式取第一个，字符串格式直接使用 */}
              {log.weather && (
                <span>
                  🌤️ {Array.isArray(log.weather) ? log.weather[0] : log.weather}
                </span>
              )}
              {log.mood && (
                <span>
                  😊 {Array.isArray(log.mood) ? log.mood[0] : log.mood}
                </span>
              )}
            </div>
          )}
          {log.tags && log.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {log.tags.map((t) => (
                <Badge key={t}>{t}</Badge>
              ))}
            </div>
          )}
          {relatedPlantNames.length > 0 && (
            <div className="text-xs text-zinc-500">
              关联：<span className="text-zinc-700">{relatedPlantNames.join("、")}</span>
            </div>
          )}
        </div>
      )}

      {/* 照片网格（优化） */}
      {log.photos && log.photos.length > 0 && (
        <div className="mt-3">
          {log.photos.length === 1 ? (
            <div
              className="cursor-pointer rounded-xl overflow-hidden"
              onClick={() => handleImageClick(log, 0)}
            >
              <ImageFromIdb
                imgKey={log.photos[0]}
                getUrlForKey={getUrlForKey}
                alt="log"
                className="w-full h-64 object-cover hover:opacity-90 transition"
              />
            </div>
          ) : log.photos.length === 2 ? (
            <div className="grid grid-cols-2 gap-2">
              {log.photos.slice(0, 2).map((key, idx) => (
                <div
                  key={key}
                  className="cursor-pointer rounded-xl overflow-hidden"
                  onClick={() => handleImageClick(log, idx)}
                >
                  <ImageFromIdb
                    imgKey={key}
                    getUrlForKey={getUrlForKey}
                    alt="log"
                    className="w-full h-40 object-cover hover:opacity-90 transition"
                  />
                </div>
              ))}
            </div>
          ) : log.photos.length <= 4 ? (
            <div className="grid grid-cols-2 gap-2">
              {log.photos.slice(0, 4).map((key, idx) => (
                <div
                  key={key}
                  className="cursor-pointer rounded-xl overflow-hidden"
                  onClick={() => handleImageClick(log, idx)}
                >
                  <ImageFromIdb
                    imgKey={key}
                    getUrlForKey={getUrlForKey}
                    alt="log"
                    className="w-full h-32 object-cover hover:opacity-90 transition"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {log.photos.slice(0, 6).map((key, idx) => (
                <div
                  key={key}
                  className="cursor-pointer rounded-xl overflow-hidden relative"
                  onClick={() => handleImageClick(log, idx)}
                >
                  <ImageFromIdb
                    imgKey={key}
                    getUrlForKey={getUrlForKey}
                    alt="log"
                    className="w-full h-24 object-cover hover:opacity-90 transition"
                  />
                  {idx === 5 && log.photos.length > 6 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-xs font-medium rounded-xl">
                      +{log.photos.length - 6}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

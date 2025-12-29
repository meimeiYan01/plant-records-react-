import { useMemo, useState } from "react";
import { Badge, Button, ImageFromIdb } from "../ui";
import { formatDateTime, formatDate, KNOWLEDGE_TYPES } from "../../utils";
import { ImageViewer } from "../ui/ImageViewer";
import { AdvancedFilter } from "../ui/AdvancedFilter";
import { MarkdownRenderer } from "../ui/MarkdownRenderer";

export function KnowledgeTab({ knowledges, getUrlForKey, onAdd, onEdit, onDelete, openImageViewer }) {
  const [filterType, setFilterType] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({});

  // 获取所有使用的标签
  const allTags = useMemo(() => {
    const tagSet = new Set();
    knowledges.forEach((knowledge) => {
      if (knowledge.tags && Array.isArray(knowledge.tags)) {
        knowledge.tags.forEach((tag) => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  }, [knowledges]);

  const filteredKnowledges = useMemo(() => {
    let result = [...knowledges];

    // 基础类型筛选
    if (filterType !== "all") {
      result = result.filter((knowledge) => knowledge.type === filterType);
    }

    // 文本搜索
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      result = result.filter(
        (knowledge) =>
          knowledge.title.toLowerCase().includes(search) ||
          knowledge.content?.toLowerCase().includes(search) ||
          knowledge.url?.toLowerCase().includes(search) ||
          knowledge.source?.toLowerCase().includes(search) ||
          knowledge.tags?.some((t) => t.toLowerCase().includes(search))
      );
    }

    // 高级筛选
    if (advancedFilters.dateFrom) {
      result = result.filter((knowledge) => formatDate(knowledge.createdAt) >= advancedFilters.dateFrom);
    }
    if (advancedFilters.dateTo) {
      result = result.filter((knowledge) => formatDate(knowledge.createdAt) <= advancedFilters.dateTo);
    }
    if (advancedFilters.selectedTags && advancedFilters.selectedTags.length > 0) {
      result = result.filter((knowledge) =>
        advancedFilters.selectedTags.some((tag) => knowledge.tags?.includes(tag))
      );
    }
    if (advancedFilters.hasPhotos === "yes") {
      result = result.filter((knowledge) => knowledge.coverPhotoKey);
    } else if (advancedFilters.hasPhotos === "no") {
      result = result.filter((knowledge) => !knowledge.coverPhotoKey);
    }

    return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [knowledges, filterType, searchText, advancedFilters]);


  function handleImageClick(knowledge) {
    if (knowledge.coverPhotoKey) {
      const images = [
        {
          key: knowledge.coverPhotoKey,
          ext: "jpg",
          filename: `${knowledge.title}-cover.jpg`,
        },
      ];
      openImageViewer(images, 0);
    }
  }

  function handleUrlClick(url) {
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
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
            {KNOWLEDGE_TYPES.map((t) => (
              <button
                key={t.key}
                onClick={() => setFilterType(t.key)}
                className={`shrink-0 rounded-full border px-3 py-1 text-xs transition ${
                  filterType === t.key
                    ? "border-zinc-900 dark:border-zinc-600 bg-zinc-900 dark:bg-zinc-700 text-white dark:text-zinc-100"
                    : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                }`}
              >
                {t.icon} {t.label}
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
            placeholder="搜索知识..."
            className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:focus:border-zinc-600"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
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

      {/* 知识列表 */}
      {filteredKnowledges.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-8 text-center">
          <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">还没有知识条目</div>
          <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">点击下方按钮添加第一条知识</div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredKnowledges.map((knowledge) => (
            <KnowledgeCard
              key={knowledge.id}
              knowledge={knowledge}
              getUrlForKey={getUrlForKey}
              onEdit={onEdit}
              onDelete={onDelete}
              handleImageClick={handleImageClick}
              handleUrlClick={handleUrlClick}
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
        plants={[]}
        initialFilters={advancedFilters}
        showPlantFilter={false}
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

// 知识卡片组件
function KnowledgeCard({ knowledge, getUrlForKey, onEdit, onDelete, handleImageClick, handleUrlClick }) {
  const [expanded, setExpanded] = useState(false);
  const knowledgeType = KNOWLEDGE_TYPES.find((t) => t.key === knowledge.type);
  const isMarkdown = knowledge.type === "markdown";
  const isWebType = knowledge.type !== "markdown" && knowledge.url;
  
  // 对于非markdown类型，内容预览
  const contentPreview = !isMarkdown && knowledge.content && knowledge.content.length > 150 
    ? knowledge.content.slice(0, 150) + "..." 
    : knowledge.content;

  // 提取URL的域名用于显示
  function getDomain(url) {
    if (!url) return "";
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace("www.", "");
    } catch {
      return url.length > 30 ? url.slice(0, 30) + "..." : url;
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-sm transition hover:shadow-md overflow-hidden">
      {/* 网页类型：封面图在顶部 */}
      {isWebType && knowledge.coverPhotoKey && (
        <div
          className="cursor-pointer w-full h-48 overflow-hidden bg-zinc-100 dark:bg-zinc-700"
          onClick={() => handleImageClick(knowledge)}
        >
          <ImageFromIdb
            imgKey={knowledge.coverPhotoKey}
            getUrlForKey={getUrlForKey}
            alt="cover"
            className="w-full h-full object-cover hover:opacity-90 transition"
          />
        </div>
      )}

      <div className="p-4">
        {/* 头部 */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge>{knowledgeType ? `${knowledgeType.icon} ${knowledgeType.label}` : knowledge.type}</Badge>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{formatDateTime(knowledge.createdAt)}</span>
              {knowledge.coverPhotoKey && !isWebType && (
                <span className="text-xs text-zinc-400 dark:text-zinc-500">📷</span>
              )}
            </div>
            <div className="mt-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">{knowledge.title}</div>
            
            {/* Markdown内容渲染 */}
            {isMarkdown && knowledge.content && (
              <div className="mt-2">
                {expanded ? (
                  <MarkdownRenderer content={knowledge.content} />
                ) : (
                  <>
                    <MarkdownRenderer content={contentPreview || knowledge.content.slice(0, 200)} />
                    {knowledge.content.length > 200 && (
                      <button
                        onClick={() => setExpanded(!expanded)}
                        className="mt-2 text-xs text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300"
                      >
                        展开全文
                      </button>
                    )}
                  </>
                )}
                {expanded && knowledge.content.length > 200 && (
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="mt-2 text-xs text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    收起
                  </button>
                )}
              </div>
            )}

            {/* 非Markdown类型的内容 */}
            {!isMarkdown && knowledge.content && (
              <div className="mt-2 text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                {expanded ? knowledge.content : contentPreview}
                {knowledge.content.length > 150 && (
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="ml-1 text-xs text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    {expanded ? "收起" : "展开"}
                  </button>
                )}
              </div>
            )}

            {/* 网页链接 - 改进的展示 */}
            {isWebType && knowledge.url && (
              <div className="mt-3">
                <a
                  href={knowledge.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUrlClick(knowledge.url);
                  }}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition text-sm font-medium"
                >
                  <span>🔗</span>
                  <span>打开链接</span>
                  <span className="text-xs opacity-75">({getDomain(knowledge.url)})</span>
                </a>
              </div>
            )}

            {knowledge.source && (
              <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">来源：{knowledge.source}</div>
            )}
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            <Button
              variant="secondary"
              onClick={() => onEdit(knowledge.id)}
              className="text-xs px-2 py-1"
            >
              编辑
            </Button>
            <Button
              variant="secondary"
              onClick={() => onDelete(knowledge.id)}
              className="text-xs px-2 py-1 text-red-600 hover:text-red-700"
            >
              删除
            </Button>
          </div>
        </div>

        {/* 标签 */}
        {knowledge.tags && knowledge.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {knowledge.tags.map((t) => (
              <Badge key={t}>{t}</Badge>
            ))}
          </div>
        )}

        {/* Markdown类型：封面图在底部 */}
        {isMarkdown && knowledge.coverPhotoKey && (
          <div className="mt-3">
            <div
              className="cursor-pointer rounded-xl overflow-hidden"
              onClick={() => handleImageClick(knowledge)}
            >
              <ImageFromIdb
                imgKey={knowledge.coverPhotoKey}
                getUrlForKey={getUrlForKey}
                alt="cover"
                className="w-full h-48 object-cover hover:opacity-90 transition"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


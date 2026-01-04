import { useMemo, useState } from "react";
import { Badge, Button, ImageFromIdb } from "../ui";
import { formatDateTime, formatDate, KNOWLEDGE_TYPES } from "../../utils";
import { ImageViewer } from "../ui/ImageViewer";
import { AdvancedFilter } from "../ui/AdvancedFilter";
import { MarkdownRenderer } from "../ui/MarkdownRenderer";

export function KnowledgeTab({ knowledges, getUrlForKey, onAdd, onEdit, onDelete, openImageViewer, onOpenAtlas, onOpenVariety }) {
  // 默认选择第一个非variety的类型（因为variety已经迁移到多肉品种Tab）
  const defaultType = KNOWLEDGE_TYPES.find(t => t.key !== "variety")?.key || KNOWLEDGE_TYPES[0]?.key || "care";
  const [filterType, setFilterType] = useState(defaultType);
  const [searchText, setSearchText] = useState("");
  const [showSearch, setShowSearch] = useState(false);
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

    // 基础类型筛选（注意：variety类型已经被迁移到多肉品种Tab，这里不再显示）
    result = result.filter((knowledge) => {
      // 兼容旧数据：将旧类型映射到新类型
      const getNormalizedType = (type) => {
        if (!type) return "variety";
        if (type === "markdown" || type === "document") return "variety";
        if (type === "article" || type === "video" || type === "xiaohongshu" || type === "web") return "care";
        return type;
      };
      const normalizedType = getNormalizedType(knowledge.type);
      // 过滤掉variety类型，因为它们已经迁移到多肉品种Tab
      if (normalizedType === "variety") return false;
      return normalizedType === filterType;
    });

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


  function handleImageClick(knowledge, index = 0) {
    // 兼容旧数据：coverPhotoKey（单个）和 coverPhotoKeys（数组）
    const photoKeys = knowledge.coverPhotoKeys && Array.isArray(knowledge.coverPhotoKeys) 
      ? knowledge.coverPhotoKeys 
      : (knowledge.coverPhotoKey ? [knowledge.coverPhotoKey] : []);
    
    if (photoKeys.length > 0) {
      const images = photoKeys.map((key, idx) => ({
        key,
        ext: "jpg",
        filename: `${knowledge.title || "知识"}-${idx + 1}.jpg`,
      }));
      openImageViewer(images, index);
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
            {KNOWLEDGE_TYPES.filter(t => t.key !== "variety").map((t) => (
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
            {/* 多肉品种按钮 */}
            <button
              onClick={onOpenVariety}
              className="shrink-0 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 px-3 py-1 text-xs transition"
            >
              🌱 多肉品种
            </button>
            {/* 知识图鉴按钮 */}
            <button
              onClick={onOpenAtlas}
              className="shrink-0 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 px-3 py-1 text-xs transition"
            >
              📖 知识图鉴
            </button>
          </div>
          <button
            onClick={() => {
              setShowSearch(!showSearch);
              if (!showSearch) {
                setShowAdvancedFilter(false);
              }
            }}
            className={`shrink-0 rounded-lg border px-3 py-1 text-xs transition ${
              showSearch || searchText.trim() || hasActiveFilters
                ? "border-zinc-900 dark:border-zinc-600 bg-zinc-900 dark:bg-zinc-700 text-white dark:text-zinc-100"
                : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
            }`}
            title="搜索"
          >
            🔍
          </button>
        </div>

        {/* 搜索框 - 点击🔍按钮时显示 */}
        {showSearch && (
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="搜索知识..."
              className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:focus:border-zinc-600"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              autoFocus
            />
            <button
              onClick={() => {
                setSearchText("");
                setShowSearch(false);
              }}
              className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 px-3 py-2 text-sm transition"
            >
              取消
            </button>
          </div>
        )}

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
  
  // 兼容旧数据：将旧类型映射到新类型
  const getNormalizedType = (type) => {
    // 旧类型映射：document/markdown -> variety, web/article/video/xiaohongshu -> care
    if (type === "markdown" || type === "document") return "variety";
    if (type === "article" || type === "video" || type === "xiaohongshu" || type === "web") return "care";
    // 新类型直接返回
    return type || "variety";
  };
  
  const normalizedType = getNormalizedType(knowledge.type);
  const knowledgeType = KNOWLEDGE_TYPES.find((t) => t.key === normalizedType);
  // 如果找不到类型，默认使用第一个（多肉品种）
  const displayType = knowledgeType || KNOWLEDGE_TYPES[0];
  const hasUrl = knowledge.url;
  
  // 内容预览
  const contentPreview = knowledge.content && knowledge.content.length > 150 
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

  // 兼容旧数据：获取图片keys数组
  const getPhotoKeys = () => {
    if (knowledge.coverPhotoKeys && Array.isArray(knowledge.coverPhotoKeys)) {
      return knowledge.coverPhotoKeys;
    }
    if (knowledge.coverPhotoKey) {
      return [knowledge.coverPhotoKey];
    }
    return [];
  };
  
  const photoKeys = getPhotoKeys();

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-sm transition hover:shadow-md overflow-hidden">
      {/* 有URL的：封面图在顶部 */}
      {hasUrl && photoKeys.length > 0 && (
        <div className="w-full h-48 overflow-hidden bg-zinc-100 dark:bg-zinc-700">
          {photoKeys.length === 1 ? (
            <div
              className="cursor-pointer w-full h-full"
              onClick={() => handleImageClick(knowledge, 0)}
            >
              <ImageFromIdb
                imgKey={photoKeys[0]}
                getUrlForKey={getUrlForKey}
                alt="cover"
                className="w-full h-full object-cover hover:opacity-90 transition"
              />
            </div>
          ) : (
            <div className="flex h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide">
              {photoKeys.map((key, idx) => (
                <div
                  key={key}
                  className="cursor-pointer shrink-0 w-full h-full snap-center"
                  onClick={() => handleImageClick(knowledge, idx)}
                >
                  <ImageFromIdb
                    imgKey={key}
                    getUrlForKey={getUrlForKey}
                    alt={`cover ${idx + 1}`}
                    className="w-full h-full object-cover hover:opacity-90 transition"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="p-4">
        {/* 头部 */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge>{displayType ? `${displayType.icon} ${displayType.label}` : "知识"}</Badge>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{formatDateTime(knowledge.createdAt)}</span>
              {photoKeys.length > 0 && !hasUrl && (
                <span className="text-xs text-zinc-400 dark:text-zinc-500">📷 {photoKeys.length > 1 ? photoKeys.length : ""}</span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="secondary"
                onClick={() => onEdit(knowledge.id)}
                className="text-xs px-2 py-1 h-6"
              >
                编辑
              </Button>
              <Button
                variant="secondary"
                onClick={() => onDelete(knowledge.id)}
                className="text-xs px-2 py-1 h-6 text-red-600 hover:text-red-700"
              >
                删除
              </Button>
            </div>
          </div>
          <div className="mt-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">{knowledge.title}</div>
            
            {/* Markdown内容渲染 */}
            {knowledge.content && !hasUrl && (
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

            {/* 有URL类型的内容 */}
            {hasUrl && knowledge.content && (
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
            {hasUrl && knowledge.url && (
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

        {/* 标签 */}
        {knowledge.tags && knowledge.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {knowledge.tags.map((t) => (
              <Badge key={t}>{t}</Badge>
            ))}
          </div>
        )}

        {/* 无URL类型：封面图在底部 */}
        {!hasUrl && photoKeys.length > 0 && (
          <div className="mt-3">
            {photoKeys.length === 1 ? (
              <div
                className="cursor-pointer rounded-xl overflow-hidden"
                onClick={() => handleImageClick(knowledge, 0)}
              >
                <ImageFromIdb
                  imgKey={photoKeys[0]}
                  getUrlForKey={getUrlForKey}
                  alt="cover"
                  className="w-full h-48 object-cover hover:opacity-90 transition"
                />
              </div>
            ) : (
              <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2">
                {photoKeys.map((key, idx) => (
                  <div
                    key={key}
                    className="cursor-pointer shrink-0 rounded-xl overflow-hidden snap-center"
                    onClick={() => handleImageClick(knowledge, idx)}
                  >
                    <ImageFromIdb
                      imgKey={key}
                      getUrlForKey={getUrlForKey}
                      alt={`cover ${idx + 1}`}
                      className="h-48 w-auto object-cover hover:opacity-90 transition"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


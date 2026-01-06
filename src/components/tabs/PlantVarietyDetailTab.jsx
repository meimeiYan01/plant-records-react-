import { useMemo, useState } from "react";
import { Badge, Button, ImageFromIdb } from "../ui";
import { formatDateTime } from "../../utils";
import { ImageViewer } from "../ui/ImageViewer";
import { MarkdownRenderer } from "../ui/MarkdownRenderer";

/**
 * 多肉品种详情Tab组件
 * 显示品种详情和该品种的知识卡片
 */
export function PlantVarietyDetailTab({ variety, knowledges, getUrlForKey, onAdd, onEdit, onDelete, openImageViewer, onBack }) {
  const [searchText, setSearchText] = useState("");
  const [filterType, setFilterType] = useState("all");

  const filteredKnowledges = useMemo(() => {
    let result = [...knowledges];

    // 类型筛选
    if (filterType !== "all") {
      result = result.filter((knowledge) => knowledge.type === filterType);
    }

    // 文本搜索
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      result = result.filter(
        (knowledge) =>
          knowledge.title?.toLowerCase().includes(search) ||
          knowledge.content?.toLowerCase().includes(search) ||
          knowledge.url?.toLowerCase().includes(search) ||
          knowledge.tags?.some((t) => t.toLowerCase().includes(search))
      );
    }

    return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [knowledges, filterType, searchText]);

  function handleImageClick(knowledge, index = 0) {
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

  // 安全检查：如果variety不存在，返回空状态
  if (!variety) {
    return (
      <div className="space-y-4 pb-20">
        <button
          onClick={onBack}
          className="flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 px-3 py-2 text-sm font-medium transition"
        >
          ← 返回
        </button>
        <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-8 text-center">
          <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">品种不存在</div>
        </div>
      </div>
    );
  }

  const photoKeys = variety.coverPhotoKeys && Array.isArray(variety.coverPhotoKeys)
    ? variety.coverPhotoKeys
    : (variety.coverPhotoKey ? [variety.coverPhotoKey] : []);

  return (
    <div className="space-y-4 pb-20">
      {/* 头部：返回按钮和搜索 */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={onBack}
          className="flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 px-3 py-2 text-sm font-medium transition"
        >
          ← 返回
        </button>
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="搜索知识..."
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:focus:border-zinc-600"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <button
          onClick={onAdd}
          className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 px-4 py-2 text-sm font-medium transition"
        >
          + 添加知识
        </button>
      </div>

      {/* 品种信息卡片 */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-sm overflow-hidden">
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* 封面图 */}
            {photoKeys.length > 0 && (
              <div
                className="cursor-pointer shrink-0 rounded-xl overflow-hidden"
                onClick={() => handleImageClick({ coverPhotoKeys: photoKeys, title: variety.name }, 0)}
              >
                <ImageFromIdb
                  imgKey={photoKeys[0]}
                  getUrlForKey={getUrlForKey}
                  alt={variety.name}
                  className="w-24 h-24 object-cover hover:opacity-90 transition"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                {variety.name}
              </h2>
              {variety.scientificName && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 italic mt-1">
                  {variety.scientificName}
                </p>
              )}
              {/* 科属信息 */}
              <div className="mt-2 flex items-center gap-3 flex-wrap text-xs text-zinc-600 dark:text-zinc-400">
                {variety.family && (
                  <span>
                    <span className="font-medium">科：</span>
                    {variety.family}
                  </span>
                )}
                {variety.genus && (
                  <span>
                    <span className="font-medium">属：</span>
                    {variety.genus}
                  </span>
                )}
                {variety.species && (
                  <span>
                    <span className="font-medium">种：</span>
                    {variety.species}
                  </span>
                )}
              </div>
              {/* 描述 */}
              {variety.description && (
                <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                  {variety.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 筛选 */}
      <div className="flex items-center gap-2">
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
        <button
          onClick={() => setFilterType("care")}
          className={`shrink-0 rounded-full border px-3 py-1 text-xs transition ${
            filterType === "care"
              ? "border-zinc-900 dark:border-zinc-600 bg-zinc-900 dark:bg-zinc-700 text-white dark:text-zinc-100"
              : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
          }`}
        >
          💧 种植养护
        </button>
        <button
          onClick={() => setFilterType("qa")}
          className={`shrink-0 rounded-full border px-3 py-1 text-xs transition ${
            filterType === "qa"
              ? "border-zinc-900 dark:border-zinc-600 bg-zinc-900 dark:bg-zinc-700 text-white dark:text-zinc-100"
              : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
          }`}
        >
          ❓ 小问小答
        </button>
      </div>

      {/* 知识列表 */}
      {filteredKnowledges.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-8 text-center">
          <div className="text-4xl mb-4">📝</div>
          <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">还没有知识条目</div>
          <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            为 <span className="font-medium text-zinc-900 dark:text-zinc-100">{variety.name}</span> 添加第一条知识吧
          </div>
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-900 dark:border-zinc-600 bg-zinc-900 dark:bg-zinc-700 text-white dark:text-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-600 px-4 py-2 text-sm font-medium transition"
          >
            + 添加知识
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredKnowledges.map((knowledge) => (
            <VarietyKnowledgeCard
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

// 品种知识卡片组件（复用KnowledgeCard的逻辑）
function VarietyKnowledgeCard({ knowledge, getUrlForKey, onEdit, onDelete, handleImageClick, handleUrlClick }) {
  const [expanded, setExpanded] = useState(false);
  
  const hasUrl = knowledge.url;
  const contentPreview = knowledge.content && knowledge.content.length > 150 
    ? knowledge.content.slice(0, 150) + "..." 
    : knowledge.content;

  function getDomain(url) {
    if (!url) return "";
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace("www.", "");
    } catch {
      return url.length > 30 ? url.slice(0, 30) + "..." : url;
    }
  }

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

  // 获取类型显示
  const getTypeLabel = (type) => {
    if (type === "care") return "💧 种植养护";
    if (type === "qa") return "❓ 小问小答";
    return "📝 知识";
  };

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-sm transition hover:shadow-md overflow-hidden">
      {/* 网页类型：封面图在顶部 */}
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
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge>{getTypeLabel(knowledge.type)}</Badge>
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
                  <MarkdownRenderer content={contentPreview || knowledge.content.slice(0, 150)} />
                  {knowledge.content.length > 150 && (
                    <button
                      onClick={() => setExpanded(!expanded)}
                      className="mt-2 text-xs text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300"
                    >
                      展开全文
                    </button>
                  )}
                </>
              )}
              {expanded && knowledge.content.length > 150 && (
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
                  {expanded ? "收起" : "展开全文"}
                </button>
              )}
            </div>
          )}

          {/* 网页链接 */}
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

        {/* 文档类型：封面图在底部 */}
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


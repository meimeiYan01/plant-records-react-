import { useState, useMemo } from "react";
import { Button } from "../ui";

/**
 * 知识图鉴Tab组件
 * 用于收集和展示多肉知识相关的网站，以卡片墙形式展示
 */
export function KnowledgeAtlasTab({ websites, onAdd, onEdit, onDelete }) {
  const [searchText, setSearchText] = useState("");

  const filteredWebsites = useMemo(() => {
    if (!searchText.trim()) return websites;
    const search = searchText.toLowerCase();
    return websites.filter(
      (site) =>
        site.name.toLowerCase().includes(search) ||
        site.url.toLowerCase().includes(search) ||
        site.description?.toLowerCase().includes(search) ||
        site.tags?.some((t) => t.toLowerCase().includes(search))
    );
  }, [websites, searchText]);

  function handleUrlClick(url) {
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  function getDomain(url) {
    if (!url) return "";
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace("www.", "");
    } catch {
      return url.length > 30 ? url.slice(0, 30) + "..." : url;
    }
  }

  function getFaviconUrl(url) {
    if (!url) return null;
    try {
      const urlObj = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
    } catch {
      return null;
    }
  }

  return (
    <div className="space-y-4 pb-20">
      {/* 头部：搜索和新增 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="搜索网站..."
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:focus:border-zinc-600"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <button
          onClick={onAdd}
          className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 px-4 py-2 text-sm font-medium transition"
        >
          + 添加网站
        </button>
      </div>

      {/* 网站卡片墙 */}
      {filteredWebsites.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-8 text-center">
          <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">还没有网站</div>
          <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">点击上方按钮添加第一个网站</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredWebsites.map((site) => (
            <WebsiteCard
              key={site.id}
              site={site}
              getDomain={getDomain}
              getFaviconUrl={getFaviconUrl}
              onEdit={onEdit}
              onDelete={onDelete}
              handleUrlClick={handleUrlClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// 网站卡片组件
function WebsiteCard({ site, getDomain, getFaviconUrl, onEdit, onDelete, handleUrlClick }) {
  const [expanded, setExpanded] = useState(false);
  const faviconUrl = getFaviconUrl(site.url);

  return (
    <div
      className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-sm transition hover:shadow-md overflow-hidden flex flex-col cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      {/* 网站图标和标题 - 始终显示 */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {faviconUrl ? (
            <img
              src={faviconUrl}
              alt={site.name}
              className="w-12 h-12 rounded-lg border border-zinc-200 dark:border-zinc-700 object-cover shrink-0"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          ) : (
            <div className="w-12 h-12 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-xl shrink-0">
              🌱
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {site.name || getDomain(site.url)}
            </h3>
            <a
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.stopPropagation();
                handleUrlClick(site.url);
              }}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline truncate mt-1 block"
            >
              {getDomain(site.url)}
            </a>
          </div>
        </div>
      </div>

      {/* 详情内容 - 只在展开时显示 */}
      {expanded && (
        <>
          <div className="px-4 pb-4 flex-1" onClick={(e) => e.stopPropagation()}>
            {/* 描述 */}
            {site.description && (
              <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-3">
                {site.description}
              </p>
            )}

            {/* 标签 */}
            {site.tags && site.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {site.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-block rounded-full bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 操作按钮 - 只在展开时显示 */}
          <div
            className="p-4 pt-0 flex items-center gap-2 border-t border-zinc-100 dark:border-zinc-700"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(site.id);
              }}
              className="text-xs px-2 py-1.5 h-auto"
            >
              编辑
            </Button>
            <Button
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(site.id);
              }}
              className="text-xs px-2 py-1.5 h-auto text-red-600 hover:text-red-700"
            >
              删除
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

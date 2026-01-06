import { useMemo, useState } from "react";
import { KNOWLEDGE_TYPES } from "../../utils";

/**
 * 知识页顶部菜单栏
 * 左侧抽屉菜单，右侧搜索，中间装饰图标
 */
export function KnowledgeMenuBar({ currentView, currentType, onSelect, onSearch }) {
  const [open, setOpen] = useState(false);

  const menuItems = useMemo(() => {
    const typeItems = KNOWLEDGE_TYPES.filter(
      (t) => t.key !== "variety" && t.key !== "introduction"
    ).map((t) => ({
      key: `type:${t.key}`,
      label: t.label,
    }));
    return [
      { key: "atlas", label: "多肉图鉴" },
      ...typeItems,
      { key: "knowledgeAtlas", label: "知识图鉴" },
      { key: "manage", label: "品种管理" },
      { key: "knowledgeData", label: "知识导入/导出" },
    ];
  }, []);

  function isActive(itemKey) {
    if (itemKey === "atlas") return currentView === "atlas";
    if (itemKey === "knowledgeAtlas") return currentView === "knowledgeAtlas";
    if (itemKey === "manage") return currentView === "manage";
    if (itemKey.startsWith("type:")) {
      return currentView === "list" && itemKey === `type:${currentType || ""}`;
    }
    return false;
  }

  return (
    <>
      <div className="flex items-center gap-2 pb-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
          aria-label="打开菜单"
        >
          ☰
        </button>
        <div className="flex-1 text-center text-lg text-zinc-400 dark:text-zinc-500">
          🌿
        </div>
        <button
          type="button"
          onClick={onSearch}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
          aria-label="搜索"
        >
          🔍
        </button>
      </div>

      {/* 抽屉菜单 */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!open}
      >
        <button
          type="button"
          className="absolute inset-0 bg-black/40"
          onClick={() => setOpen(false)}
          aria-label="关闭菜单"
        ></button>
        <div
          className={`absolute left-0 top-0 h-full w-64 bg-white dark:bg-zinc-900 shadow-xl transition-transform duration-200 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              菜单
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              aria-label="关闭"
            >
              ✕
            </button>
          </div>
          <div className="p-2 space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  onSelect?.(item.key);
                  setOpen(false);
                }}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                  isActive(item.key)
                    ? "bg-zinc-900 dark:bg-zinc-700 text-white dark:text-zinc-100"
                    : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

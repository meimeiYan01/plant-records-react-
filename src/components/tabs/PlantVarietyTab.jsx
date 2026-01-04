import { useMemo, useState } from "react";
import { Badge, Button, ImageFromIdb } from "../ui";
import { formatDateTime } from "../../utils";
import { ImageViewer } from "../ui/ImageViewer";

/**
 * 多肉品种Tab组件
 * 用于管理多肉品种信息，包括科属分类等
 */
export function PlantVarietyTab({ varieties, getUrlForKey, onAddKnowledge, onEdit, onDelete, openImageViewer, onBack, onVarietyClick }) {
  const [searchText, setSearchText] = useState("");
  const [filterFamily, setFilterFamily] = useState("all");
  const [filterGenus, setFilterGenus] = useState("all");

  // 获取所有科
  const allFamilies = useMemo(() => {
    const familySet = new Set();
    varieties.forEach((variety) => {
      if (variety.family) familySet.add(variety.family);
    });
    return Array.from(familySet).sort();
  }, [varieties]);

  // 获取当前科下的所有属
  const allGenera = useMemo(() => {
    if (filterFamily === "all") {
      const genusSet = new Set();
      varieties.forEach((variety) => {
        if (variety.genus) genusSet.add(variety.genus);
      });
      return Array.from(genusSet).sort();
    } else {
      const genusSet = new Set();
      varieties
        .filter((v) => v.family === filterFamily)
        .forEach((variety) => {
          if (variety.genus) genusSet.add(variety.genus);
        });
      return Array.from(genusSet).sort();
    }
  }, [varieties, filterFamily]);

  const filteredVarieties = useMemo(() => {
    let result = [...varieties];

    // 科筛选
    if (filterFamily !== "all") {
      result = result.filter((variety) => variety.family === filterFamily);
    }

    // 属筛选
    if (filterGenus !== "all") {
      result = result.filter((variety) => variety.genus === filterGenus);
    }

    // 文本搜索
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      result = result.filter(
        (variety) =>
          variety.name?.toLowerCase().includes(search) ||
          variety.scientificName?.toLowerCase().includes(search) ||
          variety.family?.toLowerCase().includes(search) ||
          variety.genus?.toLowerCase().includes(search) ||
          variety.description?.toLowerCase().includes(search)
      );
    }

    return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [varieties, filterFamily, filterGenus, searchText]);

  function handleImageClick(variety, index = 0) {
    const photoKeys = variety.coverPhotoKeys && Array.isArray(variety.coverPhotoKeys)
      ? variety.coverPhotoKeys
      : (variety.coverPhotoKey ? [variety.coverPhotoKey] : []);
    
    if (photoKeys.length > 0) {
      const images = photoKeys.map((key, idx) => ({
        key,
        ext: "jpg",
        filename: `${variety.name || "品种"}-${idx + 1}.jpg`,
      }));
      openImageViewer(images, index);
    }
  }

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
            placeholder="搜索品种..."
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:focus:border-zinc-600"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <button
          onClick={onAddKnowledge}
          className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 px-4 py-2 text-sm font-medium transition"
        >
          + 添加知识
        </button>
      </div>

      {/* 筛选：科和属 */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">科：</span>
          <select
            className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-3 py-1 text-xs outline-none focus:border-zinc-900 dark:focus:border-zinc-600"
            value={filterFamily}
            onChange={(e) => {
              setFilterFamily(e.target.value);
              setFilterGenus("all"); // 切换科时重置属筛选
            }}
          >
            <option value="all">全部</option>
            {allFamilies.map((family) => (
              <option key={family} value={family}>
                {family}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">属：</span>
          <select
            className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-3 py-1 text-xs outline-none focus:border-zinc-900 dark:focus:border-zinc-600"
            value={filterGenus}
            onChange={(e) => setFilterGenus(e.target.value)}
            disabled={filterFamily === "all"}
          >
            <option value="all">全部</option>
            {allGenera.map((genus) => (
              <option key={genus} value={genus}>
                {genus}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 品种列表 */}
      {filteredVarieties.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-8 text-center">
          <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">还没有品种记录</div>
          <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">请先在设置中添加品种</div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredVarieties.map((variety) => (
            <VarietyCard
              key={variety.id}
              variety={variety}
              getUrlForKey={getUrlForKey}
              onEdit={onEdit}
              onDelete={onDelete}
              handleImageClick={handleImageClick}
              onVarietyClick={onVarietyClick}
            />
          ))}
        </div>
      )}

      {/* 浮动添加按钮 */}
      <div className="fixed bottom-20 right-4 z-40 md:hidden">
        <button
          onClick={onAddKnowledge}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 dark:bg-zinc-700 text-2xl text-white dark:text-zinc-100 shadow-lg transition hover:bg-zinc-800 dark:hover:bg-zinc-600 active:scale-95"
        >
          +
        </button>
      </div>
    </div>
  );
}

// 品种卡片组件
function VarietyCard({ variety, getUrlForKey, onEdit, onDelete, handleImageClick, onVarietyClick }) {
  const photoKeys = variety.coverPhotoKeys && Array.isArray(variety.coverPhotoKeys)
    ? variety.coverPhotoKeys
    : (variety.coverPhotoKey ? [variety.coverPhotoKey] : []);

  return (
    <div 
      className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-sm transition hover:shadow-md overflow-hidden cursor-pointer"
      onClick={() => onVarietyClick(variety.id)}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
            {/* 封面图 */}
            {photoKeys.length > 0 && (
              <div
                className="cursor-pointer shrink-0 rounded-xl overflow-hidden"
                onClick={(e) => {
                  e.stopPropagation();
                  handleImageClick(variety, 0);
                }}
              >
              <ImageFromIdb
                imgKey={photoKeys[0]}
                getUrlForKey={getUrlForKey}
                alt={variety.name}
                className="w-20 h-20 object-cover hover:opacity-90 transition"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  {variety.name}
                </h3>
                {variety.scientificName && (
                  <span className="text-sm text-zinc-500 dark:text-zinc-400 italic">
                    {variety.scientificName}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="secondary"
                  onClick={() => onEdit(variety.id)}
                  className="text-xs px-2 py-1 h-6"
                >
                  编辑
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => onDelete(variety.id)}
                  className="text-xs px-2 py-1 h-6 text-red-600 hover:text-red-700"
                >
                  删除
                </Button>
              </div>
            </div>

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
              <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300 line-clamp-2">
                {variety.description}
              </p>
            )}

            {/* 创建时间 */}
            <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              {formatDateTime(variety.createdAt)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


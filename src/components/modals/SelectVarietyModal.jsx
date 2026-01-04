import { useState, useMemo } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { ImageFromIdb } from "../ui/ImageFromIdb";

/**
 * 选择品种Modal
 * 用于选择要为哪个品种添加知识
 */
export function SelectVarietyModal({ varieties, getUrlForKey, onClose, onSelect }) {
  const [searchText, setSearchText] = useState("");

  const filteredVarieties = useMemo(() => {
    if (!searchText.trim()) return varieties;
    const search = searchText.toLowerCase();
    return varieties.filter(
      (v) =>
        v.name.toLowerCase().includes(search) ||
        v.scientificName?.toLowerCase().includes(search) ||
        v.family?.toLowerCase().includes(search) ||
        v.genus?.toLowerCase().includes(search)
    );
  }, [varieties, searchText]);

  return (
    <Modal title="选择品种" onClose={onClose}>
      <div className="space-y-3 max-h-[70vh] overflow-y-auto">
        <div>
          <input
            type="text"
            placeholder="搜索品种..."
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:focus:border-zinc-600"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            autoFocus
          />
        </div>

        {filteredVarieties.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-8 text-center">
            <div className="text-sm text-zinc-600 dark:text-zinc-400">没有找到品种</div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredVarieties.map((variety) => {
              const photoKeys = variety.coverPhotoKeys && Array.isArray(variety.coverPhotoKeys)
                ? variety.coverPhotoKeys
                : (variety.coverPhotoKey ? [variety.coverPhotoKey] : []);

              return (
                <button
                  key={variety.id}
                  onClick={() => onSelect(variety.id)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition text-left"
                >
                  <div className="flex items-center gap-3">
                    {photoKeys.length > 0 ? (
                      <ImageFromIdb
                        imgKey={photoKeys[0]}
                        getUrlForKey={getUrlForKey}
                        alt={variety.name}
                        className="w-12 h-12 rounded-lg border border-zinc-200 dark:border-zinc-700 object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-2xl shrink-0">
                        🌱
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {variety.name}
                      </div>
                      {variety.scientificName && (
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 italic truncate">
                          {variety.scientificName}
                        </div>
                      )}
                      {(variety.family || variety.genus) && (
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                          {variety.family} {variety.genus}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
        </div>
      </div>
    </Modal>
  );
}


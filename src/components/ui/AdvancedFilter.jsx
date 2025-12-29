import { useState } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";

export function AdvancedFilter({ 
  isOpen, 
  onClose, 
  onApply, 
  tags = [], 
  plants = [],
  initialFilters = {},
  showPlantFilter = true
}) {
  const [filters, setFilters] = useState({
    dateFrom: initialFilters.dateFrom || "",
    dateTo: initialFilters.dateTo || "",
    selectedTags: initialFilters.selectedTags || [],
    selectedPlants: initialFilters.selectedPlants || [],
    hasPhotos: initialFilters.hasPhotos || "all",
    ...initialFilters,
  });

  function toggleTag(tag) {
    setFilters((prev) => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(tag)
        ? prev.selectedTags.filter((t) => t !== tag)
        : [...prev.selectedTags, tag],
    }));
  }

  function togglePlant(plantId) {
    setFilters((prev) => ({
      ...prev,
      selectedPlants: prev.selectedPlants.includes(plantId)
        ? prev.selectedPlants.filter((id) => id !== plantId)
        : [...prev.selectedPlants, plantId],
    }));
  }

  function handleReset() {
    setFilters({
      dateFrom: "",
      dateTo: "",
      selectedTags: [],
      selectedPlants: [],
      hasPhotos: "all",
    });
  }

  function handleApply() {
    onApply(filters);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <Modal title="高级筛选" onClose={onClose}>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        {/* 日期范围 */}
        <div>
          <div className="mb-2 text-sm font-medium text-zinc-900">日期范围</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="mb-1 text-xs text-zinc-500">开始日期</div>
              <input
                type="date"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                value={filters.dateFrom}
                onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
              />
            </div>
            <div>
              <div className="mb-1 text-xs text-zinc-500">结束日期</div>
              <input
                type="date"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                value={filters.dateTo}
                onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* 标签筛选 */}
        {tags.length > 0 && (
          <div>
            <div className="mb-2 text-sm font-medium text-zinc-900">标签</div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    filters.selectedTags.includes(tag)
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 关联多肉 */}
        {showPlantFilter && plants.length > 0 && (
          <div>
            <div className="mb-2 text-sm font-medium text-zinc-900">关联多肉</div>
            <div className="max-h-32 overflow-y-auto rounded-lg border border-zinc-200 p-2">
              <div className="flex flex-wrap gap-2">
                {plants.map((plant) => (
                  <button
                    key={plant.id}
                    type="button"
                    onClick={() => togglePlant(plant.id)}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      filters.selectedPlants.includes(plant.id)
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    {plant.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 是否有照片 */}
        <div>
          <div className="mb-2 text-sm font-medium text-zinc-900">照片</div>
          <div className="flex gap-2">
            {[
              { key: "all", label: "全部" },
              { key: "yes", label: "有照片" },
              { key: "no", label: "无照片" },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, hasPhotos: option.key }))}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm transition ${
                  filters.hasPhotos === option.key
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2 pt-2">
          <Button variant="secondary" onClick={handleReset} className="flex-1">
            重置
          </Button>
          <Button onClick={handleApply} className="flex-1">
            应用
          </Button>
        </div>
      </div>
    </Modal>
  );
}


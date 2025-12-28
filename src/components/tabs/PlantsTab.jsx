import { Badge, ImageFromIdb, Button } from "../ui";
import { daysSince } from "../../utils";

export function PlantsTab({
  plants,
  getUrlForKey,
  onPlantClick,
  onAddPlant,
}) {
  return (
    <div className="space-y-4 pb-20">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">我的多肉</div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">{plants.length} 盆</div>
      </div>

      {/* 多肉卡片网格 */}
      {plants.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-8 text-center">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">还没有多肉</div>
          <div className="mt-4">
            <Button onClick={onAddPlant}>创建第一盆</Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {plants.map((plant) => (
            <div
              key={plant.id}
              onClick={() => onPlantClick(plant.id)}
              className="group cursor-pointer rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-3 transition hover:border-zinc-900 dark:hover:border-zinc-600 hover:shadow-md"
            >
              <div className="aspect-square overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800">
                {plant.coverPhotoKey ? (
                  <ImageFromIdb
                    imgKey={plant.coverPhotoKey}
                    getUrlForKey={getUrlForKey}
                    alt={plant.name}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400 dark:text-zinc-500">
                    无图
                  </div>
                )}
              </div>
              <div className="mt-2">
                <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{plant.name}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {plant.location && (
                    <Badge className="text-xs">📍 {plant.location}</Badge>
                  )}
                  {plant.lastWateredAt && (
                    <Badge className="text-xs">💧 {daysSince(plant.lastWateredAt)}天</Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


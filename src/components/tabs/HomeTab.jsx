import { useState } from "react";
import { Badge, ImageFromIdb } from "../ui";
import { daysSince, formatDateTime } from "../../utils";

export function HomeTab({
  plants,
  logs,
  getUrlForKey,
  onPlantClick,
  onAddLog,
  onLogClick,
  onAddPlant,
  onOpenCamera,
  openImageViewer,
}) {
  // 获取最近的日志（最多5条）
  const recentLogs = logs
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  return (
    <div className="space-y-6 pb-20">
      {/* 多肉相机入口 */}
      <div>
        <button
          onClick={onOpenCamera}
          className="w-full rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-zinc-800 dark:to-zinc-900 p-6 text-center transition hover:border-zinc-900 dark:hover:border-zinc-600 hover:shadow-md"
        >
          <div className="text-4xl mb-2">📷</div>
          <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">多肉相机</div>
          <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">拍照记录，自动添加水印</div>
        </button>
      </div>

      {/* 上半部分：所有多肉的小头像 */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">我的多肉</div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">{plants.length} 盆</div>
            <button
              onClick={onAddPlant}
              className="rounded-lg border border-zinc-900 dark:border-zinc-600 bg-zinc-900 dark:bg-zinc-700 px-3 py-1 text-xs text-white dark:text-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-600 transition"
            >
              + 新增
            </button>
          </div>
        </div>
        {plants.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-8 text-center">
            <div className="text-sm text-zinc-600 dark:text-zinc-400">还没有多肉</div>
            <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">在设置中添加第一盆多肉</div>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
            {plants.map((plant) => (
              <div
                key={plant.id}
                className="group"
              >
                <div
                  onClick={() => {
                    if (plant.coverPhotoKey) {
                      openImageViewer(
                        [
                          {
                            key: plant.coverPhotoKey,
                            ext: "jpg",
                            filename: `${plant.name}-封面.jpg`,
                          },
                        ],
                        0,
                        {
                          onViewDetail: () => onPlantClick(plant.id),
                        }
                      );
                    } else {
                      onPlantClick(plant.id);
                    }
                  }}
                  className="cursor-pointer"
                >
                  <div className="aspect-square overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 transition hover:border-zinc-900 dark:hover:border-zinc-600 hover:shadow-md">
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
                  <div className="mt-1 text-center">
                    <div className="truncate text-xs font-medium text-zinc-900 dark:text-zinc-100">{plant.name}</div>
                    {plant.lastWateredAt && (
                      <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        {daysSince(plant.lastWateredAt)}天
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 下半部分：日志记录入口 */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">最近日志</div>
          <button
            onClick={onAddLog}
            className="text-sm text-zinc-600 dark:text-zinc-400 underline hover:text-zinc-900 dark:hover:text-zinc-200 transition"
          >
            + 新建日志
          </button>
        </div>
        {recentLogs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-8 text-center">
            <div className="text-sm text-zinc-600 dark:text-zinc-400">还没有日志</div>
            <div className="mt-2">
              <button
                onClick={onAddLog}
                className="rounded-lg border border-zinc-900 dark:border-zinc-600 bg-zinc-900 dark:bg-zinc-700 px-4 py-2 text-sm text-white dark:text-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-600 transition"
              >
                创建第一条日志
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {recentLogs.map((log) => (
              <div
                key={log.id}
                onClick={() => onLogClick(log.id)}
                className="cursor-pointer rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-3 transition hover:border-zinc-900 dark:hover:border-zinc-600 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {log.title && (
                      <div className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{log.title}</div>
                    )}
                    {log.content && (
                      <div className="mt-1 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400">
                        {log.content}
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <span>{formatDateTime(log.date)}</span>
                      {log.photos && log.photos.length > 0 && (
                        <span>📷 {log.photos.length}</span>
                      )}
                    </div>
                  </div>
                  {log.photos && log.photos.length > 0 && (
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
                      <ImageFromIdb
                        imgKey={log.photos[0]}
                        getUrlForKey={getUrlForKey}
                        alt="log"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
            {logs.length > 5 && (
              <div className="pt-2 text-center">
                <button
                  onClick={() => onLogClick("all")}
                  className="text-sm text-zinc-600 dark:text-zinc-400 underline hover:text-zinc-900 dark:hover:text-zinc-200 transition"
                >
                  查看全部日志 ({logs.length})
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


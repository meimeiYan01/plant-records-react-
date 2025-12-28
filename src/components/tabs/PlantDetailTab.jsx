import { useMemo } from "react";
import { Badge, Button, ImageFromIdb } from "../ui";
import { daysSince, formatDateTime, EVENT_TYPES, extFromMime } from "../../utils";

export function PlantDetailTab({
  plant,
  events,
  generalLogs,
  getUrlForKey,
  onEdit,
  onDelete,
  onAddEvent,
  onEditEvent,
  onDeleteEvent,
  onEditLog,
  openImageViewer,
  onBack,
}) {
  // 获取时间线图片
  const timelineImages = useMemo(() => {
    const images = [];
    events.forEach((e) => {
      if (e.photoKey) {
        images.push({
          key: e.photoKey,
          ext: extFromMime("image/jpeg"),
          filename: `${plant.name}-${formatDateTime(e.at).replace(/[:\s]/g, "-")}.jpg`,
        });
      }
    });
    return images;
  }, [events, plant.name]);

  if (!plant) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-10 text-center text-zinc-500 dark:text-zinc-400">
        请选择一盆多肉
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {/* 返回按钮 */}
      {onBack && (
        <div className="mb-2">
          <Button variant="secondary" onClick={onBack} className="text-xs">
            ← 返回
          </Button>
        </div>
      )}

      {/* 头部信息 */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-semibold text-zinc-900 dark:text-zinc-100">{plant.name}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge>📍 {plant.location || "未设置位置"}</Badge>
              <Badge>
                💧{" "}
                {plant.lastWateredAt
                  ? `距上次 ${daysSince(plant.lastWateredAt)} 天`
                  : "未记录"}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onEdit} className="text-xs">
              编辑
            </Button>
            <Button variant="secondary" onClick={onDelete} className="text-xs text-red-600 hover:text-red-700">
              删除
            </Button>
            <Button variant="secondary" onClick={onAddEvent} className="text-xs">
              + 事件
            </Button>
          </div>
        </div>
      </div>

      {/* 封面图 */}
      {plant.coverPhotoKey ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <div
            className="cursor-pointer overflow-hidden rounded-xl"
            onClick={() =>
              openImageViewer(
                [
                  {
                    key: plant.coverPhotoKey,
                    ext: extFromMime("image/jpeg"),
                    filename: `${plant.name}-封面.jpg`,
                  },
                ],
                0
              )
            }
          >
            <ImageFromIdb
              imgKey={plant.coverPhotoKey}
              getUrlForKey={getUrlForKey}
              alt="cover"
              className="h-56 w-full object-cover hover:opacity-90 transition"
            />
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-sm text-zinc-500">
          这盆还没有封面图
        </div>
      )}

      {/* 时间线 */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm font-semibold text-zinc-900">时间线</div>
          <div className="text-xs text-zinc-500">共 {events.length} 条</div>
        </div>

        <div className="space-y-3">
          {events.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-600">
              暂无事件。建议先记一次"浇水"。
            </div>
          ) : (
            events.map((e) => {
              const imageIndex = timelineImages.findIndex((img) => img.key === e.photoKey);
              const isLogEvent = e.type === "log";
              const relatedLog = isLogEvent && generalLogs ? generalLogs.find((l) => l.id === e.logId) : null;

              return (
                <div key={e.id} className="rounded-xl border border-zinc-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-zinc-900">
                        {EVENT_TYPES.find((t) => t.key === e.type)?.label || e.type}
                      </strong>
                      {isLogEvent && relatedLog && <Badge className="text-xs">来自日志</Badge>}
                      <span className="text-zinc-500">{formatDateTime(e.at)}</span>
                    </div>
                    <div className="flex gap-2">
                      {isLogEvent && relatedLog ? (
                        <Button
                          variant="secondary"
                          onClick={() => onEditLog(relatedLog.id)}
                          className="text-xs"
                        >
                          编辑日志
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          onClick={() => onEditEvent(e.id)}
                          className="text-xs"
                        >
                          编辑
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        onClick={() => onDeleteEvent(e.id)}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        删除
                      </Button>
                    </div>
                  </div>

                  {/* 如果是日志事件，显示日志的完整内容 */}
                  {isLogEvent && relatedLog ? (
                    <>
                      {relatedLog.title && (
                        <div className="mt-2 text-sm font-semibold text-zinc-900">{relatedLog.title}</div>
                      )}
                      {relatedLog.content && (
                        <div className="mt-2 text-sm text-zinc-800 whitespace-pre-wrap">{relatedLog.content}</div>
                      )}
                      {(relatedLog.weather || relatedLog.mood) && (
                        <div className="mt-2 flex gap-3 text-xs text-zinc-500">
                          {relatedLog.weather && <span>🌤️ {relatedLog.weather}</span>}
                          {relatedLog.mood && <span>😊 {relatedLog.mood}</span>}
                        </div>
                      )}
                      {relatedLog.tags?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {relatedLog.tags.map((t) => (
                            <Badge key={t}>{t}</Badge>
                          ))}
                        </div>
                      )}
                      {relatedLog.photos && relatedLog.photos.length > 0 && (
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          {relatedLog.photos.slice(0, 6).map((photoKey, idx) => (
                            <div
                              key={photoKey}
                              className="cursor-pointer"
                              onClick={() => {
                                const logImages = relatedLog.photos.map((key) => ({
                                  key,
                                  ext: "jpg",
                                  filename: `${relatedLog.title || "日志"}-${idx}.jpg`,
                                }));
                                openImageViewer(logImages, idx);
                              }}
                            >
                              <ImageFromIdb
                                imgKey={photoKey}
                                getUrlForKey={getUrlForKey}
                                alt="log"
                                className="h-24 w-full rounded-xl border object-cover hover:opacity-90 transition"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {e.tags?.length ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {e.tags.map((t) => (
                            <Badge key={t}>{t}</Badge>
                          ))}
                        </div>
                      ) : null}
                      {e.note ? <div className="mt-2 text-sm text-zinc-800 dark:text-zinc-300">{e.note}</div> : null}
                      {e.photoKey ? (
                        <div className="mt-3">
                          <div
                            className="cursor-pointer inline-block"
                            onClick={() => {
                              if (timelineImages.length > 0) {
                                openImageViewer(timelineImages, imageIndex >= 0 ? imageIndex : 0);
                              }
                            }}
                          >
                            <ImageFromIdb
                              imgKey={e.photoKey}
                              getUrlForKey={getUrlForKey}
                              alt="event"
                              className="h-44 w-44 rounded-xl border object-cover hover:opacity-90 transition"
                            />
                          </div>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}


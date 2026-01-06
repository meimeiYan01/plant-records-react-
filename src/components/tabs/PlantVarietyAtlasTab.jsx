import { ImageFromIdb } from "../ui";

/**
 * 多肉图鉴 Tab 组件
 * 仅展示品种图片网格，点击进入详情
 */
export function PlantVarietyAtlasTab({ varieties, getUrlForKey, onVarietyClick }) {
  return (
    <div className="space-y-4 pb-20">
      {/* 图鉴网格 */}
      {varieties.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-8 text-center">
          <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">还没有品种记录</div>
          <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">请先在设置中添加品种</div>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {varieties.map((variety) => {
            const photoKey = (variety.coverPhotoKeys && variety.coverPhotoKeys[0]) || variety.coverPhotoKey;
            return (
              <button
                key={variety.id}
                type="button"
                onClick={() => onVarietyClick(variety.id)}
                className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-1 shadow-sm transition hover:shadow-md"
                title={variety.name}
              >
                <div className="h-20 w-full overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-700">
                  {photoKey ? (
                    <ImageFromIdb
                      imgKey={photoKey}
                      getUrlForKey={getUrlForKey}
                      alt={variety.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400 dark:text-zinc-500">
                      暂无图片
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

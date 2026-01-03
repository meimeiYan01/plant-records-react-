import { ImageFromIdb } from "../ui";
import { formatDateTime } from "../../utils";

/**
 * 多肉相册 Tab
 * 以画册形式展示相机拍摄的所有照片
 */
export function AlbumTab({ album, getUrlForKey, openImageViewer, onDeletePhoto }) {
  // 按时间倒序排序
  const sortedPhotos = [...album].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (sortedPhotos.length === 0) {
    return (
      <div className="space-y-4 pb-20">
        <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-12 text-center">
          <div className="text-6xl mb-4">📷</div>
          <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-2">相册为空</div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">使用多肉相机拍摄照片后，会显示在这里</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          多肉相册 ({sortedPhotos.length} 张)
        </div>
      </div>

      {/* 画册式布局 */}
      <div className="space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
        {sortedPhotos.map((photo) => (
          <div
            key={photo.id}
            className="group relative rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 overflow-hidden bg-white dark:bg-zinc-800 shadow-lg transition-all cursor-pointer hover:border-zinc-900 dark:hover:border-zinc-600 hover:shadow-xl"
            onClick={() => {
              const images = sortedPhotos.map((p) => ({
                key: p.imageKey,
                ext: "jpg",
                filename: `多肉相机-${formatDateTime(p.createdAt)}.jpg`,
              }));
              const currentIndex = sortedPhotos.findIndex((p) => p.id === photo.id);
              openImageViewer(images, currentIndex);
            }}
          >
            {/* 照片区域 */}
            <div className="relative w-full aspect-[4/3] bg-zinc-100 dark:bg-zinc-900">
              <ImageFromIdb
                imgKey={photo.imageKey}
                getUrlForKey={getUrlForKey}
                alt={`多肉相机-${formatDateTime(photo.createdAt)}`}
                className="h-full w-full object-contain transition group-hover:scale-[1.02]"
              />
              {/* 删除按钮 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("确定要删除这张照片吗？")) {
                    onDeletePhoto(photo.id);
                  }
                }}
                className="absolute top-3 right-3 hidden group-hover:block rounded-full bg-red-500/90 text-white p-2 hover:bg-red-600 transition shadow-lg"
                title="删除照片"
              >
                <span className="text-sm">🗑️</span>
              </button>
            </div>
            
            {/* 信息区域 */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    📷 多肉相机
                  </div>
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  {formatDateTime(photo.createdAt)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

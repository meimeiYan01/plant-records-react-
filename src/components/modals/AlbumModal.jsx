import { useState } from "react";
import { Modal } from "../ui/Modal";
import { ImageFromIdb } from "../ui";
import { formatDateTime } from "../../utils";

/**
 * 多肉相册 Modal
 * 显示相机拍摄的所有照片，支持选择照片
 */
export function AlbumModal({ album, getUrlForKey, openImageViewer, onDeletePhoto, onSelectPhoto, selectMode = false, onClose }) {
  // 按时间倒序排序
  const sortedPhotos = [...album].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const [selectedKeys, setSelectedKeys] = useState(new Set());

  function toggleSelect(photoId, imageKey) {
    console.log("[AlbumModal] toggleSelect called with photoId:", photoId, "imageKey:", imageKey);
    const newSelected = new Set(selectedKeys);
    if (newSelected.has(photoId)) {
      newSelected.delete(photoId);
      console.log("[AlbumModal] Removed photoId from selection");
    } else {
      newSelected.add(photoId);
      console.log("[AlbumModal] Added photoId to selection");
    }
    console.log("[AlbumModal] Updated selectedKeys:", Array.from(newSelected));
    setSelectedKeys(newSelected);
  }

  function handleConfirm() {
    console.log("[AlbumModal] handleConfirm called, selectedKeys:", selectedKeys.size, "hasOnSelectPhoto:", !!onSelectPhoto);
    if (selectedKeys.size === 0 || !onSelectPhoto) {
      console.warn("[AlbumModal] Cannot confirm:", { selectedKeysSize: selectedKeys.size, hasOnSelectPhoto: !!onSelectPhoto });
      return;
    }
    const selectedPhotos = sortedPhotos.filter((p) => selectedKeys.has(p.id));
    const imageKeys = selectedPhotos.map((p) => p.imageKey);
    console.log("[AlbumModal] Selected photos:", selectedPhotos.length, "imageKeys:", imageKeys);
    if (imageKeys.length > 0) {
      console.log("[AlbumModal] Calling onSelectPhoto with keys:", imageKeys);
      onSelectPhoto(imageKeys);
    } else {
      console.warn("[AlbumModal] No imageKeys to send");
    }
  }

  if (sortedPhotos.length === 0) {
    return (
      <Modal 
        title={selectMode ? "选择照片" : "多肉相册"} 
        onClose={selectMode ? () => onSelectPhoto && onSelectPhoto([]) : onClose}
      >
        <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-12 text-center">
          <div className="text-6xl mb-4">📷</div>
          <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-2">相册为空</div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">使用多肉相机拍摄照片后，会显示在这里</div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={selectMode ? "选择照片" : "多肉相册"} onClose={selectMode ? () => onSelectPhoto && onSelectPhoto([]) : onClose}>
      <div className="space-y-4">
        {selectMode && (
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            已选择 {selectedKeys.size} 张照片
          </div>
        )}

        {/* 画册式布局 */}
        <div className="max-h-[70vh] overflow-y-auto space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
          {sortedPhotos.map((photo) => (
            <div
              key={photo.id}
              className={`group relative rounded-2xl border-2 overflow-hidden bg-white dark:bg-zinc-800 shadow-lg transition-all cursor-pointer ${
                selectedKeys.has(photo.id)
                  ? "border-zinc-900 dark:border-zinc-100 ring-4 ring-zinc-900/20 dark:ring-zinc-100/20 scale-[0.98]"
                  : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-900 dark:hover:border-zinc-600 hover:shadow-xl"
              }`}
              onClick={() => {
                if (selectMode) {
                  toggleSelect(photo.id, photo.imageKey);
                } else {
                  const images = sortedPhotos.map((p) => ({
                    key: p.imageKey,
                    ext: "jpg",
                    filename: `多肉相机-${formatDateTime(p.createdAt)}.jpg`,
                  }));
                  const currentIndex = sortedPhotos.findIndex((p) => p.id === photo.id);
                  openImageViewer(images, currentIndex);
                }
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
                {/* 选择模式：显示选中标记 */}
                {selectMode && selectedKeys.has(photo.id) && (
                  <div className="absolute inset-0 bg-zinc-900/20 dark:bg-zinc-100/20 flex items-center justify-center">
                    <div className="rounded-full bg-zinc-900 dark:bg-zinc-100 p-3">
                      <div className="text-3xl text-white dark:text-zinc-900">✓</div>
                    </div>
                  </div>
                )}
                {/* 非选择模式：显示删除按钮 */}
                {!selectMode && (
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
                )}
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

        {selectMode && (
          <div className="flex gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
            <button
              onClick={() => {
                if (onSelectPhoto) {
                  onSelectPhoto([]);
                }
              }}
              className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
            >
              取消
            </button>
            <button
              onClick={() => {
                if (selectedKeys.size > 0) {
                  handleConfirm();
                }
              }}
              disabled={selectedKeys.size === 0}
              className="flex-1 rounded-xl bg-zinc-900 dark:bg-zinc-700 px-4 py-2 text-sm text-white dark:text-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              确认选择 ({selectedKeys.size})
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}


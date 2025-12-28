import { useState, useEffect } from "react";
import { Button } from "./Button";
import { get as idbGet } from "idb-keyval";
import { downloadBlob, extFromMime } from "../../utils";

export function ImageViewer({ images, currentIndex = 0, getUrlForKey, onClose, onViewDetail }) {
  const [index, setIndex] = useState(currentIndex);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    function handlePrev() {
      setIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    }

    function handleNext() {
      setIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    }

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [images.length, onClose]);

  function handlePrev() {
    setIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }

  function handleNext() {
    setIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }

  async function handleDownload() {
    if (!images[index]?.key) return;
    
    setIsDownloading(true);
    try {
      const blob = await idbGet(images[index].key);
      if (blob) {
        const ext = images[index].ext || extFromMime(blob.type) || "jpg";
        const filename = images[index].filename || `image-${Date.now()}.${ext}`;
        downloadBlob(blob, filename);
      }
    } catch (err) {
      alert("下载失败：" + err.message);
    } finally {
      setIsDownloading(false);
    }
  }

  if (images.length === 0) return null;

  const currentImage = images[index];
  const imageUrl = currentImage?.key ? getUrlForKey(currentImage.key) : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={onClose}>
      <div className="relative max-h-full max-w-full" onClick={(e) => e.stopPropagation()}>
        {/* 图片 */}
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`${index + 1} / ${images.length}`}
            className="max-h-[90vh] max-w-full rounded-lg object-contain"
          />
        ) : (
          <div className="flex h-96 w-96 items-center justify-center rounded-lg bg-zinc-800 text-white">
            加载中...
          </div>
        )}

        {/* 导航按钮 */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
              aria-label="上一张"
            >
              ←
            </button>
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
              aria-label="下一张"
            >
              →
            </button>
          </>
        )}

        {/* 工具栏 */}
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/50 px-4 py-2">
          <span className="text-sm text-white">
            {index + 1} / {images.length}
          </span>
          {onViewDetail && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
                onViewDetail();
              }}
              className="rounded-full bg-white/20 px-3 py-1 text-sm text-white hover:bg-white/30"
            >
              查看详情
            </button>
          )}
          {currentImage?.key && (
            <Button
              variant="secondary"
              onClick={handleDownload}
              disabled={isDownloading}
              className="bg-white/20 text-white hover:bg-white/30"
            >
              {isDownloading ? "下载中..." : "下载"}
            </Button>
          )}
          <button
            onClick={onClose}
            className="rounded-full bg-white/20 px-3 py-1 text-sm text-white hover:bg-white/30"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}


import { useState, useEffect, useRef } from "react";
import { Button } from "./Button";
import { get as idbGet } from "idb-keyval";
import { downloadBlob, extFromMime } from "../../utils";

export function ImageViewer({ images, currentIndex = 0, getUrlForKey, onClose, onViewDetail }) {
  const [index, setIndex] = useState(currentIndex);
  const [isDownloading, setIsDownloading] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

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

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchMove(e) {
    touchEndX.current = e.touches[0].clientX;
  }

  function handleTouchEnd() {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) {
        // 向左滑动，下一张
        handleNext();
      } else {
        // 向右滑动，上一张
        handlePrev();
      }
    }

    touchStartX.current = 0;
    touchEndX.current = 0;
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
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4" onClick={onClose}>
      {/* 图片区域 - 支持滑动 */}
      <div 
        className="relative flex-1 flex items-center justify-center w-full max-h-[calc(100vh-120px)]"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`${index + 1} / ${images.length}`}
            className="max-h-full max-w-full rounded-lg object-contain select-none"
            draggable={false}
          />
        ) : (
          <div className="flex h-96 w-96 items-center justify-center rounded-lg bg-zinc-800 text-white">
            加载中...
          </div>
        )}
      </div>

      {/* 底部工具栏 - 在图片外面 */}
      <div className="flex items-center justify-center gap-3 mt-4" onClick={(e) => e.stopPropagation()}>
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
            className="rounded-md bg-white/20 px-4 py-2 text-sm text-white hover:bg-white/30 transition-colors"
          >
            查看详情
          </button>
        )}
        {currentImage?.key && (
          <Button
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              handleDownload();
            }}
            disabled={isDownloading}
            className="bg-white/20 text-white hover:bg-white/30 border-white/30"
          >
            {isDownloading ? "下载中..." : "下载"}
          </Button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="rounded-md bg-white/20 px-4 py-2 text-sm text-white hover:bg-white/30 transition-colors"
        >
          关闭
        </button>
      </div>
    </div>
  );
}


import { useEffect, useRef, useState } from "react";
import { get as idbGet } from "idb-keyval";
import { deleteImageFromIdb } from "../utils";

/**
 * 图片缓存管理 Hook
 * 管理从 IndexedDB 加载的图片 URL 缓存
 */
export function useImageCache() {
  const [urlCache, setUrlCache] = useState({});
  const urlCacheRef = useRef({});
  urlCacheRef.current = urlCache;

  // 清理所有 URL 对象，防止内存泄漏
  useEffect(() => {
    return () => {
      const cache = urlCacheRef.current;
      Object.values(cache).forEach((u) => {
        try {
          URL.revokeObjectURL(u);
        } catch {}
      });
    };
  }, []);

  async function ensureUrl(imgKey) {
    if (!imgKey) return;
    if (urlCacheRef.current[imgKey]) return;

    const blob = await idbGet(imgKey);
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    setUrlCache((prev) => ({ ...prev, [imgKey]: url }));
  }

  function getUrlForKey(imgKey) {
    if (!imgKey) return "";
    const u = urlCacheRef.current[imgKey];
    if (!u) ensureUrl(imgKey);
    return u || "";
  }

  async function removeImageKey(imgKey) {
    if (!imgKey) return;
    await deleteImageFromIdb(imgKey);

    const u = urlCacheRef.current[imgKey];
    if (u) {
      try {
        URL.revokeObjectURL(u);
      } catch {}
    }
    setUrlCache((prev) => {
      const next = { ...prev };
      delete next[imgKey];
      return next;
    });
  }

  function clearCache() {
    const cache = urlCacheRef.current;
    Object.values(cache).forEach((u) => {
      try {
        URL.revokeObjectURL(u);
      } catch {}
    });
    setUrlCache({});
  }

  return {
    ensureUrl,
    getUrlForKey,
    removeImageKey,
    clearCache,
  };
}



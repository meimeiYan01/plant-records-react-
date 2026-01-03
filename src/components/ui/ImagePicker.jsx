import { useRef, useState } from "react";
import { Button } from "./Button";
import { saveImageToIdb, MAX_IMAGE_BYTES } from "../../utils";

/**
 * 通用图片选择组件
 * 支持从多肉相册或系统相册选择图片
 */
export function ImagePicker({ onSelect, multiple = false, album = [], getUrlForKey, onOpenAlbum }) {
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);

  // 从系统相册选择
  async function handleFilePick(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter((file) => file.size <= MAX_IMAGE_BYTES);
    if (validFiles.length !== files.length) {
      alert(`部分图片太大（>${Math.floor(MAX_IMAGE_BYTES / 1024 / 1024)}MB），已跳过。`);
    }

    setLoading(true);
    try {
      const keys = [];
      for (const file of validFiles) {
        const key = await saveImageToIdb(file);
        keys.push(key);
      }
      if (onSelect) {
        onSelect(keys);
      }
    } catch (err) {
      alert(String(err.message || err));
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  // 从多肉相册选择
  function handleSelectFromAlbum() {
    if (onOpenAlbum && onSelect) {
      // 传递回调函数，当用户选择照片后会被调用
      onOpenAlbum((imageKeys) => {
        console.log("[ImagePicker] Album callback received keys:", imageKeys);
        if (imageKeys && imageKeys.length > 0) {
          // 直接传递图片keys，不重新上传
          const keysToSelect = multiple ? imageKeys : imageKeys.slice(0, 1);
          console.log("[ImagePicker] Calling onSelect with keys:", keysToSelect);
          onSelect(keysToSelect);
        } else {
          console.log("[ImagePicker] No keys received or empty array");
        }
      });
    } else {
      console.warn("[ImagePicker] Missing onOpenAlbum or onSelect:", { onOpenAlbum: !!onOpenAlbum, onSelect: !!onSelect });
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button
          variant="secondary"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="flex-1"
        >
          {loading ? "上传中..." : "📁 系统相册"}
        </Button>
        {album.length > 0 && (
          <Button
            variant="secondary"
            onClick={handleSelectFromAlbum}
            disabled={loading}
            className="flex-1"
          >
            📷 多肉相册 ({album.length})
          </Button>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        onChange={handleFilePick}
        className="hidden"
      />
    </div>
  );
}


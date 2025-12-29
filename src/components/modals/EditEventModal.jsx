import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { ImageFromIdb } from "../ui/ImageFromIdb";
import { saveImageToIdb, deleteImageFromIdb, MAX_IMAGE_BYTES, EVENT_TYPES, TAGS } from "../../utils";
import { formatDateTime } from "../../utils";

export function EditEventModal({ event, plant, getUrlForKey, onClose, onUpdate }) {
  // 兼容旧数据：如果有 photoKey，转换为 photoKeys 数组
  const initialPhotoKeys = event.photoKeys 
    ? (Array.isArray(event.photoKeys) ? event.photoKeys : [event.photoKeys])
    : (event.photoKey ? [event.photoKey] : []);

  const [type, setType] = useState(event.type || "water");
  const [tags, setTags] = useState(event.tags || []);
  const [note, setNote] = useState(event.note || "");
  const [photoKeys, setPhotoKeys] = useState(initialPhotoKeys);
  const [previewUrls, setPreviewUrls] = useState({});
  const [loading, setLoading] = useState(false);
  const [oldPhotoKeys, setOldPhotoKeys] = useState(initialPhotoKeys);

  useEffect(() => {
    return () => {
      Object.values(previewUrls).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [previewUrls]);

  function toggleTag(t) {
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  async function handlePick(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter((file) => file.size <= MAX_IMAGE_BYTES);
    if (validFiles.length !== files.length) {
      alert(`部分图片太大（>${Math.floor(MAX_IMAGE_BYTES / 1024 / 1024)}MB），已跳过。`);
    }

    setLoading(true);
    try {
      const newKeys = [];
      const newUrls = { ...previewUrls };

      for (const file of validFiles) {
        const key = await saveImageToIdb(file);
        newKeys.push(key);
        newUrls[key] = URL.createObjectURL(file);
      }

      setPhotoKeys((prev) => [...prev, ...newKeys]);
      setPreviewUrls(newUrls);
    } catch (err) {
      alert(String(err.message || err));
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  }

  async function removePhoto(key) {
    await deleteImageFromIdb(key);
    setPhotoKeys((prev) => prev.filter((k) => k !== key));
    if (previewUrls[key]) {
      URL.revokeObjectURL(previewUrls[key]);
      setPreviewUrls((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  function handleSave() {
    // 删除旧照片（如果被移除）
    const removedKeys = oldPhotoKeys.filter((k) => !photoKeys.includes(k));
    removedKeys.forEach((key) => deleteImageFromIdb(key).catch(() => {}));

    const updated = {
      ...event,
      type,
      tags,
      note: note.trim(),
      photoKeys: photoKeys,
    };
    
    onUpdate(updated);
  }

  return (
    <Modal title={`编辑事件 · ${plant.name}`} onClose={onClose}>
      <div className="space-y-3">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-xs text-zinc-600">
          事件时间：{formatDateTime(event.at)}
        </div>

        <div>
          <div className="mb-1 text-xs text-zinc-500">事件类型</div>
          <select
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {EVENT_TYPES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="mb-1 text-xs text-zinc-500">标签（可选）</div>
          <div className="flex flex-wrap gap-2">
            {TAGS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggleTag(t)}
                className={`rounded-full border px-2 py-1 text-xs ${
                  tags.includes(t) ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1 text-xs text-zinc-500">事件照片（可选，可多选）</div>
          <input type="file" accept="image/*" multiple onChange={handlePick} />
          {loading && <div className="mt-2 text-sm text-zinc-500">保存中…</div>}
          {photoKeys.length > 0 && (
            <div className="mt-2 grid grid-cols-3 gap-2">
              {photoKeys.map((key) => (
                <div key={key} className="relative">
                  {previewUrls[key] ? (
                    <img
                      src={previewUrls[key]}
                      alt="preview"
                      className="h-20 w-full rounded-xl border object-cover"
                    />
                  ) : (
                    <ImageFromIdb
                      imgKey={key}
                      getUrlForKey={getUrlForKey}
                      alt="preview"
                      className="h-20 w-full rounded-xl border object-cover"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removePhoto(key)}
                    className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-1 text-xs text-zinc-500">备注（可选）</div>
          <textarea
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900"
            rows={4}
            placeholder="比如：浇透，通风，三天后复查叶片饱满度。"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSave}>保存</Button>
        </div>
      </div>
    </Modal>
  );
}



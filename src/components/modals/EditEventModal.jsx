import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { ImageFromIdb } from "../ui/ImageFromIdb";
import { saveImageToIdb, deleteImageFromIdb, MAX_IMAGE_BYTES, EVENT_TYPES, TAGS } from "../../utils";
import { formatDateTime } from "../../utils";

export function EditEventModal({ event, plant, getUrlForKey, onClose, onUpdate }) {
  const [type, setType] = useState(event.type || "water");
  const [tags, setTags] = useState(event.tags || []);
  const [note, setNote] = useState(event.note || "");
  const [photoKey, setPhotoKey] = useState(event.photoKey || "");
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [oldPhotoKey, setOldPhotoKey] = useState(event.photoKey || "");

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function toggleTag(t) {
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  async function handlePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_BYTES) {
      alert(`图片太大（>${Math.floor(MAX_IMAGE_BYTES / 1024 / 1024)}MB）。先用小一点的图。`);
      e.target.value = "";
      return;
    }

    setLoading(true);
    try {
      const key = await saveImageToIdb(file);
      setPhotoKey(key);

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
    } catch (err) {
      alert(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  async function removePicked() {
    if (photoKey) {
      await deleteImageFromIdb(photoKey);
      setPhotoKey("");
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
  }

  function handleSave() {
    const updated = {
      ...event,
      type,
      tags,
      note: note.trim(),
      photoKey: photoKey || "",
    };
    
    // 如果更换了照片，删除旧图
    if (oldPhotoKey && oldPhotoKey !== photoKey) {
      deleteImageFromIdb(oldPhotoKey).catch(() => {});
    }
    
    onUpdate(updated);
  }

  const currentImageUrl = photoKey ? getUrlForKey(photoKey) : "";
  const showCurrentImage = photoKey && !previewUrl && currentImageUrl;

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
          <div className="mb-1 text-xs text-zinc-500">事件照片（可选）</div>
          <input type="file" accept="image/*" onChange={handlePick} />
          <div className="mt-2">
            {loading ? (
              <div className="text-sm text-zinc-500">保存中…</div>
            ) : previewUrl ? (
              <div className="flex items-center gap-3">
                <img src={previewUrl} alt="preview" className="h-28 w-28 rounded-2xl border object-cover" />
                <Button variant="secondary" onClick={removePicked}>
                  移除
                </Button>
              </div>
            ) : showCurrentImage ? (
              <div className="flex items-center gap-3">
                <ImageFromIdb
                  imgKey={photoKey}
                  getUrlForKey={getUrlForKey}
                  alt="current"
                  className="h-28 w-28 rounded-2xl border object-cover"
                />
                <Button variant="secondary" onClick={removePicked}>
                  移除
                </Button>
              </div>
            ) : (
              <div className="text-sm text-zinc-400">未设置照片</div>
            )}
          </div>
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


import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { saveImageToIdb, deleteImageFromIdb, MAX_IMAGE_BYTES, EVENT_TYPES, TAGS, uid } from "../../utils";

export function AddEventModal({ plant, onClose, onCreate }) {
  const [type, setType] = useState("water");
  const [tags, setTags] = useState([]);
  const [note, setNote] = useState("");
  const [photoKey, setPhotoKey] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);

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

  return (
    <Modal title={`记录事件 · ${plant.name}`} onClose={onClose}>
      <div className="space-y-3">
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
            ) : (
              <div className="text-sm text-zinc-400">未选择照片</div>
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
          <Button
            onClick={() =>
              onCreate({
                id: uid("e"),
                plantId: plant.id,
                type,
                at: new Date().toISOString(),
                tags,
                note: note.trim(),
                photoKey: photoKey || "",
              })
            }
          >
            保存
          </Button>
        </div>
      </div>
    </Modal>
  );
}



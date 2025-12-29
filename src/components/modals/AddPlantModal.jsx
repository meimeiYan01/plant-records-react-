import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { saveImageToIdb, deleteImageFromIdb, MAX_IMAGE_BYTES, uid } from "../../utils";

export function AddPlantModal({ locations, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState(locations[0] || "");
  const [coverKey, setCoverKey] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

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
      setCoverKey(key);

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
    } catch (err) {
      alert(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  async function removePicked() {
    if (coverKey) {
      await deleteImageFromIdb(coverKey);
      setCoverKey("");
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
  }

  return (
    <Modal title="新增多肉（可上传封面）" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <div className="mb-1 text-xs text-zinc-500">名称 / 品种</div>
          <input
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900"
            placeholder="比如：拟石莲花 / 十二卷 / 无名多肉A"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <div className="mb-1 text-xs text-zinc-500">位置</div>
          <select
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          >
            {locations.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="mb-1 text-xs text-zinc-500">封面照片（可选）</div>
          <input type="file" accept="image/*" onChange={handlePick} />
          <div className="mt-2">
            {loading ? (
              <div className="text-sm text-zinc-500">保存中…</div>
            ) : previewUrl ? (
              <div className="flex items-center gap-3">
                <img src={previewUrl} alt="preview" className="h-24 w-24 rounded-2xl border object-cover" />
                <Button variant="secondary" onClick={removePicked}>
                  移除
                </Button>
              </div>
            ) : (
              <div className="text-sm text-zinc-400">未选择照片</div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button
            disabled={!name.trim()}
            onClick={() =>
              onCreate({
                id: uid("p"),
                name: name.trim(),
                location,
                startDate: new Date().toISOString(),
                lastWateredAt: null,
                coverPhotoKey: coverKey || "",
              })
            }
          >
            创建
          </Button>
        </div>
      </div>
    </Modal>
  );
}



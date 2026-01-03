import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button, ImageFromIdb, ImagePicker } from "../ui";
import { deleteImageFromIdb, LOG_TYPES, LOG_TAGS, WEATHER_OPTIONS, MOOD_OPTIONS, uid } from "../../utils";
import { createLog } from "../../services/logService";

export function AddLogModal({ plants, getUrlForKey, onClose, onCreate, album, onOpenAlbum }) {
  const [type, setType] = useState("daily");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState([]);
  const [weather, setWeather] = useState("");
  const [mood, setMood] = useState("");
  const [relatedPlants, setRelatedPlants] = useState([]);
  const [photoKeys, setPhotoKeys] = useState([]);
  const [previewUrls, setPreviewUrls] = useState({});
  const [uploadedKeys, setUploadedKeys] = useState(new Set()); // 跟踪新上传的图片keys

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

  function togglePlant(plantId) {
    setRelatedPlants((prev) =>
      prev.includes(plantId) ? prev.filter((id) => id !== plantId) : [...prev, plantId]
    );
  }

  function handleImageSelect(keys) {
    console.log("[AddLogModal] handleImageSelect called with:", keys);
    // 确保 keys 是数组
    const keysArray = Array.isArray(keys) ? keys : [keys].filter(Boolean);
    console.log("[AddLogModal] keysArray:", keysArray);
    if (keysArray.length > 0) {
      // 避免重复添加相同的 key
      setPhotoKeys((prev) => {
        console.log("[AddLogModal] Current photoKeys:", prev);
        const newKeys = keysArray.filter((k) => !prev.includes(k));
        console.log("[AddLogModal] New keys to add:", newKeys);
        if (newKeys.length > 0) {
          const updated = [...prev, ...newKeys];
          console.log("[AddLogModal] Updated photoKeys:", updated);
          return updated;
        }
        return prev;
      });
      // 检查哪些图片是新上传的（不在相册中）
      const albumKeys = new Set((album || []).map((p) => p.imageKey));
      setUploadedKeys((prev) => {
        const next = new Set(prev);
        keysArray.forEach((k) => {
          // 只有不在相册中的图片才标记为新上传的
          if (!albumKeys.has(k)) {
            next.add(k);
          }
        });
        return next;
      });
    } else {
      console.warn("[AddLogModal] No keys to add");
    }
  }

  function handleOpenAlbum(callback) {
    console.log("[AddLogModal] handleOpenAlbum called, callback:", callback);
    // callback 是 ImagePicker 传递的回调函数
    // 当用户选择照片后，callback 会被调用，然后通过 onSelect 传递 keys
    if (onOpenAlbum) {
      console.log("[AddLogModal] Calling onOpenAlbum with callback");
      onOpenAlbum(callback);
    } else {
      console.warn("[AddLogModal] onOpenAlbum is not provided");
    }
  }

  async function removePhoto(key) {
    // 只有新上传的图片才删除，从相册引用的不删除
    if (uploadedKeys.has(key)) {
      await deleteImageFromIdb(key);
      setUploadedKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
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

  function handleCreate() {
    const log = createLog({
      id: uid("log"),
      type,
      title: title.trim(),
      content: content.trim(),
      tags,
      photos: photoKeys,
      weather,
      mood,
      relatedPlants,
    });
    onCreate(log);
  }

  return (
    <Modal title="新建日志" onClose={onClose}>
      <div className="space-y-3 max-h-[70vh] overflow-y-auto">
        <div>
          <div className="mb-1 text-xs text-zinc-500">日志类型</div>
          <select
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {LOG_TYPES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="mb-1 text-xs text-zinc-500">标题（可选）</div>
          <input
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900"
            placeholder="输入日志标题（可选）"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <div className="mb-1 text-xs text-zinc-500">内容</div>
          <textarea
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900"
            rows={6}
            placeholder="记录你的观察、感受、问题..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>

        <div>
          <div className="mb-1 text-xs text-zinc-500">标签（可选）</div>
          <div className="flex flex-wrap gap-2">
            {LOG_TAGS.map((t) => (
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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="mb-1 text-xs text-zinc-500">天气（可选）</div>
            <select
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900"
              value={weather}
              onChange={(e) => setWeather(e.target.value)}
            >
              <option value="">无</option>
              {WEATHER_OPTIONS.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="mb-1 text-xs text-zinc-500">心情（可选）</div>
            <select
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900"
              value={mood}
              onChange={(e) => setMood(e.target.value)}
            >
              <option value="">无</option>
              {MOOD_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {plants.length > 0 && (
          <div>
            <div className="mb-1 text-xs text-zinc-500">关联多肉（可选）</div>
            <div className="max-h-32 overflow-y-auto rounded-xl border border-zinc-200 p-2">
              <div className="flex flex-wrap gap-2">
                {plants.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePlant(p.id)}
                    className={`rounded-full border px-2 py-1 text-xs ${
                      relatedPlants.includes(p.id)
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 bg-white"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div>
          <div className="mb-1 text-xs text-zinc-500">照片（可选，可多选）</div>
          <ImagePicker
            onSelect={handleImageSelect}
            multiple={true}
            album={album || []}
            getUrlForKey={getUrlForKey}
            onOpenAlbum={handleOpenAlbum}
          />
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

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleCreate}>
            创建
          </Button>
        </div>
      </div>
    </Modal>
  );
}


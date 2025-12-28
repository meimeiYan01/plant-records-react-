import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { ImageFromIdb } from "../ui/ImageFromIdb";
import {
  saveImageToIdb,
  deleteImageFromIdb,
  MAX_IMAGE_BYTES,
  LOG_TYPES,
  LOG_TAGS,
  WEATHER_OPTIONS,
  MOOD_OPTIONS,
} from "../../utils";
import { formatDateTime } from "../../utils";

export function EditLogModal({ log, plants, getUrlForKey, onClose, onUpdate }) {
  // 兼容旧数据：如果 weather/mood 是数组，取第一个；如果是字符串，直接使用
  const initialWeather = Array.isArray(log.weather) 
    ? (log.weather.length > 0 ? log.weather[0] : "") 
    : (log.weather || "");
  const initialMood = Array.isArray(log.mood) 
    ? (log.mood.length > 0 ? log.mood[0] : "") 
    : (log.mood || "");

  const [type, setType] = useState(log.type || "daily");
  const [title, setTitle] = useState(log.title || "");
  const [content, setContent] = useState(log.content || "");
  const [tags, setTags] = useState(log.tags || []);
  const [weather, setWeather] = useState(initialWeather);
  const [mood, setMood] = useState(initialMood);
  const [relatedPlants, setRelatedPlants] = useState(log.relatedPlants || []);
  const [photoKeys, setPhotoKeys] = useState(log.photos || []);
  const [previewUrls, setPreviewUrls] = useState({});
  const [loading, setLoading] = useState(false);
  const [oldPhotoKeys, setOldPhotoKeys] = useState(log.photos || []);

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
      ...log,
      type,
      title: title.trim(),
      content: content.trim(),
      tags,
      photos: photoKeys,
      weather,
      mood,
      relatedPlants,
    };
    onUpdate(updated);
  }

  return (
    <Modal title="编辑日志" onClose={onClose}>
      <div className="space-y-3 max-h-[70vh] overflow-y-auto">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-xs text-zinc-600">
          创建时间：{formatDateTime(log.date)}
        </div>

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

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSave}>
            保存
          </Button>
        </div>
      </div>
    </Modal>
  );
}


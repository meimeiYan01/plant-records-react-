import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { ImageFromIdb } from "../ui/ImageFromIdb";
import { saveImageToIdb, deleteImageFromIdb, MAX_IMAGE_BYTES, KNOWLEDGE_TYPES, KNOWLEDGE_TAGS, KNOWLEDGE_SOURCES, uid } from "../../utils";
import { createKnowledge } from "../../services/knowledgeService";

export function AddKnowledgeModal({ getUrlForKey, onClose, onCreate }) {
  const [type, setType] = useState("document");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [tags, setTags] = useState([]);
  const [source, setSource] = useState("");
  const [customSource, setCustomSource] = useState("");
  const [coverPhotoKeys, setCoverPhotoKeys] = useState([]);
  const [previewUrls, setPreviewUrls] = useState({});
  const [loading, setLoading] = useState(false);

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

  async function handlePickCover(e) {
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

      setCoverPhotoKeys((prev) => [...prev, ...newKeys]);
      setPreviewUrls(newUrls);
    } catch (err) {
      alert(String(err.message || err));
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  }

  async function removeCover(keyToRemove) {
    await deleteImageFromIdb(keyToRemove);
    setCoverPhotoKeys((prev) => prev.filter((k) => k !== keyToRemove));
    if (previewUrls[keyToRemove]) {
      URL.revokeObjectURL(previewUrls[keyToRemove]);
      setPreviewUrls((prev) => {
        const next = { ...prev };
        delete next[keyToRemove];
        return next;
      });
    }
  }

  function handleCreate() {
    if (type === "web" && !url.trim()) {
      alert("请输入URL");
      return;
    }

    // 处理来源：如果是自定义，使用自定义输入的值
    const finalSource = source === "custom" ? customSource.trim() : (source ? KNOWLEDGE_SOURCES.find(s => s.key === source)?.label || source : "");

    const knowledge = createKnowledge({
      id: uid("knowledge"),
      type,
      title: title.trim(),
      content: content.trim(),
      url: url.trim(),
      tags,
      source: finalSource,
      coverPhotoKeys,
    });
    onCreate(knowledge);
  }

  const knowledgeType = KNOWLEDGE_TYPES.find((t) => t.key === type);
  const isDocument = type === "document";
  const isWeb = type === "web";

  return (
    <Modal title="新建知识" onClose={onClose}>
      <div className="space-y-3 max-h-[70vh] overflow-y-auto">
        <div>
          <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">知识类型</div>
          <select
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-900 dark:focus:border-zinc-600"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {KNOWLEDGE_TYPES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.icon} {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">标题（可选）</div>
          <input
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none focus:border-zinc-900 dark:focus:border-zinc-600"
            placeholder="输入知识标题（可选）"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {isDocument ? (
          <div>
            <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">Markdown内容</div>
            <textarea
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none focus:border-zinc-900 dark:focus:border-zinc-600"
              rows={8}
              placeholder="输入Markdown格式的内容..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
        ) : (
          <>
            <div>
              <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">URL *</div>
              <input
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none focus:border-zinc-900 dark:focus:border-zinc-600"
                type="url"
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <div>
              <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">描述/备注</div>
              <textarea
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none focus:border-zinc-900 dark:focus:border-zinc-600"
                rows={4}
                placeholder="记录一些关键信息或备注..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
          </>
        )}

        <div>
          <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">来源（可选）</div>
          <select
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-900 dark:focus:border-zinc-600"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            <option value="">无</option>
            {KNOWLEDGE_SOURCES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          {source === "custom" && (
            <input
              className="mt-2 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none focus:border-zinc-900 dark:focus:border-zinc-600"
              placeholder="输入自定义来源"
              value={customSource}
              onChange={(e) => setCustomSource(e.target.value)}
            />
          )}
        </div>

        <div>
          <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">标签（可选）</div>
          <div className="flex flex-wrap gap-2">
            {KNOWLEDGE_TAGS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggleTag(t)}
                className={`rounded-full border px-2 py-1 text-xs transition ${
                  tags.includes(t)
                    ? "border-zinc-900 dark:border-zinc-600 bg-zinc-900 dark:bg-zinc-700 text-white dark:text-zinc-100"
                    : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">封面图（可选，可多选）</div>
          <input type="file" accept="image/*" multiple onChange={handlePickCover} />
          {loading && <div className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">保存中…</div>}
          {coverPhotoKeys.length > 0 && (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
              {coverPhotoKeys.map((key) => (
                <div key={key} className="relative shrink-0">
                  {previewUrls[key] ? (
                    <img
                      src={previewUrls[key]}
                      alt="cover preview"
                      className="h-32 w-auto rounded-xl border border-zinc-200 dark:border-zinc-700 object-cover"
                    />
                  ) : (
                    <ImageFromIdb
                      imgKey={key}
                      getUrlForKey={getUrlForKey}
                      alt="cover"
                      className="h-32 w-auto rounded-xl border border-zinc-200 dark:border-zinc-700 object-cover"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeCover(key)}
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



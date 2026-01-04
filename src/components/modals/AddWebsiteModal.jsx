import { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { uid } from "../../utils";

export function AddWebsiteModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");

  function handleAddTag() {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput("");
    }
  }

  function handleRemoveTag(tagToRemove) {
    setTags(tags.filter((t) => t !== tagToRemove));
  }

  function handleCreate() {
    if (!url.trim()) {
      alert("请输入URL");
      return;
    }

    const website = {
      id: uid("website"),
      name: name.trim() || "",
      url: url.trim(),
      description: description.trim(),
      tags,
      createdAt: new Date().toISOString(),
    };
    onCreate(website);
  }

  return (
    <Modal title="添加网站" onClose={onClose}>
      <div className="space-y-3 max-h-[70vh] overflow-y-auto">
        <div>
          <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">网站名称（可选）</div>
          <input
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none focus:border-zinc-900 dark:focus:border-zinc-600"
            placeholder="输入网站名称（可选）"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

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
          <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">描述（可选）</div>
          <textarea
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none focus:border-zinc-900 dark:focus:border-zinc-600"
            rows={4}
            placeholder="输入网站描述..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">标签（可选）</div>
          <div className="flex gap-2 mb-2">
            <input
              className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none focus:border-zinc-900 dark:focus:border-zinc-600"
              placeholder="输入标签后按回车添加"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
            />
            <Button onClick={handleAddTag} variant="secondary">
              添加
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-2 py-1 text-xs"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-red-600 dark:hover:text-red-400"
                  >
                    ×
                  </button>
                </span>
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


import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { ImageFromIdb } from "../ui/ImageFromIdb";
import { saveImageToIdb, deleteImageFromIdb, MAX_IMAGE_BYTES, uid } from "../../utils";

export function AddPlantVarietyModal({ getUrlForKey, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [scientificName, setScientificName] = useState("");
  const [family, setFamily] = useState("");
  const [genus, setGenus] = useState("");
  const [species, setSpecies] = useState("");
  const [description, setDescription] = useState("");
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
    if (!name.trim()) {
      alert("请输入品种名称");
      return;
    }

    const variety = {
      id: uid("variety"),
      name: name.trim(),
      scientificName: scientificName.trim(),
      family: family.trim(),
      genus: genus.trim(),
      species: species.trim(),
      description: description.trim(),
      coverPhotoKeys,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onCreate(variety);
  }

  return (
    <Modal title="添加多肉品种" onClose={onClose}>
      <div className="space-y-3 max-h-[70vh] overflow-y-auto">
        <div>
          <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">品种名称 *</div>
          <input
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none focus:border-zinc-900 dark:focus:border-zinc-600"
            placeholder="输入品种名称"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">学名（可选）</div>
          <input
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none focus:border-zinc-900 dark:focus:border-zinc-600"
            placeholder="输入学名（拉丁文）"
            value={scientificName}
            onChange={(e) => setScientificName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">科（可选）</div>
            <input
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none focus:border-zinc-900 dark:focus:border-zinc-600"
              placeholder="科"
              value={family}
              onChange={(e) => setFamily(e.target.value)}
            />
          </div>
          <div>
            <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">属（可选）</div>
            <input
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none focus:border-zinc-900 dark:focus:border-zinc-600"
              placeholder="属"
              value={genus}
              onChange={(e) => setGenus(e.target.value)}
            />
          </div>
          <div>
            <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">种（可选）</div>
            <input
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none focus:border-zinc-900 dark:focus:border-zinc-600"
              placeholder="种"
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
            />
          </div>
        </div>

        <div>
          <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">描述（可选）</div>
          <textarea
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none focus:border-zinc-900 dark:focus:border-zinc-600"
            rows={4}
            placeholder="输入品种描述..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
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


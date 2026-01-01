import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { ImageFromIdb } from "../ui/ImageFromIdb";
import {
  saveImageToIdb,
  deleteImageFromIdb,
  MAX_IMAGE_BYTES,
  EXPENSE_TYPES,
  EXPENSE_TAGS,
  CURRENCIES,
  uid,
} from "../../utils";
import { createExpense, validateExpense } from "../../services/expenseService";

export function AddExpenseModal({ plants, getUrlForKey, onClose, onCreate }) {
  const [type, setType] = useState("other");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("CNY");
  const [description, setDescription] = useState("");
  const [relatedPlantId, setRelatedPlantId] = useState("");
  const [tags, setTags] = useState([]);
  const [photoKeys, setPhotoKeys] = useState([]);
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

  function handleCreate() {
    try {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error("请输入有效的金额");
      }
      validateExpense({ amount: amountNum, category });
      const expense = createExpense({
        id: uid("exp"),
        type,
        category: category.trim(),
        amount: amountNum,
        currency,
        description: description.trim(),
        relatedPlantId: relatedPlantId || "",
        photos: photoKeys,
        tags,
      });
      onCreate(expense);
    } catch (err) {
      alert(String(err.message || err));
    }
  }

  return (
    <Modal title="记录花费" onClose={onClose}>
      <div className="space-y-3 max-h-[70vh] overflow-y-auto">
        <div>
          <div className="mb-1 text-xs text-zinc-500">花费类型</div>
          <select
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {EXPENSE_TYPES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.icon} {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="mb-1 text-xs text-zinc-500">分类 *</div>
          <input
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900"
            placeholder="如：购买多肉、换盆材料等"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="mb-1 text-xs text-zinc-500">金额 *</div>
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <div className="mb-1 text-xs text-zinc-500">货币</div>
            <select
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <div className="mb-1 text-xs text-zinc-500">描述（可选）</div>
          <textarea
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900"
            rows={3}
            placeholder="记录花费的详细信息..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {plants.length > 0 && (
          <div>
            <div className="mb-1 text-xs text-zinc-500">关联多肉（可选）</div>
            <select
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900"
              value={relatedPlantId}
              onChange={(e) => setRelatedPlantId(e.target.value)}
            >
              <option value="">不关联</option>
              {plants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <div className="mb-1 text-xs text-zinc-500">标签（可选）</div>
          <div className="flex flex-wrap gap-2">
            {EXPENSE_TAGS.map((t) => (
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
          <Button disabled={!category.trim() || !amount} onClick={handleCreate}>
            保存
          </Button>
        </div>
      </div>
    </Modal>
  );
}




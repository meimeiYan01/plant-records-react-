import { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";

export function DataPanelModal({ state, onClose, onImport, onReset, onExportZip, onImportZip }) {
  const [text, setText] = useState(() => JSON.stringify(state, null, 2));
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function doImportText() {
    try {
      const parsed = JSON.parse(text);
      if (!parsed || !Array.isArray(parsed.plants) || !Array.isArray(parsed.events)) {
        throw new Error("数据格式不对：需要包含 plants[] 和 events[]");
      }
      onImport({
        locations: parsed.locations || ["南窗", "东窗", "北窗", "补光灯架"],
        plants: (parsed.plants || []).map((p) => ({
          ...p,
          coverPhotoKey: p.coverPhotoKey || "",
        })),
        events: (parsed.events || []).map((e) => ({
          ...e,
          tags: e.tags || [],
          photoKey: e.photoKey || "",
        })),
      });
    } catch (e) {
      setErr(String(e.message || e));
    }
  }

  return (
    <Modal title="导入 / 导出（JSON & ZIP 备份）" onClose={onClose}>
      <div className="space-y-3">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
          <div className="font-semibold">推荐：ZIP 备份（含照片，可直接打开）</div>
          <div className="mt-1 text-xs text-zinc-600">
            ZIP 会把图片本体一起打包，换电脑也能完整恢复；解压后 images/ 里的文件可直接双击查看。
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="primary"
              disabled={busy}
              onClick={async () => {
                try {
                  setBusy(true);
                  await onExportZip();
                } catch (e) {
                  setErr(String(e.message || e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "导出中…" : "导出 ZIP 备份（含照片）"}
            </Button>

            <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50">
              {busy ? "导入中…" : "从 ZIP 导入（恢复照片）"}
              <input
                type="file"
                accept=".zip,application/zip"
                className="hidden"
                disabled={busy}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    setBusy(true);
                    await onImportZip(file);
                  } catch (err2) {
                    setErr(String(err2.message || err2));
                  } finally {
                    setBusy(false);
                    e.target.value = "";
                  }
                }}
              />
            </label>
          </div>
        </div>

        <div className="text-sm text-zinc-600">JSON（仅结构，不含图片本体）：</div>

        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setErr("");
          }}
          rows={10}
          className="w-full rounded-xl border border-zinc-200 px-3 py-2 font-mono text-xs outline-none focus:border-zinc-900"
        />

        {err ? <div className="text-sm text-red-600">{err}</div> : null}

        <div className="flex flex-wrap justify-between gap-2 pt-2">
          <Button variant="secondary" onClick={doImportText} disabled={busy}>
            从文本导入（仅结构）
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigator.clipboard.writeText(text)} disabled={busy}>
              复制导出（仅结构）
            </Button>
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              关闭
            </Button>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3">
          <div className="text-sm font-semibold text-red-700">危险区</div>
          <div className="mt-1 text-sm text-red-700">清空结构数据（不清 IndexedDB 图片库）。</div>
          <div className="mt-2">
            <Button variant="secondary" onClick={onReset} disabled={busy}>
              清空数据
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}


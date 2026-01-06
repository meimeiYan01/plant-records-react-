import { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";

export function KnowledgeDataPanelModal({ onClose, onExportZip, onImportZip }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  return (
    <Modal title="知识导入 / 导出" onClose={onClose}>
      <div className="space-y-3">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
          <div className="font-semibold">ZIP 导出（含文字 + 图片）</div>
          <div className="mt-1 text-xs text-zinc-600">
            使用与全量备份一致的格式，导入后可兼容当前数据结构。
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="primary"
              disabled={busy}
              onClick={async () => {
                try {
                  setBusy(true);
                  setErr("");
                  await onExportZip();
                } catch (e) {
                  setErr(String(e.message || e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "导出中..." : "导出 ZIP（知识）"}
            </Button>

            <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50">
              {busy ? "导入中..." : "从 ZIP 导入（知识）"}
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
                    setErr("");
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

        {err ? <div className="text-sm text-red-600">{err}</div> : null}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            关闭
          </Button>
        </div>
      </div>
    </Modal>
  );
}

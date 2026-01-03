import { Modal } from "./Modal";
import { Button } from "./Button";

export function ConfirmDialog({ title, message, confirmText = "确认", cancelText = "取消", onConfirm, onCancel }) {
  return (
    <Modal title={title || "确认操作"} onClose={onCancel}>
      <div className="space-y-4">
        <div className="text-sm text-zinc-700">{message}</div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            {cancelText}
          </Button>
          <Button
            onClick={() => {
              onConfirm();
              onCancel();
            }}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}





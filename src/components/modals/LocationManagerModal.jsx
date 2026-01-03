import { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";

export function LocationManagerModal({ locations, plants, onClose, onUpdate }) {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [newLocation, setNewLocation] = useState("");

  function handleAdd() {
    if (!newLocation.trim()) return;
    if (locations.includes(newLocation.trim())) {
      alert("该位置已存在");
      return;
    }
    onUpdate([...locations, newLocation.trim()]);
    setNewLocation("");
  }

  function handleEdit(index) {
    setEditingIndex(index);
    setEditValue(locations[index]);
  }

  function handleSaveEdit() {
    if (!editValue.trim()) return;
    if (locations.includes(editValue.trim()) && locations[editingIndex] !== editValue.trim()) {
      alert("该位置已存在");
      return;
    }
    const updated = [...locations];
    updated[editingIndex] = editValue.trim();
    onUpdate(updated);
    setEditingIndex(null);
    setEditValue("");
  }

  function handleDelete(index) {
    const location = locations[index];
    const usedCount = plants.filter((p) => p.location === location).length;
    
    if (usedCount > 0) {
      if (!confirm(`该位置正在被 ${usedCount} 盆多肉使用，删除后这些多肉的位置将变为"未设置位置"。确定要删除吗？`)) {
        return;
      }
    }
    
    const updated = locations.filter((_, i) => i !== index);
    onUpdate(updated);
  }

  function getLocationUsage(location) {
    return plants.filter((p) => p.location === location).length;
  }

  return (
    <Modal title="位置管理" onClose={onClose}>
      <div className="space-y-4">
        {/* 添加新位置 */}
        <div>
          <div className="mb-2 text-xs font-semibold text-zinc-700">添加新位置</div>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900"
              placeholder="输入位置名称"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
            />
            <Button onClick={handleAdd}>添加</Button>
          </div>
        </div>

        {/* 位置列表 */}
        <div>
          <div className="mb-2 text-xs font-semibold text-zinc-700">位置列表</div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {locations.length === 0 ? (
              <div className="text-sm text-zinc-400 text-center py-4">暂无位置</div>
            ) : (
              locations.map((location, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-3"
                >
                  {editingIndex === index ? (
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        className="flex-1 rounded-lg border border-zinc-200 px-2 py-1 text-sm outline-none focus:border-zinc-900"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") handleSaveEdit();
                          if (e.key === "Escape") {
                            setEditingIndex(null);
                            setEditValue("");
                          }
                        }}
                        autoFocus
                      />
                      <Button variant="secondary" onClick={() => handleSaveEdit()}>
                        保存
                      </Button>
                      <Button variant="secondary" onClick={() => { setEditingIndex(null); setEditValue(""); }}>
                        取消
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-zinc-900">{location}</div>
                        <div className="text-xs text-zinc-500">
                          使用中：{getLocationUsage(location)} 盆
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => handleEdit(index)}>
                          编辑
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => handleDelete(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          删除
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={onClose}>关闭</Button>
        </div>
      </div>
    </Modal>
  );
}





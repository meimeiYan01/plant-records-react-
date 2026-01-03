import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button, ImagePicker } from "../ui";
import { get as idbGet } from "idb-keyval";
import { deleteImageFromIdb, uid } from "../../utils";

export function AddPlantModal({ locations, onClose, onCreate, album, getUrlForKey, onOpenAlbum }) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState(locations[0] || "");
  const [coverKey, setCoverKey] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [isFromAlbum, setIsFromAlbum] = useState(false); // 标记图片是否来自相册

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    async function loadPreview() {
      if (coverKey) {
        const blob = await idbGet(coverKey);
        if (blob) {
          const oldUrl = previewUrl;
          const newUrl = URL.createObjectURL(blob);
          setPreviewUrl(newUrl);
          if (oldUrl) URL.revokeObjectURL(oldUrl);
        } else {
          if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl("");
          }
        }
      } else {
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          setPreviewUrl("");
        }
      }
    }
    loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coverKey]);

  function handleImageSelect(keys) {
    if (keys && keys.length > 0) {
      setCoverKey(keys[0]);
      // 检查是否来自相册（通过检查 album 中是否有这个 key）
      const isFromAlbumRef = album && album.some((p) => p.imageKey === keys[0]);
      setIsFromAlbum(isFromAlbumRef);
    }
  }

  function handleOpenAlbum(callback) {
    // callback 是 ImagePicker 传递的回调函数
    // 当用户选择照片后，callback 会被调用，然后通过 onSelect 传递 keys
    // 所以这里只需要传递 callback 即可，不需要处理 keys
    onOpenAlbum(callback);
  }

  async function removePicked() {
    if (coverKey && !isFromAlbum) {
      // 只有新上传的图片才删除，相册引用的图片不删除
      await deleteImageFromIdb(coverKey);
    }
    setCoverKey("");
    setIsFromAlbum(false);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
  }

  return (
    <Modal title="新增多肉（可上传封面）" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <div className="mb-1 text-xs text-zinc-500">名称 / 品种</div>
          <input
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900"
            placeholder="比如：拟石莲花 / 十二卷 / 无名多肉A"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <div className="mb-1 text-xs text-zinc-500">位置</div>
          <select
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          >
            {locations.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="mb-1 text-xs text-zinc-500">封面照片（可选）</div>
          <ImagePicker
            onSelect={handleImageSelect}
            multiple={false}
            album={album || []}
            getUrlForKey={getUrlForKey}
            onOpenAlbum={handleOpenAlbum}
          />
          <div className="mt-2">
            {previewUrl ? (
              <div className="flex items-center gap-3">
                <img src={previewUrl} alt="preview" className="h-24 w-24 rounded-2xl border object-cover" />
                <Button variant="secondary" onClick={removePicked}>
                  移除
                </Button>
              </div>
            ) : (
              <div className="text-sm text-zinc-400">未选择照片</div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button
            disabled={!name.trim()}
            onClick={() =>
              onCreate({
                id: uid("p"),
                name: name.trim(),
                location,
                startDate: new Date().toISOString(),
                lastWateredAt: null,
                coverPhotoKey: coverKey || "",
              })
            }
          >
            创建
          </Button>
        </div>
      </div>
    </Modal>
  );
}




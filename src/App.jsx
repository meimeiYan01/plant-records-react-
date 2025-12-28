import React, { useEffect, useMemo, useRef, useState } from "react";
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";
import JSZip from "jszip";

/**
 * 多肉记录 App · MVP（IndexedDB 照片 + ZIP 备份，可直接打开图片）
 * - 结构数据：localStorage
 * - 照片：IndexedDB（存 Blob，并强制保留 MIME type）
 * - 备份 ZIP：backup.json + images/<key>.<ext> + images-manifest.json
 * - 恢复 ZIP：按 manifest 写回 IndexedDB，key 不变（引用不丢）
 */

const LS_KEY = "succulent_log_v3_indexeddb_photos";
const BACKUP_VERSION = 2;

const EVENT_TYPES = [
  { key: "water", label: "浇水" },
  { key: "repot", label: "换盆" },
  { key: "move", label: "移位" },
  { key: "pest", label: "虫害/处理" },
  { key: "snapshot", label: "状态快照" },
];

const TAGS = ["盆轻", "叶软", "土干透", "换季", "连阴雨", "暴晒", "通风差", "恢复中"];

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB（你可调大）

/* ---------------- 工具函数 ---------------- */

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function formatDateTime(iso) {
  const d = new Date(iso);
  return d.toISOString().replace("T", " ").slice(0, 16);
}

function daysSince(iso) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveState(state) {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function nowStamp() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}${mm}${dd}-${hh}${mi}`;
}

/** MIME -> 扩展名（用于 ZIP 里生成可双击打开的文件） */
function extFromMime(mime = "") {
  const m = String(mime).toLowerCase();
  if (m.includes("jpeg") || m.includes("jpg")) return "jpg";
  if (m.includes("png")) return "png";
  if (m.includes("webp")) return "webp";
  if (m.includes("gif")) return "gif";
  if (m.includes("bmp")) return "bmp";
  if (m.includes("heic")) return "heic";
  return "bin"; // 兜底（理论上我们已尽量避免）
}

/**
 * 关键修复：把 File/Blob 包成“带 type 的 Blob”
 * 有些浏览器/路径会让 IDB 取出来的 blob.type 变空，导致导出成 .bin
 */
function normalizeBlobWithType(fileOrBlob, preferredType = "") {
  if (!fileOrBlob) return null;
  const type = (fileOrBlob && fileOrBlob.type) || preferredType || "application/octet-stream";
  // 用 new Blob([...]) 强制把 type 固定下来
  return new Blob([fileOrBlob], { type });
}

/** 把 File/Blob 存入 IndexedDB，并返回 key（强制保留 MIME type） */
async function saveImageToIdb(fileOrBlob) {
  if (!fileOrBlob) return "";
  if (fileOrBlob.size > MAX_IMAGE_BYTES) {
    throw new Error(`图片太大（>${Math.floor(MAX_IMAGE_BYTES / 1024 / 1024)}MB），建议换小一点的图。`);
  }
  const key = `img_${uid("k")}`;
  const blob = normalizeBlobWithType(fileOrBlob, fileOrBlob.type);
  await idbSet(key, blob);
  return key;
}

/** 用指定 key 存入（用于导入恢复，保证引用不丢；也强制保留 type） */
async function setImageToIdbWithKey(key, blob, preferredType = "") {
  if (!key || !blob) return;
  const normalized = normalizeBlobWithType(blob, preferredType || blob.type);
  await idbSet(key, normalized);
}

async function deleteImageFromIdb(key) {
  if (!key) return;
  await idbDel(key);
}

/* ---------------- PWA：安装提示 Hook（新增） ---------------- */

function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  useEffect(() => {
    const checkStandalone = () => {
      const standalone =
        window.matchMedia?.("(display-mode: standalone)")?.matches ||
        // iOS Safari 兼容（不影响安卓）
        window.navigator.standalone === true;
      setIsStandalone(!!standalone);
    };

    checkStandalone();

    const onBeforeInstallPrompt = (e) => {
      // 阻止浏览器默认提示，让我们自己显示“安装到桌面”按钮
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setJustInstalled(true);
      setTimeout(checkStandalone, 300);
      setTimeout(() => setJustInstalled(false), 3000);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    document.addEventListener("visibilitychange", checkStandalone);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      document.removeEventListener("visibilitychange", checkStandalone);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice;
    } finally {
      setDeferredPrompt(null);
    }
  };

  return { deferredPrompt, isStandalone, justInstalled, promptInstall };
}

/* ---------------- UI 组件 ---------------- */

function Badge({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-xs text-zinc-700">
      {children}
    </span>
  );
}

function Button({ children, onClick, variant = "primary", disabled, type = "button" }) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium transition disabled:opacity-50";
  const styles =
    variant === "primary"
      ? "bg-zinc-900 text-white hover:bg-zinc-800"
      : variant === "secondary"
      ? "border border-zinc-200 bg-white hover:bg-zinc-50"
      : "hover:bg-zinc-100";
  return (
    <button type={type} className={`${base} ${styles}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="font-semibold">{title}</div>
          <button className="rounded-lg px-2 py-1 hover:bg-zinc-100" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function ImageFromIdb({ imgKey, getUrlForKey, className, alt }) {
  const url = imgKey ? getUrlForKey(imgKey) : "";
  if (!imgKey) return null;
  if (!url) {
    return (
      <div className="flex items-center justify-center rounded-xl border bg-zinc-100 text-xs text-zinc-400">
        加载中…
      </div>
    );
  }
  return <img src={url} alt={alt} className={className} />;
}

/* ---------------- 主 App ---------------- */

export default function App() {
  const [state, setState] = useState(() => {
    const loaded = loadState();
    if (loaded) return loaded;
    return {
      plants: [],
      events: [],
      locations: ["南窗", "东窗", "北窗", "补光灯架"],
    };
  });

  const [selectedId, setSelectedId] = useState(null);
  const [showAddPlant, setShowAddPlant] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showDataPanel, setShowDataPanel] = useState(false);

  // ✅ PWA 安装提示（新增）
  const { deferredPrompt, isStandalone, justInstalled, promptInstall } = usePwaInstall();

  const [urlCache, setUrlCache] = useState({});
  const urlCacheRef = useRef({});
  urlCacheRef.current = urlCache;

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    return () => {
      const cache = urlCacheRef.current;
      Object.values(cache).forEach((u) => {
        try {
          URL.revokeObjectURL(u);
        } catch {}
      });
    };
  }, []);

  async function ensureUrl(imgKey) {
    if (!imgKey) return;
    if (urlCacheRef.current[imgKey]) return;

    const blob = await idbGet(imgKey);
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    setUrlCache((prev) => ({ ...prev, [imgKey]: url }));
  }

  function getUrlForKey(imgKey) {
    if (!imgKey) return "";
    const u = urlCacheRef.current[imgKey];
    if (!u) ensureUrl(imgKey);
    return u || "";
  }

  async function removeImageKey(imgKey) {
    if (!imgKey) return;
    await deleteImageFromIdb(imgKey);

    const u = urlCacheRef.current[imgKey];
    if (u) {
      try {
        URL.revokeObjectURL(u);
      } catch {}
    }
    setUrlCache((prev) => {
      const next = { ...prev };
      delete next[imgKey];
      return next;
    });
  }

  const plantsSorted = useMemo(() => {
    return [...state.plants].sort((a, b) => {
      const da = daysSince(a.lastWateredAt);
      const db = daysSince(b.lastWateredAt);
      if (da == null && db == null) return a.name.localeCompare(b.name);
      if (da == null) return 1;
      if (db == null) return -1;
      return db - da;
    });
  }, [state.plants]);

  const selectedPlant = state.plants.find((p) => p.id === selectedId);

  const events = useMemo(() => {
    if (!selectedId) return [];
    return state.events
      .filter((e) => e.plantId === selectedId)
      .sort((a, b) => new Date(b.at) - new Date(a.at));
  }, [state.events, selectedId]);

  useEffect(() => {
    const keys = plantsSorted
      .map((p) => p.coverPhotoKey)
      .filter(Boolean)
      .slice(0, 12);
    keys.forEach((k) => ensureUrl(k));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plantsSorted]);

  function addPlant(plant) {
    setState((s) => ({ ...s, plants: [plant, ...s.plants] }));
  }

  function updatePlant(patch) {
    setState((s) => ({
      ...s,
      plants: s.plants.map((p) => (p.id === patch.id ? { ...p, ...patch } : p)),
    }));
  }

  function addEvent(ev) {
    setState((s) => {
      let plants = s.plants;
      if (ev.type === "water") {
        plants = plants.map((p) => (p.id === ev.plantId ? { ...p, lastWateredAt: ev.at } : p));
      }
      return { ...s, plants, events: [ev, ...s.events] };
    });
  }

  function resetAll() {
    localStorage.removeItem(LS_KEY);
    window.location.reload();
  }

  /* ---------------- ZIP 备份：导出 / 导入 ---------------- */

  function collectReferencedImageKeys(st) {
    const keys = new Set();
    for (const p of st.plants || []) {
      if (p.coverPhotoKey) keys.add(p.coverPhotoKey);
    }
    for (const e of st.events || []) {
      if (e.photoKey) keys.add(e.photoKey);
    }
    return Array.from(keys);
  }

  async function exportBackupZip() {
    const zip = new JSZip();

    const snapshot = {
      backupVersion: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      state,
    };

    zip.file("backup.json", JSON.stringify(snapshot, null, 2));

    const keys = collectReferencedImageKeys(state);
    const imagesFolder = zip.folder("images");

    // manifest：key -> { fileName, type, size }
    const manifest = {};

    for (const key of keys) {
      const blob = await idbGet(key);
      if (!blob) continue;

      const type = blob.type || "application/octet-stream";
      const ext = extFromMime(type);
      const fileName = `${key}.${ext}`; // ✅ 带扩展名，解压可直接打开

      manifest[key] = { fileName, type, size: blob.size || 0 };

      // 注意：zip 里存的是图片本体（Blob），不会改变清晰度
      imagesFolder.file(fileName, blob);
    }

    zip.file("images-manifest.json", JSON.stringify(manifest, null, 2));

    const zipBlob = await zip.generateAsync({ type: "blob" });
    downloadBlob(zipBlob, `PlantByGPT-backup-${nowStamp()}.zip`);
  }

  async function importBackupZip(file) {
    const buf = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(buf);

    const backupJson = zip.file("backup.json");
    if (!backupJson) throw new Error("这个 ZIP 里没有 backup.json（不是本应用备份包？）");

    const backupText = await backupJson.async("string");
    const parsed = JSON.parse(backupText);

    const st = parsed?.state;
    if (!st || !Array.isArray(st.plants) || !Array.isArray(st.events)) {
      throw new Error("backup.json 格式不对：缺少 plants/events");
    }

    // 1) 先恢复结构数据
    const nextState = {
      locations: st.locations || ["南窗", "东窗", "北窗", "补光灯架"],
      plants: (st.plants || []).map((p) => ({
        coverPhotoKey: "",
        ...p,
        coverPhotoKey: p.coverPhotoKey || "",
      })),
      events: (st.events || []).map((e) => ({
        tags: [],
        photoKey: "",
        ...e,
        photoKey: e.photoKey || "",
      })),
    };
    setState(nextState);

    // 2) 再恢复图片到 IndexedDB（key 不变）
    const manifestFile = zip.file("images-manifest.json");
    const imagesFolder = zip.folder("images");

    if (manifestFile && imagesFolder) {
      const manifestText = await manifestFile.async("string");
      const manifest = JSON.parse(manifestText); // key -> { fileName, type, size }

      const entries = Object.entries(manifest);
      for (const [key, meta] of entries) {
        const fileName = meta?.fileName;
        if (!fileName) continue;

        const imgFile = imagesFolder.file(fileName);
        if (!imgFile) continue;

        const blob = await imgFile.async("blob");
        // ✅ 导入时也固定 type，避免以后又变成 .bin
        await setImageToIdbWithKey(key, blob, meta?.type || blob.type);
      }
    } else if (imagesFolder) {
      // 兼容旧格式：没有 manifest 时无法可靠映射 key -> 文件
      console.warn("ZIP 没有 images-manifest.json：可能是旧格式备份包；图片恢复可能不完整。");
    }

    // 3) 清理 urlCache，让图片重新按需加载
    const cache = urlCacheRef.current;
    Object.values(cache).forEach((u) => {
      try {
        URL.revokeObjectURL(u);
      } catch {}
    });
    setUrlCache({});
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-900 text-white">
              🌱
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-900">多肉记录 · 相册备份版</div>
              <div className="text-xs text-zinc-500">ZIP 里图片可直接打开｜导入可完整恢复</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowDataPanel(true)}>
              导入/导出
            </Button>
            <Button onClick={() => setShowAddPlant(true)}>+ 新增多肉</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-4">
        {/* ✅ PWA 安装提示条（新增） */}
        <div className="mb-4">
          {justInstalled ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              ✅ 已安装到桌面！以后从桌面图标打开就是 App 模式。
            </div>
          ) : isStandalone ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-3 text-sm text-zinc-700">
              ✅ 当前正在以 <span className="font-semibold">App 模式</span> 运行（standalone）。
            </div>
          ) : deferredPrompt ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-3">
              <div className="text-sm text-zinc-700">
                📲 想像 App 一样使用？安装到桌面后可全屏打开、更像原生应用。
              </div>
              <Button onClick={promptInstall}>安装到桌面</Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-200 bg-white p-3 text-sm text-zinc-600">
              ℹ️ 如果 Chrome 没出现“安装”按钮：先正常使用一会儿，再在右上角菜单里选择「添加到主屏幕」。
              <span className="ml-2 text-zinc-500">（记得定期导出 ZIP 备份，卸载/清理数据会丢记录）</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          {/* 左：多肉列表 */}
          <div className="md:col-span-4 space-y-3">
            {plantsSorted.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center">
                <div className="text-base font-semibold text-zinc-900">还没有多肉</div>
                <div className="mt-2 text-sm text-zinc-600">先新增一盆，再记录浇水/换盆等事件。</div>
                <div className="mt-4">
                  <Button onClick={() => setShowAddPlant(true)}>创建第一盆</Button>
                </div>
              </div>
            ) : (
              plantsSorted.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={`cursor-pointer rounded-2xl border bg-white p-3 transition hover:shadow-sm ${
                    p.id === selectedId ? "border-zinc-900" : "border-zinc-200"
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-zinc-100">
                      {p.coverPhotoKey ? (
                        <ImageFromIdb
                          imgKey={p.coverPhotoKey}
                          getUrlForKey={getUrlForKey}
                          alt="cover"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
                          无图
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-zinc-900">{p.name}</div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        <Badge>📍 {p.location || "未设置位置"}</Badge>
                        <Badge>💧 {p.lastWateredAt ? `距浇水 ${daysSince(p.lastWateredAt)} 天` : "未浇水"}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 右：详情 */}
          <div className="md:col-span-8">
            {!selectedPlant ? (
              <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center text-zinc-500">
                请选择一盆多肉
              </div>
            ) : (
              <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-lg font-semibold text-zinc-900">{selectedPlant.name}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge>📍 {selectedPlant.location || "未设置位置"}</Badge>
                      <Badge>
                        💧{" "}
                        {selectedPlant.lastWateredAt
                          ? `距上次 ${daysSince(selectedPlant.lastWateredAt)} 天`
                          : "未记录"}
                      </Badge>
                    </div>
                  </div>

                  <Button variant="secondary" onClick={() => setShowAddEvent(true)}>
                    + 记录事件
                  </Button>
                </div>

                {/* 封面图 */}
                {selectedPlant.coverPhotoKey ? (
                  <div className="mt-4">
                    <ImageFromIdb
                      imgKey={selectedPlant.coverPhotoKey}
                      getUrlForKey={getUrlForKey}
                      alt="cover"
                      className="h-56 w-full rounded-2xl border object-cover"
                    />
                    <div className="mt-2 flex justify-end">
                      <Button
                        variant="secondary"
                        onClick={async () => {
                          const key = selectedPlant.coverPhotoKey;
                          await removeImageKey(key);
                          updatePlant({ id: selectedPlant.id, coverPhotoKey: "" });
                        }}
                      >
                        移除封面图
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-500">
                    这盆还没有封面图（新增多肉时可上传）。
                  </div>
                )}

                {/* 时间线 */}
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm font-semibold text-zinc-900">时间线</div>
                  <div className="text-xs text-zinc-500">共 {events.length} 条</div>
                </div>

                <div className="mt-3 space-y-3">
                  {events.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-600">
                      暂无事件。建议先记一次“浇水”。
                    </div>
                  ) : (
                    events.map((e) => (
                      <div key={e.id} className="rounded-2xl border border-zinc-200 p-3">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <strong className="text-zinc-900">
                            {EVENT_TYPES.find((t) => t.key === e.type)?.label || e.type}
                          </strong>
                          <span className="text-zinc-500">{formatDateTime(e.at)}</span>
                        </div>

                        {e.tags?.length ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {e.tags.map((t) => (
                              <Badge key={t}>{t}</Badge>
                            ))}
                          </div>
                        ) : null}

                        {e.note ? <div className="mt-2 text-sm text-zinc-800">{e.note}</div> : null}

                        {e.photoKey ? (
                          <div className="mt-3">
                            <ImageFromIdb
                              imgKey={e.photoKey}
                              getUrlForKey={getUrlForKey}
                              alt="event"
                              className="h-44 w-44 rounded-2xl border object-cover"
                            />
                            <div className="mt-2">
                              <Button
                                variant="secondary"
                                onClick={async () => {
                                  const key = e.photoKey;
                                  await removeImageKey(key);
                                  setState((s) => ({
                                    ...s,
                                    events: s.events.map((x) => (x.id === e.id ? { ...x, photoKey: "" } : x)),
                                  }));
                                }}
                              >
                                移除这张事件图
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {showAddPlant && (
        <AddPlantModal
          locations={state.locations}
          onClose={() => setShowAddPlant(false)}
          onCreate={(p) => {
            addPlant(p);
            setSelectedId(p.id);
            setShowAddPlant(false);
          }}
        />
      )}

      {showAddEvent && selectedPlant && (
        <AddEventModal
          plant={selectedPlant}
          onClose={() => setShowAddEvent(false)}
          onCreate={(e) => {
            addEvent(e);
            setShowAddEvent(false);
          }}
        />
      )}

      {showDataPanel && (
        <DataPanelModal
          state={state}
          onClose={() => setShowDataPanel(false)}
          onImport={(next) => {
            setState(next);
            setShowDataPanel(false);
          }}
          onReset={resetAll}
          onExportZip={exportBackupZip}
          onImportZip={importBackupZip}
        />
      )}
    </div>
  );
}

/* ---------------- 弹窗：新增多肉 ---------------- */

function AddPlantModal({ locations, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState(locations[0] || "");
  const [coverKey, setCoverKey] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function handlePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_BYTES) {
      alert(`图片太大（>${Math.floor(MAX_IMAGE_BYTES / 1024 / 1024)}MB）。先用小一点的图。`);
      e.target.value = "";
      return;
    }

    setLoading(true);
    try {
      const key = await saveImageToIdb(file);
      setCoverKey(key);

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
    } catch (err) {
      alert(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  async function removePicked() {
    if (coverKey) {
      await deleteImageFromIdb(coverKey);
      setCoverKey("");
    }
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
          <input type="file" accept="image/*" onChange={handlePick} />
          <div className="mt-2">
            {loading ? (
              <div className="text-sm text-zinc-500">保存中…</div>
            ) : previewUrl ? (
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

/* ---------------- 弹窗：新增事件 ---------------- */

function AddEventModal({ plant, onClose, onCreate }) {
  const [type, setType] = useState("water");
  const [tags, setTags] = useState([]);
  const [note, setNote] = useState("");
  const [photoKey, setPhotoKey] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function toggleTag(t) {
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  async function handlePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_BYTES) {
      alert(`图片太大（>${Math.floor(MAX_IMAGE_BYTES / 1024 / 1024)}MB）。先用小一点的图。`);
      e.target.value = "";
      return;
    }

    setLoading(true);
    try {
      const key = await saveImageToIdb(file);
      setPhotoKey(key);

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
    } catch (err) {
      alert(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  async function removePicked() {
    if (photoKey) {
      await deleteImageFromIdb(photoKey);
      setPhotoKey("");
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
  }

  return (
    <Modal title={`记录事件 · ${plant.name}`} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <div className="mb-1 text-xs text-zinc-500">事件类型</div>
          <select
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {EVENT_TYPES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="mb-1 text-xs text-zinc-500">标签（可选）</div>
          <div className="flex flex-wrap gap-2">
            {TAGS.map((t) => (
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
          <div className="mb-1 text-xs text-zinc-500">事件照片（可选）</div>
          <input type="file" accept="image/*" onChange={handlePick} />
          <div className="mt-2">
            {loading ? (
              <div className="text-sm text-zinc-500">保存中…</div>
            ) : previewUrl ? (
              <div className="flex items-center gap-3">
                <img src={previewUrl} alt="preview" className="h-28 w-28 rounded-2xl border object-cover" />
                <Button variant="secondary" onClick={removePicked}>
                  移除
                </Button>
              </div>
            ) : (
              <div className="text-sm text-zinc-400">未选择照片</div>
            )}
          </div>
        </div>

        <div>
          <div className="mb-1 text-xs text-zinc-500">备注（可选）</div>
          <textarea
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900"
            rows={4}
            placeholder="比如：浇透，通风，三天后复查叶片饱满度。"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button
            onClick={() =>
              onCreate({
                id: uid("e"),
                plantId: plant.id,
                type,
                at: new Date().toISOString(),
                tags,
                note: note.trim(),
                photoKey: photoKey || "",
              })
            }
          >
            保存
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------------- 弹窗：导入/导出（JSON & ZIP） ---------------- */

function DataPanelModal({ state, onClose, onImport, onReset, onExportZip, onImportZip }) {
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
          coverPhotoKey: "",
          ...p,
          coverPhotoKey: p.coverPhotoKey || "",
        })),
        events: (parsed.events || []).map((e) => ({
          tags: [],
          photoKey: "",
          ...e,
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

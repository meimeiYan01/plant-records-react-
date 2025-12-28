import JSZip from "jszip";
import { get as idbGet } from "idb-keyval";
import { BACKUP_VERSION, extFromMime, setImageToIdbWithKey, downloadBlob, nowStamp } from "../utils";
import { collectLogImageKeys } from "./logService";
import { collectExpenseImageKeys } from "./expenseService";

/**
 * 备份服务
 * 处理 ZIP 备份的导出和导入逻辑
 */

/**
 * 收集所有被引用的图片 key
 */
export function collectReferencedImageKeys(state) {
  const keys = new Set();
  
  // 多肉封面图
  for (const p of state.plants || []) {
    if (p.coverPhotoKey) keys.add(p.coverPhotoKey);
  }
  
  // 事件照片
  for (const e of state.events || []) {
    if (e.photoKey) keys.add(e.photoKey);
  }
  
  // 日志照片
  const logKeys = collectLogImageKeys(state.generalLogs || []);
  logKeys.forEach((k) => keys.add(k));
  
  // 花费照片
  const expenseKeys = collectExpenseImageKeys(state.expenses || []);
  expenseKeys.forEach((k) => keys.add(k));
  
  return Array.from(keys);
}

/**
 * 导出 ZIP 备份
 */
export async function exportBackupZip(state) {
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

/**
 * 导入 ZIP 备份
 */
export async function importBackupZip(file) {
  const buf = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);

  const backupJson = zip.file("backup.json");
  if (!backupJson) throw new Error("这个 ZIP 里没有 backup.json（不是本应用备份包？）");

  const backupText = await backupJson.async("string");
  const parsed = JSON.parse(backupText);

  const state = parsed?.state;
  if (!state || !Array.isArray(state.plants) || !Array.isArray(state.events)) {
    throw new Error("backup.json 格式不对：缺少 plants/events");
  }

  // 1) 先恢复结构数据
  const nextState = {
    locations: state.locations || ["南窗", "东窗", "北窗", "补光灯架"],
    plants: (state.plants || []).map((p) => ({
      coverPhotoKey: "",
      ...p,
      coverPhotoKey: p.coverPhotoKey || "",
    })),
    events: (state.events || []).map((e) => ({
      tags: [],
      photoKey: "",
      ...e,
      photoKey: e.photoKey || "",
    })),
    generalLogs: (state.generalLogs || []).map((log) => ({
      photos: [],
      tags: [],
      relatedPlants: [],
      ...log,
      photos: log.photos || [],
      tags: log.tags || [],
      relatedPlants: log.relatedPlants || [],
    })),
    expenses: (state.expenses || []).map((exp) => ({
      photos: [],
      tags: [],
      ...exp,
      photos: exp.photos || [],
      tags: exp.tags || [],
    })),
  };

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

  return nextState;
}


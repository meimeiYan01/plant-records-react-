import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";

export const LS_KEY = "succulent_log_v4_indexeddb_photos"; // v4: 添加日志和花费功能
export const BACKUP_VERSION = 3; // 更新备份版本

export const EVENT_TYPES = [
  { key: "water", label: "浇水" },
  { key: "repot", label: "换盆" },
  { key: "move", label: "移位" },
  { key: "pest", label: "虫害/处理" },
  { key: "snapshot", label: "状态快照" },
  { key: "log", label: "日志记录" }, // 来自日志模块的事件
];

export const TAGS = ["盆轻", "叶软", "土干透", "换季", "连阴雨", "暴晒", "通风差", "恢复中"];

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB

// 日志类型
export const LOG_TYPES = [
  { key: "daily", label: "日常日志" },
  { key: "weekly", label: "周报" },
  { key: "monthly", label: "月报" },
  { key: "custom", label: "自定义" },
];

// 花费类型
export const EXPENSE_TYPES = [
  { key: "plant", label: "购买多肉", icon: "🌱" },
  { key: "soil", label: "土壤/介质", icon: "🪴" },
  { key: "pot", label: "花盆", icon: "🏺" },
  { key: "tool", label: "工具", icon: "🔧" },
  { key: "fertilizer", label: "肥料", icon: "💊" },
  { key: "other", label: "其他", icon: "📦" },
];

// 货币类型
export const CURRENCIES = [
  { key: "CNY", label: "人民币 (¥)", symbol: "¥" },
  { key: "USD", label: "美元 ($)", symbol: "$" },
  { key: "EUR", label: "欧元 (€)", symbol: "€" },
];

// 日志标签（常用）
export const LOG_TAGS = ["记录", "观察", "问题", "解决", "成长", "收获", "日常"];

// 天气选项（预设）
export const WEATHER_OPTIONS = ["晴天", "多云", "阴天", "雨天", "雪天", "大风", "雾霾"];

// 心情选项（预设）
export const MOOD_OPTIONS = ["开心", "兴奋", "平静", "担心", "难过", "疲惫", "满足"];

// 花费标签（常用）
export const EXPENSE_TAGS = ["必需品", "升级", "补充", "一次性", "定期"];

/* ---------------- 工具函数 ---------------- */

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

export function formatDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  // 使用本地时区格式化，而不是 UTC
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

export function formatDate(iso) {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function formatTime(iso) {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mi}`;
}

export function formatCurrency(amount, currency = "CNY") {
  const symbols = { CNY: "¥", USD: "$", EUR: "€" };
  const symbol = symbols[currency] || currency;
  return `${symbol}${amount.toFixed(2)}`;
}

export function daysSince(iso) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveState(state) {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function nowStamp() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}${mm}${dd}-${hh}${mi}`;
}

/** MIME -> 扩展名（用于 ZIP 里生成可双击打开的文件） */
export function extFromMime(mime = "") {
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
 * 关键修复：把 File/Blob 包成"带 type 的 Blob"
 * 有些浏览器/路径会让 IDB 取出来的 blob.type 变空，导致导出成 .bin
 */
export function normalizeBlobWithType(fileOrBlob, preferredType = "") {
  if (!fileOrBlob) return null;
  const type = (fileOrBlob && fileOrBlob.type) || preferredType || "application/octet-stream";
  // 用 new Blob([...]) 强制把 type 固定下来
  return new Blob([fileOrBlob], { type });
}

/** 把 File/Blob 存入 IndexedDB，并返回 key（强制保留 MIME type） */
export async function saveImageToIdb(fileOrBlob) {
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
export async function setImageToIdbWithKey(key, blob, preferredType = "") {
  if (!key || !blob) return;
  const normalized = normalizeBlobWithType(blob, preferredType || blob.type);
  await idbSet(key, normalized);
}

export async function deleteImageFromIdb(key) {
  if (!key) return;
  await idbDel(key);
}


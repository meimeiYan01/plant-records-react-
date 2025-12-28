/**
 * 日志服务
 * 处理总体日志的 CRUD 操作
 */

/**
 * 创建日志
 */
export function createLog(log) {
  // 兼容旧数据：如果 weather/mood 是数组，取第一个；如果是字符串，直接使用
  const weather = Array.isArray(log.weather) 
    ? (log.weather.length > 0 ? log.weather[0] : "") 
    : (log.weather || "");
  const mood = Array.isArray(log.mood) 
    ? (log.mood.length > 0 ? log.mood[0] : "") 
    : (log.mood || "");
  
  return {
    id: log.id || `log_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    type: log.type || "daily",
    title: log.title || "",
    content: log.content || "",
    date: log.date || new Date().toISOString(),
    tags: log.tags || [],
    photos: log.photos || [],
    weather: weather,
    mood: mood,
    relatedPlants: log.relatedPlants || [],
  };
}

/**
 * 验证日志数据（标题现在是可选的）
 */
export function validateLog(log) {
  // 标题现在是可选的，不再验证
  return true;
}

/**
 * 收集日志中引用的图片 key
 */
export function collectLogImageKeys(logs) {
  const keys = new Set();
  for (const log of logs || []) {
    if (log.photos && Array.isArray(log.photos)) {
      log.photos.forEach((key) => {
        if (key) keys.add(key);
      });
    }
  }
  return Array.from(keys);
}


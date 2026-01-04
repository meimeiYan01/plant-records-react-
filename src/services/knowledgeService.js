/**
 * 知识服务
 * 处理多肉养护知识的 CRUD 操作
 */

/**
 * 创建知识条目
 */
export function createKnowledge(knowledge) {
  const now = new Date().toISOString();
  // 兼容旧数据：将旧类型映射到新类型
  const getNormalizedType = (type) => {
    if (!type) return "variety";
    // 旧类型映射：document/markdown -> variety, web/article/video/xiaohongshu -> care
    if (type === "markdown" || type === "document") return "variety";
    if (type === "article" || type === "video" || type === "xiaohongshu" || type === "web") return "care";
    // 新类型直接返回
    return type;
  };
  
  // 兼容旧数据：coverPhotoKey（单个）转为 coverPhotoKeys（数组）
  const getCoverPhotoKeys = (coverPhotoKey, coverPhotoKeys) => {
    if (coverPhotoKeys && Array.isArray(coverPhotoKeys)) {
      return coverPhotoKeys;
    }
    if (coverPhotoKey) {
      return [coverPhotoKey];
    }
    return [];
  };
  
  return {
    id: knowledge.id || `knowledge_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    type: getNormalizedType(knowledge.type),
    title: knowledge.title || "",
    content: knowledge.content || "",
    url: knowledge.url || "",
    tags: knowledge.tags || [],
    coverPhotoKeys: getCoverPhotoKeys(knowledge.coverPhotoKey, knowledge.coverPhotoKeys),
    source: knowledge.source || "",
    createdAt: knowledge.createdAt || now,
    updatedAt: knowledge.updatedAt || now,
  };
}

/**
 * 验证知识数据
 */
export function validateKnowledge(knowledge) {
  // 标题、URL、内容现在都是可选的，不再强制验证
  return true;
}

/**
 * 收集知识中引用的图片 key
 */
export function collectKnowledgeImageKeys(knowledges) {
  const keys = new Set();
  for (const knowledge of knowledges || []) {
    // 兼容旧数据：coverPhotoKey（单个）和 coverPhotoKeys（数组）
    if (knowledge.coverPhotoKeys && Array.isArray(knowledge.coverPhotoKeys)) {
      knowledge.coverPhotoKeys.forEach((key) => {
        if (key) keys.add(key);
      });
    } else if (knowledge.coverPhotoKey) {
      keys.add(knowledge.coverPhotoKey);
    }
  }
  return Array.from(keys);
}



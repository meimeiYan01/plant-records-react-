/**
 * 知识服务
 * 处理多肉养护知识的 CRUD 操作
 */

/**
 * 创建知识条目
 */
export function createKnowledge(knowledge) {
  const now = new Date().toISOString();
  return {
    id: knowledge.id || `knowledge_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    type: knowledge.type || "markdown",
    title: knowledge.title || "",
    content: knowledge.content || "",
    url: knowledge.url || "",
    tags: knowledge.tags || [],
    coverPhotoKey: knowledge.coverPhotoKey || "",
    source: knowledge.source || "",
    createdAt: knowledge.createdAt || now,
    updatedAt: knowledge.updatedAt || now,
  };
}

/**
 * 验证知识数据
 */
export function validateKnowledge(knowledge) {
  if (!knowledge.title || knowledge.title.trim() === "") {
    return false;
  }
  // 如果是网页类型，URL是必需的
  if (knowledge.type !== "markdown" && (!knowledge.url || knowledge.url.trim() === "")) {
    return false;
  }
  return true;
}

/**
 * 收集知识中引用的图片 key
 */
export function collectKnowledgeImageKeys(knowledges) {
  const keys = new Set();
  for (const knowledge of knowledges || []) {
    if (knowledge.coverPhotoKey) {
      keys.add(knowledge.coverPhotoKey);
    }
  }
  return Array.from(keys);
}



/**
 * 花费服务
 * 处理花费记录的 CRUD 操作和统计
 */

/**
 * 创建花费记录
 */
export function createExpense(expense) {
  return {
    id: expense.id || `exp_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    type: expense.type || "other",
    category: expense.category || "",
    amount: expense.amount || 0,
    currency: expense.currency || "CNY",
    date: expense.date || new Date().toISOString(),
    description: expense.description || "",
    relatedPlantId: expense.relatedPlantId || "",
    photos: expense.photos || [],
    tags: expense.tags || [],
  };
}

/**
 * 验证花费数据
 */
export function validateExpense(expense) {
  if (!expense.amount || expense.amount <= 0) {
    throw new Error("花费金额必须大于 0");
  }
  if (!expense.category || !expense.category.trim()) {
    throw new Error("花费分类不能为空");
  }
  return true;
}

/**
 * 收集花费中引用的图片 key
 */
export function collectExpenseImageKeys(expenses) {
  const keys = new Set();
  for (const exp of expenses || []) {
    if (exp.photos && Array.isArray(exp.photos)) {
      exp.photos.forEach((key) => {
        if (key) keys.add(key);
      });
    }
  }
  return Array.from(keys);
}

/**
 * 计算总花费
 */
export function calculateTotalExpense(expenses, currency = "CNY") {
  return expenses
    .filter((e) => e.currency === currency)
    .reduce((sum, e) => sum + (e.amount || 0), 0);
}

/**
 * 按月统计花费
 */
export function calculateMonthlyExpense(expenses, currency = "CNY") {
  const monthly = {};
  expenses
    .filter((e) => e.currency === currency)
    .forEach((e) => {
      const date = new Date(e.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthly[monthKey] = (monthly[monthKey] || 0) + (e.amount || 0);
    });
  return monthly;
}

/**
 * 按类型统计花费
 */
export function calculateExpenseByType(expenses, currency = "CNY") {
  const byType = {};
  expenses
    .filter((e) => e.currency === currency)
    .forEach((e) => {
      byType[e.type] = (byType[e.type] || 0) + (e.amount || 0);
    });
  return byType;
}



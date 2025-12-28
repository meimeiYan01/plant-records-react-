import { useMemo, useState } from "react";
import { Badge, Button, ImageFromIdb } from "../ui";
import { formatDateTime, formatCurrency, EXPENSE_TYPES, CURRENCIES } from "../../utils";
import { calculateTotalExpense, calculateMonthlyExpense } from "../../services/expenseService";

export function ExpensesTab({ expenses, plants, getUrlForKey, onAdd, onEdit, onDelete, openImageViewer }) {
  const [filterType, setFilterType] = useState("all");
  const [filterCurrency, setFilterCurrency] = useState("CNY");
  const [searchText, setSearchText] = useState("");

  const filteredExpenses = useMemo(() => {
    let result = [...expenses];
    
    if (filterType !== "all") {
      result = result.filter((e) => e.type === filterType);
    }
    
    result = result.filter((e) => e.currency === filterCurrency);
    
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      result = result.filter(
        (e) =>
          e.category.toLowerCase().includes(search) ||
          e.description.toLowerCase().includes(search) ||
          e.tags.some((t) => t.toLowerCase().includes(search))
      );
    }
    
    return result.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [expenses, filterType, filterCurrency, searchText]);

  const totalExpense = useMemo(() => {
    return calculateTotalExpense(expenses, filterCurrency);
  }, [expenses, filterCurrency]);

  const monthlyExpense = useMemo(() => {
    const monthly = calculateMonthlyExpense(expenses, filterCurrency);
    const currentMonth = new Date().toISOString().slice(0, 7);
    return monthly[currentMonth] || 0;
  }, [expenses, filterCurrency]);

  function getPlantName(plantId) {
    if (!plantId) return null;
    return plants.find((p) => p.id === plantId)?.name;
  }

  function handleImageClick(expense) {
    if (expense.photos && expense.photos.length > 0) {
      const images = expense.photos.map((key) => ({
        key,
        ext: "jpg",
        filename: `${expense.category}-${formatDateTime(expense.date).replace(/[:\s]/g, "-")}.jpg`,
      }));
      openImageViewer(images, 0);
    }
  }

  const expenseType = EXPENSE_TYPES.find((t) => t.key === filterType);
  const currencySymbol = CURRENCIES.find((c) => c.key === filterCurrency)?.symbol || filterCurrency;

  return (
    <div className="space-y-4 pb-20">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">总花费</div>
          <div className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">
            {formatCurrency(totalExpense, filterCurrency)}
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">本月花费</div>
          <div className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">
            {formatCurrency(monthlyExpense, filterCurrency)}
          </div>
        </div>
      </div>

      {/* 筛选和搜索 */}
      <div className="space-y-2">
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setFilterType("all")}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs ${
              filterType === "all"
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-200 bg-white"
            }`}
          >
            全部
          </button>
          {EXPENSE_TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilterType(t.key)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs ${
                filterType === t.key
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-white"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <select
            className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:focus:border-zinc-600"
            value={filterCurrency}
            onChange={(e) => setFilterCurrency(e.target.value)}
          >
            {CURRENCIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="搜索花费..."
            className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:focus:border-zinc-600"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
      </div>

      {/* 花费列表 */}
      {filteredExpenses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-8 text-center">
          <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">还没有花费记录</div>
          <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">点击下方按钮记录第一笔花费</div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredExpenses.map((expense) => {
            const expenseTypeInfo = EXPENSE_TYPES.find((t) => t.key === expense.type);
            const plantName = getPlantName(expense.relatedPlantId);

            return (
              <div key={expense.id} className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{expenseTypeInfo?.icon || "📦"}</span>
                      <Badge>{expenseTypeInfo?.label || expense.type}</Badge>
                      <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(expense.amount, expense.currency)}
                      </span>
                    </div>
                    <div className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">{expense.category}</div>
                    {expense.description && (
                      <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{expense.description}</div>
                    )}
                    <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <span>{formatDateTime(expense.date)}</span>
                      {plantName && <span>· 关联：{plantName}</span>}
                    </div>
                    {expense.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {expense.tags.map((t) => (
                          <Badge key={t}>{t}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="secondary"
                      onClick={() => onEdit(expense.id)}
                      className="text-xs"
                    >
                      编辑
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => onDelete(expense.id)}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      删除
                    </Button>
                  </div>
                </div>

                {/* 照片 */}
                {expense.photos && expense.photos.length > 0 && (
                  <div className="mt-3">
                    <div className="grid grid-cols-3 gap-2">
                      {expense.photos.slice(0, 3).map((key) => (
                        <div
                          key={key}
                          className="cursor-pointer"
                          onClick={() => handleImageClick(expense)}
                        >
                          <ImageFromIdb
                            imgKey={key}
                            getUrlForKey={getUrlForKey}
                            alt="expense"
                            className="h-20 w-full rounded-xl border object-cover hover:opacity-90 transition"
                          />
                        </div>
                      ))}
                    </div>
                    {expense.photos.length > 3 && (
                      <div className="mt-2 text-xs text-zinc-500 text-center">
                        还有 {expense.photos.length - 3} 张照片，点击查看全部
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 浮动添加按钮 */}
      <div className="fixed bottom-20 right-4 z-40 md:hidden">
        <button
          onClick={onAdd}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-2xl text-white shadow-lg hover:bg-zinc-800"
        >
          +
        </button>
      </div>
    </div>
  );
}


import { Button } from "../ui/Button";

export function SettingsTab({
  onLocationManager,
  onDataPanel,
  onAddPlant,
  plantsCount,
  logsCount,
  expensesCount,
  knowledgesCount,
  justInstalled,
  isStandalone,
  deferredPrompt,
  promptInstall,
  isDark,
  toggleTheme,
}) {
  return (
    <div className="space-y-4 pb-20">
      {/* 统计信息 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 text-center">
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{plantsCount}</div>
          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">多肉</div>
        </div>
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 text-center">
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{logsCount}</div>
          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">日志</div>
        </div>
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 text-center">
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{expensesCount}</div>
          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">花费</div>
        </div>
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 text-center">
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{knowledgesCount || 0}</div>
          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">知识</div>
        </div>
      </div>

      {/* 外观设置 */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4">
        <div className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">外观设置</div>
        <div className="space-y-2">
          <button
            onClick={toggleTheme}
            className="flex w-full items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-700 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-600 transition"
          >
            <span className="flex items-center gap-2">
              <span>{isDark ? "☀️" : "🌙"}</span>
              <span>{isDark ? "白天模式" : "夜间模式"}</span>
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {isDark ? "点击切换到白天模式" : "点击切换到夜间模式"}
            </span>
          </button>
        </div>
      </div>

      {/* 多肉管理 */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4">
        <div className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">多肉管理</div>
        <div className="space-y-2">
          <Button onClick={onAddPlant} className="w-full justify-start">
            + 新增多肉
          </Button>
        </div>
      </div>

      {/* 数据管理 */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4">
        <div className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">数据管理</div>
        <div className="space-y-2">
          <Button variant="secondary" onClick={onLocationManager} className="w-full justify-start">
            📍 位置管理
          </Button>
          <Button variant="secondary" onClick={onDataPanel} className="w-full justify-start">
            💾 导入/导出
          </Button>
        </div>
      </div>

      {/* PWA 安装提示 */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4">
        <div className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">应用安装</div>
        <div className="space-y-3">
          {justInstalled ? (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 p-3 text-sm text-emerald-900 dark:text-emerald-200">
              ✅ 已安装到桌面！以后从桌面图标打开就是 App 模式。
            </div>
          ) : isStandalone ? (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-700/50 p-3 text-sm text-zinc-700 dark:text-zinc-300">
              ✅ 当前正在以 <span className="font-semibold">App 模式</span> 运行（standalone）。
            </div>
          ) : deferredPrompt ? (
            <div className="space-y-2">
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-700/50 p-3 text-sm text-zinc-700 dark:text-zinc-300">
                📲 想像 App 一样使用？安装到桌面后可全屏打开、更像原生应用。
              </div>
              <Button onClick={promptInstall} className="w-full">安装到桌面</Button>
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-700/50 p-3 text-sm text-zinc-600 dark:text-zinc-400">
              ℹ️ 如果 Chrome 没出现"安装"按钮：先正常使用一会儿，再在右上角菜单里选择「添加到主屏幕」。
              <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">（记得定期导出 ZIP 备份，卸载/清理数据会丢记录）</div>
            </div>
          )}
        </div>
      </div>

      {/* 关于 */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4">
        <div className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">关于</div>
        <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          <div>多肉记录 · 相册备份版</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-500">ZIP 里图片可直接打开｜导入可完整恢复</div>
        </div>
      </div>
    </div>
  );
}


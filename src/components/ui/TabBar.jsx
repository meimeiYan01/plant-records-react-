export function TabBar({ currentTab, onTabChange }) {
  const tabs = [
    { key: "home", label: "首页", icon: "🏠" },
    { key: "plants", label: "多肉", icon: "🌱" },
    { key: "logs", label: "日志", icon: "📝" },
    { key: "expenses", label: "花费", icon: "💰" },
    { key: "knowledge", label: "知识", icon: "📚" },
    { key: "settings", label: "设置", icon: "⚙️" },
  ];

  return (
    <>
      {/* 移动端：底部导航栏 */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-200 dark:border-zinc-700 bg-white/95 dark:bg-zinc-800/95 backdrop-blur md:hidden">
        <div className="flex items-center justify-around">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`flex flex-col items-center justify-center gap-1 px-2 py-2 text-xs transition ${
                currentTab === tab.key
                  ? "text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="font-medium">{tab.label}</span>
              {currentTab === tab.key && (
                <div className="h-0.5 w-full rounded-full bg-zinc-900 dark:bg-zinc-100" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 桌面端：顶部标签栏 */}
      <div className="hidden md:block border-b border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 mb-4">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex items-center gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => onTabChange(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition ${
                  currentTab === tab.key
                    ? "text-zinc-900 dark:text-zinc-100 border-b-2 border-zinc-900 dark:border-zinc-100"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}


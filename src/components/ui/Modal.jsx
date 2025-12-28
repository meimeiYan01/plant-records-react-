export function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-800 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700 px-4 py-3">
          <div className="font-semibold text-zinc-900 dark:text-zinc-100">{title}</div>
          <button className="rounded-lg px-2 py-1 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}


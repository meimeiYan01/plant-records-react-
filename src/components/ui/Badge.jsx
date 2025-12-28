export function Badge({ children, className = "" }) {
  return (
    <span className={`inline-flex items-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-0.5 text-xs text-zinc-700 dark:text-zinc-300 ${className}`}>
      {children}
    </span>
  );
}


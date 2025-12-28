export function Button({ children, onClick, variant = "primary", disabled, type = "button", className = "" }) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium transition disabled:opacity-50";
  const styles =
    variant === "primary"
      ? "bg-zinc-900 dark:bg-zinc-700 text-white dark:text-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-600"
      : variant === "secondary"
      ? "border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
      : "hover:bg-zinc-100 dark:hover:bg-zinc-800";
  return (
    <button type={type} className={`${base} ${styles} ${className}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}


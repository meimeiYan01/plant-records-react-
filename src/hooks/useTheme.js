import { useState, useEffect } from "react";

const THEME_KEY = "succulent_log_theme";

export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    // 从 localStorage 读取保存的主题
    const saved = localStorage.getItem(THEME_KEY);
    if (saved !== null) {
      return saved === "dark";
    }
    // 如果没有保存的主题，使用系统偏好
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    // 应用主题到 html 元素
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    // 保存到 localStorage
    localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  return { isDark, toggleTheme };
}





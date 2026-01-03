import { useEffect, useState } from "react";

/**
 * PWA 安装提示 Hook
 * 处理 PWA 安装相关的逻辑
 */
export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  useEffect(() => {
    const checkStandalone = () => {
      const standalone =
        window.matchMedia?.("(display-mode: standalone)")?.matches ||
        // iOS Safari 兼容（不影响安卓）
        window.navigator.standalone === true;
      setIsStandalone(!!standalone);
    };

    checkStandalone();

    const onBeforeInstallPrompt = (e) => {
      // 阻止浏览器默认提示，让我们自己显示"安装到桌面"按钮
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setJustInstalled(true);
      setTimeout(checkStandalone, 300);
      setTimeout(() => setJustInstalled(false), 3000);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    document.addEventListener("visibilitychange", checkStandalone);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      document.removeEventListener("visibilitychange", checkStandalone);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice;
    } finally {
      setDeferredPrompt(null);
    }
  };

  return { deferredPrompt, isStandalone, justInstalled, promptInstall };
}





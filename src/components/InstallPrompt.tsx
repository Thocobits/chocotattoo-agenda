"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Logo } from "@/components/Logo";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const dismissedAt = localStorage.getItem("pwa-install-dismissed");
    if (dismissedAt) {
      const daysSince =
        (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) setDismissed(true);
    }

    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () =>
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem("pwa-install-dismissed", String(Date.now()));
  }

  if (isInstalled || dismissed || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 card shadow-2xl border-[var(--primary)]">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-[var(--muted)] hover:text-white"
        aria-label="Fechar"
      >
        <X size={18} />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <Logo size="sm" />
        <div>
          <p className="font-semibold">Instalar Chocotattoo</p>
          <p className="text-sm text-[var(--muted)] mt-1">
            Adicione ao celular para acesso rápido como app
          </p>
          <button
            onClick={handleInstall}
            className="btn-primary mt-3 flex items-center gap-2 text-sm"
          >
            <Download size={16} />
            Instalar App
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    if (typeof window !== 'undefined' && (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt) {
      return (window as unknown as { __pwaInstallPrompt: BeforeInstallPromptEvent }).__pwaInstallPrompt;
    }
    return null;
  });
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === 'undefined') return false;
    const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
    const isNavigatorStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    const isGlobalInstalled = (window as unknown as { __pwaInstalled?: boolean }).__pwaInstalled === true;
    return isStandaloneMedia || isNavigatorStandalone || isGlobalInstalled;
  });
  const [isIOS, setIsIOS] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);

  useEffect(() => {
    // Detect standalone mode (already installed as PWA or running in web app window)
    const checkStandalone = () => {
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      const isNavigatorStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      const isGlobalInstalled = (window as unknown as { __pwaInstalled?: boolean }).__pwaInstalled === true;
      return isStandaloneMedia || isNavigatorStandalone || isGlobalInstalled;
    };

    setIsInstalled(checkStandalone());

    // Detect user agent specifics
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(isIOSDevice);

    // Detect In-App Browsers (WhatsApp, Gmail, Facebook, Instagram, LinkedIn, etc.)
    const isEmbedded = /wv|fbav|instagram|fban|line|micromessenger|gsa/i.test(userAgent);
    setIsInAppBrowser(isEmbedded);

    // Check if prompt was already captured on window
    const existingPrompt = (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt;
    if (existingPrompt && !deferredPrompt) {
      setDeferredPrompt(existingPrompt);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt = e as BeforeInstallPromptEvent;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      (window as unknown as { __pwaInstallPrompt?: unknown }).__pwaInstallPrompt = null;
      (window as unknown as { __pwaInstalled?: boolean }).__pwaInstalled = true;
    };

    const handlePromptReady = () => {
      const prompt = (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt;
      if (prompt) {
        setDeferredPrompt(prompt);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('pwa-prompt-ready', handlePromptReady);
    window.addEventListener('pwa-installed-success', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('pwa-prompt-ready', handlePromptReady);
      window.removeEventListener('pwa-installed-success', handleAppInstalled);
    };
  }, [deferredPrompt]);

  const install = async (): Promise<boolean> => {
    const promptEvent = deferredPrompt || (typeof window !== 'undefined' ? (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt : null);
    if (!promptEvent) return false;
    try {
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        if (typeof window !== 'undefined') {
          (window as unknown as { __pwaInstallPrompt?: unknown }).__pwaInstallPrompt = null;
        }
        return true;
      }
    } catch (err) {
      console.error('Error during PWA installation prompt:', err);
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt || (typeof window !== 'undefined' && !!(window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt),
    isInstalled,
    isIOS,
    isInAppBrowser,
    install,
  };
}

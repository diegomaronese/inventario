import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    __deferredPrompt?: BeforeInstallPromptEvent | null;
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    typeof window !== 'undefined' ? window.__deferredPrompt || null : null
  );
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);

  useEffect(() => {
    // Detect standalone mode (already installed as PWA or running in web app window / WebAPK)
    const checkStandalone = () => {
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      const isNavigatorStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      const isAndroidWebAPK = document.referrer.includes('android-app://');
      return isStandaloneMedia || isNavigatorStandalone || isAndroidWebAPK;
    };

    setIsInstalled(checkStandalone());

    // Detect iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(isIOSDevice);

    // Detect In-App WebViews (WhatsApp, Instagram, Facebook, Messenger, etc.)
    const inApp = /fban|fbav|instagram|messenger|whatsapp|bytedance|tiktok|snapchat|line/i.test(userAgent);
    setIsInAppBrowser(inApp);

    // Check if prompt was caught before component mount
    if (window.__deferredPrompt) {
      setDeferredPrompt(window.__deferredPrompt);
    }

    const handlePromptReady = () => {
      if (window.__deferredPrompt) {
        setDeferredPrompt(window.__deferredPrompt);
      }
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.__deferredPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      window.__deferredPrompt = null;
    };

    window.addEventListener('pwa-prompt-ready', handlePromptReady);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('pwa-prompt-ready', handlePromptReady);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async (): Promise<boolean> => {
    const promptEvent = deferredPrompt || (typeof window !== 'undefined' ? window.__deferredPrompt : null);
    if (!promptEvent) return false;
    try {
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        if (typeof window !== 'undefined') {
          window.__deferredPrompt = null;
        }
        return true;
      }
    } catch (err) {
      console.error('Error during PWA installation prompt:', err);
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt || (typeof window !== 'undefined' && !!window.__deferredPrompt),
    isInstalled,
    isIOS,
    isInAppBrowser,
    install,
  };
}


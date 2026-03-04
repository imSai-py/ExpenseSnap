import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Plus, ArrowUpFromLine } from 'lucide-react';

/**
 * BeforeInstallPromptEvent type declaration.
 * This event is fired by Chrome/Edge/Android when the app meets PWA install criteria.
 */
interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
    prompt(): Promise<void>;
}

// Dismissed timestamp key in localStorage
const DISMISS_KEY = 'pwa-install-dismissed';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Detect if the user is on iOS Safari (which doesn't fire beforeinstallprompt).
 */
function isIOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

/**
 * Detect if the app is already running in standalone mode (installed).
 */
function isStandalone(): boolean {
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as any).standalone === true
    );
}

/**
 * Check if the user recently dismissed the install prompt.
 */
function wasRecentlyDismissed(): boolean {
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (!dismissed) return false;
    const dismissedAt = parseInt(dismissed, 10);
    return Date.now() - dismissedAt < DISMISS_DURATION_MS;
}

/**
 * InstallPrompt Component
 *
 * Renders a polished bottom banner prompting the user to install the PWA.
 * - On Android/Chrome/Edge: intercepts beforeinstallprompt and triggers native install dialog.
 * - On iOS Safari: shows manual instructions (Share → Add to Home Screen).
 * - Hides if the app is already installed or user dismissed within last 7 days.
 */
export function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showIOSPrompt, setShowIOSPrompt] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [isInstalling, setIsInstalling] = useState(false);

    useEffect(() => {
        // Don't show if already installed or recently dismissed
        if (isStandalone() || wasRecentlyDismissed()) return;

        // iOS-specific: show manual instructions
        if (isIOS()) {
            // Small delay so the app doesn't show the banner immediately on load
            const timer = setTimeout(() => setShowIOSPrompt(true), 3000);
            return () => clearTimeout(timer);
        }

        // Chrome/Edge/Android: listen for beforeinstallprompt
        const handler = (e: Event) => {
            e.preventDefault(); // Prevent the mini-infobar
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Also listen for successful install
        const installedHandler = () => {
            setDeferredPrompt(null);
            setIsVisible(false);
        };
        window.addEventListener('appinstalled', installedHandler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
            window.removeEventListener('appinstalled', installedHandler);
        };
    }, []);

    // Show the banner when we have a deferred prompt or iOS instructions
    useEffect(() => {
        if (deferredPrompt || showIOSPrompt) {
            // Small delay for a nicer UX
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, [deferredPrompt, showIOSPrompt]);

    const handleInstall = useCallback(async () => {
        if (!deferredPrompt) return;

        setIsInstalling(true);

        try {
            await deferredPrompt.prompt();
            const choiceResult = await deferredPrompt.userChoice;

            if (choiceResult.outcome === 'accepted') {
                console.log('[PWA] User accepted the install prompt');
            } else {
                console.log('[PWA] User dismissed the install prompt');
            }
        } catch (error) {
            console.error('[PWA] Install prompt error:', error);
        } finally {
            setDeferredPrompt(null);
            setIsInstalling(false);
            setIsVisible(false);
        }
    }, [deferredPrompt]);

    const handleDismiss = useCallback(() => {
        setIsVisible(false);
        setDeferredPrompt(null);
        setShowIOSPrompt(false);
        localStorage.setItem(DISMISS_KEY, Date.now().toString());
    }, []);

    // Nothing to show
    if (!isVisible) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-[60]"
                >
                    <div className="bg-white rounded-2xl shadow-2xl border border-purple-100 overflow-hidden">
                        {/* Gradient accent bar */}
                        <div className="h-1 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500" />

                        <div className="p-4">
                            {/* Close button */}
                            <button
                                onClick={handleDismiss}
                                className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                                aria-label="Dismiss install prompt"
                            >
                                <X className="w-4 h-4 text-gray-400" />
                            </button>

                            {showIOSPrompt ? (
                                /* ---- iOS Instructions ---- */
                                <div className="pr-6">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center shrink-0">
                                            <Download className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900 text-sm">Install ExpenseSnap</h3>
                                            <p className="text-xs text-gray-500">Add to your home screen</p>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-3 space-y-2.5">
                                        <div className="flex items-center gap-2.5 text-xs text-gray-600">
                                            <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                                                <ArrowUpFromLine className="w-3 h-3 text-purple-600" />
                                            </div>
                                            <span>Tap the <strong>Share</strong> button in Safari</span>
                                        </div>
                                        <div className="flex items-center gap-2.5 text-xs text-gray-600">
                                            <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                                                <Plus className="w-3 h-3 text-purple-600" />
                                            </div>
                                            <span>Select <strong>"Add to Home Screen"</strong></span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* ---- Chrome/Android Install Button ---- */
                                <div className="flex items-center gap-3 pr-6">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center shrink-0">
                                        <Download className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-gray-900 text-sm">Install ExpenseSnap</h3>
                                        <p className="text-xs text-gray-500 truncate">Quick access from your home screen</p>
                                    </div>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={handleInstall}
                                        disabled={isInstalling}
                                        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-purple-200 transition-shadow disabled:opacity-50 shrink-0"
                                    >
                                        {isInstalling ? 'Installing...' : 'Install'}
                                    </motion.button>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

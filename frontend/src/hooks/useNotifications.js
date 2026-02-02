import { useState, useEffect, useCallback } from 'react';

// Push notification subscription key (you'd get this from your backend)
const VAPID_PUBLIC_KEY = 'YOUR_VAPID_PUBLIC_KEY_HERE';

export function useNotifications() {
    const [permission, setPermission] = useState(Notification?.permission || 'default');
    const [subscription, setSubscription] = useState(null);
    const [supported, setSupported] = useState(false);

    useEffect(() => {
        setSupported('Notification' in window && 'serviceWorker' in navigator);
    }, []);

    const requestPermission = useCallback(async () => {
        if (!supported) return false;

        try {
            const result = await Notification.requestPermission();
            setPermission(result);
            return result === 'granted';
        } catch (err) {
            console.error('Notification permission error:', err);
            return false;
        }
    }, [supported]);

    const subscribe = useCallback(async () => {
        if (!supported || permission !== 'granted') return null;

        try {
            const registration = await navigator.serviceWorker.ready;

            // Check for existing subscription
            let sub = await registration.pushManager.getSubscription();

            if (!sub) {
                // Create new subscription
                sub = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
                });
            }

            setSubscription(sub);
            return sub;
        } catch (err) {
            console.error('Push subscription error:', err);
            return null;
        }
    }, [supported, permission]);

    // Show local notification
    const showNotification = useCallback(async (title, options = {}) => {
        if (!supported || permission !== 'granted') return;

        try {
            const registration = await navigator.serviceWorker.ready;
            await registration.showNotification(title, {
                icon: '/icons/icon-192.png',
                badge: '/icons/icon-72.png',
                vibrate: [200, 100, 200],
                ...options,
            });
        } catch (err) {
            console.error('Show notification error:', err);
        }
    }, [supported, permission]);

    // Show alert notification for machine status
    const showAlertNotification = useCallback((machine, severity) => {
        const titles = {
            critical: `🚨 CRITICAL: ${machine.machine_id}`,
            warning: `⚠️ Warning: ${machine.machine_id}`,
            info: `ℹ️ Info: ${machine.machine_id}`,
        };

        const messages = {
            critical: `Immediate attention required! Temp: ${machine.temperature}°C, Health: ${machine.health_score}%`,
            warning: `Check recommended. Temp: ${machine.temperature}°C`,
            info: `Status update for ${machine.machine_id}`,
        };

        showNotification(titles[severity] || titles.info, {
            body: messages[severity] || messages.info,
            tag: `alert-${machine.machine_id}`,
            requireInteraction: severity === 'critical',
            data: { machineId: machine.machine_id, severity },
        });
    }, [showNotification]);

    return {
        supported,
        permission,
        subscription,
        requestPermission,
        subscribe,
        showNotification,
        showAlertNotification,
    };
}

// Hook for app install prompt
export function useInstallPrompt() {
    const [installPrompt, setInstallPrompt] = useState(null);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        const handleBeforeInstall = (e) => {
            e.preventDefault();
            setInstallPrompt(e);
        };

        const handleAppInstalled = () => {
            setInstallPrompt(null);
            setIsInstalled(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstall);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const promptInstall = useCallback(async () => {
        if (!installPrompt) return false;

        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;

        if (outcome === 'accepted') {
            setInstallPrompt(null);
            return true;
        }
        return false;
    }, [installPrompt]);

    return {
        canInstall: !!installPrompt,
        isInstalled,
        promptInstall,
    };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

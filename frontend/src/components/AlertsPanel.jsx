import { useState, useEffect } from 'react';
import { Bell, X, Check, AlertTriangle, AlertCircle } from 'lucide-react';
import { getAlerts, acknowledgeAlert } from '../services/api';

export default function AlertsPanel({ isOpen, onClose }) {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            fetchAlerts();
        }
    }, [isOpen]);

    const fetchAlerts = async () => {
        try {
            setLoading(true);
            const res = await getAlerts(50);
            setAlerts(res.data.alerts);
        } catch (error) {
            console.error('Failed to fetch alerts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAcknowledge = async (alertId) => {
        try {
            await acknowledgeAlert(alertId);
            setAlerts(prev => prev.filter(a => a.id !== alertId));
        } catch (error) {
            console.error('Failed to acknowledge alert:', error);
        }
    };

    const getSeverityIcon = (severity) => {
        if (severity === 'critical') {
            return <AlertCircle className="w-5 h-5 text-red-500" />;
        }
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    };

    const getSeverityStyle = (severity) => {
        if (severity === 'critical') {
            return 'border-l-red-500 bg-red-500/5';
        }
        return 'border-l-yellow-500 bg-yellow-500/5';
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="relative w-full max-w-md bg-secondary border-l border-theme 
                      h-full overflow-hidden animate-slide-in-right">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-theme">
                    <div className="flex items-center gap-2">
                        <Bell className="w-5 h-5 text-accent" />
                        <h2 className="text-lg font-semibold text-primary">Alerts</h2>
                        <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400">
                            {alerts.length}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-surface-secondary transition-colors"
                    >
                        <X className="w-5 h-5 text-secondary" />
                    </button>
                </div>

                {/* Alert list */}
                <div className="h-full overflow-y-auto pb-20">
                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="w-6 h-6 border-2 border-accent border-t-transparent 
                            rounded-full animate-spin" />
                        </div>
                    ) : alerts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 text-muted">
                            <Check className="w-8 h-8 mb-2" />
                            <p>All clear! No active alerts.</p>
                        </div>
                    ) : (
                        <div className="p-4 space-y-3">
                            {alerts.map(alert => (
                                <div
                                    key={alert.id}
                                    className={`p-4 rounded-lg border-l-4 ${getSeverityStyle(alert.severity)} 
                             glass transition-all hover:scale-[1.01]`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-3">
                                            {getSeverityIcon(alert.severity)}
                                            <div>
                                                <p className="font-medium text-primary">{alert.machine_id}</p>
                                                <p className="text-sm text-secondary mt-1">{alert.message}</p>
                                                <p className="text-xs text-muted mt-2">
                                                    {new Date(alert.created_at).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleAcknowledge(alert.id)}
                                            className="p-1.5 rounded-lg hover:bg-surface-tertiary 
                               transition-colors text-muted hover:text-primary"
                                            title="Acknowledge"
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

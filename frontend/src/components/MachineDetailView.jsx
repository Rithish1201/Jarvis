import { ArrowLeft, Thermometer, Activity, Gauge, Heart } from 'lucide-react';
import HistoryChart from './HistoryChart';

export default function MachineDetailView({ machine, onBack }) {
    if (!machine) return null;

    const getStatusStyle = () => {
        switch (machine.status) {
            case 'Healthy': return 'status-healthy';
            case 'Warning': return 'status-warning';
            case 'Critical': return 'status-critical';
            default: return '';
        }
    };

    const getHealthColor = () => {
        if (machine.health_score >= 70) return 'text-green-500';
        if (machine.health_score >= 40) return 'text-yellow-500';
        return 'text-red-500';
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Back button */}
            <button
                onClick={onBack}
                className="flex items-center gap-2 text-secondary hover:text-primary 
                   transition-colors group"
            >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                Back to Dashboard
            </button>

            {/* Machine header */}
            <div className="glass rounded-2xl p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-primary">{machine.machine_id}</h1>
                        <p className="text-secondary mt-1">Real-time monitoring</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusStyle()}`}>
                            {machine.status}
                        </span>
                        <div className={`text-3xl font-bold ${getHealthColor()}`}>
                            {machine.health_score}%
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={<Thermometer className="w-6 h-6" />}
                    label="Temperature"
                    value={`${machine.temperature}°C`}
                    color={machine.temperature > 80 ? 'text-red-500' : 'text-blue-500'}
                />
                <StatCard
                    icon={<Activity className="w-6 h-6" />}
                    label="Vibration"
                    value={machine.vibration.toFixed(3)}
                    color={machine.vibration > 0.7 ? 'text-yellow-500' : 'text-green-500'}
                />
                <StatCard
                    icon={<Gauge className="w-6 h-6" />}
                    label="RPM"
                    value={machine.rpm || 'N/A'}
                    color={machine.rpm > 3000 ? 'text-orange-500' : 'text-purple-500'}
                />
                <StatCard
                    icon={<Heart className="w-6 h-6" />}
                    label="Health Score"
                    value={`${machine.health_score}%`}
                    color={getHealthColor()}
                />
            </div>

            {/* Historical chart */}
            <HistoryChart machineId={machine.machine_id} hours={1} />

            {/* Timestamp */}
            <p className="text-sm text-muted text-center">
                Last updated: {new Date(machine.timestamp).toLocaleString()}
            </p>
        </div>
    );
}

function StatCard({ icon, label, value, color }) {
    return (
        <div className="glass rounded-xl p-4 card-hover">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-surface-secondary ${color}`}>
                    {icon}
                </div>
                <div>
                    <p className="text-sm text-muted">{label}</p>
                    <p className={`text-xl font-bold ${color}`}>{value}</p>
                </div>
            </div>
        </div>
    );
}

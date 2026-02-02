import { Activity, Thermometer, Gauge, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function MachineCard({ machine, onClick, anomaly, prediction }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const getStatusColors = () => {
    switch (machine.status) {
      case 'Healthy': return { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' };
      case 'Warning': return { bg: 'rgba(234,179,8,0.15)', text: '#eab308' };
      case 'Critical': return { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' };
      default: return { bg: 'rgba(107,114,128,0.15)', text: '#6b7280' };
    }
  };

  const statusColors = getStatusColors();

  const getHealthColor = () => {
    if (machine.health_score >= 70) return '#22c55e';
    if (machine.health_score >= 40) return '#eab308';
    return '#ef4444';
  };

  // Check for anomaly or prediction alerts
  const hasAnomaly = anomaly?.is_anomaly;
  const hasPrediction = prediction?.risk_level && prediction.risk_level !== 'stable';

  return (
    <div
      onClick={onClick}
      className="rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl border backdrop-blur-xl relative overflow-hidden"
      style={{
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
        borderColor: hasAnomaly ? '#ef4444' : (hasPrediction ? '#f59e0b' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)')),
        borderWidth: hasAnomaly || hasPrediction ? '2px' : '1px'
      }}
    >
      {/* Anomaly/Prediction Badge */}
      {(hasAnomaly || hasPrediction) && (
        <div
          className="absolute top-0 right-0 px-3 py-1 text-xs font-bold text-white rounded-bl-lg flex items-center gap-1"
          style={{ backgroundColor: hasAnomaly ? '#ef4444' : '#f59e0b' }}
        >
          <AlertTriangle className="w-3 h-3" />
          {hasAnomaly ? 'ANOMALY' : 'AT RISK'}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <span
            className={`w-2.5 h-2.5 rounded-full ${machine.status === 'Critical' ? 'animate-pulse' : ''}`}
            style={{ backgroundColor: statusColors.text }}
          />
          <h3
            className="text-lg font-semibold"
            style={{ color: isDark ? '#ffffff' : '#0f172a' }}
          >
            {machine.machine_id}
          </h3>
        </div>
        <span
          className="px-3 py-1 text-xs rounded-full font-medium"
          style={{ backgroundColor: statusColors.bg, color: statusColors.text }}
        >
          {machine.status}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4">
        <StatItem
          icon={<Thermometer className="w-4 h-4" />}
          label="Temp"
          value={`${machine.temperature}°C`}
          alert={machine.temperature > 80}
          isDark={isDark}
          trend={prediction?.trends?.temperature}
        />
        <StatItem
          icon={<Activity className="w-4 h-4" />}
          label="Vibration"
          value={machine.vibration?.toFixed(3) || '0'}
          alert={machine.vibration > 0.7}
          isDark={isDark}
          trend={prediction?.trends?.vibration}
        />
        <StatItem
          icon={<Gauge className="w-4 h-4" />}
          label="RPM"
          value={machine.rpm || 'N/A'}
          alert={machine.rpm > 3000}
          isDark={isDark}
        />
        <StatItem
          icon={<TrendingUp className="w-4 h-4" />}
          label="Health"
          value={`${machine.health_score}%`}
          customColor={getHealthColor()}
          isDark={isDark}
          trend={prediction?.trends?.health}
        />
      </div>

      {/* Prediction warning */}
      {hasPrediction && (
        <div
          className="mt-4 p-2 rounded-lg text-xs flex items-center gap-2"
          style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}
        >
          <AlertTriangle className="w-4 h-4" />
          {prediction.risk_message}
        </div>
      )}

      {/* Click hint */}
      <p
        className="text-xs mt-3 text-center opacity-0 hover:opacity-100 transition-opacity"
        style={{ color: isDark ? '#6b7280' : '#94a3b8' }}
      >
        Click for details →
      </p>
    </div>
  );
}

function StatItem({ icon, label, value, alert, customColor, isDark, trend }) {
  const color = customColor || (alert ? '#ef4444' : (isDark ? '#9ca3af' : '#475569'));

  const TrendIcon = trend === 'rising' || trend === 'declining' ? TrendingUp :
    trend === 'falling' || trend === 'improving' ? TrendingDown : null;
  const trendColor = (trend === 'rising' || trend === 'declining') ? '#ef4444' :
    (trend === 'falling' || trend === 'improving') ? '#22c55e' : null;

  return (
    <div className="flex items-center gap-2">
      <div
        className="p-1.5 rounded-lg"
        style={{
          backgroundColor: alert ? 'rgba(239,68,68,0.1)' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'),
          color: color
        }}
      >
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-xs" style={{ color: isDark ? '#6b7280' : '#94a3b8' }}>{label}</p>
        <div className="flex items-center gap-1">
          <p className="text-sm font-semibold" style={{ color }}>{value}</p>
          {TrendIcon && <TrendIcon className="w-3 h-3" style={{ color: trendColor }} />}
        </div>
      </div>
    </div>
  );
}

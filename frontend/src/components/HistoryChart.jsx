import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getMachineHistory } from '../services/api';

export default function HistoryChart({ machineId, hours = 1 }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (machineId) {
            fetchHistory();
        }
    }, [machineId, hours]);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const res = await getMachineHistory(machineId, hours);

            // Format data for chart - reverse to show oldest first
            const formatted = res.data.readings.reverse().map(r => ({
                time: new Date(r.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                temperature: r.temperature,
                vibration: r.vibration * 100, // Scale for visibility
                health: r.health_score,
            }));

            setData(formatted);
        } catch (error) {
            console.error('Failed to fetch history:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="h-64 flex items-center justify-center glass rounded-xl">
                <div className="w-6 h-6 border-2 border-accent border-t-transparent 
                      rounded-full animate-spin" />
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center glass rounded-xl text-muted">
                No historical data available
            </div>
        );
    }

    return (
        <div className="glass rounded-xl p-4">
            <h3 className="text-sm font-medium text-secondary mb-4">
                Performance History (Last {hours}h)
            </h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                        <XAxis
                            dataKey="time"
                            stroke="var(--color-text-muted)"
                            fontSize={12}
                            tickLine={false}
                        />
                        <YAxis
                            stroke="var(--color-text-muted)"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--color-bg-secondary)',
                                border: '1px solid var(--color-border)',
                                borderRadius: '8px',
                                color: 'var(--color-text-primary)'
                            }}
                            labelStyle={{ color: 'var(--color-text-secondary)' }}
                        />
                        <Legend />
                        <Line
                            type="monotone"
                            dataKey="temperature"
                            stroke="#ef4444"
                            strokeWidth={2}
                            dot={false}
                            name="Temperature (°C)"
                        />
                        <Line
                            type="monotone"
                            dataKey="vibration"
                            stroke="#eab308"
                            strokeWidth={2}
                            dot={false}
                            name="Vibration (x100)"
                        />
                        <Line
                            type="monotone"
                            dataKey="health"
                            stroke="#22c55e"
                            strokeWidth={2}
                            dot={false}
                            name="Health Score"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

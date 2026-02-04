import React, { useState, useEffect } from 'react';
import { getShiftSummary, getMachineComparison, getDailySummary } from './services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#00ff88', '#00f0ff', '#ff9500', '#ff3b3b', '#a855f7'];

export default function AnalyticsDashboard({ language = 'en', onBack }) {
    const [shiftData, setShiftData] = useState(null);
    const [comparison, setComparison] = useState(null);
    const [dailyData, setDailyData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [language]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [shift, comp, daily] = await Promise.all([
                getShiftSummary(24, language),  // 24 hours for better data coverage
                getMachineComparison(),
                getDailySummary(7)
            ]);
            setShiftData(shift.data);
            setComparison(comp.data);
            setDailyData(daily.data.daily_summaries);
        } catch (err) {
            console.error('Failed to load analytics:', err);
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.loading}>
                    <div style={styles.spinner}></div>
                    <p>Loading Analytics...</p>
                </div>
            </div>
        );
    }

    const machineData = comparison?.machines || [];
    const efficiencyData = machineData.map(m => ({
        name: m.machine_id,
        efficiency: m.efficiency_score,
        health: m.health_score
    }));

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <button onClick={onBack} style={styles.backBtn}>← Back</button>
                <h1 style={styles.title}>📊 Analytics Dashboard</h1>
                <button onClick={loadData} style={styles.refreshBtn}>🔄 Refresh</button>
            </div>

            {/* Overview Cards */}
            <div style={styles.cardsRow}>
                <Card title="Shift Overview" icon="📋">
                    <p style={styles.cardValue}>{shiftData?.overview?.machines_monitored || 0}</p>
                    <p style={styles.cardLabel}>Machines Monitored</p>
                    <div style={styles.cardStats}>
                        <span style={{ color: '#ff3b3b' }}>🔴 {shiftData?.overview?.critical_alerts || 0} Critical</span>
                        <span style={{ color: '#ff9500' }}>🟡 {shiftData?.overview?.warning_alerts || 0} Warnings</span>
                    </div>
                </Card>

                <Card title="Best Performer" icon="🏆">
                    <p style={styles.cardValue}>{comparison?.best_performer || '-'}</p>
                    <p style={styles.cardLabel}>Top Efficiency</p>
                </Card>

                <Card title="Needs Attention" icon="⚠️">
                    <p style={styles.cardValue}>{comparison?.needs_attention?.length || 0}</p>
                    <p style={styles.cardLabel}>Machines Below 60%</p>
                    <p style={styles.cardSmall}>{comparison?.needs_attention?.join(', ') || 'None'}</p>
                </Card>

                <Card title="Total Readings" icon="📈">
                    <p style={styles.cardValue}>{shiftData?.overview?.total_readings || 0}</p>
                    <p style={styles.cardLabel}>This Shift</p>
                </Card>
            </div>

            {/* Charts Row */}
            <div style={styles.chartsRow}>
                {/* Efficiency Bar Chart */}
                <div style={styles.chartCard}>
                    <h3 style={styles.chartTitle}>Machine Efficiency Rankings</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={efficiencyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,240,255,0.2)" />
                            <XAxis dataKey="name" stroke="#00f0ff" />
                            <YAxis stroke="#00f0ff" />
                            <Tooltip
                                contentStyle={{ background: 'rgba(0,20,40,0.9)', border: '1px solid #00f0ff' }}
                                labelStyle={{ color: '#00f0ff' }}
                            />
                            <Bar dataKey="efficiency" fill="#00ff88" name="Efficiency %" />
                            <Bar dataKey="health" fill="#00f0ff" name="Health %" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Daily Trend Line Chart */}
                <div style={styles.chartCard}>
                    <h3 style={styles.chartTitle}>7-Day Health Trend</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={[...(dailyData || [])].reverse()}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,240,255,0.2)" />
                            <XAxis dataKey="date" stroke="#00f0ff" />
                            <YAxis stroke="#00f0ff" />
                            <Tooltip
                                contentStyle={{ background: 'rgba(0,20,40,0.9)', border: '1px solid #00f0ff' }}
                            />
                            <Line type="monotone" dataKey="avg_health" stroke="#00ff88" strokeWidth={2} name="Avg Health" />
                            <Line type="monotone" dataKey="avg_temperature" stroke="#ff3b3b" strokeWidth={2} name="Avg Temp" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Recommendations */}
            <div style={styles.recommendationsCard}>
                <h3 style={styles.chartTitle}>🔧 Recommendations for Next Shift</h3>
                <div style={styles.recList}>
                    {shiftData?.recommendations?.slice(0, 5).map((rec, i) => (
                        <div key={i} style={styles.recItem}>
                            <span style={{
                                ...styles.priority,
                                background: rec.priority === 'high' ? '#ff3b3b' : rec.priority === 'medium' ? '#ff9500' : '#00ff88'
                            }}>
                                {rec.priority?.toUpperCase() || 'INFO'}
                            </span>
                            <span>{rec.message}</span>
                        </div>
                    )) || <p>No recommendations at this time</p>}
                </div>
            </div>

            {/* Machine Stats Table */}
            <div style={styles.tableCard}>
                <h3 style={styles.chartTitle}>📊 Machine Performance Summary</h3>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>Rank</th>
                            <th style={styles.th}>Machine</th>
                            <th style={styles.th}>Efficiency</th>
                            <th style={styles.th}>Health</th>
                            <th style={styles.th}>Temp</th>
                            <th style={styles.th}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {machineData.map((m, i) => (
                            <tr key={m.machine_id} style={styles.tr}>
                                <td style={styles.td}>#{m.rank}</td>
                                <td style={styles.td}>{m.machine_id}</td>
                                <td style={{ ...styles.td, color: m.efficiency_score > 70 ? '#00ff88' : '#ff9500' }}>
                                    {m.efficiency_score}%
                                </td>
                                <td style={styles.td}>{m.health_score}%</td>
                                <td style={{ ...styles.td, color: m.temperature > 75 ? '#ff3b3b' : '#00f0ff' }}>
                                    {m.temperature}°C
                                </td>
                                <td style={{
                                    ...styles.td,
                                    color: m.status === 'Healthy' ? '#00ff88' : m.status === 'Warning' ? '#ff9500' : '#ff3b3b'
                                }}>
                                    {m.status}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
        </div>
    );
}

function Card({ title, icon, children }) {
    return (
        <div style={styles.card}>
            <div style={styles.cardHeader}>
                <span>{icon}</span>
                <span>{title}</span>
            </div>
            {children}
        </div>
    );
}

const styles = {
    container: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a1628 0%, #1a1a2e 100%)',
        padding: '20px',
        color: '#00f0ff',
        fontFamily: "'Rajdhani', 'Orbitron', sans-serif"
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        padding: '16px',
        background: 'rgba(0,240,255,0.05)',
        borderRadius: '12px',
        border: '1px solid rgba(0,240,255,0.2)'
    },
    title: {
        margin: 0,
        fontSize: '28px',
        color: '#00f0ff',
        textShadow: '0 0 20px rgba(0,240,255,0.5)'
    },
    backBtn: {
        background: 'rgba(0,240,255,0.1)',
        border: '1px solid #00f0ff',
        color: '#00f0ff',
        padding: '8px 16px',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '14px'
    },
    refreshBtn: {
        background: 'rgba(0,255,136,0.1)',
        border: '1px solid #00ff88',
        color: '#00ff88',
        padding: '8px 16px',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '14px'
    },
    loading: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '50vh'
    },
    spinner: {
        width: '50px',
        height: '50px',
        border: '3px solid rgba(0,240,255,0.2)',
        borderTop: '3px solid #00f0ff',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
    },
    cardsRow: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
    },
    card: {
        background: 'rgba(0,20,40,0.8)',
        border: '1px solid rgba(0,240,255,0.3)',
        borderRadius: '12px',
        padding: '16px',
        textAlign: 'center'
    },
    cardHeader: {
        display: 'flex',
        gap: '8px',
        justifyContent: 'center',
        marginBottom: '12px',
        fontSize: '14px',
        opacity: 0.8
    },
    cardValue: {
        fontSize: '32px',
        fontWeight: 'bold',
        color: '#00ff88',
        margin: '8px 0'
    },
    cardLabel: {
        fontSize: '12px',
        opacity: 0.7
    },
    cardStats: {
        display: 'flex',
        justifyContent: 'space-around',
        marginTop: '12px',
        fontSize: '11px'
    },
    cardSmall: {
        fontSize: '10px',
        opacity: 0.6,
        marginTop: '8px'
    },
    chartsRow: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
    },
    chartCard: {
        background: 'rgba(0,20,40,0.8)',
        border: '1px solid rgba(0,240,255,0.3)',
        borderRadius: '12px',
        padding: '16px'
    },
    chartTitle: {
        margin: '0 0 16px 0',
        fontSize: '16px',
        color: '#00f0ff'
    },
    recommendationsCard: {
        background: 'rgba(0,20,40,0.8)',
        border: '1px solid rgba(0,240,255,0.3)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px'
    },
    recList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },
    recItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '8px 12px',
        background: 'rgba(0,0,0,0.3)',
        borderRadius: '8px',
        fontSize: '13px'
    },
    priority: {
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '10px',
        fontWeight: 'bold',
        color: '#000'
    },
    tableCard: {
        background: 'rgba(0,20,40,0.8)',
        border: '1px solid rgba(0,240,255,0.3)',
        borderRadius: '12px',
        padding: '16px',
        overflowX: 'auto'
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse'
    },
    th: {
        textAlign: 'left',
        padding: '12px',
        borderBottom: '1px solid rgba(0,240,255,0.3)',
        color: '#00f0ff',
        fontSize: '12px'
    },
    tr: {
        borderBottom: '1px solid rgba(0,240,255,0.1)'
    },
    td: {
        padding: '12px',
        fontSize: '13px'
    }
};

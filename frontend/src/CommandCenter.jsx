import React, { useState, useEffect } from 'react';

const API_BASE = 'http://127.0.0.1:8000';

export default function CommandCenter({ machines = [], alerts = [], onExit }) {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [activeView, setActiveView] = useState(0);
    const [autoRotate, setAutoRotate] = useState(true);
    const [factoryStats, setFactoryStats] = useState({
        uptime: 98.7,
        efficiency: 94.2,
        oee: 87.5,
        production: 1247
    });

    // Update clock every second
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Auto-rotate views
    useEffect(() => {
        if (!autoRotate) return;
        const rotateTimer = setInterval(() => {
            setActiveView(v => (v + 1) % 3);
        }, 15000); // Change view every 15 seconds
        return () => clearInterval(rotateTimer);
    }, [autoRotate]);

    const getStatusColor = (status) => ({
        'Healthy': '#00ff88',
        'Warning': '#ff9500',
        'Critical': '#ff3b3b',
        'Offline': '#666'
    }[status] || '#00f0ff');

    const getStatusIcon = (status) => ({
        'Healthy': '✓',
        'Warning': '⚠',
        'Critical': '✕',
        'Offline': '○'
    }[status] || '?');

    const healthyCount = machines.filter(m => m.status === 'Healthy').length;
    const warningCount = machines.filter(m => m.status === 'Warning').length;
    const criticalCount = machines.filter(m => m.status === 'Critical').length;

    return (
        <div style={styles.container}>
            {/* Header Bar */}
            <div style={styles.header}>
                <div style={styles.headerLeft}>
                    <div style={styles.logo}>🏭 JARVIS</div>
                    <div style={styles.subtitle}>FACTORY COMMAND CENTER</div>
                </div>

                <div style={styles.headerCenter}>
                    <div style={styles.clock}>
                        {currentTime.toLocaleTimeString('en-US', { hour12: false })}
                    </div>
                    <div style={styles.date}>
                        {currentTime.toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </div>
                </div>

                <div style={styles.headerRight}>
                    <button
                        onClick={() => setAutoRotate(!autoRotate)}
                        style={{ ...styles.controlBtn, opacity: autoRotate ? 1 : 0.5 }}
                    >
                        {autoRotate ? '⏸ AUTO' : '▶ MANUAL'}
                    </button>
                    <button onClick={onExit} style={styles.exitBtn}>EXIT</button>
                </div>
            </div>

            {/* Status Bar */}
            <div style={styles.statusBar}>
                <div style={styles.statusItem}>
                    <span style={{ ...styles.statusDot, background: '#00ff88' }}></span>
                    <span style={styles.statusCount}>{healthyCount}</span>
                    <span style={styles.statusLabel}>OPERATIONAL</span>
                </div>
                <div style={styles.statusItem}>
                    <span style={{ ...styles.statusDot, background: '#ff9500' }}></span>
                    <span style={styles.statusCount}>{warningCount}</span>
                    <span style={styles.statusLabel}>WARNING</span>
                </div>
                <div style={styles.statusItem}>
                    <span style={{ ...styles.statusDot, background: '#ff3b3b' }}></span>
                    <span style={styles.statusCount}>{criticalCount}</span>
                    <span style={styles.statusLabel}>CRITICAL</span>
                </div>
                <div style={styles.divider}></div>
                <div style={styles.kpiItem}>
                    <span style={styles.kpiValue}>{factoryStats.uptime}%</span>
                    <span style={styles.kpiLabel}>UPTIME</span>
                </div>
                <div style={styles.kpiItem}>
                    <span style={styles.kpiValue}>{factoryStats.efficiency}%</span>
                    <span style={styles.kpiLabel}>EFFICIENCY</span>
                </div>
                <div style={styles.kpiItem}>
                    <span style={styles.kpiValue}>{factoryStats.oee}%</span>
                    <span style={styles.kpiLabel}>OEE</span>
                </div>
                <div style={styles.kpiItem}>
                    <span style={styles.kpiValue}>{factoryStats.production}</span>
                    <span style={styles.kpiLabel}>UNITS TODAY</span>
                </div>
            </div>

            {/* Main Content */}
            <div style={styles.mainContent}>
                {/* Left Panel - Machine Grid */}
                <div style={styles.leftPanel}>
                    <div style={styles.panelHeader}>
                        <span style={styles.panelTitle}>MACHINE STATUS</span>
                        <span style={styles.liveIndicator}>● LIVE</span>
                    </div>
                    <div style={styles.machineGrid}>
                        {machines.map((machine, i) => (
                            <div
                                key={i}
                                style={{
                                    ...styles.machineCard,
                                    borderColor: getStatusColor(machine.status),
                                    boxShadow: machine.status === 'Critical'
                                        ? `0 0 20px ${getStatusColor(machine.status)}`
                                        : 'none',
                                    animation: machine.status === 'Critical' ? 'pulse 1s infinite' : 'none'
                                }}
                            >
                                <div style={styles.machineHeader}>
                                    <span style={{ ...styles.machineStatus, color: getStatusColor(machine.status) }}>
                                        {getStatusIcon(machine.status)}
                                    </span>
                                    <span style={styles.machineId}>{machine.machine_id}</span>
                                </div>
                                <div style={styles.machineStats}>
                                    <div style={styles.machineStat}>
                                        <span style={styles.statIcon}>🌡️</span>
                                        <span style={{
                                            color: machine.temperature > 70 ? '#ff3b3b' : machine.temperature > 60 ? '#ff9500' : '#00ff88'
                                        }}>
                                            {machine.temperature?.toFixed(1)}°C
                                        </span>
                                    </div>
                                    <div style={styles.machineStat}>
                                        <span style={styles.statIcon}>📳</span>
                                        <span style={{
                                            color: machine.vibration > 0.5 ? '#ff3b3b' : machine.vibration > 0.3 ? '#ff9500' : '#00ff88'
                                        }}>
                                            {machine.vibration?.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                                <div style={styles.healthBar}>
                                    <div
                                        style={{
                                            ...styles.healthFill,
                                            width: `${machine.health_score}%`,
                                            background: machine.health_score > 70 ? '#00ff88' : machine.health_score > 40 ? '#ff9500' : '#ff3b3b'
                                        }}
                                    ></div>
                                </div>
                                <div style={styles.healthValue}>{machine.health_score?.toFixed(0)}% HEALTH</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Panel - Alerts & Info */}
                <div style={styles.rightPanel}>
                    {/* Alerts Console */}
                    <div style={styles.alertsPanel}>
                        <div style={styles.panelHeader}>
                            <span style={styles.panelTitle}>🚨 ALERT CONSOLE</span>
                            <span style={styles.alertCount}>{alerts.length}</span>
                        </div>
                        <div style={styles.alertsList}>
                            {alerts.length === 0 ? (
                                <div style={styles.noAlerts}>
                                    <span style={{ fontSize: '40px' }}>✅</span>
                                    <span>All Systems Normal</span>
                                </div>
                            ) : (
                                alerts.slice(0, 6).map((alert, i) => (
                                    <div key={i} style={styles.alertItem}>
                                        <span style={styles.alertIcon}>
                                            {alert.type === 'critical' ? '🔴' : '🟡'}
                                        </span>
                                        <div style={styles.alertContent}>
                                            <div style={styles.alertMessage}>{alert.message}</div>
                                            <div style={styles.alertTime}>
                                                {new Date(alert.timestamp).toLocaleTimeString()}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Factory Overview */}
                    <div style={styles.overviewPanel}>
                        <div style={styles.panelHeader}>
                            <span style={styles.panelTitle}>📊 FACTORY OVERVIEW</span>
                        </div>
                        <div style={styles.overviewGrid}>
                            <div style={styles.overviewCard}>
                                <div style={styles.overviewIcon}>⚙️</div>
                                <div style={styles.overviewValue}>{machines.length}</div>
                                <div style={styles.overviewLabel}>MACHINES</div>
                            </div>
                            <div style={styles.overviewCard}>
                                <div style={styles.overviewIcon}>📡</div>
                                <div style={styles.overviewValue}>12</div>
                                <div style={styles.overviewLabel}>SENSORS</div>
                            </div>
                            <div style={styles.overviewCard}>
                                <div style={styles.overviewIcon}>⚡</div>
                                <div style={styles.overviewValue}>4.2</div>
                                <div style={styles.overviewLabel}>MW POWER</div>
                            </div>
                            <div style={styles.overviewCard}>
                                <div style={styles.overviewIcon}>🔧</div>
                                <div style={styles.overviewValue}>2</div>
                                <div style={styles.overviewLabel}>SCHEDULED</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div style={styles.footer}>
                <div style={styles.footerLeft}>
                    SHIFT: DAY (06:00 - 18:00) | SUPERVISOR: Floor Manager
                </div>
                <div style={styles.footerCenter}>
                    <div style={styles.viewIndicators}>
                        {[0, 1, 2].map(i => (
                            <span
                                key={i}
                                onClick={() => { setActiveView(i); setAutoRotate(false); }}
                                style={{
                                    ...styles.viewDot,
                                    background: activeView === i ? '#00f0ff' : '#333'
                                }}
                            ></span>
                        ))}
                    </div>
                </div>
                <div style={styles.footerRight}>
                    JARVIS v2.0 | CONNECTED | {machines.length} MACHINES ONLINE
                </div>
            </div>

            {/* Animated Background Grid */}
            <div style={styles.bgGrid}></div>

            <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
      `}</style>
        </div>
    );
}

const styles = {
    container: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, #0a1628 0%, #0d2137 50%, #0a1628 100%)',
        color: '#ffffff',
        fontFamily: "'Orbitron', 'Segoe UI', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        zIndex: 2000,
        overflow: 'hidden'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 32px',
        background: 'rgba(0,20,40,0.8)',
        borderBottom: '2px solid rgba(0,240,255,0.3)'
    },
    headerLeft: { display: 'flex', alignItems: 'center', gap: '20px' },
    logo: { fontSize: '28px', fontWeight: 'bold', color: '#00f0ff', letterSpacing: '4px' },
    subtitle: { fontSize: '14px', color: '#4a7c80', letterSpacing: '3px' },
    headerCenter: { textAlign: 'center' },
    clock: { fontSize: '48px', fontWeight: 'bold', color: '#00f0ff', letterSpacing: '4px' },
    date: { fontSize: '14px', color: '#88cccc', marginTop: '4px' },
    headerRight: { display: 'flex', gap: '12px' },
    controlBtn: {
        background: 'rgba(0,240,255,0.1)',
        border: '1px solid #00f0ff',
        color: '#00f0ff',
        padding: '10px 20px',
        fontSize: '12px',
        cursor: 'pointer',
        letterSpacing: '2px'
    },
    exitBtn: {
        background: 'rgba(255,59,59,0.1)',
        border: '1px solid #ff3b3b',
        color: '#ff3b3b',
        padding: '10px 20px',
        fontSize: '12px',
        cursor: 'pointer',
        letterSpacing: '2px'
    },
    statusBar: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '40px',
        padding: '16px',
        background: 'rgba(0,40,60,0.5)',
        borderBottom: '1px solid rgba(0,240,255,0.2)'
    },
    statusItem: { display: 'flex', alignItems: 'center', gap: '10px' },
    statusDot: { width: '12px', height: '12px', borderRadius: '50%' },
    statusCount: { fontSize: '28px', fontWeight: 'bold' },
    statusLabel: { fontSize: '12px', color: '#88cccc' },
    divider: { width: '1px', height: '40px', background: 'rgba(0,240,255,0.3)' },
    kpiItem: { textAlign: 'center' },
    kpiValue: { display: 'block', fontSize: '24px', fontWeight: 'bold', color: '#00ff88' },
    kpiLabel: { fontSize: '10px', color: '#88cccc' },
    mainContent: {
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '20px',
        padding: '20px',
        overflow: 'hidden'
    },
    leftPanel: {
        background: 'rgba(0,20,40,0.6)',
        border: '1px solid rgba(0,240,255,0.3)',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column'
    },
    panelHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '1px solid rgba(0,240,255,0.2)'
    },
    panelTitle: { fontSize: '16px', letterSpacing: '2px', color: '#00f0ff' },
    liveIndicator: { color: '#00ff88', fontSize: '12px', animation: 'pulse 1s infinite' },
    alertCount: {
        background: '#ff3b3b',
        color: '#fff',
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '14px'
    },
    machineGrid: {
        flex: 1,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        overflow: 'auto'
    },
    machineCard: {
        background: 'rgba(0,40,60,0.6)',
        border: '2px solid',
        borderRadius: '12px',
        padding: '16px',
        transition: 'all 0.3s'
    },
    machineHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '12px'
    },
    machineStatus: { fontSize: '24px', fontWeight: 'bold' },
    machineId: { fontSize: '16px', fontWeight: 'bold', color: '#00f0ff' },
    machineStats: { display: 'flex', justifyContent: 'space-between', marginBottom: '12px' },
    machineStat: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' },
    statIcon: { fontSize: '14px' },
    healthBar: {
        height: '8px',
        background: 'rgba(0,0,0,0.4)',
        borderRadius: '4px',
        overflow: 'hidden',
        marginBottom: '6px'
    },
    healthFill: { height: '100%', borderRadius: '4px', transition: 'width 0.5s' },
    healthValue: { fontSize: '11px', textAlign: 'center', color: '#88cccc' },
    rightPanel: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
    },
    alertsPanel: {
        flex: 1,
        background: 'rgba(0,20,40,0.6)',
        border: '1px solid rgba(0,240,255,0.3)',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column'
    },
    alertsList: { flex: 1, overflow: 'auto' },
    noAlerts: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: '#00ff88',
        gap: '10px'
    },
    alertItem: {
        display: 'flex',
        gap: '12px',
        padding: '12px',
        background: 'rgba(255,59,59,0.1)',
        borderRadius: '8px',
        marginBottom: '8px',
        borderLeft: '3px solid #ff3b3b'
    },
    alertIcon: { fontSize: '20px' },
    alertContent: { flex: 1 },
    alertMessage: { fontSize: '13px', marginBottom: '4px' },
    alertTime: { fontSize: '11px', color: '#888' },
    overviewPanel: {
        background: 'rgba(0,20,40,0.6)',
        border: '1px solid rgba(0,240,255,0.3)',
        borderRadius: '12px',
        padding: '16px'
    },
    overviewGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px'
    },
    overviewCard: {
        background: 'rgba(0,40,60,0.5)',
        borderRadius: '8px',
        padding: '16px',
        textAlign: 'center'
    },
    overviewIcon: { fontSize: '28px', marginBottom: '8px' },
    overviewValue: { fontSize: '28px', fontWeight: 'bold', color: '#00f0ff' },
    overviewLabel: { fontSize: '10px', color: '#88cccc' },
    footer: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 32px',
        background: 'rgba(0,20,40,0.8)',
        borderTop: '1px solid rgba(0,240,255,0.2)',
        fontSize: '12px',
        color: '#4a7c80'
    },
    footerLeft: {},
    footerCenter: {},
    viewIndicators: { display: 'flex', gap: '8px' },
    viewDot: {
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        cursor: 'pointer',
        transition: 'background 0.3s'
    },
    footerRight: {},
    bgGrid: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `
      linear-gradient(rgba(0,240,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,240,255,0.03) 1px, transparent 1px)
    `,
        backgroundSize: '50px 50px',
        pointerEvents: 'none',
        zIndex: -1
    }
};

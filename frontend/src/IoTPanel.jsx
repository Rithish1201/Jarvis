import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const API_BASE = 'http://127.0.0.1:8000';

export default function IoTPanel({ onClose }) {
    const [sensors, setSensors] = useState([]);
    const [readings, setReadings] = useState([]);
    const [byType, setByType] = useState({});
    const [summary, setSummary] = useState({ sensors: {}, readings: {} });
    const [selectedSensor, setSelectedSensor] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
        // Auto-refresh every 5 seconds
        const interval = setInterval(loadData, 5000);
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        try {
            const [sensorsRes, dashRes] = await Promise.all([
                fetch(`${API_BASE}/iot/sensors`),
                fetch(`${API_BASE}/iot/dashboard`)
            ]);

            const sensorsData = await sensorsRes.json();
            const dashData = await dashRes.json();

            setSensors(sensorsData.sensors || []);
            setByType(dashData.by_type || {});
            setSummary({
                sensors: dashData.sensors || {},
                readings: dashData.readings || {}
            });

            // Flatten readings from by_type
            const allReadings = Object.values(dashData.by_type || {}).flat();
            setReadings(allReadings);
        } catch (err) {
            console.error('Failed to load IoT data:', err);
        }
        setLoading(false);
    };

    const loadHistory = async (sensorId) => {
        try {
            const res = await fetch(`${API_BASE}/iot/readings/${sensorId}/history?hours=1`);
            const data = await res.json();
            setHistory(data.history || []);
            setSelectedSensor(data);
        } catch (err) {
            console.error('Failed to load history:', err);
        }
    };

    const getStatusColor = (status) => {
        const colors = { online: '#00ff88', warning: '#ff9500', critical: '#ff3b3b', offline: '#666' };
        return colors[status] || '#00f0ff';
    };

    const getTypeIcon = (type) => {
        const icons = {
            temperature: '🌡️',
            vibration: '📳',
            pressure: '📊',
            coolant_flow: '💧',
            rpm: '⚙️',
            power: '⚡'
        };
        return icons[type] || '📡';
    };

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <h2 style={styles.title}>📡 IoT Sensor Dashboard</h2>
                <div style={styles.headerRight}>
                    <span style={styles.liveIndicator}>● LIVE</span>
                    <button onClick={onClose} style={styles.closeBtn}>✕</button>
                </div>
            </div>

            {/* Summary Cards */}
            <div style={styles.summaryCards}>
                <div style={styles.summaryCard}>
                    <div style={styles.cardIcon}>📡</div>
                    <div style={styles.cardValue}>{summary.sensors.total || 0}</div>
                    <div style={styles.cardLabel}>Total Sensors</div>
                </div>
                <div style={{ ...styles.summaryCard, borderColor: '#00ff88' }}>
                    <div style={styles.cardIcon}>✅</div>
                    <div style={{ ...styles.cardValue, color: '#00ff88' }}>{summary.sensors.online || 0}</div>
                    <div style={styles.cardLabel}>Online</div>
                </div>
                <div style={{ ...styles.summaryCard, borderColor: '#ff9500' }}>
                    <div style={styles.cardIcon}>⚠️</div>
                    <div style={{ ...styles.cardValue, color: '#ff9500' }}>{summary.readings.warning || 0}</div>
                    <div style={styles.cardLabel}>Warnings</div>
                </div>
                <div style={{ ...styles.summaryCard, borderColor: '#ff3b3b' }}>
                    <div style={styles.cardIcon}>🚨</div>
                    <div style={{ ...styles.cardValue, color: '#ff3b3b' }}>{summary.readings.critical || 0}</div>
                    <div style={styles.cardLabel}>Critical</div>
                </div>
            </div>

            <div style={styles.mainContent}>
                {/* Sensors by Type */}
                <div style={styles.sensorsPanel}>
                    <h3 style={styles.sectionTitle}>Sensor Readings by Type</h3>
                    {Object.entries(byType).map(([type, typeSensors]) => (
                        <div key={type} style={styles.typeGroup}>
                            <div style={styles.typeHeader}>
                                <span style={styles.typeIcon}>{getTypeIcon(type)}</span>
                                <span style={styles.typeName}>{type.replace('_', ' ').toUpperCase()}</span>
                            </div>
                            <div style={styles.sensorList}>
                                {typeSensors.map((sensor, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            ...styles.sensorItem,
                                            borderColor: getStatusColor(sensor.status),
                                            background: selectedSensor?.sensor_id === sensor.sensor_id ? 'rgba(0,240,255,0.1)' : 'transparent'
                                        }}
                                        onClick={() => loadHistory(sensor.sensor_id)}
                                    >
                                        <div style={styles.sensorTop}>
                                            <span style={styles.sensorId}>{sensor.sensor_id}</span>
                                            <span style={{ ...styles.sensorStatus, color: getStatusColor(sensor.status) }}>
                                                ● {sensor.status}
                                            </span>
                                        </div>
                                        <div style={styles.sensorValue}>
                                            <span style={styles.valueNumber}>{sensor.value}</span>
                                            <span style={styles.valueUnit}>{sensor.unit}</span>
                                        </div>
                                        <div style={styles.sensorMachine}>{sensor.machine_id}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* History Chart */}
                <div style={styles.chartPanel}>
                    {selectedSensor ? (
                        <>
                            <h3 style={styles.sectionTitle}>
                                {getTypeIcon(selectedSensor.sensor_type)} {selectedSensor.sensor_id} - Live History
                            </h3>
                            <div style={styles.statsRow}>
                                <div style={styles.statItem}>
                                    <span style={styles.statLabel}>Min</span>
                                    <span style={styles.statValue}>{selectedSensor.stats?.min} {selectedSensor.unit}</span>
                                </div>
                                <div style={styles.statItem}>
                                    <span style={styles.statLabel}>Max</span>
                                    <span style={styles.statValue}>{selectedSensor.stats?.max} {selectedSensor.unit}</span>
                                </div>
                                <div style={styles.statItem}>
                                    <span style={styles.statLabel}>Avg</span>
                                    <span style={styles.statValue}>{selectedSensor.stats?.avg} {selectedSensor.unit}</span>
                                </div>
                                <div style={styles.statItem}>
                                    <span style={styles.statLabel}>Current</span>
                                    <span style={{ ...styles.statValue, color: '#00f0ff' }}>{selectedSensor.stats?.current} {selectedSensor.unit}</span>
                                </div>
                            </div>
                            <div style={styles.chartContainer}>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={history}>
                                        <XAxis
                                            dataKey="timestamp"
                                            stroke="#00f0ff"
                                            tick={false}
                                        />
                                        <YAxis stroke="#00f0ff" />
                                        <Tooltip
                                            contentStyle={{
                                                background: 'rgba(0,20,40,0.95)',
                                                border: '1px solid #00f0ff',
                                                color: '#fff'
                                            }}
                                            labelFormatter={() => ''}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="value"
                                            stroke="#00ff88"
                                            strokeWidth={2}
                                            dot={false}
                                            animationDuration={300}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </>
                    ) : (
                        <div style={styles.placeholder}>
                            <span style={{ fontSize: '60px' }}>📈</span>
                            <p>Select a sensor to view history</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Device List */}
            <div style={styles.devicesSection}>
                <h3 style={styles.sectionTitle}>Connected Devices</h3>
                <div style={styles.deviceGrid}>
                    {sensors.slice(0, 6).map((sensor, i) => (
                        <div key={i} style={{ ...styles.deviceCard, borderColor: getStatusColor(sensor.status) }}>
                            <div style={styles.deviceHeader}>
                                <span style={styles.deviceId}>{sensor.sensor_id}</span>
                                <span style={{ color: getStatusColor(sensor.status) }}>●</span>
                            </div>
                            <div style={styles.deviceModel}>{sensor.model}</div>
                            <div style={styles.deviceMeta}>
                                <span>📶 {sensor.signal_strength}%</span>
                                <span>FW: {sensor.firmware}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
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
        background: 'rgba(10,22,40,0.98)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        color: '#ffffff',
        overflow: 'hidden'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 24px',
        borderBottom: '1px solid rgba(0,240,255,0.3)'
    },
    title: {
        margin: 0,
        color: '#00f0ff',
        fontSize: '24px',
        fontFamily: "'Orbitron', sans-serif"
    },
    headerRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
    },
    liveIndicator: {
        color: '#00ff88',
        fontSize: '12px',
        animation: 'pulse 1s infinite'
    },
    closeBtn: {
        background: 'transparent',
        border: '1px solid #ff3b3b',
        color: '#ff3b3b',
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        cursor: 'pointer',
        fontSize: '18px'
    },
    summaryCards: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        padding: '16px 24px'
    },
    summaryCard: {
        background: 'rgba(0,40,60,0.5)',
        border: '1px solid rgba(0,240,255,0.3)',
        borderRadius: '12px',
        padding: '16px',
        textAlign: 'center'
    },
    cardIcon: { fontSize: '28px', marginBottom: '8px' },
    cardValue: { fontSize: '32px', fontWeight: 'bold', color: '#ffffff' },
    cardLabel: { fontSize: '12px', color: '#88cccc', marginTop: '4px' },
    mainContent: {
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        padding: '0 24px',
        overflow: 'hidden'
    },
    sensorsPanel: {
        background: 'rgba(0,20,40,0.6)',
        border: '1px solid rgba(0,240,255,0.2)',
        borderRadius: '12px',
        padding: '16px',
        overflowY: 'auto'
    },
    sectionTitle: {
        margin: '0 0 16px 0',
        color: '#00f0ff',
        fontSize: '16px'
    },
    typeGroup: {
        marginBottom: '16px'
    },
    typeHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '8px'
    },
    typeIcon: { fontSize: '18px' },
    typeName: { fontSize: '12px', color: '#88cccc' },
    sensorList: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '8px'
    },
    sensorItem: {
        background: 'rgba(0,40,60,0.5)',
        border: '1px solid',
        borderRadius: '8px',
        padding: '10px',
        cursor: 'pointer',
        transition: 'background 0.2s'
    },
    sensorTop: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '4px'
    },
    sensorId: { fontSize: '11px', color: '#00f0ff' },
    sensorStatus: { fontSize: '10px' },
    sensorValue: { marginBottom: '4px' },
    valueNumber: { fontSize: '22px', fontWeight: 'bold' },
    valueUnit: { fontSize: '12px', color: '#88cccc', marginLeft: '4px' },
    sensorMachine: { fontSize: '10px', color: '#888' },
    chartPanel: {
        background: 'rgba(0,20,40,0.6)',
        border: '1px solid rgba(0,240,255,0.2)',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column'
    },
    statsRow: {
        display: 'flex',
        gap: '20px',
        marginBottom: '16px'
    },
    statItem: { textAlign: 'center' },
    statLabel: { display: 'block', fontSize: '10px', color: '#88cccc' },
    statValue: { fontSize: '16px', fontWeight: 'bold' },
    chartContainer: { flex: 1 },
    placeholder: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#88cccc'
    },
    devicesSection: {
        padding: '16px 24px',
        borderTop: '1px solid rgba(0,240,255,0.2)'
    },
    deviceGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: '12px'
    },
    deviceCard: {
        background: 'rgba(0,40,60,0.5)',
        border: '1px solid',
        borderRadius: '8px',
        padding: '12px'
    },
    deviceHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '4px'
    },
    deviceId: { fontSize: '12px', color: '#00f0ff' },
    deviceModel: { fontSize: '11px', color: '#ffffff', marginBottom: '4px' },
    deviceMeta: { display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#888' }
};

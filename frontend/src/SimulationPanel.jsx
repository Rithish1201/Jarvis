import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const API_BASE = 'http://127.0.0.1:8000';

export default function SimulationPanel({ machines = [], onClose }) {
    const [selectedMachine, setSelectedMachine] = useState(machines[0]?.machine_id || 'MILL-01');
    const [params, setParams] = useState({
        duration_hours: 24,
        workload_percent: 100,
        cooling_efficiency: 100,
        maintenance_applied: false,
        temperature_change: 0
    });
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [presets, setPresets] = useState([]);

    useEffect(() => {
        // Load presets
        fetch(`${API_BASE}/simulation/presets`)
            .then(r => r.json())
            .then(data => setPresets(data.presets || []))
            .catch(console.error);
    }, []);

    const runSimulation = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/simulation/run`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ machine_id: selectedMachine, ...params })
            });
            const data = await response.json();
            setResult(data);
        } catch (err) {
            console.error('Simulation failed:', err);
        }
        setLoading(false);
    };

    const applyPreset = (preset) => {
        setParams(prev => ({ ...prev, ...preset.params }));
    };

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <h2 style={styles.title}>🔮 Digital Twin Simulator</h2>
                <button onClick={onClose} style={styles.closeBtn}>✕</button>
            </div>

            <div style={styles.content}>
                {/* Controls Panel */}
                <div style={styles.controlsPanel}>
                    <h3 style={styles.sectionTitle}>Scenario Parameters</h3>

                    {/* Machine Selection */}
                    <div style={styles.control}>
                        <label style={styles.label}>Machine</label>
                        <select
                            value={selectedMachine}
                            onChange={e => setSelectedMachine(e.target.value)}
                            style={styles.select}
                        >
                            {machines.map(m => (
                                <option key={m.machine_id} value={m.machine_id}>{m.machine_id}</option>
                            ))}
                        </select>
                    </div>

                    {/* Duration */}
                    <div style={styles.control}>
                        <label style={styles.label}>Simulation Duration: {params.duration_hours}h</label>
                        <input
                            type="range"
                            min="6"
                            max="72"
                            value={params.duration_hours}
                            onChange={e => setParams(p => ({ ...p, duration_hours: parseInt(e.target.value) }))}
                            style={styles.slider}
                        />
                    </div>

                    {/* Workload */}
                    <div style={styles.control}>
                        <label style={styles.label}>Workload: {params.workload_percent}%</label>
                        <input
                            type="range"
                            min="50"
                            max="150"
                            value={params.workload_percent}
                            onChange={e => setParams(p => ({ ...p, workload_percent: parseInt(e.target.value) }))}
                            style={styles.slider}
                        />
                    </div>

                    {/* Cooling Efficiency */}
                    <div style={styles.control}>
                        <label style={styles.label}>Cooling Efficiency: {params.cooling_efficiency}%</label>
                        <input
                            type="range"
                            min="30"
                            max="100"
                            value={params.cooling_efficiency}
                            onChange={e => setParams(p => ({ ...p, cooling_efficiency: parseInt(e.target.value) }))}
                            style={styles.slider}
                        />
                    </div>

                    {/* Temperature Change */}
                    <div style={styles.control}>
                        <label style={styles.label}>Ambient Temp Change: {params.temperature_change > 0 ? '+' : ''}{params.temperature_change}°C</label>
                        <input
                            type="range"
                            min="-10"
                            max="20"
                            value={params.temperature_change}
                            onChange={e => setParams(p => ({ ...p, temperature_change: parseInt(e.target.value) }))}
                            style={styles.slider}
                        />
                    </div>

                    {/* Maintenance Toggle */}
                    <div style={styles.control}>
                        <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                                type="checkbox"
                                checked={params.maintenance_applied}
                                onChange={e => setParams(p => ({ ...p, maintenance_applied: e.target.checked }))}
                                style={{ width: '18px', height: '18px' }}
                            />
                            Apply Maintenance First
                        </label>
                    </div>

                    {/* Presets */}
                    <div style={styles.presetsSection}>
                        <label style={styles.label}>Quick Presets</label>
                        <div style={styles.presetButtons}>
                            {presets.map((preset, i) => (
                                <button
                                    key={i}
                                    onClick={() => applyPreset(preset)}
                                    style={styles.presetBtn}
                                    title={preset.description}
                                >
                                    {preset.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Run Button */}
                    <button
                        onClick={runSimulation}
                        disabled={loading}
                        style={styles.runBtn}
                    >
                        {loading ? '⏳ Simulating...' : '▶ Run Simulation'}
                    </button>
                </div>

                {/* Results Panel */}
                <div style={styles.resultsPanel}>
                    {result ? (
                        <>
                            {/* Summary Cards */}
                            <div style={styles.summaryCards}>
                                <div style={{ ...styles.card, borderColor: result.risk_level === 'High' ? '#ff3b3b' : result.risk_level === 'Medium' ? '#ff9500' : '#00ff88' }}>
                                    <div style={styles.cardLabel}>Risk Level</div>
                                    <div style={{ ...styles.cardValue, color: result.risk_level === 'High' ? '#ff3b3b' : result.risk_level === 'Medium' ? '#ff9500' : '#00ff88' }}>
                                        {result.risk_level}
                                    </div>
                                </div>
                                <div style={styles.card}>
                                    <div style={styles.cardLabel}>Final Health</div>
                                    <div style={{ ...styles.cardValue, color: result.predicted_health > 70 ? '#00ff88' : result.predicted_health > 40 ? '#ff9500' : '#ff3b3b' }}>
                                        {result.predicted_health}%
                                    </div>
                                </div>
                                <div style={styles.card}>
                                    <div style={styles.cardLabel}>Predicted Failures</div>
                                    <div style={{ ...styles.cardValue, color: result.predicted_failures > 0 ? '#ff3b3b' : '#00ff88' }}>
                                        {result.predicted_failures}
                                    </div>
                                </div>
                            </div>

                            {/* Timeline Chart */}
                            <div style={styles.chartContainer}>
                                <h4 style={styles.chartTitle}>Predicted Health Over Time</h4>
                                <ResponsiveContainer width="100%" height={200}>
                                    <AreaChart data={result.timeline}>
                                        <defs>
                                            <linearGradient id="healthGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#00ff88" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#00ff88" stopOpacity={0.1} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,240,255,0.2)" />
                                        <XAxis dataKey="hour" stroke="#00f0ff" label={{ value: 'Hours', position: 'bottom' }} />
                                        <YAxis stroke="#00f0ff" domain={[0, 100]} />
                                        <Tooltip contentStyle={{ background: 'rgba(0,20,40,0.95)', border: '1px solid #00f0ff' }} />
                                        <Area type="monotone" dataKey="health_score" stroke="#00ff88" fill="url(#healthGradient)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Temperature Chart */}
                            <div style={styles.chartContainer}>
                                <h4 style={styles.chartTitle}>Predicted Temperature</h4>
                                <ResponsiveContainer width="100%" height={150}>
                                    <LineChart data={result.timeline}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,240,255,0.2)" />
                                        <XAxis dataKey="hour" stroke="#00f0ff" />
                                        <YAxis stroke="#00f0ff" />
                                        <Tooltip contentStyle={{ background: 'rgba(0,20,40,0.95)', border: '1px solid #00f0ff' }} />
                                        <Line type="monotone" dataKey="temperature" stroke="#ff3b3b" strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Recommendations */}
                            <div style={styles.recommendations}>
                                <h4 style={styles.chartTitle}>🔧 Recommendations</h4>
                                <ul style={styles.recList}>
                                    {result.recommendations.map((rec, i) => (
                                        <li key={i} style={styles.recItem}>{rec}</li>
                                    ))}
                                </ul>
                            </div>
                        </>
                    ) : (
                        <div style={styles.placeholder}>
                            <div style={styles.placeholderIcon}>🔮</div>
                            <p>Configure parameters and run a simulation to see predictions</p>
                            <p style={{ fontSize: '12px', opacity: 0.6 }}>Try different scenarios to find the optimal operating conditions</p>
                        </div>
                    )}
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
        color: '#ffffff'
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
    content: {
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '350px 1fr',
        gap: '20px',
        padding: '20px',
        overflow: 'hidden'
    },
    controlsPanel: {
        background: 'rgba(0,20,40,0.8)',
        border: '1px solid rgba(0,240,255,0.3)',
        borderRadius: '12px',
        padding: '16px',
        overflowY: 'auto'
    },
    sectionTitle: {
        margin: '0 0 16px 0',
        color: '#00f0ff',
        fontSize: '16px',
        borderBottom: '1px solid rgba(0,240,255,0.2)',
        paddingBottom: '8px'
    },
    control: {
        marginBottom: '16px'
    },
    label: {
        display: 'block',
        marginBottom: '6px',
        fontSize: '13px',
        color: '#88cccc'
    },
    select: {
        width: '100%',
        padding: '10px',
        background: 'rgba(0,40,60,0.8)',
        border: '1px solid rgba(0,240,255,0.3)',
        borderRadius: '6px',
        color: '#00f0ff',
        fontSize: '14px'
    },
    slider: {
        width: '100%',
        height: '6px',
        appearance: 'none',
        background: 'rgba(0,240,255,0.2)',
        borderRadius: '3px',
        cursor: 'pointer'
    },
    presetsSection: {
        marginTop: '20px',
        paddingTop: '16px',
        borderTop: '1px solid rgba(0,240,255,0.2)'
    },
    presetButtons: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        marginTop: '8px'
    },
    presetBtn: {
        padding: '6px 12px',
        background: 'rgba(0,240,255,0.1)',
        border: '1px solid rgba(0,240,255,0.3)',
        borderRadius: '16px',
        color: '#00f0ff',
        fontSize: '11px',
        cursor: 'pointer'
    },
    runBtn: {
        width: '100%',
        padding: '14px',
        marginTop: '20px',
        background: 'linear-gradient(135deg, #00ff88 0%, #00f0ff 100%)',
        border: 'none',
        borderRadius: '8px',
        color: '#000',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: 'pointer'
    },
    resultsPanel: {
        background: 'rgba(0,20,40,0.6)',
        border: '1px solid rgba(0,240,255,0.2)',
        borderRadius: '12px',
        padding: '20px',
        overflowY: 'auto'
    },
    summaryCards: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
        marginBottom: '20px'
    },
    card: {
        background: 'rgba(0,40,60,0.5)',
        border: '1px solid rgba(0,240,255,0.3)',
        borderRadius: '8px',
        padding: '16px',
        textAlign: 'center'
    },
    cardLabel: {
        fontSize: '12px',
        color: '#88cccc',
        marginBottom: '8px'
    },
    cardValue: {
        fontSize: '28px',
        fontWeight: 'bold'
    },
    chartContainer: {
        marginBottom: '20px'
    },
    chartTitle: {
        margin: '0 0 12px 0',
        color: '#00f0ff',
        fontSize: '14px'
    },
    recommendations: {
        marginTop: '20px',
        padding: '16px',
        background: 'rgba(0,40,60,0.5)',
        borderRadius: '8px'
    },
    recList: {
        margin: 0,
        paddingLeft: '20px'
    },
    recItem: {
        marginBottom: '8px',
        fontSize: '13px',
        color: '#cccccc'
    },
    placeholder: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        textAlign: 'center',
        color: '#88cccc'
    },
    placeholderIcon: {
        fontSize: '80px',
        marginBottom: '20px'
    }
};

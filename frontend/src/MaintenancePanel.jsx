import React, { useState, useEffect } from 'react';

const API_BASE = 'http://127.0.0.1:8000';

export default function MaintenancePanel({ onClose }) {
    const [predictions, setPredictions] = useState([]);
    const [summary, setSummary] = useState(null);
    const [inventory, setInventory] = useState([]);
    const [lowStock, setLowStock] = useState([]);
    const [selectedMachine, setSelectedMachine] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('predictions');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load predictions
            const predRes = await fetch(`${API_BASE}/maintenance/predictions`);
            const predData = await predRes.json();
            setPredictions(predData.predictions || []);
            setSummary(predData.summary);

            // Load inventory
            const invRes = await fetch(`${API_BASE}/maintenance/parts-inventory`);
            const invData = await invRes.json();
            setInventory(invData.inventory || []);
            setLowStock(invData.low_stock_alerts || []);
        } catch (err) {
            console.error('Failed to load maintenance data:', err);
        }
        setLoading(false);
    };

    const loadHistory = async (machineId) => {
        try {
            const res = await fetch(`${API_BASE}/maintenance/history/${machineId}`);
            const data = await res.json();
            setHistory(data.history || []);
            setSelectedMachine(machineId);
        } catch (err) {
            console.error('Failed to load history:', err);
        }
    };

    const getPriorityColor = (priority) => {
        const colors = {
            critical: '#ff3b3b',
            high: '#ff9500',
            medium: '#ffd60a',
            low: '#00ff88'
        };
        return colors[priority] || '#00f0ff';
    };

    const getPriorityIcon = (priority) => {
        const icons = { critical: '🚨', high: '⚠️', medium: '📋', low: '✅' };
        return icons[priority] || '📋';
    };

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <h2 style={styles.title}>🔧 Predictive Maintenance</h2>
                <button onClick={onClose} style={styles.closeBtn}>✕</button>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div style={styles.summaryCards}>
                    <div style={{ ...styles.summaryCard, borderColor: '#ff3b3b' }}>
                        <div style={styles.cardIcon}>🚨</div>
                        <div style={styles.cardValue}>{summary.critical_machines}</div>
                        <div style={styles.cardLabel}>Critical</div>
                    </div>
                    <div style={{ ...styles.summaryCard, borderColor: '#ff9500' }}>
                        <div style={styles.cardIcon}>⚠️</div>
                        <div style={styles.cardValue}>{summary.high_priority}</div>
                        <div style={styles.cardLabel}>High Priority</div>
                    </div>
                    <div style={{ ...styles.summaryCard, borderColor: '#00f0ff' }}>
                        <div style={styles.cardIcon}>💰</div>
                        <div style={styles.cardValue}>${Math.round(summary.estimated_urgent_cost)}</div>
                        <div style={styles.cardLabel}>Urgent Cost Est.</div>
                    </div>
                    <div style={{ ...styles.summaryCard, borderColor: lowStock.length > 0 ? '#ff9500' : '#00ff88' }}>
                        <div style={styles.cardIcon}>📦</div>
                        <div style={styles.cardValue}>{lowStock.length}</div>
                        <div style={styles.cardLabel}>Low Stock Parts</div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div style={styles.tabs}>
                <button
                    onClick={() => setActiveTab('predictions')}
                    style={{ ...styles.tab, ...(activeTab === 'predictions' ? styles.activeTab : {}) }}
                >
                    📊 Predictions
                </button>
                <button
                    onClick={() => setActiveTab('inventory')}
                    style={{ ...styles.tab, ...(activeTab === 'inventory' ? styles.activeTab : {}) }}
                >
                    📦 Parts Inventory
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    style={{ ...styles.tab, ...(activeTab === 'history' ? styles.activeTab : {}) }}
                >
                    📜 History
                </button>
            </div>

            {/* Content */}
            <div style={styles.content}>
                {loading ? (
                    <div style={styles.loading}>Loading maintenance data...</div>
                ) : activeTab === 'predictions' ? (
                    <div style={styles.predictionsList}>
                        {predictions.map((pred, i) => (
                            <div
                                key={i}
                                style={{ ...styles.predictionCard, borderLeftColor: getPriorityColor(pred.priority) }}
                                onClick={() => loadHistory(pred.machine_id)}
                            >
                                <div style={styles.predHeader}>
                                    <span style={styles.predIcon}>{getPriorityIcon(pred.priority)}</span>
                                    <span style={styles.predMachine}>{pred.machine_id}</span>
                                    <span style={{ ...styles.predPriority, color: getPriorityColor(pred.priority) }}>
                                        {pred.priority.toUpperCase()}
                                    </span>
                                </div>
                                <div style={styles.predBody}>
                                    <div style={styles.predStat}>
                                        <span style={styles.statLabel}>Days Until Failure</span>
                                        <span style={{ ...styles.statValue, color: pred.days_until_failure <= 7 ? '#ff3b3b' : '#00ff88' }}>
                                            {pred.days_until_failure}
                                        </span>
                                    </div>
                                    <div style={styles.predStat}>
                                        <span style={styles.statLabel}>Downtime Est.</span>
                                        <span style={styles.statValue}>{pred.estimated_downtime_hours}h</span>
                                    </div>
                                    <div style={styles.predStat}>
                                        <span style={styles.statLabel}>Cost Est.</span>
                                        <span style={styles.statValue}>${Math.round(pred.cost_estimate)}</span>
                                    </div>
                                    <div style={styles.predStat}>
                                        <span style={styles.statLabel}>Confidence</span>
                                        <span style={styles.statValue}>{Math.round(pred.confidence * 100)}%</span>
                                    </div>
                                </div>
                                <div style={styles.predAction}>{pred.recommended_action}</div>
                                <div style={styles.predParts}>
                                    <span style={styles.partsLabel}>Parts Needed: </span>
                                    {pred.parts_needed.join(', ')}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : activeTab === 'inventory' ? (
                    <div style={styles.inventoryGrid}>
                        {inventory.map((part, i) => (
                            <div
                                key={i}
                                style={{
                                    ...styles.partCard,
                                    borderColor: part.in_stock <= part.reorder_point ? '#ff9500' : 'rgba(0,240,255,0.3)'
                                }}
                            >
                                <div style={styles.partName}>{part.name}</div>
                                <div style={styles.partStats}>
                                    <div style={styles.partStat}>
                                        <span style={styles.partLabel}>In Stock</span>
                                        <span style={{
                                            ...styles.partValue,
                                            color: part.in_stock <= part.reorder_point ? '#ff9500' : '#00ff88'
                                        }}>
                                            {part.in_stock}
                                        </span>
                                    </div>
                                    <div style={styles.partStat}>
                                        <span style={styles.partLabel}>Reorder At</span>
                                        <span style={styles.partValue}>{part.reorder_point}</span>
                                    </div>
                                    <div style={styles.partStat}>
                                        <span style={styles.partLabel}>Lead Time</span>
                                        <span style={styles.partValue}>{part.lead_time_days}d</span>
                                    </div>
                                </div>
                                {part.in_stock <= part.reorder_point && (
                                    <div style={styles.reorderAlert}>⚠️ Reorder Required</div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={styles.historySection}>
                        {selectedMachine ? (
                            <>
                                <h3 style={styles.historyTitle}>Maintenance History: {selectedMachine}</h3>
                                <div style={styles.historyList}>
                                    {history.map((h, i) => (
                                        <div key={i} style={styles.historyItem}>
                                            <div style={styles.historyDate}>{h.date}</div>
                                            <div style={styles.historyAction}>{h.action}</div>
                                            <div style={styles.historyMeta}>
                                                <span>👤 {h.technician}</span>
                                                <span>⏱️ {h.duration_hours.toFixed(1)}h</span>
                                                <span>💰 ${Math.round(h.cost)}</span>
                                            </div>
                                            <div style={styles.historyNotes}>{h.notes}</div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div style={styles.placeholder}>
                                <span style={{ fontSize: '60px' }}>📜</span>
                                <p>Select a machine from Predictions to view history</p>
                            </div>
                        )}
                    </div>
                )}
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
    summaryCards: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        padding: '16px 24px'
    },
    summaryCard: {
        background: 'rgba(0,40,60,0.5)',
        border: '1px solid',
        borderRadius: '12px',
        padding: '16px',
        textAlign: 'center'
    },
    cardIcon: { fontSize: '28px', marginBottom: '8px' },
    cardValue: { fontSize: '32px', fontWeight: 'bold', color: '#ffffff' },
    cardLabel: { fontSize: '12px', color: '#88cccc', marginTop: '4px' },
    tabs: {
        display: 'flex',
        gap: '8px',
        padding: '0 24px',
        borderBottom: '1px solid rgba(0,240,255,0.2)'
    },
    tab: {
        background: 'transparent',
        border: 'none',
        color: '#88cccc',
        padding: '12px 20px',
        fontSize: '14px',
        cursor: 'pointer',
        borderBottom: '2px solid transparent',
        marginBottom: '-1px'
    },
    activeTab: {
        color: '#00f0ff',
        borderBottomColor: '#00f0ff'
    },
    content: {
        flex: 1,
        padding: '20px 24px',
        overflowY: 'auto'
    },
    loading: {
        textAlign: 'center',
        padding: '40px',
        color: '#88cccc'
    },
    predictionsList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
    },
    predictionCard: {
        background: 'rgba(0,40,60,0.5)',
        border: '1px solid rgba(0,240,255,0.3)',
        borderLeft: '4px solid',
        borderRadius: '8px',
        padding: '16px',
        cursor: 'pointer',
        transition: 'background 0.2s'
    },
    predHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '12px'
    },
    predIcon: { fontSize: '24px' },
    predMachine: { fontSize: '18px', fontWeight: 'bold', color: '#00f0ff' },
    predPriority: { marginLeft: 'auto', fontWeight: 'bold', fontSize: '12px' },
    predBody: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        marginBottom: '12px'
    },
    predStat: { textAlign: 'center' },
    statLabel: { display: 'block', fontSize: '10px', color: '#88cccc', marginBottom: '4px' },
    statValue: { fontSize: '18px', fontWeight: 'bold' },
    predAction: {
        background: 'rgba(0,240,255,0.1)',
        padding: '10px',
        borderRadius: '6px',
        fontSize: '13px',
        marginBottom: '8px'
    },
    predParts: { fontSize: '12px', color: '#88cccc' },
    partsLabel: { color: '#00f0ff' },
    inventoryGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '16px'
    },
    partCard: {
        background: 'rgba(0,40,60,0.5)',
        border: '1px solid',
        borderRadius: '8px',
        padding: '16px'
    },
    partName: { fontSize: '16px', fontWeight: 'bold', marginBottom: '12px', color: '#00f0ff' },
    partStats: { display: 'flex', justifyContent: 'space-between' },
    partStat: { textAlign: 'center' },
    partLabel: { display: 'block', fontSize: '10px', color: '#88cccc' },
    partValue: { fontSize: '18px', fontWeight: 'bold' },
    reorderAlert: {
        marginTop: '12px',
        padding: '6px',
        background: 'rgba(255,149,0,0.2)',
        borderRadius: '4px',
        textAlign: 'center',
        fontSize: '12px',
        color: '#ff9500'
    },
    historySection: { padding: '10px' },
    historyTitle: { color: '#00f0ff', marginBottom: '16px' },
    historyList: { display: 'flex', flexDirection: 'column', gap: '12px' },
    historyItem: {
        background: 'rgba(0,40,60,0.5)',
        border: '1px solid rgba(0,240,255,0.2)',
        borderRadius: '8px',
        padding: '14px'
    },
    historyDate: { fontSize: '12px', color: '#00f0ff', marginBottom: '4px' },
    historyAction: { fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' },
    historyMeta: { display: 'flex', gap: '16px', fontSize: '13px', color: '#88cccc', marginBottom: '8px' },
    historyNotes: { fontSize: '12px', color: '#aaaaaa', fontStyle: 'italic' },
    placeholder: {
        textAlign: 'center',
        padding: '60px',
        color: '#88cccc'
    }
};

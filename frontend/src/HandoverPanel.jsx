import React, { useState, useEffect } from 'react';

const API_BASE = 'http://127.0.0.1:8000';

export default function HandoverPanel({ onClose }) {
    const [notes, setNotes] = useState([]);
    const [summary, setSummary] = useState(null);
    const [showAddNote, setShowAddNote] = useState(false);
    const [newNote, setNewNote] = useState({
        machine_id: '',
        priority: 'medium',
        message: ''
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [notesRes, summaryRes] = await Promise.all([
                fetch(`${API_BASE}/handover/notes`),
                fetch(`${API_BASE}/handover/summary`)
            ]);

            const notesData = await notesRes.json();
            const summaryData = await summaryRes.json();

            setNotes(notesData.notes || []);
            setSummary(summaryData);
        } catch (err) {
            console.error('Failed to load handover data:', err);
        }
        setLoading(false);
    };

    const submitNote = async () => {
        if (!newNote.message.trim()) return;

        try {
            const response = await fetch(`${API_BASE}/handover/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newNote,
                    author: 'Current User',
                    shift: new Date().getHours() >= 6 && new Date().getHours() < 18 ? 'day' : 'night'
                })
            });

            if (response.ok) {
                loadData();
                setNewNote({ machine_id: '', priority: 'medium', message: '' });
                setShowAddNote(false);
            }
        } catch (err) {
            console.error('Failed to submit note:', err);
        }
    };

    const acknowledgeNote = async (noteId) => {
        try {
            await fetch(`${API_BASE}/handover/notes/${noteId}/acknowledge?acknowledged_by=Current User`, {
                method: 'POST'
            });
            loadData();
        } catch (err) {
            console.error('Failed to acknowledge:', err);
        }
    };

    const getPriorityColor = (priority) => ({
        critical: '#ff3b3b',
        high: '#ff9500',
        medium: '#ffd60a',
        low: '#00ff88'
    }[priority] || '#00f0ff');

    const getPriorityIcon = (priority) => ({
        critical: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🟢'
    }[priority] || '⚪');

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <h2 style={styles.title}>💬 Shift Handover Notes</h2>
                <div style={styles.headerRight}>
                    <button onClick={() => setShowAddNote(true)} style={styles.addBtn}>+ Add Note</button>
                    <button onClick={onClose} style={styles.closeBtn}>✕</button>
                </div>
            </div>

            {/* Shift Summary */}
            {summary && (
                <div style={styles.summaryBanner}>
                    <div style={styles.shiftInfo}>
                        <span style={styles.shiftLabel}>CURRENT SHIFT</span>
                        <span style={styles.shiftValue}>{summary.current_shift?.toUpperCase()}</span>
                    </div>
                    <div style={styles.divider}></div>
                    <div style={styles.summaryStats}>
                        <div style={styles.stat}>
                            <span style={styles.statValue}>{summary.notes_count}</span>
                            <span style={styles.statLabel}>Notes</span>
                        </div>
                        <div style={styles.stat}>
                            <span style={{ ...styles.statValue, color: '#ff3b3b' }}>{summary.critical_issues}</span>
                            <span style={styles.statLabel}>Critical</span>
                        </div>
                        <div style={styles.stat}>
                            <span style={styles.statValue}>{summary.machines_mentioned?.length || 0}</span>
                            <span style={styles.statLabel}>Machines</span>
                        </div>
                    </div>
                    <div style={styles.summaryText}>{summary.summary_text}</div>
                </div>
            )}

            {/* Notes List */}
            <div style={styles.content}>
                {loading ? (
                    <div style={styles.loading}>Loading notes...</div>
                ) : notes.length === 0 ? (
                    <div style={styles.empty}>
                        <span style={{ fontSize: '60px' }}>📝</span>
                        <p>No handover notes yet</p>
                    </div>
                ) : (
                    <div style={styles.notesList}>
                        {notes.map((note, i) => (
                            <div
                                key={i}
                                style={{
                                    ...styles.noteCard,
                                    borderLeftColor: getPriorityColor(note.priority),
                                    opacity: note.acknowledged ? 0.7 : 1
                                }}
                            >
                                <div style={styles.noteHeader}>
                                    <span style={styles.noteIcon}>{getPriorityIcon(note.priority)}</span>
                                    {note.machine_id && (
                                        <span style={styles.noteMachine}>{note.machine_id}</span>
                                    )}
                                    <span style={{ ...styles.notePriority, color: getPriorityColor(note.priority) }}>
                                        {note.priority.toUpperCase()}
                                    </span>
                                    <span style={styles.noteTime}>
                                        {new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>

                                <div style={styles.noteMessage}>{note.message}</div>

                                <div style={styles.noteFooter}>
                                    <span style={styles.noteAuthor}>
                                        👤 {note.author} • {note.shift} shift
                                    </span>
                                    {note.acknowledged ? (
                                        <span style={styles.acknowledged}>
                                            ✓ Acknowledged by {note.acknowledged_by}
                                        </span>
                                    ) : (
                                        <button
                                            onClick={() => acknowledgeNote(note.id)}
                                            style={styles.ackBtn}
                                        >
                                            ✓ Acknowledge
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Note Modal */}
            {showAddNote && (
                <div style={styles.modal}>
                    <div style={styles.modalContent}>
                        <h3 style={styles.modalTitle}>📝 Add Handover Note</h3>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Machine (Optional)</label>
                            <select
                                value={newNote.machine_id}
                                onChange={e => setNewNote(n => ({ ...n, machine_id: e.target.value }))}
                                style={styles.select}
                            >
                                <option value="">General Note</option>
                                <option value="MILL-01">MILL-01</option>
                                <option value="LATHE-02">LATHE-02</option>
                                <option value="PRESS-03">PRESS-03</option>
                                <option value="CNC-04">CNC-04</option>
                                <option value="DRILL-05">DRILL-05</option>
                            </select>
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Priority</label>
                            <div style={styles.priorityBtns}>
                                {['low', 'medium', 'high', 'critical'].map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setNewNote(n => ({ ...n, priority: p }))}
                                        style={{
                                            ...styles.priorityBtn,
                                            background: newNote.priority === p ? getPriorityColor(p) : 'transparent',
                                            borderColor: getPriorityColor(p),
                                            color: newNote.priority === p ? '#000' : getPriorityColor(p)
                                        }}
                                    >
                                        {getPriorityIcon(p)} {p.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Message</label>
                            <textarea
                                value={newNote.message}
                                onChange={e => setNewNote(n => ({ ...n, message: e.target.value }))}
                                placeholder="Leave a note for the next shift..."
                                style={styles.textarea}
                                rows={4}
                            />
                        </div>

                        <div style={styles.modalButtons}>
                            <button onClick={() => setShowAddNote(false)} style={styles.cancelBtn}>Cancel</button>
                            <button onClick={submitNote} style={styles.submitBtn}>Submit Note</button>
                        </div>
                    </div>
                </div>
            )}
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
    headerRight: { display: 'flex', gap: '12px' },
    addBtn: {
        background: 'linear-gradient(135deg, #00ff88, #00f0ff)',
        border: 'none',
        color: '#000',
        padding: '10px 20px',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold'
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
    summaryBanner: {
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        padding: '20px 24px',
        background: 'rgba(0,40,60,0.5)',
        borderBottom: '1px solid rgba(0,240,255,0.2)'
    },
    shiftInfo: { textAlign: 'center' },
    shiftLabel: { display: 'block', fontSize: '10px', color: '#88cccc' },
    shiftValue: { fontSize: '24px', fontWeight: 'bold', color: '#00f0ff' },
    divider: { width: '1px', height: '40px', background: 'rgba(0,240,255,0.3)' },
    summaryStats: { display: 'flex', gap: '24px' },
    stat: { textAlign: 'center' },
    statValue: { display: 'block', fontSize: '24px', fontWeight: 'bold' },
    statLabel: { fontSize: '10px', color: '#88cccc' },
    summaryText: { flex: 1, fontSize: '13px', color: '#88cccc' },
    content: {
        flex: 1,
        padding: '20px 24px',
        overflowY: 'auto'
    },
    loading: { textAlign: 'center', padding: '40px', color: '#88cccc' },
    empty: { textAlign: 'center', padding: '60px', color: '#88cccc' },
    notesList: { display: 'flex', flexDirection: 'column', gap: '16px' },
    noteCard: {
        background: 'rgba(0,40,60,0.5)',
        border: '1px solid rgba(0,240,255,0.2)',
        borderLeft: '4px solid',
        borderRadius: '8px',
        padding: '16px'
    },
    noteHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '10px'
    },
    noteIcon: { fontSize: '18px' },
    noteMachine: {
        background: 'rgba(0,240,255,0.2)',
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '12px',
        color: '#00f0ff'
    },
    notePriority: { fontSize: '11px', fontWeight: 'bold' },
    noteTime: { marginLeft: 'auto', fontSize: '12px', color: '#888' },
    noteMessage: { fontSize: '15px', lineHeight: 1.5, marginBottom: '12px' },
    noteFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    noteAuthor: { fontSize: '12px', color: '#888' },
    acknowledged: { fontSize: '12px', color: '#00ff88' },
    ackBtn: {
        background: 'transparent',
        border: '1px solid #00ff88',
        color: '#00ff88',
        padding: '6px 16px',
        borderRadius: '16px',
        cursor: 'pointer',
        fontSize: '12px'
    },
    modal: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100
    },
    modalContent: {
        background: 'rgba(10,30,50,0.98)',
        border: '1px solid rgba(0,240,255,0.3)',
        borderRadius: '16px',
        padding: '24px',
        width: '500px',
        maxWidth: '90%'
    },
    modalTitle: { margin: '0 0 20px 0', color: '#00f0ff' },
    formGroup: { marginBottom: '16px' },
    label: { display: 'block', marginBottom: '8px', fontSize: '13px', color: '#88cccc' },
    select: {
        width: '100%',
        padding: '12px',
        background: 'rgba(0,40,60,0.8)',
        border: '1px solid rgba(0,240,255,0.3)',
        borderRadius: '8px',
        color: '#00f0ff',
        fontSize: '14px'
    },
    priorityBtns: { display: 'flex', gap: '8px' },
    priorityBtn: {
        flex: 1,
        padding: '10px',
        border: '1px solid',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '11px',
        fontWeight: 'bold'
    },
    textarea: {
        width: '100%',
        padding: '12px',
        background: 'rgba(0,40,60,0.8)',
        border: '1px solid rgba(0,240,255,0.3)',
        borderRadius: '8px',
        color: '#ffffff',
        fontSize: '14px',
        resize: 'vertical'
    },
    modalButtons: { display: 'flex', gap: '12px', marginTop: '20px' },
    cancelBtn: {
        flex: 1,
        padding: '12px',
        background: 'transparent',
        border: '1px solid #666',
        color: '#888',
        borderRadius: '8px',
        cursor: 'pointer'
    },
    submitBtn: {
        flex: 1,
        padding: '12px',
        background: 'linear-gradient(135deg, #00ff88, #00f0ff)',
        border: 'none',
        color: '#000',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold'
    }
};

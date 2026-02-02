import React, { useState, useEffect } from 'react';

const API_BASE = 'http://127.0.0.1:8000';

export default function LeaderboardPanel({ onClose }) {
    const [leaderboard, setLeaderboard] = useState([]);
    const [achievements, setAchievements] = useState([]);
    const [challenge, setChallenge] = useState(null);
    const [activeTab, setActiveTab] = useState('leaderboard');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [lbRes, achRes, chRes] = await Promise.all([
                fetch(`${API_BASE}/gamification/leaderboard`),
                fetch(`${API_BASE}/gamification/achievements`),
                fetch(`${API_BASE}/gamification/weekly-challenge`)
            ]);

            const lbData = await lbRes.json();
            const achData = await achRes.json();
            const chData = await chRes.json();

            setLeaderboard(lbData.leaderboard || []);
            setAchievements(achData.achievements || []);
            setChallenge(chData.current_challenge);
        } catch (err) {
            console.error('Failed to load gamification data:', err);
        }
        setLoading(false);
    };

    const getRankStyle = (rank) => {
        if (rank === 1) return { color: '#ffd700', icon: '🥇' };
        if (rank === 2) return { color: '#c0c0c0', icon: '🥈' };
        if (rank === 3) return { color: '#cd7f32', icon: '🥉' };
        return { color: '#88cccc', icon: `#${rank}` };
    };

    const getRarityColor = (rarity) => ({
        common: '#888',
        rare: '#3b82f6',
        epic: '#a855f7',
        legendary: '#ffd700'
    }[rarity] || '#888');

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <h2 style={styles.title}>🏆 Leaderboard & Achievements</h2>
                <button onClick={onClose} style={styles.closeBtn}>✕</button>
            </div>

            {/* Weekly Challenge Banner */}
            {challenge && (
                <div style={styles.challengeBanner}>
                    <div style={styles.challengeIcon}>🎯</div>
                    <div style={styles.challengeInfo}>
                        <div style={styles.challengeName}>WEEKLY CHALLENGE: {challenge.name}</div>
                        <div style={styles.challengeDesc}>{challenge.description}</div>
                        <div style={styles.progressBar}>
                            <div style={{ ...styles.progressFill, width: `${(challenge.progress / challenge.target) * 100}%` }}></div>
                        </div>
                        <div style={styles.progressText}>{challenge.progress}/{challenge.target}</div>
                    </div>
                    <div style={styles.challengeReward}>
                        <span style={styles.rewardPoints}>+{challenge.reward}</span>
                        <span style={styles.rewardLabel}>points</span>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div style={styles.tabs}>
                <button
                    onClick={() => setActiveTab('leaderboard')}
                    style={{ ...styles.tab, ...(activeTab === 'leaderboard' ? styles.activeTab : {}) }}
                >
                    🏆 Leaderboard
                </button>
                <button
                    onClick={() => setActiveTab('achievements')}
                    style={{ ...styles.tab, ...(activeTab === 'achievements' ? styles.activeTab : {}) }}
                >
                    🎖️ Achievements
                </button>
            </div>

            {/* Content */}
            <div style={styles.content}>
                {loading ? (
                    <div style={styles.loading}>Loading...</div>
                ) : activeTab === 'leaderboard' ? (
                    <div style={styles.leaderboardList}>
                        {leaderboard.map((player, i) => {
                            const rankStyle = getRankStyle(player.rank);
                            return (
                                <div key={i} style={{
                                    ...styles.playerCard,
                                    background: player.rank <= 3 ? `linear-gradient(90deg, rgba(${player.rank === 1 ? '255,215,0' : player.rank === 2 ? '192,192,192' : '205,127,50'},0.1) 0%, transparent 50%)` : 'transparent'
                                }}>
                                    <div style={styles.rank}>
                                        <span style={{ color: rankStyle.color, fontSize: '24px' }}>{rankStyle.icon}</span>
                                    </div>
                                    <div style={styles.avatar}>{player.avatar}</div>
                                    <div style={styles.playerInfo}>
                                        <div style={styles.playerName}>{player.name}</div>
                                        <div style={styles.playerStats}>
                                            <span>🔧 {player.issues_resolved} resolved</span>
                                            <span>⚡ {player.response_time_avg}s avg</span>
                                            <span>🔥 {player.streak_days} day streak</span>
                                        </div>
                                    </div>
                                    <div style={styles.playerPoints}>
                                        <div style={styles.pointsValue}>{player.points.toLocaleString()}</div>
                                        <div style={styles.pointsLabel}>points</div>
                                    </div>
                                    <div style={styles.achievementCount}>
                                        <span style={styles.achCountValue}>{player.achievements}</span>
                                        <span style={styles.achCountLabel}>🎖️</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div style={styles.achievementsGrid}>
                        {achievements.map((ach, i) => (
                            <div key={i} style={{
                                ...styles.achievementCard,
                                borderColor: getRarityColor(ach.rarity)
                            }}>
                                <div style={styles.achIcon}>{ach.icon}</div>
                                <div style={styles.achName}>{ach.name}</div>
                                <div style={styles.achDesc}>{ach.description}</div>
                                <div style={styles.achBottom}>
                                    <span style={{ ...styles.achRarity, color: getRarityColor(ach.rarity) }}>
                                        {ach.rarity.toUpperCase()}
                                    </span>
                                    <span style={styles.achPoints}>+{ach.points} pts</span>
                                </div>
                            </div>
                        ))}
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
        color: '#ffd700',
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
    challengeBanner: {
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        padding: '20px 24px',
        background: 'linear-gradient(90deg, rgba(168,85,247,0.2) 0%, rgba(0,240,255,0.1) 100%)',
        borderBottom: '1px solid rgba(168,85,247,0.3)'
    },
    challengeIcon: { fontSize: '48px' },
    challengeInfo: { flex: 1 },
    challengeName: { fontSize: '16px', fontWeight: 'bold', color: '#a855f7', marginBottom: '4px' },
    challengeDesc: { fontSize: '13px', color: '#88cccc', marginBottom: '8px' },
    progressBar: {
        height: '8px',
        background: 'rgba(0,0,0,0.4)',
        borderRadius: '4px',
        overflow: 'hidden',
        width: '300px'
    },
    progressFill: {
        height: '100%',
        background: 'linear-gradient(90deg, #a855f7, #00f0ff)',
        borderRadius: '4px',
        transition: 'width 0.5s'
    },
    progressText: { fontSize: '12px', color: '#88cccc', marginTop: '4px' },
    challengeReward: { textAlign: 'center' },
    rewardPoints: { display: 'block', fontSize: '28px', fontWeight: 'bold', color: '#00ff88' },
    rewardLabel: { fontSize: '12px', color: '#88cccc' },
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
        color: '#ffd700',
        borderBottomColor: '#ffd700'
    },
    content: {
        flex: 1,
        padding: '20px 24px',
        overflowY: 'auto'
    },
    loading: { textAlign: 'center', padding: '40px', color: '#88cccc' },
    leaderboardList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    },
    playerCard: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '16px 20px',
        background: 'rgba(0,40,60,0.5)',
        border: '1px solid rgba(0,240,255,0.2)',
        borderRadius: '12px'
    },
    rank: { width: '50px', textAlign: 'center' },
    avatar: { fontSize: '36px' },
    playerInfo: { flex: 1 },
    playerName: { fontSize: '18px', fontWeight: 'bold', color: '#00f0ff', marginBottom: '4px' },
    playerStats: { display: 'flex', gap: '16px', fontSize: '12px', color: '#88cccc' },
    playerPoints: { textAlign: 'center' },
    pointsValue: { fontSize: '24px', fontWeight: 'bold', color: '#00ff88' },
    pointsLabel: { fontSize: '10px', color: '#88cccc' },
    achievementCount: { textAlign: 'center' },
    achCountValue: { fontSize: '20px', fontWeight: 'bold', color: '#ffd700' },
    achCountLabel: { fontSize: '16px' },
    achievementsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '16px'
    },
    achievementCard: {
        background: 'rgba(0,40,60,0.5)',
        border: '2px solid',
        borderRadius: '12px',
        padding: '20px',
        textAlign: 'center'
    },
    achIcon: { fontSize: '40px', marginBottom: '10px' },
    achName: { fontSize: '16px', fontWeight: 'bold', marginBottom: '6px' },
    achDesc: { fontSize: '12px', color: '#88cccc', marginBottom: '12px' },
    achBottom: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    achRarity: { fontSize: '10px', fontWeight: 'bold' },
    achPoints: { fontSize: '14px', color: '#00ff88' }
};

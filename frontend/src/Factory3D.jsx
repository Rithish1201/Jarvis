import React, { useRef, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';

// Simple Machine 3D Model
function Machine({ machine, position, onClick, isSelected }) {
    const meshRef = useRef();
    const [hovered, setHovered] = useState(false);

    const statusColors = {
        'Healthy': '#00ff88',
        'Warning': '#ff9500',
        'Critical': '#ff3b3b'
    };

    const color = statusColors[machine.status] || '#00f0ff';
    const health = machine.health_score || 50;

    useFrame((state) => {
        if (meshRef.current) {
            const pulse = machine.status === 'Critical'
                ? Math.sin(state.clock.elapsedTime * 4) * 0.1 + 1
                : 1;
            meshRef.current.scale.y = pulse;
        }
    });

    return (
        <group position={position}>
            <mesh
                ref={meshRef}
                onClick={(e) => { e.stopPropagation(); onClick(machine); }}
                onPointerOver={() => setHovered(true)}
                onPointerOut={() => setHovered(false)}
            >
                <boxGeometry args={[1.5, 1 + (health / 100), 1.5]} />
                <meshStandardMaterial
                    color={hovered ? '#ffffff' : color}
                    emissive={color}
                    emissiveIntensity={hovered ? 0.5 : 0.2}
                />
            </mesh>

            {/* Status light */}
            <mesh position={[0, 1.2, 0]}>
                <sphereGeometry args={[0.15, 16, 16]} />
                <meshBasicMaterial color={color} />
            </mesh>

            {/* Label */}
            <Text
                position={[0, 2, 0]}
                fontSize={0.3}
                color="#00f0ff"
                anchorX="center"
            >
                {machine.machine_id}
            </Text>

            {/* Selection indicator */}
            {isSelected && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
                    <ringGeometry args={[1.2, 1.4, 32]} />
                    <meshBasicMaterial color="#00f0ff" transparent opacity={0.7} />
                </mesh>
            )}
        </group>
    );
}

// Floor grid
function Floor() {
    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
            <planeGeometry args={[30, 30]} />
            <meshStandardMaterial color="#0a1628" />
        </mesh>
    );
}

// Main 3D Factory Component
export default function Factory3D({ machines = [], onMachineSelect, selectedMachine, onBack }) {
    const getMachinePosition = (index) => {
        const cols = 3;
        const spacing = 5;
        const x = (index % cols - 1) * spacing;
        const z = Math.floor(index / cols) * spacing - 3;
        return [x, 0, z];
    };

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <button onClick={onBack} style={styles.backBtn}>← Back to Dashboard</button>
                <h2 style={styles.title}>🏭 3D Factory Floor</h2>
                <div style={styles.legend}>
                    <span style={{ color: '#00ff88' }}>● Healthy</span>
                    <span style={{ color: '#ff9500' }}>● Warning</span>
                    <span style={{ color: '#ff3b3b' }}>● Critical</span>
                </div>
            </div>

            {/* 3D Canvas */}
            <div style={styles.canvasContainer}>
                <Canvas
                    camera={{ position: [10, 8, 10], fov: 50 }}
                    style={{ background: '#0a1628' }}
                >
                    <Suspense fallback={null}>
                        <ambientLight intensity={0.4} />
                        <directionalLight position={[10, 10, 5]} intensity={1} />
                        <pointLight position={[-5, 5, -5]} intensity={0.5} color="#ff00ff" />

                        <Floor />

                        <gridHelper args={[30, 30, '#00f0ff', '#0a3040']} position={[0, -0.99, 0]} />

                        {machines.map((machine, index) => (
                            <Machine
                                key={machine.machine_id}
                                machine={machine}
                                position={getMachinePosition(index)}
                                onClick={onMachineSelect}
                                isSelected={selectedMachine?.machine_id === machine.machine_id}
                            />
                        ))}

                        <OrbitControls
                            enablePan={true}
                            enableZoom={true}
                            minPolarAngle={0.3}
                            maxPolarAngle={Math.PI / 2.2}
                        />
                    </Suspense>
                </Canvas>
            </div>

            {/* Selected Machine Info */}
            {selectedMachine && (
                <div style={styles.infoPanel}>
                    <h3 style={styles.infoTitle}>{selectedMachine.machine_id}</h3>
                    <div style={styles.infoGrid}>
                        <div>
                            <span style={styles.label}>Status</span>
                            <span style={{
                                color: selectedMachine.status === 'Healthy' ? '#00ff88' :
                                    selectedMachine.status === 'Warning' ? '#ff9500' : '#ff3b3b',
                                fontWeight: 'bold'
                            }}>{selectedMachine.status}</span>
                        </div>
                        <div>
                            <span style={styles.label}>Temperature</span>
                            <span style={styles.value}>{selectedMachine.temperature}°C</span>
                        </div>
                        <div>
                            <span style={styles.label}>Health</span>
                            <span style={styles.value}>{selectedMachine.health_score}%</span>
                        </div>
                        <div>
                            <span style={styles.label}>Vibration</span>
                            <span style={styles.value}>{selectedMachine.vibration?.toFixed(3)}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Instructions */}
            <div style={styles.instructions}>
                🖱️ Drag to rotate • Scroll to zoom • Click machine for details
            </div>
        </div>
    );
}

const styles = {
    container: {
        width: '100%',
        height: '100vh',
        background: '#0a1628',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 20px',
        background: 'rgba(0,20,40,0.9)',
        borderBottom: '1px solid rgba(0,240,255,0.3)',
        zIndex: 10
    },
    title: {
        margin: 0,
        color: '#00f0ff',
        fontSize: '20px',
        fontFamily: "'Orbitron', sans-serif"
    },
    backBtn: {
        background: 'rgba(0,240,255,0.1)',
        border: '1px solid #00f0ff',
        color: '#00f0ff',
        padding: '8px 16px',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '13px'
    },
    legend: {
        display: 'flex',
        gap: '16px',
        fontSize: '13px'
    },
    canvasContainer: {
        flex: 1,
        position: 'relative'
    },
    infoPanel: {
        position: 'absolute',
        bottom: '70px',
        right: '20px',
        background: 'rgba(0,20,40,0.95)',
        border: '1px solid rgba(0,240,255,0.5)',
        borderRadius: '12px',
        padding: '16px',
        minWidth: '220px',
        zIndex: 10
    },
    infoTitle: {
        margin: '0 0 12px 0',
        color: '#00f0ff',
        fontSize: '16px',
        borderBottom: '1px solid rgba(0,240,255,0.3)',
        paddingBottom: '8px'
    },
    infoGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '10px'
    },
    label: {
        display: 'block',
        fontSize: '10px',
        color: '#4a7c80',
        textTransform: 'uppercase',
        marginBottom: '2px'
    },
    value: {
        fontSize: '14px',
        color: '#ffffff',
        fontWeight: 'bold'
    },
    instructions: {
        position: 'absolute',
        bottom: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0,20,40,0.9)',
        padding: '8px 20px',
        borderRadius: '20px',
        color: '#00f0ff',
        fontSize: '12px',
        border: '1px solid rgba(0,240,255,0.3)',
        zIndex: 10
    }
};

import { useState, useEffect } from 'react';
import MachineCard from "./MachineCard";
import { useTheme } from '../context/ThemeContext';
import { getAnomalies, getPredictions } from '../services/api';

export default function MachineGrid({ machines, onSelectMachine }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [anomalyData, setAnomalyData] = useState({});
  const [predictionData, setPredictionData] = useState({});

  // Fetch anomalies and predictions for all machines
  useEffect(() => {
    const fetchAIData = async () => {
      if (!machines.length) return;

      try {
        // Fetch anomalies
        const anomalyRes = await getAnomalies();
        const anomalies = {};
        for (const a of anomalyRes.data.anomalies || []) {
          anomalies[a.machine_id] = a;
        }
        setAnomalyData(anomalies);

        // Fetch predictions for each machine
        const predictions = {};
        for (const m of machines) {
          try {
            const predRes = await getPredictions(m.machine_id);
            predictions[m.machine_id] = predRes.data;
          } catch (e) {
            // Skip if prediction fails
          }
        }
        setPredictionData(predictions);
      } catch (e) {
        console.error('Failed to fetch AI data:', e);
      }
    };

    fetchAIData();
    const interval = setInterval(fetchAIData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [machines]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {machines.length === 0 ? (
        <div
          className="col-span-2 rounded-xl p-8 text-center border backdrop-blur-xl"
          style={{
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
          }}
        >
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent 
                        rounded-full animate-spin mx-auto mb-3" />
          <p style={{ color: isDark ? '#6b7280' : '#94a3b8' }}>
            Connecting to machines...
          </p>
        </div>
      ) : (
        machines.map(machine => (
          <MachineCard
            key={machine.machine_id}
            machine={machine}
            onClick={() => onSelectMachine(machine)}
            anomaly={anomalyData[machine.machine_id]}
            prediction={predictionData[machine.machine_id]}
          />
        ))
      )}
    </div>
  );
}

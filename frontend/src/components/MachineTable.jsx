import { useEffect, useState } from "react";
import { api } from "../services/api";

export default function MachineTable() {
  const [machines, setMachines] = useState([]);

  useEffect(() => {
    const fetchMachines = async () => {
      try {
        const res = await api.get("/machines/live");
        setMachines(res.data.machines);
      } catch (err) {
        console.error("API error:", err);
      }
    };

    fetchMachines();
    const interval = setInterval(fetchMachines, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <table border="1" cellPadding="10" width="100%">
      <thead>
        <tr>
          <th>Machine ID</th>
          <th>Temperature (°C)</th>
          <th>Vibration</th>
          <th>RPM</th>
          <th>Health Score</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {machines.map((m) => (
          <tr key={m.machine_id}>
            <td>{m.machine_id}</td>
            <td>{m.temperature}</td>
            <td>{m.vibration}</td>
            <td>{m.rpm}</td>
            <td>{m.health_score}</td>
            <td>{m.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8000';

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 120000, // 2 minute timeout for slow Ollama
});

// Machine endpoints
export const getMachines = () => api.get('/machines/live');
export const getMachineHistory = (machineId, hours = 24) =>
  api.get(`/machines/history/${machineId}?hours=${hours}`);
export const getAlerts = (limit = 50) =>
  api.get(`/machines/alerts?limit=${limit}`);
export const acknowledgeAlert = (alertId) =>
  api.post(`/machines/alerts/${alertId}/acknowledge`);

// Jarvis AI endpoints
export const askJarvis = (prompt, sessionId = 'default', language = 'en') =>
  api.post('/jarvis/ask', { prompt, session_id: sessionId, language });
export const getAnomalies = () =>
  api.get('/jarvis/anomalies');
export const getPredictions = (machineId) =>
  api.get(`/jarvis/predictions/${machineId}`);
export const getMaintenance = () =>
  api.get('/jarvis/maintenance');

// Machine Control endpoints (Voice Commands)
export const controlMachine = (machineId, action, value = null) =>
  api.post(`/machines/${machineId}/control`, { action, value });
export const getMachineState = (machineId) =>
  api.get(`/machines/${machineId}/state`);
export const getPendingMaintenance = () =>
  api.get('/machines/pending-maintenance');

// Analytics & Reports endpoints
export const getShiftSummary = (shiftHours = 8, language = 'en') =>
  api.get(`/analytics/shift-summary?shift_hours=${shiftHours}&language=${language}`);
export const getMachineComparison = () =>
  api.get('/analytics/machine-comparison');
export const getMachineTrends = (machineId, hours = 24) =>
  api.get(`/analytics/trends/${machineId}?hours=${hours}`);
export const getDailySummary = (days = 7) =>
  api.get(`/analytics/daily-summary?days=${days}`);

export default api;

import { useState, useEffect, useCallback, useRef } from 'react';

const WS_URL = 'ws://127.0.0.1:8000/ws/machines';

export function useWebSocket() {
  const [machines, setMachines] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeout = useRef(null);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Connected to Jarvis');
        setIsConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'machine_update') {
            setMachines(data.machines);
          }
        } catch (e) {
          console.error('[WS] Parse error:', e);
        }
      };

      ws.onerror = (e) => {
        console.error('[WS] Error:', e);
        setError('Connection error');
      };

      ws.onclose = () => {
        console.log('[WS] Disconnected');
        setIsConnected(false);
        
        // Attempt reconnect after 3 seconds
        reconnectTimeout.current = setTimeout(() => {
          console.log('[WS] Reconnecting...');
          connect();
        }, 3000);
      };

    } catch (e) {
      console.error('[WS] Failed to connect:', e);
      setError('Failed to connect');
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { machines, isConnected, error };
}

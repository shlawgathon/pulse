// Simple WebSocket hub keyed by sessionId. Allows publishing progress events to clients.

type AnyWebSocket = any;

const sessionIdToClients = new Map<string, Set<AnyWebSocket>>();

export function addClientToSession(sessionId: string, ws: AnyWebSocket) {
  if (!sessionId) return;
  let clients = sessionIdToClients.get(sessionId);
  if (!clients) {
    clients = new Set();
    sessionIdToClients.set(sessionId, clients);
  }
  clients.add(ws);
}

export function removeClientFromSession(sessionId: string, ws: AnyWebSocket) {
  if (!sessionId) return;
  const clients = sessionIdToClients.get(sessionId);
  if (!clients) return;
  clients.delete(ws);
  if (clients.size === 0) {
    sessionIdToClients.delete(sessionId);
  }
}

export function publishToSession(sessionId: string, payload: unknown) {
  if (!sessionId) return;
  const clients = sessionIdToClients.get(sessionId);
  if (!clients || clients.size === 0) return;
  const message = JSON.stringify(payload);
  for (const ws of clients) {
    try {
      ws.send(message);
    } catch {
      // Ignore send errors per-socket
    }
  }
}



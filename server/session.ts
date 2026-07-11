import { getData } from './dataStore.js';

export function createSession(userId: string): string {
    const data = getData();
    const sessionId = Math.random().toString(36).substr(2, 9);
    data.sessions.push({ sessionId, userId });
    return sessionId;
}

export function getSession(sessionId: string) {
    const data = getData();
    return data.sessions.find(session => session.sessionId === sessionId);
}

export function removeSession(sessionId: string): void {
    const data = getData();
    const sessionIndex = data.sessions.findIndex(session => session.sessionId === sessionId);
    if (sessionIndex !== -1) {
        data.sessions.splice(sessionIndex, 1);
    }
}

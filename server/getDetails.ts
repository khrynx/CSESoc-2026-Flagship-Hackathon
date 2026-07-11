import { getData, User, Pool, Participant } from './dataStore.js'

// Gets the pools a user is participating in
export function getParticipatingPools(userId: string): Pool[] {
    const data = getData();
    const user = data.users.find(user => user.userId === userId);  

    if (!user) {
        throw new Error("User not found");
    }
    return user.participatingPools;
}

// Gets the pools a user is hosting
export function getHostingPools(userId: string): Pool[] {
    const data = getData();
    const user = data.users.find(user => user.userId === userId);

    if (!user) {
        throw new Error("User not found");
    }
    return user.hostingPools;
}

// Gets host details of a pool
export function getHost(poolId: string): Participant {
    const data = getData();
    const pool = data.globalPools.find(pool => pool.id === poolId);

    if (!pool) {
        throw new Error("Pool not found");
    }

    if (pool.participants.length === 0) {
        throw new Error("No participants in the pool");
    }

    return pool.participants[0]; // Return the host (first participant)
}

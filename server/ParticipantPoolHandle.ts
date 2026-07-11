import { cleanupInactivePools, getData, persistData } from './dataStore.js'
import { createRequest } from './permissions.js'

export function joinPool(userId: string, poolId: string, quantity: number) {
    cleanupInactivePools();

    const { users, globalPools } = getData();
    const pool = globalPools.find((p) => p.id === poolId);
    const user = users.find((u) => u.userId === userId);

    if (!pool) {
        throw new Error('Pool not found');
    }

    if (!user) {
        throw new Error('User not found');
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error('Quantity must be greater than 0');
    }

    if (new Date(pool.deadline).getTime() <= Date.now()) {
        throw new Error('Pool deadline has passed');
    }

    if (pool.currentTotal == pool.quantityGoal) { 
        throw new Error('Pool is already at full capacity');
    }

    if (pool.currentTotal + quantity > pool.quantityGoal) {
        throw new Error('Not enough quantity available in the pool');
    }

    // send a request to the host to join the pool
    createRequest(userId, poolId);

    // pool.currentTotal += quantity;

    // const existingParticipant = pool.participants.find((participant) => participant.userId === userId);
    // if (existingParticipant) {
    //     existingParticipant.quantity += quantity;
    // } else {
    //     pool.participants.push({ userId, username: user.username, quantity, phoneNumber: user.phoneNumber });
    // }

    // if (!user.participatingPools.some((p) => p.id === pool.id)) {
    //     user.participatingPools.push(pool);
    // }

    // persistData();

    // const cleanupResult = cleanupInactivePools();
    // const wasRemoved = cleanupResult.removedPoolIds.includes(poolId);
    // return {
    //     pool: wasRemoved ? null : pool,
    //     removed: wasRemoved,
    // };
}

export function getHost(userId: string, poolId: string) {
    const { users, globalPools } = getData();
    const pool = globalPools.find((p) => p.id === poolId);
    const user = users.find((u) => u.userId === userId);

    if (!pool) {
        throw new Error('Pool not found');
    }

    if (!user) {
        throw new Error('User not found');
    }

    return pool.participants[0]; // Assuming the first participant is the host
}

export function getParticipants(poolId: string) { 
    const { globalPools } = getData();
    const pool = globalPools.find((p) => p.id === poolId);

    if (!pool) {
        throw new Error('Pool not found');
    }

    return pool.participants;
}

export function getUserParticipantPools(userId: string) {
    const { users } = getData();
    const user = users.find((u) => u.userId === userId); 

    if (!user) {
        throw new Error('User not found');
    }
    return user.participatingPools;
}

export function leavePool(userId: string, poolId: string) {
    const { users, globalPools } = getData();
    const pool = globalPools.find((p) => p.id === poolId);
    const user = users.find((u) => u.userId === userId);    

    if (!pool) {
        throw new Error('Pool not found');
    }
    if (!user) {
        throw new Error('User not found');
    }   

    if (pool.participants[0].userId === userId) {
        throw new Error('Host cannot leave the pool'); // redundant, ignore
    }

    for (let i = 0; i < pool.participants.length; i++) {
        if (pool.participants[i].userId === userId) {
            pool.currentTotal -= pool.participants[i].quantity;
            pool.participants.splice(i, 1);
            persistData();
            return;
        }
    }

    throw new Error('User is not a participant of the pool');
}
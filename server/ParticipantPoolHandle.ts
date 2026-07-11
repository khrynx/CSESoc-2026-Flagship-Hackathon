import { getData } from './dataStore.js'

export function joinPool(userId: string, poolId: string, quantity: number) { 
    const { users, globalPools } = getData();
    const pool = globalPools.find((p) => p.id === poolId);
    const user = users.find((u) => u.userId === userId);

    if (!pool) {
        throw new Error('Pool not found');
    }

    if (!user) {
        throw new Error('User not found');
    }

    if (pool.currentTotal == pool.quantityGoal) { 
        throw new Error('Pool is already at full capacity');
    }

    if (pool.currentTotal + quantity > pool.quantityGoal) {
        throw new Error('Not enough quantity available in the pool');
    }

    pool.currentTotal += quantity;
    pool.participants.push({ userId, username: user.username, quantity, phoneNumber: user.phoneNumber }); 

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

export function returnUserPools(userId: string) {
    const { users } = getData();
    const user = users.find((u) => u.userId === userId); 
    getUserPools(userId); // Populate the user's pools before returning
    if (!user) {
        throw new Error('User not found');
    }
    return user.pools;
}

function getUserPools(userId: string) {
    const { users , globalPools} = getData();
    const user = users.find((u) => u.userId === userId);

    if (!user) {
        throw new Error('User not found');
    }

    for (const pool of globalPools) {
        if (pool.participants.some((participant) => participant.userId === userId)) {
            user.pools.push(pool);
        }
    }
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
        throw new Error('Host cannot leave the pool');
    }

    for (let i = 0; i < pool.participants.length; i++) {
        if (pool.participants[i].userId === userId) {
            pool.currentTotal -= pool.participants[i].quantity;
            pool.participants.splice(i, 1);
            return;
        }
    }

    throw new Error('User is not a participant of the pool');
}
import { getData, generatePoolId, persistData } from './dataStore.js'

export function makePool(userId: string, itemName: string, desc: string, price: number, quantityGoal: number, deadline: Date, longitude: number, latitude: number, hostquantity: number) {
    const { users, globalPools } = getData();
    const user = users.find((u) => u.userId === userId);

    if (!user) {
        throw new Error('User not found');
    }

    if (hostquantity > quantityGoal) {
        throw new Error('Host quantity cannot exceed the total quantity goal');
    }

    const newPool = {
        id: generatePoolId(),
        itemName,
        desc,
        price,
        quantityGoal,
        currentTotal: 0,
        deadline,
        longitude,
        latitude,
        participants: [{ userId, username: user.username, quantity: hostquantity, phoneNumber: user.phoneNumber }],
    };

    globalPools.push(newPool);
    persistData();
    return newPool;
}

export function getHostingPools(userId: string) {
    const { globalPools } = getData();
    return globalPools.filter((pool) => pool.participants[0].userId === userId);
}

export function cancelPool(userId: string, poolId: string) {
    const { users, globalPools } = getData();
    const poolIndex = globalPools.findIndex((p) => p.id === poolId);
    const user = users.find((u) => u.userId === userId);

    if (!user) {
        throw new Error('User not found');
    }

    if (poolIndex === -1) {
        throw new Error('Pool not found');
    }

    const pool = globalPools[poolIndex];
    if (pool.participants[0].userId !== userId) {
        throw new Error('Only the host can cancel the pool');
    }

    globalPools.splice(poolIndex, 1);
}

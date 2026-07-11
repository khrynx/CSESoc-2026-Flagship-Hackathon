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
    user.hostingPools.push(newPool);
    persistData();
    return newPool;
}

export function cancelPool(userId: string, poolId: string) {
    const { users, globalPools } = getData();
    const globalPoolIndex = globalPools.findIndex((p) => p.id === poolId);
    const user = users.find((u) => u.userId === userId);

    if (!user) {
        throw new Error('User not found');
    }

    const hostingPoolIndex = user.hostingPools.findIndex((p) => p.id === poolId);

    if (globalPoolIndex === -1) {
        throw new Error('Pool not found');
    }

    if (hostingPoolIndex === -1) {
        throw new Error('Pool not found');
    }

    const pool = globalPools[globalPoolIndex];
    if (pool.participants[0].userId !== userId) {
        throw new Error('Only the host can cancel the pool');
    }

    globalPools.splice(globalPoolIndex, 1);
    user.hostingPools.splice(hostingPoolIndex, 1);
}

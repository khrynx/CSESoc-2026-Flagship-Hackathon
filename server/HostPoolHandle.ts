import { getData, generatePoolId, persistData, Categories, Category } from './dataStore.js'

export function makePool(userId: string, itemName: string, desc: string, price: number, quantityGoal: number, deadline: Date, longitude: number, latitude: number, hostquantity: number, category: Category) {
    const { users, globalPools } = getData();
    const user = users.find((u) => u.userId === userId);

    if (!user) {
        throw new Error('User not found');
    }
    
    if (hostquantity > quantityGoal) {
        throw new Error('Host quantity cannot exceed the total quantity goal');
    }

    if (!(deadline instanceof Date) || Number.isNaN(deadline.getTime())) {
        throw new Error('Deadline must be a valid date and time');
    }

    const now = new Date();
    const maxDeadline = new Date(now.getTime() + 50 * 24 * 60 * 60 * 1000);
    if (deadline <= now) {
        throw new Error('Deadline must be in the future');
    }

    if (deadline > maxDeadline) {
        throw new Error('Deadline must be within 50 days from now');
    }

    // default, CHANGE LATER

    const newPool = {
        id: generatePoolId(),
        hostUserId: userId,
        itemName,
        desc,
        price,
        quantityGoal,
        currentTotal: hostquantity,
        deadline,
        longitude,
        latitude,
        participants: [{ userId, username: user.username, quantity: hostquantity, phoneNumber: user.phoneNumber }],
        category
    };

    globalPools.push(newPool);
    user.hostingPools.push(newPool);
    persistData();
    return newPool;
}

export function getHostingPools(userId: string) {
    const { users } = getData();
    const user = users.find((u) => u.userId === userId); 

    if (!user) {
        throw new Error('User not found');
    }
    return user.hostingPools;
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

import { getData, Request } from './dataStore.js';

export function createRequest(userId: string, poolId: string,) {
    const { users } = getData();
    const user = users.find((u) => u.userId === userId);
    if (!user) {
        throw new Error('User not found');
    }

    const pool = getData().globalPools.find((p) => p.id === poolId);
    if (!pool) {
        throw new Error('Pool not found');
    }


    // const newOutgoingRequest: Request = {
    //     poolId: poolId,
    //     direction: 'outgoing',
    //     fromUserId: userId,

    // }

    // const newIncomingRequest: Request = {
    //     poolId: poolId,
    //     direction: 'incoming'

    // }

    // user.requests.push(newRequest);
    // // Implementation for creating a request
}


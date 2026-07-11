import { getData, Request, generateRequestId, persistData, cleanupInactivePools } from './dataStore.js';

export function createRequest(userId: string, poolId: string, quantity: number) {
    const { users } = getData();
    const user = users.find((u) => u.userId === userId);
    if (!user) {
        throw new Error('User not found');
    }

    const pool = getData().globalPools.find((p) => p.id === poolId);
    if (!pool) {
        throw new Error('Pool not found');
    }

    const host = users.find((u) => u.userId === pool.hostUserId);
    if (!host) {
        throw new Error('Host not found');
    }

    if (pool.hostUserId === userId) {
        throw new Error('Host cannot request to join their own pool');
    }

    const hasPendingOutgoing = user.requests.some(
        (request) =>
            request.poolId === poolId &&
            request.direction === 'outgoing' &&
            request.status === 'pending',
    );

    if (hasPendingOutgoing) {
        throw new Error('You already have a pending request for this pool');
    }

    const requestId = generateRequestId();

    // one requestId refers to a pair of ongoing, incoming requests
    const newOutgoingRequest: Request = {
        requestId: requestId,
        poolId: poolId,
        direction: 'outgoing',
        fromUserId: userId,
        toUserId: pool.hostUserId,
        status: 'pending',
        quantity: quantity
    }

    const newIncomingRequest: Request = {
        requestId: requestId,
        poolId: poolId,
        direction: 'incoming',
        fromUserId: userId,
        toUserId: pool.hostUserId,
        status: 'pending',
        quantity: quantity
    }

    user.requests.push(newOutgoingRequest);
    host.requests.push(newIncomingRequest);

    persistData();

    return {
        requestId,
        request: newOutgoingRequest,
    };
}

// can only decline or accept incoming requests as the host
export function declineRequest(userId: string, requestId: string) {
    const { users } = getData();
    const host = users.find((u) => u.userId === userId);
    if (!host) {
        throw new Error('Host not found');
    }

    const hostRequest = host.requests.find((r) => r.requestId === requestId && r.direction === 'incoming');
    if (!hostRequest) {
        throw new Error('Request not found or not an incoming request');
    }
    const hostRequestIndex = host.requests.findIndex((r) => r.requestId === requestId && r.direction === 'incoming');
    if (hostRequestIndex === -1) {
        throw new Error('Request not found or not an incoming request');
    }

    host.requests.splice(hostRequestIndex, 1);

    const participantId = hostRequest.fromUserId;
    const participant = users.find((u) => u.userId === participantId);
    if (!participant) {
        throw new Error('Participant not found');
    }
    const participantRequest = participant.requests.find((r) => r.requestId === requestId && r.direction === 'outgoing');
    if (!participantRequest) {
        throw new Error('Request not found or not an outgoing request');
    }
    participantRequest.status = 'rejected';
    persistData();

    // ask kevin to make an x button that will splice the participant's request after clicking X and seeing that it has been declined
}

export function acceptRequest(userId: string, requestId: string) {
    const { users, globalPools } = getData();
    const host = users.find((u) => u.userId === userId);
    if (!host) {
        throw new Error('Host not found');
    }

    const hostRequest = host.requests.find((r) => r.requestId === requestId && r.direction === 'incoming');
    if (!hostRequest) {
        throw new Error('Request not found or not an incoming request');
    }

    const hostRequestIndex = host.requests.findIndex((r) => r.requestId === requestId && r.direction === 'incoming');
    if (hostRequestIndex === -1) {
        throw new Error('Request not found or not an incoming request');
    }

    const poolId = hostRequest.poolId;
    const pool = globalPools.find((p) => p.id === poolId);
    if (!pool) {
        throw new Error('Pool not found');
    }

    host.requests.splice(hostRequestIndex, 1);

    const participantId = hostRequest.fromUserId;
    const participant = users.find((u) => u.userId === participantId);
    if (!participant) {
        throw new Error('Participant not found');
    }
    const participantRequest = participant.requests.find((r) => r.requestId === requestId && r.direction === 'outgoing');
    if (!participantRequest) {
        throw new Error('Request not found or not an outgoing request');
    }
    participantRequest.status = 'accepted';

    // NOW ADD PARTICIPANT TO POOL
    const quantity = participantRequest.quantity;
    pool.currentTotal += quantity;

    const existingParticipant = pool.participants.find((participant) => participant.userId === participantId);
    if (existingParticipant) {
        existingParticipant.quantity += quantity;
    } else {
        pool.participants.push({ userId: participantId, username: participant.username, quantity, phoneNumber: participant.phoneNumber });
    }

    if (!participant.participatingPools.some((p) => p.id === pool.id)) {
        participant.participatingPools.push(pool);
    }

    persistData();

    const cleanupResult = cleanupInactivePools();
    const wasRemoved = cleanupResult.removedPoolIds.includes(poolId);
    return {
        pool: wasRemoved ? null : pool,
        removed: wasRemoved,
    };
}

export function cancelOutgoingRequest(userId: string, requestId: string) {
    const { users } = getData();
    const participant = users.find((u) => u.userId === userId);
    if (!participant) {
        throw new Error('User not found');
    }

    const outgoingRequest = participant.requests.find((r) => r.requestId === requestId && r.direction === 'outgoing');
    if (!outgoingRequest) {
        throw new Error('Outgoing request not found');
    }

    if (outgoingRequest.status === 'rejected') {
        throw new Error('Rejected requests can only be closed');
    }

    participant.requests = participant.requests.filter((r) => !(r.requestId === requestId && r.direction === 'outgoing'));

    if (outgoingRequest.status === 'pending') {
        const host = users.find((u) => u.userId === outgoingRequest.toUserId);
        if (host) {
            host.requests = host.requests.filter((r) => !(r.requestId === requestId && r.direction === 'incoming'));
        }
    }

    persistData();
}

export function closeRejectedOutgoingRequest(userId: string, requestId: string) {
    const { users } = getData();
    const participant = users.find((u) => u.userId === userId);
    if (!participant) {
        throw new Error('User not found');
    }

    const outgoingRequest = participant.requests.find((r) => r.requestId === requestId && r.direction === 'outgoing');
    if (!outgoingRequest) {
        throw new Error('Outgoing request not found');
    }

    if (outgoingRequest.status !== 'rejected') {
        throw new Error('Only rejected requests can be closed');
    }

    participant.requests = participant.requests.filter((r) => !(r.requestId === requestId && r.direction === 'outgoing'));
    persistData();
}
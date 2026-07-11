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


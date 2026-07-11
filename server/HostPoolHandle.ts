import { getData , generatePoolId} from './dataStore.js'

export function makePool(userId: string, itemName: string, desc: string, price: number, quantityGoal: number, deadline: Date, longitude: number, latitude: number, hostquantity: number) {
    const { users, globalPools } = getData();
    const user = users.find((u) => u.userId === userId);    

    if (!user) {
        throw new Error('User not found');
    }   

    const newPool = {
        id: generatePoolId(),
        itemName,   desc, price, quantityGoal, currentTotal: 0, deadline, longitude, latitude,
        participants: [{ userId, username: user.username, quantity: hostquantity, phoneNumber: user.phoneNumber }] // host is the first participant
    };
    globalPools.push(newPool);
}


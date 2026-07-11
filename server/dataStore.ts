// DATASTORE
// TO-DO: ADD REVIEW DATA 

export interface Participant {
    userId: string;
    username: string;
    quantity: number; // the share of how much of the bulk they want
    phoneNumber: string;

}

export interface Pool {
    id: string;
    itemName: string;
    desc: string;
    price: number;
    participants: Participant[]; // array of userIDs, index 0 is always the host
    quantityGoal: number;
    currentTotal: number;
    deadline: Date; // use date-fns package
    longitude: number;
    latitude: number;

}

export interface User {
    userId: string;
    username: string;
    email: string;
    password: string;
    phoneNumber: string;
    pools: Pool[];

}

export interface Data {
    users: User[];
    globalPools: Pool[];
}

const data: Data = {
    users: [],
    globalPools: []
};

export function getData() {
    return data;
};


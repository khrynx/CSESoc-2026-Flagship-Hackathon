// DATASTORE
// TO-DO: ADD REVIEW DATA

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

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
    hostingPools: Pool[];
    participatingPools: Pool[];
    hostReviews: Review[];  // reviews received as a host
    participantReviews: Review[]; // reviews received as a participant
}

export interface Data {
    users: User[];
    globalPools: Pool[];
    sessions: Session[];
}

interface Session {
    sessionId: string;
    userId: string;
}

interface Review {
    isHost: boolean; // true if the reviewee is the host, false if the reviewee is a participant
    reviewId: string;
    reviewerId: string;
    revieweeId: string; // the user being reviewed
    rating: number; // 1-5
    comment: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE_PATH = path.join(__dirname, 'data', 'data.json');

let data: Data | null = null;

function createDefaultData(): Data {
    return {
        users: [],
        globalPools: [],
        sessions: []
    };
}

function normalizeData(rawData: Partial<Data> | null | undefined): Data {
    const parsed = rawData ?? createDefaultData();

    return {
        users: Array.isArray(parsed.users) ? parsed.users : [],
        globalPools: Array.isArray(parsed.globalPools)
            ? parsed.globalPools.map((pool) => ({
                ...pool,
                deadline: pool.deadline ? new Date(pool.deadline as string | Date) : new Date(),
            }))
            : [],
        sessions: Array.isArray(parsed.sessions) ? parsed.sessions : []
    };
}

function ensureStoreFile() {
    fs.mkdirSync(path.dirname(DATA_FILE_PATH), { recursive: true });

    if (!fs.existsSync(DATA_FILE_PATH)) {
        fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(createDefaultData(), null, 2), 'utf8');
    }
}

function loadDataFromDisk(): Data {
    ensureStoreFile();

    try {
        const fileContents = fs.readFileSync(DATA_FILE_PATH, 'utf8');
        return normalizeData(JSON.parse(fileContents) as Partial<Data>);
    } catch (error) {
        console.warn('Unable to read persisted data; starting fresh.', error);
        const freshData = createDefaultData();
        saveDataToDisk(freshData);
        return freshData;
    }
}

function saveDataToDisk(nextData: Data) {
    ensureStoreFile();
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(nextData, null, 2), 'utf8');
}

export function generatePoolId() {
    const { globalPools } = getData();
    let randid = Math.random().toString(36).substr(2, 9);
    while (globalPools.some(pool => pool.id === randid)) {
        randid = Math.random().toString(36).substr(2, 9);
    }

    return randid;
}

export function generateUserId() {
    const { users } = getData();
    let randid = Math.random().toString(36).substr(2, 9);
    while (users.some(user => user.userId === randid)) {
        randid = Math.random().toString(36).substr(2, 9);
    }

    return randid;
}

export function getData() {
    if (!data) {
        data = loadDataFromDisk();
    }

    return data;
}

export function persistData() {
    if (!data) {
        data = loadDataFromDisk();
    }

    saveDataToDisk(data);
    return data;
}


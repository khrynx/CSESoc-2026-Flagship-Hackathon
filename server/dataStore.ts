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
    category: Category;
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
    averageHostRating: number; // average rating received as a host
    averageParticipantRating: number; // average rating received as a participant
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

export interface Review {
    isHost: boolean; // true if the reviewee is the host, false if the reviewee is a participant
    reviewId: string;
    reviewerId: string;
    revieweeId: string; // the user being reviewed
    rating: number; // 1-5
    comment: string;
}

export const Categories = ["Clothing", 
                    "Beverages", 
                    "Fresh Produce", 
                    "Pantry & Dry Goods", 
                    "Snacks", 
                    "Home & Garden", 
                    "Household Essentials", 
                    "Sports & Outdoors", 
                    "Toys & Games", 
                    "Pet Supplies",
                    "Health & Wellness",
                    "Baby & Kids",
                    "School & Office Supplies",
                    "Other"
                ] as const;
export type Category = typeof Categories[number];


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

    const normalizedUsers = Array.isArray(parsed.users)
        ? parsed.users.map((user) => ({
            ...user,
            hostingPools: Array.isArray((user as Partial<User> & { pools?: Pool[] }).hostingPools)
                ? (user as Partial<User> & { hostingPools?: Pool[] }).hostingPools ?? []
                : Array.isArray((user as Partial<User> & { pools?: Pool[] }).pools)
                    ? ((user as Partial<User> & { pools?: Pool[] }).pools ?? [])
                    : [],
            participatingPools: Array.isArray((user as Partial<User>).participatingPools)
                ? (user as Partial<User>).participatingPools ?? []
                : [],
            hostReviews: Array.isArray((user as Partial<User>).hostReviews)
                ? (user as Partial<User>).hostReviews ?? []
                : [],
            participantReviews: Array.isArray((user as Partial<User>).participantReviews)
                ? (user as Partial<User>).participantReviews ?? []
                : [],
        }))
        : [];

    return {
        users: normalizedUsers,
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

export function resetData() {
    data = createDefaultData();
    saveDataToDisk(data);
    return data;
}

export function cleanupInactivePools(referenceDate: Date = new Date()) {
    const store = getData();
    const cutoff = referenceDate.getTime();

    const removedPoolIds = new Set(
        store.globalPools
            .filter((pool) => {
                const deadlineMs = new Date(pool.deadline as unknown as string | Date).getTime();
                return pool.currentTotal >= pool.quantityGoal || deadlineMs <= cutoff;
            })
            .map((pool) => pool.id)
    );

    if (removedPoolIds.size === 0) {
        return { removedPoolIds: [] as string[] };
    }

    store.globalPools = store.globalPools.filter((pool) => !removedPoolIds.has(pool.id));
    store.users = store.users.map((user) => ({
        ...user,
        hostingPools: user.hostingPools.filter((pool) => !removedPoolIds.has(pool.id)),
        participatingPools: user.participatingPools.filter((pool) => !removedPoolIds.has(pool.id)),
    }));

    saveDataToDisk(store);
    return { removedPoolIds: Array.from(removedPoolIds) };
}
import { addReview } from './reviews.js';
import { registerUser } from './auth.js';
import { makePool } from './HostPoolHandle.js';
import { joinPool } from './ParticipantPoolHandle.js';
import { acceptRequest } from './permissions.js';

export function initMockData() {
    const daysFromNow = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    // Create mock users
    const user1 = registerUser('Antony C', 'antony@gmail.com', 'Password123!', '0400000000');
    const user2 = registerUser('Kevin Li', 'kevin@gmail.com', 'Password123!', '0400000001');
    const user3 = registerUser('Josh P', 'josh@gmail.com', 'Password123!', '0400000002');
    const user4 = registerUser('Ethan H', 'ethan@gmail.com', 'Password123!', '0400000003');
    const user5 = registerUser('Joe Biden', 'sleepyjoe@gmail.com', 'Password123!', '0400000004');
    const user6 = registerUser('Pauline', 'paul@gmail.com', 'Password123!', '0400000005');
    const user7 = registerUser('Alice T', 'alice@gmail.com', 'Password123!', '0400000006');
    const user8 = registerUser('Bob Kirk', 'bob@gmail.com', 'Password123!', '0400000007');
    const user9 = registerUser('Charlie Moustache', 'charlie@gmail.com', 'Password123!', '0400000008');
    const user10 = registerUser('Diana R', 'diana@gmail.com', 'Password123!', '0400000009');
    const user11 = registerUser('Mario Mario', 'mario@gmail.com', 'Password123!', '0400000010');
    const user12 = registerUser('Jamin Lee', 'jamin@gmail.com', 'Password123!', '0400000011');
    const user13 = registerUser('Guan Yu', 'gy@gmail.com', 'Password123!', '04000000012');
    const user14 = registerUser('Cleve Hendra', 'cleve@gmail.com', 'Password123!', '0400000013');
    const user15 = registerUser('Donkey Kong', 'donkey@gmail.com', 'Password123!', '0400000014');
    const user16 = registerUser('Cullen Hendra', 'cullen@gmail.com', 'Password123!', '0400000015');
    const user17 = registerUser('Adonis Chen', 'adonis@gmail.com', 'Password123!', '0400000016');

    // Create mock pools
    // makePool(userId: string, itemName: string, desc: string, price: number, quantityGoal: number, deadline: Date, longitude: number, latitude: number, hostquantity: number, category: Category)
    const pool1 = makePool(user1.userId, 'Whey Protein', 'A huge truck load of PROTEIN!!!!', 5, 50, daysFromNow(14), 151.0574, -33.9443, 5, 'Health & Wellness');
    const pool2 = makePool(user1.userId, 'Paper Towels', 'Many rolls of paper towels', 2, 60, daysFromNow(18), 151.2263, -33.8849, 5, 'Health & Wellness');
    const pool3 = makePool(user2.userId, 'Canned Beans', 'A lot of canned beans', 1, 100, daysFromNow(20), 151.2743, -33.8908, 10, 'Pantry & Dry Goods');
    const pool4 = makePool(user3.userId, 'Dog Food', 'Yummy delicious doggy treats!', 3, 80, daysFromNow(24), 151.2069, -33.8708, 5, 'Pet Supplies');
    const pool5 = makePool(user4.userId, 'Canned Tuna', 'A lot of canned tuna', 2, 70, daysFromNow(16), 151.2840, -33.9120, 10, 'Pantry & Dry Goods');
    const pool6 = makePool(user5.userId, 'Soccer Balls', 'HAALAND HAALAND', 4, 10, daysFromNow(22), 151.1890, -33.9310, 5, 'Sports & Outdoors');
    const pool7 = makePool(user6.userId, 'Hot Wheels', 'Good ol\' Hot Wheels', 3, 40, daysFromNow(28), 151.1320, -33.8650, 20, 'Toys & Games');

    // Create host mock reviews
    // addReview(userId: string, revieweeId: string, rating: number, comment: string)
    addReview(user2.userId, user1.userId, 5, 'Great host! Very responsive and helpful.', true);
    addReview(user3.userId, user1.userId, 2, 'Could improve on communication.', true);
    addReview(user4.userId, user1.userId, 4, 'Excellent host! Highly recommended. Kinda chopped.', true);

    addReview(user5.userId, user2.userId, 2, 'Could be more organized.', true);
    addReview(user6.userId, user2.userId, 3, 'Horrible host! Went below and under!', true);

    addReview(user7.userId, user3.userId, 4, 'Good host. Would use again.', true);
    addReview(user8.userId, user3.userId, 5, 'Great experience! Very accommodating.', true);
    addReview(user8.userId, user3.userId, 4, 'Might be the goat!?!', true);
    addReview(user8.userId, user3.userId, 2, 'Who is bro?', true);
    addReview(user8.userId, user3.userId, 3, 'Scary dog!', true);

    addReview(user9.userId, user4.userId, 4, 'Good host. Communication could be better.', true);
    addReview(user10.userId, user4.userId, 5, 'Excellent host! Very friendly and helpful.', true);

    addReview(user11.userId, user5.userId, 4, 'Good host. Would recommend.', true);
    addReview(user12.userId, user5.userId, 5, 'Great experience! Very professional.', true);

    // Create participant mock reviews
    addReview(user1.userId, user2.userId, 1, 'Worst of all time!?!', false);
    addReview(user2.userId, user2.userId, 2, 'He was not participating.', false);
    addReview(user3.userId, user2.userId, 3, 'Violent man.', false);
    addReview(user4.userId, user2.userId, 2, 'Needs a shower.', false);
    addReview(user5.userId, user2.userId, 4, 'Lacking in punctuality.', false);

    addReview(user1.userId, user3.userId, 4, 'Good experience overall, but could improve on punctuality.', false);
    addReview(user2.userId, user3.userId, 2, 'Greedy greedy greedy.', false);
    addReview(user3.userId, user3.userId, 4, 'Very helpful!', false);
    addReview(user4.userId, user3.userId, 5, 'Amazing experience!', false);
    
    addReview(user1.userId, user4.userId, 5, 'Excellent participant! Highly recommended.', false);
    addReview(user2.userId, user4.userId, 3, 'Average participant. Could be more organized.', false);
   
    addReview(user1.userId, user5.userId, 3, 'Average experience. Could be more organized.', false);
    addReview(user4.userId, user5.userId, 2, 'Showed up late.', false);
   
    addReview(user6.userId, user6.userId, 5, 'Fantastic participant! Went above and beyond.', false);
    addReview(user3.userId, user7.userId, 4, 'Good participant. Would meet again.', false);
    addReview(user2.userId, user10.userId, 5, 'Excellent participant! Very friendly and helpful.', false);

    // Join some participants to pools
    let req;

    req = joinPool(user2.userId, pool1.id, 3);
    acceptRequest(user1.userId, req.requestId);
    req = joinPool(user13.userId, pool1.id, 5);
    acceptRequest(user1.userId, req.requestId);
    req = joinPool(user3.userId, pool1.id, 2);
    acceptRequest(user1.userId, req.requestId);
    req = joinPool(user17.userId, pool1.id, 2);
    acceptRequest(user1.userId, req.requestId);
    req = joinPool(user4.userId, pool1.id, 3);
    acceptRequest(user1.userId, req.requestId);

    req = joinPool(user3.userId, pool2.id, 2);
    acceptRequest(user1.userId, req.requestId);
    req = joinPool(user4.userId, pool2.id, 2);
    acceptRequest(user1.userId, req.requestId);
    req = joinPool(user5.userId, pool2.id, 3);
    acceptRequest(user1.userId, req.requestId);
    req = joinPool(user6.userId, pool2.id, 1);
    acceptRequest(user1.userId, req.requestId);

    req = joinPool(user5.userId, pool3.id, 8);
    acceptRequest(user2.userId, req.requestId);
    req = joinPool(user6.userId, pool3.id, 6);
    acceptRequest(user2.userId, req.requestId);
    req = joinPool(user12.userId, pool3.id, 7);
    acceptRequest(user2.userId, req.requestId);
    req = joinPool(user14.userId, pool3.id, 4);
    acceptRequest(user2.userId, req.requestId);
    req = joinPool(user1.userId, pool3.id, 5);
    acceptRequest(user2.userId, req.requestId);
    req = joinPool(user9.userId, pool3.id, 3);
    acceptRequest(user2.userId, req.requestId);
    req = joinPool(user11.userId, pool3.id, 2);
    acceptRequest(user2.userId, req.requestId);

    req = joinPool(user7.userId, pool4.id, 8);
    acceptRequest(user3.userId, req.requestId);
    req = joinPool(user8.userId, pool4.id, 6);
    acceptRequest(user3.userId, req.requestId);
    req = joinPool(user15.userId, pool4.id, 2);
    acceptRequest(user3.userId, req.requestId);
    req = joinPool(user16.userId, pool4.id, 3);
    acceptRequest(user3.userId, req.requestId);

    req = joinPool(user9.userId, pool5.id, 3);
    acceptRequest(user4.userId, req.requestId);
    req = joinPool(user10.userId, pool5.id, 2);
    acceptRequest(user4.userId, req.requestId);

    req = joinPool(user12.userId, pool6.id, 1);
    acceptRequest(user5.userId, req.requestId);
    req = joinPool(user13.userId, pool6.id, 1);
    acceptRequest(user5.userId, req.requestId);

    req = joinPool(user14.userId, pool7.id, 2);
    acceptRequest(user6.userId, req.requestId);

    // Special mock data for demonstration purposes
    const specialPool = makePool(user2.userId, 'Special Pool (wow)', 'This is a special pool for demonstration purposes. Fulfill me!!', 5, 20, daysFromNow(10), 151.1540, -33.9020, 5, 'Other');
    req = joinPool(user1.userId, specialPool.id, 3);
    acceptRequest(user2.userId, req.requestId);
    req = joinPool(user3.userId, specialPool.id, 2);
    acceptRequest(user2.userId, req.requestId);
    req = joinPool(user4.userId, specialPool.id, 1);
    acceptRequest(user2.userId, req.requestId);
}
import {getData, persistData, Review} from './dataStore.js';

// Add a review for a user
export function addReview(reviewerId: string, revieweeId: string, rating: number, comment: string, isHost: boolean) {
    const reviewId = Math.random().toString(36).substr(2, 9);
    const review: Review = {
        isHost,
        reviewId,
        reviewerId,
        revieweeId,
        rating,
        comment
    };
    const data =  getData();
    const reviewee = data.users.find(user => user.userId === revieweeId);
    const reviewer = data.users.find(user => user.userId === reviewerId);

    if (!reviewee) {
        throw new Error("Reviewee not found");
    }
    if (!reviewer) {
        throw new Error("Reviewer not found");
    }

    if (isHost) {
        reviewee.hostReviews.push(review);
    } else {
        reviewee.participantReviews.push(review);
    }
    updateAverageRatings(revieweeId);
    persistData();
}

// Delete a review by its ID and the reviewee's ID
export function deleteReview(reviewId: string, revieweeId: string) {
    const data = getData();
    const reviewee = data.users.find(user => user.userId === revieweeId);

    if (!reviewee) {
        throw new Error("Reviewee not found");
    }

    const reviewIndexHost = reviewee.hostReviews.findIndex(review => review.reviewId === reviewId);
    if (reviewIndexHost !== -1) {
        reviewee.hostReviews.splice(reviewIndexHost, 1);
        updateAverageRatings(revieweeId);
        persistData();
        return;
    }

    const reviewIndexParticipant = reviewee.participantReviews.findIndex(review => review.reviewId === reviewId);
    if (reviewIndexParticipant !== -1) {
        reviewee.participantReviews.splice(reviewIndexParticipant, 1);
        updateAverageRatings(revieweeId);
        persistData();
        return;
    }  

    throw new Error("Review not found");
}

// Get all reviews for a user as a host
export function getHostReviews(userId: string): Review[] {
    const data = getData();
    const user = data.users.find(user => user.userId === userId);

    if (!user) {
        throw new Error("User not found");
    }

    return user.hostReviews;
}

// Get all reviews for a user as a participant
export function getParticipantReviews(userId: string): Review[] {
    const data = getData();
    const user = data.users.find(user => user.userId === userId);

    if (!user) {
        throw new Error("User not found");
    }

    return user.participantReviews;
}

// Edit a review by its ID and the reviewee's ID
export function editReview(reviewId: string, revieweeId: string, newRating?: number, newComment?: string) {
    const data = getData();
    const reviewee = data.users.find(user => user.userId === revieweeId);

    if (!reviewee) {
        throw new Error("Reviewee not found");
    }

    editReviewInArray(reviewee.hostReviews, reviewId, newRating, newComment);
    editReviewInArray(reviewee.participantReviews, reviewId, newRating, newComment);
    updateAverageRatings(revieweeId);
    persistData();
}

// Helper function to edit a review in an array of reviews
export function editReviewInArray(reviews: Review[], reviewId: string, newRating?: number, newComment?: string) {
    const review = reviews.find(r => r.reviewId === reviewId);

    if (!review) {
        return;
    }

    const reviewIndex = reviews.findIndex(review => review.reviewId === reviewId);
    if (reviewIndex !== -1) {
        if (newRating !== undefined) {
            reviews[reviewIndex].rating = newRating;
        }
        if (newComment !== undefined) {
            reviews[reviewIndex].comment = newComment;
        }
    }
}

// Calculate the average host rating for a user
function calculateAverageHostRating(userId: string): number {
    const data = getData();
    const user = data.users.find(user => user.userId === userId); 

    if (!user) {
        throw new Error("User not found");
    }

    const numReviews = user.hostReviews.length;
    if (numReviews === 0) {
        return 0;
    }

    const totalRating = user.hostReviews.reduce((sum, review) => sum + review.rating, 0);
    return totalRating / numReviews;
}

// Calculate the average participant rating for a user
function calculateAverageParticipantRating(userId: string): number {
    const data = getData();
    const user = data.users.find(user => user.userId === userId);

    if (!user) {
        throw new Error("User not found");
    }

    const numReviews = user.participantReviews.length;
    if (numReviews === 0) {
        return 0;
    }

    const totalRating = user.participantReviews.reduce((sum, review) => sum + review.rating, 0);
    return totalRating / numReviews;
}


// Update the average ratings for a user
function updateAverageRatings(userId: string) {
    const data = getData();
    const user = data.users.find(user => user.userId === userId);

    if (!user) {
        throw new Error("User not found");
    }

    user.averageHostRating = calculateAverageHostRating(userId);
    user.averageParticipantRating = calculateAverageParticipantRating(userId);
}
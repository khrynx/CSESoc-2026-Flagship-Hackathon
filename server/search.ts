import { Category, getData, Pool } from './dataStore.js'

export function searchPools(query: string) {
  const normalizedQuery = query.trim().toLowerCase()
  const { globalPools } = getData()

  if (!normalizedQuery) {
    return globalPools
  }

  return globalPools.filter((pool) => {
    const searchpool = `${pool.itemName} ${pool.desc}`.toLowerCase();
    return searchpool.includes(normalizedQuery);
  })
}

export function filterAllPools(
  pools: Pool[],
  distance?: number,
  userLongitude?: number,
  userLatitude?: number,
  price?: number,
  size?: number,
  category?: Category,
  fullness?: number,
  rating?: number,
  deadline?: Date,
) {
  let filteredPools = pools;
  filteredPools = filterPoolsDistance(distance, userLongitude, userLatitude, filteredPools);
  filteredPools = filterPoolsPrice(price, filteredPools);
  filteredPools = filterPoolsSize(size, filteredPools);
  filteredPools = filterPoolsCategory(category, filteredPools);
  filteredPools = filterPoolsFullness(fullness, filteredPools);
  filteredPools = filterPoolsRating(rating, filteredPools); 
  filteredPools = filterPoolsDeadline(deadline, filteredPools);
  return filteredPools;
}

function filterPoolsDistance(distance: number | undefined, userLongitude: number | undefined, userLatitude: number | undefined, pools: Pool[]) {
  if (!distance || userLongitude === undefined || userLatitude === undefined) {
    return pools;
  }
  return pools.filter((pool) => {
    const distanceToPool = calculateDistance(userLatitude, userLongitude, pool.latitude, pool.longitude);
    return distanceToPool <= distance;
  })
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) { 
    const latdist = (lat2 - lat1);
    const londist = (lon2 - lon1);
    return Math.sqrt(latdist * latdist + londist * londist);
}

function filterPoolsPrice(price: number | undefined, pools: Pool[]) {
  if (!price) {
    return pools;
  }
  return pools.filter((pool) => pool.price <= price);
}

function filterPoolsSize(size: number | undefined, pools: Pool[]) {
  if (!size) {
    return pools;
  }
  return pools.filter((pool) => pool.quantityGoal <= size);
}

function filterPoolsCategory(category: Category | undefined, pools: Pool[]) {
  if (!category) {
    return pools;
  }
  return pools.filter((pool) => pool.category === category);
}

function filterPoolsFullness(fullness: number | undefined, pools: Pool[]) { 
  if (!fullness) {
    return pools;
  }
  return pools.filter((pool) => pool.currentTotal/pool.quantityGoal <= fullness);
}

function filterPoolsRating(rating: number | undefined, pools: Pool[]) {
  if (!rating) {
    return pools;
  }
  return pools.filter((pool) => {
    const hostReviews = pool.participants[0].userId; // Assuming the first participant is the host
    const { users } = getData();
    const host = users.find((user) => user.userId === hostReviews);
    if (!host) {
      return false;
    }
    const averageRating = host.averageHostRating; 
    return averageRating >= rating;
  });
}

function filterPoolsDeadline(deadline: Date | undefined, pools: Pool[]) {
  if (!deadline) {
    return pools;
  }
  return pools.filter((pool) => pool.deadline <= deadline);
}
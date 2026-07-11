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

export function filterAllPools(distance: number, userLongitude: number, userLatitude: number, price: number, size: number, category: Category) {
  const { globalPools } = getData();
  let filteredPools = globalPools;
  filteredPools = filterPoolsDistance(distance, userLongitude, userLatitude, filteredPools);
  filteredPools = filterPoolsPrice(price, filteredPools);
  filteredPools = filterPoolsSize(size, filteredPools);
  filteredPools = filterPoolsCategory(category, filteredPools);
}

function filterPoolsDistance(distance: number, userLongitude: number, userLatitude: number, pools: Pool[]) {
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

function filterPoolsPrice(price: number, pools: Pool[]) {
  return pools.filter((pool) => pool.price <= price);
}

function filterPoolsSize(size: number, pools: Pool[]) {
  return pools.filter((pool) => pool.quantityGoal <= size);
}

function filterPoolsCategory(category: Category, pools: Pool[]) {
  return pools.filter((pool) => pool.category <= category);
}

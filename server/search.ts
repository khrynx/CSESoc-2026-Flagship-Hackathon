import { getData } from './dataStore.js'

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

export function filterPoolsDistance(distance: number, userLongitude: number, userLatitude: number) {
  const { globalPools } = getData();

  return globalPools.filter((pool) => {
    const distanceToPool = calculateDistance(userLatitude, userLongitude, pool.latitude, pool.longitude);
    return distanceToPool <= distance;
  })
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) { 
    const latdist = (lat2 - lat1);
    const londist = (lon2 - lon1);
    return Math.sqrt(latdist * latdist + londist * londist);
}
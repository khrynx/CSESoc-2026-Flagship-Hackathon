import express from 'express'
import { cancelPool, getHostingPools, makePool } from './HostPoolHandle.js'
import { getData } from './dataStore.js'
import { getHost, getParticipants, joinPool, leavePool, returnUserPools } from './ParticipantPoolHandle.js'
import { searchPools } from './search.js'

const router = express.Router()

router.get('/pools', (_req, res) => {
  try {
    const { globalPools } = getData()
    res.json({ pools: globalPools })
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Unable to load pools.' })
  }
})

router.post('/pools', (req, res) => {
  try {
    const {
      userId,
      itemName,
      desc,
      price,
      quantityGoal,
      deadline,
      longitude,
      latitude,
      hostquantity,
    } = req.body ?? {}

    if (!userId || !itemName || !desc || !price || !quantityGoal || !deadline || longitude === undefined || latitude === undefined || hostquantity === undefined) {
      res.status(400).json({ message: 'Missing pool details.' })
      return
    }

    const pool = makePool(
      userId,
      itemName,
      desc,
      Number(price),
      Number(quantityGoal),
      new Date(deadline),
      Number(longitude),
      Number(latitude),
      Number(hostquantity),
    )

    res.status(201).json({ pool })
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Unable to create pool.' })
  }
})

router.get('/pools/hosting/:userId', (req, res) => {
  try {
    res.json({ pools: getHostingPools(req.params.userId) })
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Unable to load hosting pools.' })
  }
})

router.delete('/pools/:poolId/host/:userId', (req, res) => {
  try {
    cancelPool(req.params.userId, req.params.poolId)
    res.json({ message: 'Pool cancelled.' })
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Unable to cancel pool.' })
  }
})

router.post('/pools/:poolId/join', (req, res) => {
  try {
    const { userId, quantity } = req.body ?? {}

    if (!userId || quantity === undefined) {
      res.status(400).json({ message: 'User id and quantity are required.' })
      return
    }

    const pool = joinPool(userId, req.params.poolId, Number(quantity))
    res.json({ pool })
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Unable to join pool.' })
  }
})

router.post('/pools/:poolId/leave', (req, res) => {
  try {
    const { userId } = req.body ?? {}

    if (!userId) {
      res.status(400).json({ message: 'User id is required.' })
      return
    }

    leavePool(userId, req.params.poolId)
    res.json({ message: 'Left pool.' })
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Unable to leave pool.' })
  }
})

router.get('/pools/:poolId/participants', (req, res) => {
  try {
    res.json({ participants: getParticipants(req.params.poolId) })
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Unable to load participants.' })
  }
})

router.get('/pools/:poolId/host', (req, res) => {
  try {
    const { userId } = req.query
    res.json({ host: getHost(String(userId), req.params.poolId) })
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Unable to load host.' })
  }
})

router.get('/users/:userId/pools', (req, res) => {
  try {
    res.json({ pools: returnUserPools(req.params.userId) })
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Unable to load user pools.' })
  }
})

router.get('/search', (req, res) => {
  try {
    const { q, distance, lng, lat } = req.query

    let results = searchPools(String(q ?? ''))

    if (distance !== undefined && lng !== undefined && lat !== undefined) {
      const maxDist = Number(distance)
      const uLng = Number(lng)
      const uLat = Number(lat)
      results = results.filter((pool) => {
        const latd = pool.latitude - uLat
        const lngd = pool.longitude - uLng
        return Math.sqrt(latd * latd + lngd * lngd) <= maxDist
      })
    }

    res.json({ pools: results })
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Search failed.' })
  }
})

export default router


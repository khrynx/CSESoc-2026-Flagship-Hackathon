import express from 'express'
import { getUserById } from './auth.js'
import { cancelPool, getHostingPools, makePool } from './HostPoolHandle.js'
import { cleanupInactivePools, getData, resetData } from './dataStore.js'
import { getHost, getParticipants, joinPool, leavePool, getUserParticipantPools } from './ParticipantPoolHandle.js'
import { initMockData } from './mockDemo.js'
import { acceptRequest, cancelOutgoingRequest, closeRejectedOutgoingRequest, declineRequest } from './permissions.js'
import { addReview, getHostReviews, getParticipantReviews } from './reviews.js'
import { filterAllPools, searchPools } from './search.js'

const router = express.Router()

router.use((_req, _res, next) => {
  cleanupInactivePools()
  next()
})

router.get('/pools', (_req, res) => {
  try {
    const { globalPools } = getData()
    res.json({ pools: globalPools })
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Unable to load pools.' })
  }
})

router.post('/reset', (_req, res) => {
  try {
    const data = resetData()
    res.json({ message: 'Data reset successfully.', pools: data.globalPools })
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Unable to reset data.' })
  }
})

router.post('/mockdemo', (_req, res) => {
  try {
    resetData()
    initMockData()
    const { globalPools } = getData()
    res.json({
      message: 'Mock demo data loaded successfully.',
      pools: globalPools,
    })
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Unable to load mock demo data.' })
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
      category
    } = req.body ?? {}

    if (!userId || !itemName || !desc || !price || !quantityGoal || !deadline || longitude === undefined || latitude === undefined || hostquantity === undefined || !category) {
      res.status(400).json({ message: 'Missing pool details.' })
      return
    }
    // CHANGE PLEASE
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
      category
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

    const result = joinPool(userId, req.params.poolId, Number(quantity))
    res.json(result)
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
    res.json({ pools: getUserParticipantPools(req.params.userId) })
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Unable to load user pools.' })
  }
})

router.get('/users/:userId/requests', (req, res) => {
  try {
    const user = getUserById(req.params.userId)
    const { users } = getData()
    const requests = (user?.requests ?? []).map((request) => {
      const sender = users.find((candidate) => candidate.userId === request.fromUserId)
      const receiver = users.find((candidate) => candidate.userId === request.toUserId)
      return {
        ...request,
        fromUsername: sender?.username ?? request.fromUserId,
        toUsername: receiver?.username ?? request.toUserId,
      }
    })

    res.json({ requests })
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Unable to load user requests.' })
  }
})

router.get('/users/:userId/profile', (req, res) => {
  try {
    const user = getUserById(req.params.userId)
    if (!user) {
      res.status(404).json({ message: 'User not found.' })
      return
    }

    const hostReviews = getHostReviews(user.userId)
    const participantReviews = getParticipantReviews(user.userId)
    const { globalPools } = getData()
    const hostingPools = globalPools.filter((pool) => pool.hostUserId === user.userId)

    const hostRating = hostReviews.length === 0
      ? 0
      : hostReviews.reduce((sum, review) => sum + review.rating, 0) / hostReviews.length

    const participantRating = participantReviews.length === 0
      ? 0
      : participantReviews.reduce((sum, review) => sum + review.rating, 0) / participantReviews.length

    res.json({
      profile: {
        userId: user.userId,
        username: user.username,
        hostRating,
        participantRating,
        hostingPools,
      },
    })
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Unable to load profile.' })
  }
})

router.post('/requests/:requestId/accept', (req, res) => {
  try {
    const { userId } = req.body ?? {}

    if (!userId) {
      res.status(400).json({ message: 'User id is required.' })
      return
    }

    const result = acceptRequest(userId, req.params.requestId)
    res.json({ message: 'Request accepted.', ...result })
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Unable to accept request.' })
  }
})

router.post('/requests/:requestId/decline', (req, res) => {
  try {
    const { userId } = req.body ?? {}

    if (!userId) {
      res.status(400).json({ message: 'User id is required.' })
      return
    }

    declineRequest(userId, req.params.requestId)
    res.json({ message: 'Request declined.' })
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Unable to decline request.' })
  }
})

router.post('/requests/:requestId/outgoing/cancel', (req, res) => {
  try {
    const { userId } = req.body ?? {}

    if (!userId) {
      res.status(400).json({ message: 'User id is required.' })
      return
    }

    cancelOutgoingRequest(userId, req.params.requestId)
    res.json({ message: 'Request cancelled.' })
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Unable to cancel request.' })
  }
})

router.post('/requests/:requestId/outgoing/close', (req, res) => {
  try {
    const { userId } = req.body ?? {}

    if (!userId) {
      res.status(400).json({ message: 'User id is required.' })
      return
    }

    closeRejectedOutgoingRequest(userId, req.params.requestId)
    res.json({ message: 'Request closed.' })
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Unable to close request.' })
  }
})

router.post('/reviews', (req, res) => {
  try {
    const { reviewerId, revieweeId, rating, comment, isHost } = req.body ?? {}

    if (!reviewerId || !revieweeId || rating === undefined || typeof isHost !== 'boolean') {
      res.status(400).json({ message: 'Reviewer, reviewee, rating and role are required.' })
      return
    }

    const parsedRating = Number(rating)
    if (!Number.isFinite(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      res.status(400).json({ message: 'Rating must be between 1 and 5.' })
      return
    }

    addReview(String(reviewerId), String(revieweeId), parsedRating, String(comment ?? ''), Boolean(isHost))
    res.status(201).json({ message: 'Review submitted.' })
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Unable to submit review.' })
  }
})

router.get('/search', (req, res) => {
  try {
    const { q, distance, lng, lat, category, price, size, fullness, rating, deadlineBefore } = req.query

    let results = searchPools(String(q ?? ''))

    const parsedDistance = distance !== undefined ? Number(distance) : undefined
    const parsedLng = lng !== undefined ? Number(lng) : undefined
    const parsedLat = lat !== undefined ? Number(lat) : undefined
    const parsedPrice = price !== undefined ? Number(price) : undefined
    const parsedSize = size !== undefined ? Number(size) : undefined
    const parsedFullness = fullness !== undefined ? Number(fullness) : undefined
    const parsedRating = rating !== undefined ? Number(rating) : undefined
    const parsedDeadline = deadlineBefore !== undefined ? new Date(String(deadlineBefore)) : undefined

    results = filterAllPools(
      results,
      Number.isFinite(parsedDistance) ? parsedDistance : undefined,
      Number.isFinite(parsedLng) ? parsedLng : undefined,
      Number.isFinite(parsedLat) ? parsedLat : undefined,
      Number.isFinite(parsedPrice) ? parsedPrice : undefined,
      Number.isFinite(parsedSize) ? parsedSize : undefined,
      category ? String(category) as never : undefined,
      Number.isFinite(parsedFullness) ? parsedFullness : undefined,
      Number.isFinite(parsedRating) ? parsedRating : undefined,
      parsedDeadline && !Number.isNaN(parsedDeadline.getTime()) ? parsedDeadline : undefined,
    )

    res.json({ pools: results })
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Search failed.' })
  }
})

export default router


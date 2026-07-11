import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import './App.css'

type GroupBuy = {
  id: number
  title: string
  item: string
  totalQty: string
  shareQty: string
  split: string
  price: string
  savings: string
  participants: number
  remaining: string
  pickup: string
  closes: string
  impact: string
  accent: string
  position: {
    lat: number
    lng: number
  }
}

type Pool = {
  id: string
  hostUserId?: string
  itemName: string
  desc: string
  category?: string
  price: number
  quantityGoal: number
  currentTotal: number
  deadline: string
  longitude: number
  latitude: number
  participants: Array<{ userId: string; username: string; quantity: number; phoneNumber: string }>
}

type UserRequest = {
  requestId: string
  quantity: number
  poolId: string
  direction: 'outgoing' | 'incoming'
  fromUserId: string
  fromUsername?: string
  toUserId: string
  toUsername?: string
  status: 'pending' | 'accepted' | 'rejected'
}

type UserProfile = {
  userId: string
  username: string
  hostRating: number
  participantRating: number
  hostingPools: Pool[]
}

type CloseRatingTarget = {
  userId: string
  username: string
  isHostReview: boolean
}

const poolCategories = [
  'Clothing',
  'Beverages',
  'Fresh Produce',
  'Pantry & Dry Goods',
  'Snacks',
  'Home & Garden',
  'Household Essentials',
  'Sports & Outdoors',
  'Toys & Games',
  'Pet Supplies',
  'Health & Wellness',
  'Baby & Kids',
  'School & Office Supplies',
  'Other',
] as const

const normalMapStyleUrl = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'

const groupBuys: GroupBuy[] = [
  {
    id: 1,
    title: 'Rice share',
    item: '5kg rice bag',
    totalQty: '5kg total',
    shareQty: '1kg share',
    split: '3kg + 1kg + 1kg',
    price: '$12 bulk',
    savings: '$4 each',
    participants: 6,
    remaining: '2kg left',
    pickup: 'Northside Community Hall',
    closes: '6:30 PM',
    impact: '2 fewer deliveries',
    accent: '#14b8a6',
    position: { lat: -33.8688, lng: 151.2093 },
  },
  {
    id: 2,
    title: 'Pasta round-up',
    item: '3kg pasta box',
    totalQty: '3kg total',
    shareQty: '750g share',
    split: '1.5kg + 750g + 750g',
    price: '$8 bulk',
    savings: '$3 each',
    participants: 4,
    remaining: '1.5kg left',
    pickup: 'Elm Street Cafe',
    closes: '8:00 PM',
    impact: '1.2kg packaging avoided',
    accent: '#3b82f6',
    position: { lat: -33.873, lng: 151.223 },
  },
  {
    id: 3,
    title: 'Soap Hi lol',
    item: '4L dish soap',
    totalQty: '4L total',
    shareQty: '1L share',
    split: '2L + 1L + 1L',
    price: '$11 bulk',
    savings: '$4 each',
    participants: 8,
    remaining: '1L left',
    pickup: 'River Park Gate',
    closes: '7:15 PM',
    impact: '3 shared households',
    accent: '#f59e0b',
    position: { lat: -33.88, lng: 151.2 },
  },
]

function App() {
  const [mapReady, setMapReady] = useState(false)
  const [mapError, setMapError] = useState(false)
  const [mapRetryCount, setMapRetryCount] = useState(0)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [view, setView] = useState<'app' | 'auth' | 'home'>('auth')
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [loginData, setLoginData] = useState({ email: '', password: '' })
  const [signupData, setSignupData] = useState({ username: '', email: '', password: '', phoneNumber: '' })
  const [authMessage, setAuthMessage] = useState('')
  const [currentUser, setCurrentUser] = useState<{ userId: string; username: string; email: string } | null>(null)
  const [poolForm, setPoolForm] = useState({
    category: '',
    itemName: '',
    desc: '',
    price: '',
    quantityGoal: '',
    deadlineDate: '',
    deadlineTime: '',
    longitude: '',
    latitude: '',
    hostquantity: '',
  })
  const [poolMessage, setPoolMessage] = useState('')
  const [joinQuantity, setJoinQuantity] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSearchQuery, setActiveSearchQuery] = useState('')
  const [distanceFilter, setDistanceFilter] = useState('')
  const [showMapAdvancedSearch, setShowMapAdvancedSearch] = useState(false)
  const [mapAdvancedFilters, setMapAdvancedFilters] = useState({
    category: '',
    price: '',
    size: '',
    fullness: '',
    rating: '',
    deadlineDays: '',
  })
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [homeSearchQuery, setHomeSearchQuery] = useState('')
  const [homeDistanceFilter, setHomeDistanceFilter] = useState('')
  const [showHomeAdvancedSearch, setShowHomeAdvancedSearch] = useState(false)
  const [homeAdvancedFilters, setHomeAdvancedFilters] = useState({
    category: '',
    price: '',
    size: '',
    fullness: '',
    rating: '',
    deadlineDays: '',
  })
  const [homeSearchResults, setHomeSearchResults] = useState<Pool[]>([])
  const [showHomeDropdown, setShowHomeDropdown] = useState(false)
  const [displayedPools, setDisplayedPools] = useState<Pool[]>([])
  const [selectedLocation, setSelectedLocation] = useState<{ lng: number; lat: number } | null>(null)
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null)
  const [pools, setPools] = useState<Pool[]>([])
  const [userRequests, setUserRequests] = useState<UserRequest[]>([])
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({})
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | null>(null)
  const [homeRequestMessage, setHomeRequestMessage] = useState('')
  const [requestTab, setRequestTab] = useState<'incoming' | 'outgoing'>('incoming')
  const [dismissedFulfilledPoolIds, setDismissedFulfilledPoolIds] = useState<string[]>([])
  const [poolToClose, setPoolToClose] = useState<Pool | null>(null)
  const [closeRatings, setCloseRatings] = useState<Record<string, string>>({})
  const [closePoolMessage, setClosePoolMessage] = useState('')
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const selectedLocationMarkerRef = useRef<maplibregl.Marker | null>(null)
  const hasAutoRetriedRef = useRef(false)

  const selectedPool = useMemo(
    () => pools.find((pool) => pool.id === selectedPoolId) ?? null,
    [pools, selectedPoolId],
  )

  const selectedProfile = useMemo(
    () => (selectedProfileUserId ? userProfiles[selectedProfileUserId] ?? null : null),
    [selectedProfileUserId, userProfiles],
  )

  const isPoolFulfilled = (pool: Pool): boolean => pool.currentTotal >= pool.quantityGoal

  const closeRatingTargets = useMemo<CloseRatingTarget[]>(() => {
    if (!poolToClose || !currentUser?.userId) {
      return []
    }

    const hostUserId = poolToClose.hostUserId ?? poolToClose.participants[0]?.userId
    const hostedByCurrentUser = Boolean(hostUserId && hostUserId === currentUser.userId)

    if (hostedByCurrentUser) {
      return poolToClose.participants
        .filter((participant) => participant.userId !== currentUser.userId)
        .map((participant) => ({ userId: participant.userId, username: participant.username, isHostReview: false }))
    }

    const hostParticipant = poolToClose.participants.find((participant) => participant.userId === hostUserId)
    if (!hostUserId || !hostParticipant) {
      return []
    }

    return [{ userId: hostUserId, username: hostParticipant.username, isHostReview: true }]
  }, [poolToClose, currentUser?.userId])

  const myParticipantPools = useMemo(() => {
    if (!currentUser?.userId) {
      return []
    }
    return pools.filter(
      (pool) =>
        !dismissedFulfilledPoolIds.includes(pool.id) &&
        pool.participants.some((participant) => participant.userId === currentUser.userId),
    )
  }, [currentUser?.userId, pools, dismissedFulfilledPoolIds])

  const incomingHostRequests = useMemo(() => {
    if (!currentUser?.userId) {
      return []
    }
    return userRequests.filter(
      (request) => request.direction === 'incoming' && request.status === 'pending' && request.toUserId === currentUser.userId,
    )
  }, [currentUser?.userId, userRequests])

  const outgoingRequests = useMemo(
    () => userRequests.filter((request) => request.direction === 'outgoing'),
    [userRequests],
  )

  const pendingRequestCount = userRequests.filter((request) => request.direction === 'incoming' && request.status === 'pending').length

  const getPoolMarkerColor = (pool: Pool): string => {
    const fullness = Math.max(0, Math.min(1, pool.currentTotal / pool.quantityGoal))
    const hue = 120 - fullness * 120
    return `hsl(${hue}, 85%, 45%)`
  }

  const renderStars = (rating: number): string => {
    const rounded = Math.round(Math.max(0, Math.min(5, rating)))
    return `${'★'.repeat(rounded)}${'☆'.repeat(5 - rounded)}`
  }

  const isHostedByCurrentUser = (pool: Pool): boolean => {
    if (!currentUser?.userId) {
      return false
    }
    const hostId = pool.hostUserId ?? pool.participants[0]?.userId
    return hostId === currentUser.userId
  }

  const isCurrentUserInPool = (pool: Pool): boolean => {
    if (!currentUser?.userId) {
      return false
    }
    return pool.participants.some((participant) => participant.userId === currentUser.userId)
  }

  const hasValidCoordinates = (pool: Pool): boolean =>
    Number.isFinite(pool.longitude) &&
    Number.isFinite(pool.latitude) &&
    pool.longitude >= -180 &&
    pool.longitude <= 180 &&
    pool.latitude >= -90 &&
    pool.latitude <= 90

  const hasHomeAdvancedFilters = Boolean(
    homeAdvancedFilters.category ||
      homeAdvancedFilters.price ||
      homeAdvancedFilters.size ||
      homeAdvancedFilters.fullness ||
      homeAdvancedFilters.rating ||
      homeAdvancedFilters.deadlineDays,
  )

  const hasMapAdvancedFilters = Boolean(
    mapAdvancedFilters.category ||
      mapAdvancedFilters.price ||
      mapAdvancedFilters.size ||
      mapAdvancedFilters.fullness ||
      mapAdvancedFilters.rating ||
      mapAdvancedFilters.deadlineDays,
  )

  useEffect(() => {
    if (!navigator.geolocation) {
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude })
      },
      () => undefined,
    )
  }, [])

  // Reset + reinitialise the map every time we enter the app view,
  // because the map container is unmounted while on home/auth pages.
  useEffect(() => {
    if (view !== 'app') return
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }
    setMapReady(false)
    setMapError(false)
    setMapRetryCount((c) => c + 1)
  }, [view])

  useEffect(() => {
    let cancelled = false

    const refreshPools = async () => {
      try {
        const poolsResponse = await fetch('/api/pools')
        const poolsData = await parseApiResponse(poolsResponse)
        if (!poolsResponse.ok) {
          return
        }

        const latestPools: Pool[] = poolsData.pools ?? []
        if (cancelled) {
          return
        }

        setPools(latestPools)

        if (!activeSearchQuery && !distanceFilter && !hasMapAdvancedFilters) {
          setDisplayedPools(latestPools.filter((pool) => !isPoolFulfilled(pool)))
        }

        if (!homeSearchQuery.trim() && !homeDistanceFilter && !hasHomeAdvancedFilters) {
          setHomeSearchResults([])
          return
        }

        const searchParams = new URLSearchParams()
        if (homeSearchQuery.trim()) searchParams.set('q', homeSearchQuery)
        if (homeAdvancedFilters.category) searchParams.set('category', homeAdvancedFilters.category)
        if (homeAdvancedFilters.price) searchParams.set('price', homeAdvancedFilters.price)
        if (homeAdvancedFilters.size) searchParams.set('size', homeAdvancedFilters.size)
        if (homeAdvancedFilters.fullness) searchParams.set('fullness', homeAdvancedFilters.fullness)
        if (homeAdvancedFilters.rating) searchParams.set('rating', homeAdvancedFilters.rating)
        if (homeAdvancedFilters.deadlineDays) {
          const deadlineBefore = new Date(Date.now() + Number(homeAdvancedFilters.deadlineDays) * 24 * 60 * 60 * 1000)
          searchParams.set('deadlineBefore', deadlineBefore.toISOString())
        }
        if (homeDistanceFilter && userLocation) {
          searchParams.set('distance', (Number(homeDistanceFilter) / 111).toFixed(6))
          searchParams.set('lng', String(userLocation.lng))
          searchParams.set('lat', String(userLocation.lat))
        }

        const homeResponse = await fetch(`/api/search?${searchParams}`)
        const homeData = await parseApiResponse(homeResponse)

        if (!cancelled && homeResponse.ok) {
          setHomeSearchResults(homeData.pools ?? [])
        }
      } catch {
        if (!cancelled) {
          setPools([])
        }
      }

      if (!activeSearchQuery && !distanceFilter && !hasMapAdvancedFilters) {
        return
      }

      try {
        const params = new URLSearchParams()
        if (activeSearchQuery) params.set('q', activeSearchQuery)
        if (mapAdvancedFilters.category) params.set('category', mapAdvancedFilters.category)
        if (mapAdvancedFilters.price) params.set('price', mapAdvancedFilters.price)
        if (mapAdvancedFilters.size) params.set('size', mapAdvancedFilters.size)
        if (mapAdvancedFilters.fullness) params.set('fullness', mapAdvancedFilters.fullness)
        if (mapAdvancedFilters.rating) params.set('rating', mapAdvancedFilters.rating)
        if (mapAdvancedFilters.deadlineDays) {
          const deadlineBefore = new Date(Date.now() + Number(mapAdvancedFilters.deadlineDays) * 24 * 60 * 60 * 1000)
          params.set('deadlineBefore', deadlineBefore.toISOString())
        }
        if (distanceFilter && userLocation) {
          params.set('distance', (Number(distanceFilter) / 111).toFixed(6))
          params.set('lng', String(userLocation.lng))
          params.set('lat', String(userLocation.lat))
        }

        const response = await fetch(`/api/search?${params}`)
        const data = await parseApiResponse(response)

        if (!cancelled && response.ok) {
          setDisplayedPools((data.pools ?? []).filter((pool: Pool) => !isPoolFulfilled(pool)))
        }
      } catch {
        if (!cancelled) {
          setDisplayedPools([])
        }
      }
    }

    refreshPools()
    const pollId = window.setInterval(refreshPools, 1000)

    return () => {
      cancelled = true
      window.clearInterval(pollId)
    }
  }, [
    activeSearchQuery,
    distanceFilter,
    hasHomeAdvancedFilters,
    homeAdvancedFilters,
    homeSearchQuery,
    homeDistanceFilter,
    hasMapAdvancedFilters,
    mapAdvancedFilters,
    userLocation,
  ])

  useEffect(() => {
    if (!currentUser?.userId) {
      setUserRequests([])
      return
    }

    let cancelled = false

    const refreshUserRequests = async () => {
      try {
        const response = await fetch(`/api/users/${currentUser.userId}/requests`)
        const data = await parseApiResponse(response)

        if (!cancelled && response.ok) {
          setUserRequests(Array.isArray(data.requests) ? data.requests : [])
        }
      } catch {
        if (!cancelled) {
          setUserRequests([])
        }
      }
    }

    void refreshUserRequests()
    const pollId = window.setInterval(() => {
      void refreshUserRequests()
    }, 1000)

    return () => {
      cancelled = true
      window.clearInterval(pollId)
    }
  }, [currentUser?.userId])

  useEffect(() => {
    if (!selectedPool) {
      return
    }

    const participantIds = Array.from(new Set(selectedPool.participants.map((participant) => participant.userId)))

    const loadProfiles = async () => {
      const loadedProfiles: Record<string, UserProfile> = {}

      await Promise.all(participantIds.map(async (userId) => {
        try {
          const response = await fetch(`/api/users/${userId}/profile`)
          const data = await parseApiResponse(response)
          if (response.ok && data.profile) {
            loadedProfiles[userId] = data.profile as UserProfile
          }
        } catch {
          // Ignore profile lookup failures for individual users.
        }
      }))

      if (Object.keys(loadedProfiles).length > 0) {
        setUserProfiles((current) => ({ ...current, ...loadedProfiles }))
      }
    }

    void loadProfiles()
  }, [selectedPool])

  const retryMap = (source: 'manual' | 'auto' = 'manual') => {
    if (source === 'auto' && hasAutoRetriedRef.current) {
      return
    }

    if (source === 'auto') {
      hasAutoRetriedRef.current = true
    }

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }

    if (mapContainerRef.current) {
      mapContainerRef.current.innerHTML = ''
    }

    setMapReady(false)
    setMapError(false)
    setMapRetryCount((current) => current + 1)
  }

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) {
      return
    }

    const container = mapContainerRef.current
    const defaultCenter: [number, number] = userLocation
      ? [userLocation.lng, userLocation.lat]
      : [groupBuys[0].position.lng, groupBuys[0].position.lat]

    const initializeMap = () => {
      if (!container.isConnected || !container.clientWidth || !container.clientHeight) {
        window.setTimeout(initializeMap, 150)
        return
      }

      const map = new maplibregl.Map({
        container,
        style: normalMapStyleUrl,
        center: defaultCenter,
        zoom: userLocation ? 13 : 12,
        attributionControl: false,
      })

      mapInstanceRef.current = map

      map.addControl(new maplibregl.NavigationControl(), 'top-right')
      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')

      const resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(() => map.resize())
      })
      resizeObserver.observe(container)

      let settled = false

      const markReady = () => {
        if (settled) {
          return
        }
        settled = true
        setMapError(false)
        setMapReady(true)
        requestAnimationFrame(() => map.resize())
      }

      const timeoutId = window.setTimeout(() => {
        if (!settled) {
          setMapError(true)
          retryMap('auto')
        }
      }, 8000)

      map.on('load', () => {
        window.clearTimeout(timeoutId)
        markReady()
      })

      map.on('error', () => {
        setMapError(true)
      })

      map.on('click', (event) => {
        const { lng, lat } = event.lngLat
        setSelectedLocation({ lng, lat })
        setSelectedPoolId(null)
        setPoolForm((current) => ({
          ...current,
          longitude: lng.toFixed(6),
          latitude: lat.toFixed(6),
        }))

        if (selectedLocationMarkerRef.current) {
          selectedLocationMarkerRef.current.remove()
        }

        selectedLocationMarkerRef.current = new maplibregl.Marker({ color: '#ef4444' })
          .setLngLat([lng, lat])
          .addTo(map)
      })

      return () => {
        window.clearTimeout(timeoutId)
        resizeObserver.disconnect()
      }
    }

    const timerId = window.setTimeout(initializeMap, 0)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [userLocation, mapRetryCount])

  useEffect(() => {
    const run = async () => {
      if (!activeSearchQuery && !distanceFilter && !hasMapAdvancedFilters) {
        setDisplayedPools(pools.filter((pool) => !isPoolFulfilled(pool)))
        return
      }
      try {
        const params = new URLSearchParams()
        if (activeSearchQuery) params.set('q', activeSearchQuery)
        if (mapAdvancedFilters.category) params.set('category', mapAdvancedFilters.category)
        if (mapAdvancedFilters.price) params.set('price', mapAdvancedFilters.price)
        if (mapAdvancedFilters.size) params.set('size', mapAdvancedFilters.size)
        if (mapAdvancedFilters.fullness) params.set('fullness', mapAdvancedFilters.fullness)
        if (mapAdvancedFilters.rating) params.set('rating', mapAdvancedFilters.rating)
        if (mapAdvancedFilters.deadlineDays) {
          const deadlineBefore = new Date(Date.now() + Number(mapAdvancedFilters.deadlineDays) * 24 * 60 * 60 * 1000)
          params.set('deadlineBefore', deadlineBefore.toISOString())
        }
        if (distanceFilter && userLocation) {
          params.set('distance', (Number(distanceFilter) / 111).toFixed(6))
          params.set('lng', String(userLocation.lng))
          params.set('lat', String(userLocation.lat))
        }
        const response = await fetch(`/api/search?${params}`)
        const data = await parseApiResponse(response)
        if (response.ok) {
          setDisplayedPools((data.pools ?? []).filter((pool: Pool) => !isPoolFulfilled(pool)))
          setShowSearchResults(true)
        }
      } catch {
        setDisplayedPools(pools.filter((pool) => !isPoolFulfilled(pool)))
      }
    }
    run()
  }, [activeSearchQuery, distanceFilter, hasMapAdvancedFilters, mapAdvancedFilters, pools, userLocation])

  useEffect(() => {
    if (!homeSearchQuery.trim() && !homeDistanceFilter && !hasHomeAdvancedFilters) {
      setHomeSearchResults([])
      setShowHomeDropdown(false)
      return
    }
    const run = async () => {
      try {
        const params = new URLSearchParams()
        if (homeSearchQuery.trim()) params.set('q', homeSearchQuery)
        if (homeAdvancedFilters.category) params.set('category', homeAdvancedFilters.category)
        if (homeAdvancedFilters.price) params.set('price', homeAdvancedFilters.price)
        if (homeAdvancedFilters.size) params.set('size', homeAdvancedFilters.size)
        if (homeAdvancedFilters.fullness) params.set('fullness', homeAdvancedFilters.fullness)
        if (homeAdvancedFilters.rating) params.set('rating', homeAdvancedFilters.rating)
        if (homeAdvancedFilters.deadlineDays) {
          const deadlineBefore = new Date(Date.now() + Number(homeAdvancedFilters.deadlineDays) * 24 * 60 * 60 * 1000)
          params.set('deadlineBefore', deadlineBefore.toISOString())
        }
        if (homeDistanceFilter && userLocation) {
          params.set('distance', (Number(homeDistanceFilter) / 111).toFixed(6))
          params.set('lng', String(userLocation.lng))
          params.set('lat', String(userLocation.lat))
        }
        const response = await fetch(`/api/search?${params}`)
        const data = await parseApiResponse(response)
        if (response.ok) {
          setHomeSearchResults(data.pools ?? [])
          setShowHomeDropdown(true)
        }
      } catch {
        setHomeSearchResults([])
      }
    }
    run()
  }, [homeSearchQuery, homeDistanceFilter, homeAdvancedFilters, hasHomeAdvancedFilters, userLocation])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !mapReady) {
      return
    }

    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = displayedPools.filter(hasValidCoordinates).map((pool) => {
      const marker = new maplibregl.Marker({ color: getPoolMarkerColor(pool) })
        .setLngLat([pool.longitude, pool.latitude])
        .addTo(map)

      if (isHostedByCurrentUser(pool)) {
        marker.getElement().classList.add('pool-marker-hosted')
      }

      marker.getElement().addEventListener('click', (event) => {
        event.stopPropagation()
        setSelectedPoolId(pool.id)
        setSelectedLocation(null)
      })
      return marker
    })
  }, [currentUser?.userId, mapReady, displayedPools])

  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady) {
      return
    }

    if (selectedPool && hasValidCoordinates(selectedPool)) {
      mapInstanceRef.current.flyTo({
        center: [selectedPool.longitude, selectedPool.latitude],
        zoom: 13,
        essential: true,
      })
    }
  }, [pools, selectedPool, selectedPoolId, mapReady, displayedPools])

  const parseApiResponse = async (response: Response) => {
    const text = await response.text()

    if (!text) {
      return {}
    }

    try {
      return JSON.parse(text)
    } catch {
      return { message: text }
    }
  }

  const handleLoginChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setLoginData((current) => ({ ...current, [name]: value }))
  }

  const handleSignupChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setSignupData((current) => ({ ...current, [name]: value }))
  }

  const handlePoolFormChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target
    setPoolForm((current) => ({ ...current, [name]: value }))
  }

  const parseDeadlineInput = (dateInput: string, timeInput: string): Date | null => {
    const match = dateInput.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (!match) {
      return null
    }

    const timeMatch = timeInput.trim().match(/^(\d{2}):(\d{2})$/)
    if (!timeMatch) {
      return null
    }

    const year = Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])
    const hour = Number(timeMatch[1])
    const minute = Number(timeMatch[2])
    const parsed = new Date(year, month - 1, day, hour, minute, 0, 0)

    if (
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day ||
      parsed.getHours() !== hour ||
      parsed.getMinutes() !== minute
    ) {
      return null
    }

    return parsed
  }

  const handlePoolSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!currentUser?.userId) {
      setPoolMessage('Please sign in before creating a pool.')
      return
    }

    const deadlineDate = parseDeadlineInput(poolForm.deadlineDate, poolForm.deadlineTime)
    if (!deadlineDate) {
      setPoolMessage('Deadline date/time is invalid. Use date picker and enter time as HH:mm.')
      return
    }

    const now = new Date()
    const maxDeadline = new Date(now.getTime() + 50 * 24 * 60 * 60 * 1000)
    if (deadlineDate <= now) {
      setPoolMessage('Deadline must be in the future.')
      return
    }

    if (deadlineDate > maxDeadline) {
      setPoolMessage('Deadline must be within 50 days from now.')
      return
    }

    try {
      const response = await fetch('/api/pools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.userId,
          category: poolForm.category,
          itemName: poolForm.itemName,
          desc: poolForm.desc,
          price: Number(poolForm.price),
          quantityGoal: Number(poolForm.quantityGoal),
          deadline: deadlineDate.toISOString(),
          longitude: Number(poolForm.longitude),
          latitude: Number(poolForm.latitude),
          hostquantity: Number(poolForm.hostquantity),
        }),
      })

      const data = await parseApiResponse(response)

      if (!response.ok) {
        throw new Error(data.message || 'Unable to create pool.')
      }

      setPoolMessage('Pool created successfully.')
      const createdPool = data.pool
      if (createdPool) {
        setPools((current) => [...current, createdPool])
      }
      setPoolForm({
        category: '',
        itemName: '',
        desc: '',
        price: '',
        quantityGoal: '',
        deadlineDate: '',
        deadlineTime: '',
        longitude: '',
        latitude: '',
        hostquantity: '',
      })
    } catch (error) {
      setPoolMessage(error instanceof Error ? error.message : 'Unable to create pool.')
    }
  }

  const handleJoinPool = async (poolId: string) => {
    try {
      const response = await fetch(`/api/pools/${poolId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser?.userId, quantity: joinQuantity }),
      })

      const data = await parseApiResponse(response)

      if (!response.ok) {
        throw new Error(data.message || 'Unable to join pool.')
      }

      setPoolMessage(data.message || 'Join request sent to host.')
    } catch (error) {
      setPoolMessage(error instanceof Error ? error.message : 'Unable to join pool.')
    }
  }

  const handleDeclineRequest = async (requestId: string) => {
    if (!currentUser?.userId) {
      return
    }

    try {
      const response = await fetch(`/api/requests/${requestId}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.userId }),
      })

      const data = await parseApiResponse(response)

      if (!response.ok) {
        throw new Error(data.message || 'Unable to decline request.')
      }

      setUserRequests((current) => current.filter((request) => request.requestId !== requestId || request.direction !== 'incoming'))
      setHomeRequestMessage('Request declined.')
    } catch (error) {
      setHomeRequestMessage(error instanceof Error ? error.message : 'Unable to decline request.')
    }
  }

  const handleCancelOutgoingRequest = async (requestId: string) => {
    if (!currentUser?.userId) {
      return
    }

    try {
      const response = await fetch(`/api/requests/${requestId}/outgoing/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.userId }),
      })

      const data = await parseApiResponse(response)

      if (!response.ok) {
        throw new Error(data.message || 'Unable to cancel request.')
      }

      setUserRequests((current) => current.filter((request) => !(request.requestId === requestId && request.direction === 'outgoing')))
      setHomeRequestMessage('Outgoing request cancelled.')
    } catch (error) {
      setHomeRequestMessage(error instanceof Error ? error.message : 'Unable to cancel request.')
    }
  }

  const handleCloseRejectedOutgoingRequest = async (requestId: string) => {
    if (!currentUser?.userId) {
      return
    }

    try {
      const response = await fetch(`/api/requests/${requestId}/outgoing/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.userId }),
      })

      const data = await parseApiResponse(response)

      if (!response.ok) {
        throw new Error(data.message || 'Unable to close request.')
      }

      setUserRequests((current) => current.filter((request) => !(request.requestId === requestId && request.direction === 'outgoing')))
      setHomeRequestMessage('Rejected request removed.')
    } catch (error) {
      setHomeRequestMessage(error instanceof Error ? error.message : 'Unable to close request.')
    }
  }

  const handleOpenUserProfile = async (userId: string) => {
    setSelectedProfileUserId(userId)
    if (userProfiles[userId]) {
      return
    }

    try {
      const response = await fetch(`/api/users/${userId}/profile`)
      const data = await parseApiResponse(response)
      if (response.ok && data.profile) {
        setUserProfiles((current) => ({ ...current, [userId]: data.profile as UserProfile }))
      }
    } catch {
      // Keep popup open with loading fallback.
    }
  }

  const handleAcceptRequest = async (requestId: string, poolId: string) => {
    if (!currentUser?.userId) {
      return
    }

    try {
      const response = await fetch(`/api/requests/${requestId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.userId }),
      })

      const data = await parseApiResponse(response)

      if (!response.ok) {
        throw new Error(data.message || 'Unable to accept request.')
      }

      setUserRequests((current) => current.filter((request) => request.requestId !== requestId || request.direction !== 'incoming'))

      if (data.removed || !data.pool) {
        setPools((current) => current.filter((pool) => pool.id !== poolId))
        setDisplayedPools((current) => current.filter((pool) => pool.id !== poolId))
        setSelectedPoolId((current) => (current === poolId ? null : current))
        setHomeRequestMessage('Request accepted. Pool is now fulfilled/closed and has been removed.')
        return
      }

      const updatedPool = data.pool as Pool
      setPools((current) => current.map((pool) => (pool.id === updatedPool.id ? updatedPool : pool)))
      setDisplayedPools((current) => {
        if (updatedPool.currentTotal >= updatedPool.quantityGoal) {
          return current.filter((pool) => pool.id !== updatedPool.id)
        }
        return current.map((pool) => (pool.id === updatedPool.id ? updatedPool : pool))
      })
      setHomeRequestMessage('Request accepted.')
    } catch (error) {
      setHomeRequestMessage(error instanceof Error ? error.message : 'Unable to accept request.')
    }
  }

  const handleLeaveOrCancelPool = async (pool: Pool) => {
    if (!currentUser?.userId) {
      return
    }

    const hostedByMe = isHostedByCurrentUser(pool)

    try {
      if (!hostedByMe) {
        const response = await fetch(`/api/pools/${pool.id}/leave`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.userId }),
        })
        const data = await parseApiResponse(response)
        if (!response.ok) {
          throw new Error(data.message || 'Unable to leave pool.')
        }

        setPools((current) => current.map((candidate) => {
          if (candidate.id !== pool.id) {
            return candidate
          }
          return {
            ...candidate,
            participants: candidate.participants.filter((participant) => participant.userId !== currentUser.userId),
            currentTotal: Math.max(0, candidate.currentTotal - (candidate.participants.find((participant) => participant.userId === currentUser.userId)?.quantity ?? 0)),
          }
        }))
        setDisplayedPools((current) => current.map((candidate) => {
          if (candidate.id !== pool.id) {
            return candidate
          }
          return {
            ...candidate,
            participants: candidate.participants.filter((participant) => participant.userId !== currentUser.userId),
            currentTotal: Math.max(0, candidate.currentTotal - (candidate.participants.find((participant) => participant.userId === currentUser.userId)?.quantity ?? 0)),
          }
        }))
        setHomeRequestMessage('Left pool successfully.')
        return
      }

      const response = await fetch(`/api/pools/${pool.id}/host/${currentUser.userId}`, {
        method: 'DELETE',
      })
      const data = await parseApiResponse(response)
      if (!response.ok) {
        throw new Error(data.message || 'Unable to cancel pool.')
      }

      setPools((current) => current.filter((candidate) => candidate.id !== pool.id))
      setDisplayedPools((current) => current.filter((candidate) => candidate.id !== pool.id))
      setSelectedPoolId((current) => (current === pool.id ? null : current))
      setHomeRequestMessage('Hosted pool cancelled.')
    } catch (error) {
      setHomeRequestMessage(error instanceof Error ? error.message : 'Unable to update pool participation.')
    }
  }

  const handleOpenClosePool = (pool: Pool) => {
    setPoolToClose(pool)
    const initialRatings: Record<string, string> = {}

    if (currentUser?.userId) {
      if (isHostedByCurrentUser(pool)) {
        pool.participants
          .filter((participant) => participant.userId !== currentUser.userId)
          .forEach((participant) => {
            initialRatings[participant.userId] = ''
          })
      } else {
        const hostUserId = pool.hostUserId ?? pool.participants[0]?.userId
        if (hostUserId) {
          initialRatings[hostUserId] = ''
        }
      }
    }

    setCloseRatings(initialRatings)
    setClosePoolMessage('')
  }

  const handleClosePoolSubmit = async () => {
    if (!currentUser?.userId || !poolToClose) {
      return
    }

    const ratingsToSubmit = Object.entries(closeRatings)
      .map(([userId, value]) => ({ userId, rating: Number(value) }))
      .filter(({ rating }) => Number.isFinite(rating) && rating >= 1 && rating <= 5)

    try {
      await Promise.all(ratingsToSubmit.map(async ({ userId, rating }) => {
        const target = closeRatingTargets.find((candidate) => candidate.userId === userId)
        if (!target) {
          return
        }

        const response = await fetch('/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reviewerId: currentUser.userId,
            revieweeId: userId,
            rating,
            comment: '',
            isHost: target.isHostReview,
          }),
        })
        const data = await parseApiResponse(response)
        if (!response.ok) {
          throw new Error(data.message || 'Unable to submit rating.')
        }
      }))

      setDismissedFulfilledPoolIds((current) => (current.includes(poolToClose.id) ? current : [...current, poolToClose.id]))
      setPoolToClose(null)
      setClosePoolMessage('')
      setHomeRequestMessage('Pool closed.')
    } catch (error) {
      setClosePoolMessage(error instanceof Error ? error.message : 'Unable to submit ratings right now. Please try again.')
    }
  }

  const handleRedoReset = async () => {
    const confirmed = window.confirm('Reset all app data? This will delete all users and pools.')
    if (!confirmed) {
      return
    }

    try {
      const response = await fetch('/api/reset', {
        method: 'POST',
      })
      const data = await parseApiResponse(response)

      if (!response.ok) {
        throw new Error(data.message || 'Unable to reset data.')
      }

      setPools(Array.isArray(data.pools) ? data.pools : [])
      setDisplayedPools(Array.isArray(data.pools) ? data.pools.filter((pool: Pool) => !isPoolFulfilled(pool)) : [])
      setSelectedPoolId(null)
      setSelectedLocation(null)
      setPoolMessage('Data reset complete.')
      setDismissedFulfilledPoolIds([])
      if (selectedLocationMarkerRef.current) {
        selectedLocationMarkerRef.current.remove()
        selectedLocationMarkerRef.current = null
      }
      retryMap('manual')
    } catch (error) {
      setPoolMessage(error instanceof Error ? error.message : 'Unable to reset data.')
    }
  }

  const handleLoadMockDemo = async () => {
    const confirmed = window.confirm('Load mock demo data? This will reset current users, pools, and requests.')
    if (!confirmed) {
      return
    }

    try {
      const response = await fetch('/api/mockdemo', {
        method: 'POST',
      })
      const data = await parseApiResponse(response)

      if (!response.ok) {
        throw new Error(data.message || 'Unable to load mock demo data.')
      }

      const loadedPools = Array.isArray(data.pools) ? (data.pools as Pool[]) : []
      setPools(loadedPools)
      setDisplayedPools(loadedPools.filter((pool) => !isPoolFulfilled(pool)))
      setHomeSearchResults([])
      setShowHomeDropdown(false)
      setUserRequests([])
      setUserProfiles({})
      setSelectedPoolId(null)
      setSelectedLocation(null)
      setDismissedFulfilledPoolIds([])
      setPoolToClose(null)
      setCloseRatings({})
      setClosePoolMessage('')

      if (selectedLocationMarkerRef.current) {
        selectedLocationMarkerRef.current.remove()
        selectedLocationMarkerRef.current = null
      }

      setCurrentUser(null)
      setView('auth')
      setAuthMode('login')
      setLoginData({ email: 'antony@gmail.com', password: 'Password123!' })
      setAuthMessage('Mock demo data loaded. Sign in with the prefilled demo account.')
    } catch (error) {
      setHomeRequestMessage(error instanceof Error ? error.message : 'Unable to load mock demo data.')
    }
  }

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!loginData.email || !loginData.password) {
      setAuthMessage('Please enter both your email and password.')
      return
    }

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginData.email,
          password: loginData.password,
        }),
      })

      const data = await parseApiResponse(response)

      if (!response.ok) {
        throw new Error(data.message || 'Unable to sign in right now.')
      }

      setCurrentUser(data.user ?? null)
      setAuthMessage(`Welcome back, ${data.user?.username || loginData.email}!`)
      setView('home')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sign in right now.'
      setAuthMessage(message)
    }
  }

  const handleSignupSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!signupData.username || !signupData.email || !signupData.password || !signupData.phoneNumber) {
      setAuthMessage('Please fill in every field to create an account.')
      return
    }

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData),
      })

      const data = await parseApiResponse(response)

      if (!response.ok) {
        throw new Error(data.message || 'Unable to create account right now.')
      }

      setAuthMessage('Account created. You can sign in now.')
      setLoginData({ email: signupData.email, password: '' })
      setAuthMode('login')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create account right now.'
      setAuthMessage(message)
    }
  }

  if (view === 'home') {
    return (
      <main className="home-page" onClick={() => setShowHomeDropdown(false)}>
        <aside className="home-my-pools home-my-pools-rail" onClick={(e) => e.stopPropagation()}>
          <div className="home-my-pools-header">
            <h3>Your pools</h3>
            <span>{myParticipantPools.length}</span>
          </div>
          {myParticipantPools.length === 0 ? (
            <p className="home-my-pools-empty">You have not joined any pools yet.</p>
          ) : (
            <ul className="home-my-pools-list">
              {myParticipantPools.map((pool) => {
                const hostedByMe = isHostedByCurrentUser(pool)
                const fulfilled = isPoolFulfilled(pool)
                return (
                  <li
                    key={pool.id}
                    className={`home-my-pool-item${hostedByMe ? ' hosted' : ''}${fulfilled ? ' fulfilled' : ''}`}
                    onClick={() => {
                      setSelectedPoolId(pool.id)
                      setView('app')
                    }}
                  >
                    <div className="home-my-pool-top">
                      <strong>{pool.itemName}</strong>
                      {fulfilled
                        ? <span className="home-my-pool-badge fulfilled">Fulfilled</span>
                        : hostedByMe
                          ? <span className="home-my-pool-badge">Hosting</span>
                          : <span className="home-my-pool-badge muted">Joined</span>}
                    </div>
                    <span>{pool.category ?? 'Uncategorized'}</span>
                    <span className="dropdown-meta">{Math.max(0, pool.quantityGoal - pool.currentTotal)} remaining</span>
                    <button
                      type="button"
                      className="home-pool-action-btn"
                      onClick={(event) => {
                        event.stopPropagation()
                        if (fulfilled) {
                          handleOpenClosePool(pool)
                          return
                        }
                        void handleLeaveOrCancelPool(pool)
                      }}
                      disabled={!fulfilled && hostedByMe && pool.participants.length > 1}
                      title={!fulfilled && hostedByMe && pool.participants.length > 1 ? 'Host can only cancel if no one else has joined' : undefined}
                    >
                      {fulfilled ? 'Close pool' : hostedByMe ? 'Cancel pool' : 'Leave pool'}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>

        <aside className="home-requests home-requests-rail" onClick={(e) => e.stopPropagation()}>
          <div className="home-my-pools-header">
            <h3>Requests</h3>
            <span>{requestTab === 'incoming' ? incomingHostRequests.length : outgoingRequests.length}</span>
          </div>
          <div className="home-request-tabs">
            <button
              type="button"
              className={`home-request-tab${requestTab === 'incoming' ? ' active' : ''}`}
              onClick={() => setRequestTab('incoming')}
            >
              Incoming
            </button>
            <button
              type="button"
              className={`home-request-tab${requestTab === 'outgoing' ? ' active' : ''}`}
              onClick={() => setRequestTab('outgoing')}
            >
              Outgoing
            </button>
          </div>

          {requestTab === 'incoming' ? (
            incomingHostRequests.length === 0 ? (
              <p className="home-my-pools-empty">No incoming requests for your hosted pools.</p>
            ) : (
              <ul className="home-my-pools-list">
                {incomingHostRequests.map((request) => {
                  const requestPool = pools.find((pool) => pool.id === request.poolId)
                  return (
                    <li key={request.requestId} className="home-request-item">
                      <strong>{requestPool?.itemName ?? 'Unknown pool'}</strong>
                      <span>From: {request.fromUsername ?? request.fromUserId}</span>
                      <span>Requested qty: {request.quantity}</span>
                      <div className="home-request-actions">
                        <button
                          type="button"
                          className="home-request-accept"
                          onClick={() => void handleAcceptRequest(request.requestId, request.poolId)}
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          className="home-request-decline"
                          onClick={() => void handleDeclineRequest(request.requestId)}
                        >
                          Decline
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )
          ) : (
            outgoingRequests.length === 0 ? (
              <p className="home-my-pools-empty">No outgoing requests yet.</p>
            ) : (
              <ul className="home-my-pools-list">
                {outgoingRequests.map((request) => {
                  const requestPool = pools.find((pool) => pool.id === request.poolId)
                  const statusClass = request.status === 'accepted' ? ' accepted' : request.status === 'rejected' ? ' rejected' : ' pending'
                  return (
                    <li key={request.requestId} className={`home-request-item outgoing${statusClass}`}>
                      {request.status === 'rejected' || request.status === 'accepted' ? (
                        <button
                          type="button"
                          className="home-request-close"
                          title={request.status === 'accepted' ? 'Remove accepted request' : 'Remove rejected request'}
                          onClick={() => {
                            if (request.status === 'accepted') {
                              void handleCancelOutgoingRequest(request.requestId)
                              return
                            }
                            void handleCloseRejectedOutgoingRequest(request.requestId)
                          }}
                        >
                          ✕
                        </button>
                      ) : null}
                      <strong>{requestPool?.itemName ?? 'Unknown pool'}</strong>
                      <span>To: {request.toUsername ?? request.toUserId}</span>
                      <span>Requested qty: {request.quantity}</span>
                      <span className="home-request-status">Status: {request.status}</span>
                      {request.status === 'pending' ? (
                        <button
                          type="button"
                          className="home-request-cancel"
                          onClick={() => void handleCancelOutgoingRequest(request.requestId)}
                        >
                          Cancel request
                        </button>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            )
          )}
          {homeRequestMessage ? <p className="home-request-message">{homeRequestMessage}</p> : null}
        </aside>

        <header className="home-topbar">
          <div className="brand-row home-brand">
            <div className="brand-badge">N</div>
            <span className="brand-name">Neighbourly</span>
            {currentUser ? <span className="home-brand-user">@{currentUser.username}</span> : null}
          </div>
          <div className="home-topbar-actions">
            {currentUser ? (
              <span className="home-pending-count">
                {pendingRequestCount} pending request{pendingRequestCount === 1 ? '' : 's'}
              </span>
            ) : null}
            <button type="button" className="home-ghost-btn" onClick={() => void handleLoadMockDemo()}>
              Load mock demo
            </button>
            <button type="button" className="home-ghost-btn" onClick={() => { setView('auth'); setAuthMode('login'); setAuthMessage('') }}>
              Log out
            </button>
            <button type="button" className="home-start-btn" onClick={() => setView('app')}>
              Start a pool
            </button>
          </div>
        </header>

        <div className="home-hero">
          <h1 className="home-title">Find a Buy Pool<br />near you.</h1>
          <p className="home-subtitle">Split bulk purchases with neighbours. Save money, cut waste.</p>

          <div className="home-search-wrapper" onClick={(e) => e.stopPropagation()}>
            <form
              className="home-search-form"
              onSubmit={(e) => {
                e.preventDefault()
                if (homeSearchResults.length > 0) setShowHomeDropdown(true)
              }}
            >
              <input
                type="search"
                className="home-search-input"
                placeholder="Search for rice, soap, pasta…"
                value={homeSearchQuery}
                onChange={(e) => setHomeSearchQuery(e.target.value)}
                onFocus={() => homeSearchResults.length > 0 && setShowHomeDropdown(true)}
                autoFocus
              />
              <select
                className="home-distance-select"
                value={homeDistanceFilter}
                onChange={(e) => setHomeDistanceFilter(e.target.value)}
                disabled={!userLocation}
                title={userLocation ? 'Filter by distance' : 'Allow location access to filter by distance'}
              >
                <option value="">Any distance</option>
                <option value="1">Within 1 km</option>
                <option value="2">Within 2 km</option>
                <option value="5">Within 5 km</option>
                <option value="10">Within 10 km</option>
                <option value="25">Within 25 km</option>
              </select>
              <button
                type="button"
                className="home-map-btn"
                onClick={() => setView('app')}
              >
                Browse map →
              </button>
            </form>

            <div className="home-advanced-row">
              <button
                type="button"
                className={`home-advanced-toggle${showHomeAdvancedSearch ? ' active' : ''}`}
                onClick={() => setShowHomeAdvancedSearch((current) => !current)}
              >
                Advanced search
              </button>
            </div>

            {showHomeAdvancedSearch && (
              <div className="home-advanced-panel">
                <select
                  className="home-advanced-select"
                  value={homeAdvancedFilters.category}
                  onChange={(e) => setHomeAdvancedFilters((current) => ({ ...current, category: e.target.value }))}
                >
                  <option value="">Any category</option>
                  {poolCategories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                <select
                  className="home-advanced-select"
                  value={homeAdvancedFilters.price}
                  onChange={(e) => setHomeAdvancedFilters((current) => ({ ...current, price: e.target.value }))}
                >
                  <option value="">Any price</option>
                  <option value="5">Up to $5</option>
                  <option value="10">Up to $10</option>
                  <option value="20">Up to $20</option>
                  <option value="50">Up to $50</option>
                  <option value="100">Up to $100</option>
                </select>
                <select
                  className="home-advanced-select"
                  value={homeAdvancedFilters.size}
                  onChange={(e) => setHomeAdvancedFilters((current) => ({ ...current, size: e.target.value }))}
                >
                  <option value="">Any size</option>
                  <option value="5">Up to 5 units</option>
                  <option value="10">Up to 10 units</option>
                  <option value="20">Up to 20 units</option>
                  <option value="50">Up to 50 units</option>
                </select>
                <select
                  className="home-advanced-select"
                  value={homeAdvancedFilters.fullness}
                  onChange={(e) => setHomeAdvancedFilters((current) => ({ ...current, fullness: e.target.value }))}
                >
                  <option value="">Any fullness</option>
                  <option value="0.25">Up to 25% filled</option>
                  <option value="0.5">Up to 50% filled</option>
                  <option value="0.75">Up to 75% filled</option>
                  <option value="1">Any open pool</option>
                </select>
                <select
                  className="home-advanced-select"
                  value={homeAdvancedFilters.rating}
                  onChange={(e) => setHomeAdvancedFilters((current) => ({ ...current, rating: e.target.value }))}
                >
                  <option value="">Any host rating</option>
                  <option value="5">5.0+</option>
                  <option value="4">4.0+</option>
                  <option value="3">3.0+</option>
                  <option value="2">2.0+</option>
                </select>
                <select
                  className="home-advanced-select"
                  value={homeAdvancedFilters.deadlineDays}
                  onChange={(e) => setHomeAdvancedFilters((current) => ({ ...current, deadlineDays: e.target.value }))}
                >
                  <option value="">Any deadline</option>
                  <option value="1">Within 24 hours</option>
                  <option value="3">Within 3 days</option>
                  <option value="7">Within 7 days</option>
                  <option value="14">Within 14 days</option>
                  <option value="30">Within 30 days</option>
                </select>
              </div>
            )}

            {showHomeDropdown && homeSearchResults.length > 0 && (
              <ul className="home-dropdown">
                {homeSearchResults.map((pool) => {
                  const joined = isCurrentUserInPool(pool)
                  return (
                    <li
                      key={pool.id}
                      className={`home-dropdown-item${joined ? ' joined' : ''}`}
                      onClick={() => {
                        setSelectedPoolId(pool.id)
                        setShowHomeDropdown(false)
                        setHomeSearchQuery('')
                        setView('app')
                      }}
                    >
                      <strong>{pool.itemName}</strong>
                      <span>{pool.desc}</span>
                      {pool.category ? <span>{pool.category}</span> : null}
                      {joined ? <span className="joined-pill">Already joined</span> : null}
                      <span className="dropdown-meta">${pool.price} · {pool.quantityGoal - pool.currentTotal} remaining</span>
                    </li>
                  )
                })}
              </ul>
            )}

            {(homeSearchQuery || homeDistanceFilter || hasHomeAdvancedFilters) && !showHomeDropdown && homeSearchResults.length === 0 && (
              <div className="home-no-results">No pools found
                {homeSearchQuery ? ` for “${homeSearchQuery}”` : ''}
                {homeDistanceFilter ? ` within ${homeDistanceFilter} km` : ''}
                {homeAdvancedFilters.category ? ` in ${homeAdvancedFilters.category}` : ''}
              </div>
            )}
          </div>
        </div>

        {poolToClose && (
          <aside className="popup popup-profile">
            <div className="popup-header">
              <h3>Close pool</h3>
              <button
                type="button"
                className="popup-close"
                onClick={() => {
                  setPoolToClose(null)
                  setClosePoolMessage('')
                }}
              >
                ✕
              </button>
            </div>
            <div className="popup-body">
              <p className="pool-desc">{poolToClose.itemName}</p>
              {closeRatingTargets.length === 0 ? (
                <p className="pool-desc">No optional ratings available for this pool.</p>
              ) : (
                <div className="participants-section">
                  <p className="eyebrow">Optional ratings</p>
                  <ul className="participants-list">
                    {closeRatingTargets.map((target) => (
                      <li key={target.userId}>
                        <span className="participant-main">{target.username}</span>
                        <label className="input-group">
                          <span>Rating (1-5, optional)</span>
                          <select
                            value={closeRatings[target.userId] ?? ''}
                            onChange={(event) => setCloseRatings((current) => ({ ...current, [target.userId]: event.target.value }))}
                          >
                            <option value="">Skip</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                            <option value="5">5</option>
                          </select>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <button type="button" className="primary-btn" onClick={() => void handleClosePoolSubmit()}>
                Close pool
              </button>
              {closePoolMessage ? <p className="form-message success">{closePoolMessage}</p> : null}
            </div>
          </aside>
        )}
      </main>
    )
  }

  if (view === 'auth') {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="auth-hero">
            <div className="brand-row">
              <div className="brand-badge">N</div>
              <span>Neighbourly</span>
            </div>
            <h1>Welcome back</h1>
            <p>Log in to see local group buys, manage your shares, and keep your community updates close by.</p>
          </div>

          {authMode === 'login' ? (
            <form className="auth-form" onSubmit={handleLoginSubmit}>
              <h2>Log in</h2>
              <p className="auth-intro">Sign in to continue</p>

              <label className="input-group">
                <span>Email address</span>
                <input name="email" type="email" placeholder="you@example.com" value={loginData.email} onChange={handleLoginChange} />
              </label>

              <label className="input-group">
                <span>Password</span>
                <input name="password" type="password" placeholder="Enter your password" value={loginData.password} onChange={handleLoginChange} />
              </label>

              <button type="submit" className="primary-btn">
                Sign in
              </button>

              <button type="button" className="ghost-btn" onClick={() => setAuthMode('signup')}>
                Create an account
              </button>

              {authMessage ? <p className="form-message success">{authMessage}</p> : null}

              <p className="auth-link">
                Demo login: <strong>demo@example.com</strong> / <strong>Password123!</strong>
              </p>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleSignupSubmit}>
              <h2>Create account</h2>
              <p className="auth-intro">Join Neighbourly to start sharing group buys.</p>

              <label className="input-group">
                <span>Full name</span>
                <input name="username" placeholder="Kevin Li" value={signupData.username} onChange={handleSignupChange} />
              </label>

              <label className="input-group">
                <span>Email address</span>
                <input name="email" type="email" placeholder="you@example.com" value={signupData.email} onChange={handleSignupChange} />
              </label>

              <label className="input-group">
                <span>Password</span>
                <input name="password" type="password" placeholder="Choose a password" value={signupData.password} onChange={handleSignupChange} />
              </label>

              <label className="input-group">
                <span>Phone number</span>
                <input name="phoneNumber" placeholder="0400000000" value={signupData.phoneNumber} onChange={handleSignupChange} />
              </label>

              <button type="submit" className="primary-btn">
                Sign up
              </button>

              <button type="button" className="ghost-btn" onClick={() => setAuthMode('login')}>
                Back to sign in
              </button>

              {authMessage ? <p className="form-message success">{authMessage}</p> : null}
            </form>
          )}
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-row">
          <button type="button" className="ghost-btn" onClick={handleRedoReset}>
            Reset data
          </button>
          <div className="brand-badge">N</div>
          <span className="brand-name">Neighbourly</span>
        </div>
        <div className="topbar-actions">
          <button type="button" className="ghost-btn" onClick={() => setView('home')}>
            ← Home
          </button>
          
          <button type="button" className="ghost-btn" onClick={() => { setView('auth'); setAuthMode('login'); setAuthMessage('') }}>
            Log out
          </button>
        </div>
      </header>

      <div className="map-fullscreen">
        <div ref={mapContainerRef} className="map-canvas" />
        {!mapReady && <div className="map-loading">Loading map…</div>}
        {mapError && (
          <div className="map-error">
            Map failed to load.{' '}
            <button type="button" onClick={() => retryMap('manual')}>Retry</button>
          </div>
        )}
        <button type="button" className="map-reload-btn" title="Reload map" onClick={() => retryMap('manual')}>
          ↺
        </button>

        <div className="map-search-stack">
          <div className="map-search-island">
            <div className="map-search-cluster">
              <form
                className="search-bar"
                onSubmit={(e) => { e.preventDefault(); setActiveSearchQuery(searchQuery) }}
              >
                <input
                  type="search"
                  className="search-input"
                  placeholder="Search pools…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit" className="search-btn">Search</button>
                <button
                  type="button"
                  className={`filter-btn${showMapAdvancedSearch ? ' active' : ''}`}
                  onClick={() => setShowMapAdvancedSearch((current) => !current)}
                  title="Advanced filters"
                  aria-label="Toggle advanced filters"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 5h18l-7 8v5l-4 2v-7L3 5z" />
                  </svg>
                </button>
              </form>

              {showMapAdvancedSearch && (
                <div className="map-advanced-panel">
                  <select
                    className="map-advanced-select"
                    value={distanceFilter}
                    onChange={(e) => setDistanceFilter(e.target.value)}
                    disabled={!userLocation}
                    title={userLocation ? 'Filter by distance from your location' : 'Allow location access to filter by distance'}
                  >
                    <option value="">Any distance</option>
                    <option value="1">Within 1 km</option>
                    <option value="2">Within 2 km</option>
                    <option value="5">Within 5 km</option>
                    <option value="10">Within 10 km</option>
                    <option value="25">Within 25 km</option>
                  </select>
                  <select
                    className="map-advanced-select"
                    value={mapAdvancedFilters.category}
                    onChange={(e) => setMapAdvancedFilters((current) => ({ ...current, category: e.target.value }))}
                  >
                    <option value="">Any category</option>
                    {poolCategories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  <select
                    className="map-advanced-select"
                    value={mapAdvancedFilters.price}
                    onChange={(e) => setMapAdvancedFilters((current) => ({ ...current, price: e.target.value }))}
                  >
                    <option value="">Any price</option>
                    <option value="5">Up to $5</option>
                    <option value="10">Up to $10</option>
                    <option value="20">Up to $20</option>
                    <option value="50">Up to $50</option>
                    <option value="100">Up to $100</option>
                  </select>
                  <select
                    className="map-advanced-select"
                    value={mapAdvancedFilters.size}
                    onChange={(e) => setMapAdvancedFilters((current) => ({ ...current, size: e.target.value }))}
                  >
                    <option value="">Any size</option>
                    <option value="5">Up to 5 units</option>
                    <option value="10">Up to 10 units</option>
                    <option value="20">Up to 20 units</option>
                    <option value="50">Up to 50 units</option>
                  </select>
                  <select
                    className="map-advanced-select"
                    value={mapAdvancedFilters.fullness}
                    onChange={(e) => setMapAdvancedFilters((current) => ({ ...current, fullness: e.target.value }))}
                  >
                    <option value="">Any fullness</option>
                    <option value="0.25">Up to 25% filled</option>
                    <option value="0.5">Up to 50% filled</option>
                    <option value="0.75">Up to 75% filled</option>
                    <option value="1">Any open pool</option>
                  </select>
                  <select
                    className="map-advanced-select"
                    value={mapAdvancedFilters.rating}
                    onChange={(e) => setMapAdvancedFilters((current) => ({ ...current, rating: e.target.value }))}
                  >
                    <option value="">Any host rating</option>
                    <option value="5">5.0+</option>
                    <option value="4">4.0+</option>
                    <option value="3">3.0+</option>
                    <option value="2">2.0+</option>
                  </select>
                  <select
                    className="map-advanced-select"
                    value={mapAdvancedFilters.deadlineDays}
                    onChange={(e) => setMapAdvancedFilters((current) => ({ ...current, deadlineDays: e.target.value }))}
                  >
                    <option value="">Any deadline</option>
                    <option value="1">Within 24 hours</option>
                    <option value="3">Within 3 days</option>
                    <option value="7">Within 7 days</option>
                    <option value="14">Within 14 days</option>
                    <option value="30">Within 30 days</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Search results popup – under search island */}
          {showSearchResults && (
            <aside className="popup popup-search-results">
              <div className="popup-header">
                <h3>
                  {displayedPools.length === 0
                    ? 'No results'
                    : `${displayedPools.length} pool${displayedPools.length === 1 ? '' : 's'} found`}
                </h3>
                <button
                  type="button"
                  className="popup-close"
                  onClick={() => {
                    setShowSearchResults(false)
                    setActiveSearchQuery('')
                    setSearchQuery('')
                    setDistanceFilter('')
                  }}
                >
                  ✕
                </button>
              </div>
              <div className="popup-body">
                {displayedPools.length === 0 ? (
                  <p className="pool-desc">Try a different search term or distance.</p>
                ) : (
                  <ul className="search-result-list">
                    {displayedPools.map((pool) => {
                      const joined = isCurrentUserInPool(pool)
                      return (
                        <li
                          key={pool.id}
                          className={`search-result-item${joined ? ' joined' : ''}`}
                          onClick={() => {
                            setSelectedPoolId(pool.id)
                            setSelectedLocation(null)
                            setShowSearchResults(false)
                          }}
                        >
                          <strong>{pool.itemName}</strong>
                          <span>{pool.desc}</span>
                          {joined ? <span className="joined-pill">Already joined</span> : null}
                          <span className="result-meta">${pool.price} · {pool.quantityGoal - pool.currentTotal} remaining</span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </aside>
          )}
        </div>

        {/* Create pool popup – top left */}
        {selectedLocation && (
          <aside className="popup popup-create">
            <div className="popup-header">
              <h3>Create a pool</h3>
              <button
                type="button"
                className="popup-close"
                onClick={() => {
                  setSelectedLocation(null)
                  if (selectedLocationMarkerRef.current) {
                    selectedLocationMarkerRef.current.remove()
                    selectedLocationMarkerRef.current = null
                  }
                  setPoolMessage('')
                }}
              >
                ✕
              </button>
            </div>
            <form className="popup-form" onSubmit={handlePoolSubmit}>
              <label className="input-group">
                <span>Category</span>
                <select name="category" value={poolForm.category} onChange={handlePoolFormChange} required>
                  <option value="" disabled>Select a category</option>
                  {poolCategories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>
              <label className="input-group">
                <span>Item name</span>
                <input name="itemName" value={poolForm.itemName} onChange={handlePoolFormChange} required />
              </label>
              <label className="input-group">
                <span>Description</span>
                <textarea name="desc" value={poolForm.desc} onChange={handlePoolFormChange} />
              </label>
              <label className="input-group">
                <span>Price ($)</span>
                <input name="price" type="number" min="0" step="0.01" value={poolForm.price} onChange={handlePoolFormChange} required />
              </label>
              <label className="input-group">
                <span>Quantity goal</span>
                <input name="quantityGoal" type="number" min="1" value={poolForm.quantityGoal} onChange={handlePoolFormChange} required />
              </label>
              <label className="input-group">
                <span>Your quantity</span>
                <input name="hostquantity" type="number" min="1" value={poolForm.hostquantity} onChange={handlePoolFormChange} required />
              </label>
              <label className="input-group">
                <span>Deadline date</span>
                <input
                  name="deadlineDate"
                  type="date"
                  value={poolForm.deadlineDate}
                  onChange={handlePoolFormChange}
                  required
                />
              </label>
              <label className="input-group">
                <span>Deadline time</span>
                <input
                  name="deadlineTime"
                  type="text"
                  placeholder="HH:mm"
                  value={poolForm.deadlineTime}
                  onChange={handlePoolFormChange}
                  required
                />
              </label>
              <p className="location-hint">Select date, then enter local time as HH:mm (24-hour, max 50 days from now)</p>
              <p className="location-hint">📍 {Number(poolForm.latitude).toFixed(4)}, {Number(poolForm.longitude).toFixed(4)}</p>
              <button type="submit" className="primary-btn">Create pool</button>
              {poolMessage && <p className="form-message success">{poolMessage}</p>}
            </form>
          </aside>
        )}

        {/* View / Join pool popup – right */}
        {selectedPool && (
          <aside className="popup popup-detail">
            <div className="popup-header">
              <h3>{selectedPool.itemName}</h3>
              <button
                type="button"
                className="popup-close"
                onClick={() => { setSelectedPoolId(null); setPoolMessage('') }}
              >
                ✕
              </button>
            </div>
            <div className="popup-body">
              <p className="pool-desc">{selectedPool.desc}</p>
              {!isHostedByCurrentUser(selectedPool) ? (
                <p className="detail-host">
                  Hosted by:{' '}
                  <button
                    type="button"
                    className="participant-name-link"
                    onClick={() => void handleOpenUserProfile(selectedPool.hostUserId ?? selectedPool.participants[0]?.userId ?? '')}
                    disabled={!selectedPool.hostUserId && !selectedPool.participants[0]?.userId}
                  >
                    {selectedPool.participants.find((participant) => participant.userId === selectedPool.hostUserId)?.username ?? selectedPool.participants[0]?.username ?? 'Unknown host'}
                  </button>
                  <span className="rating-inline">{renderStars(userProfiles[selectedPool.hostUserId ?? selectedPool.participants[0]?.userId ?? '']?.hostRating ?? 0)} ({(userProfiles[selectedPool.hostUserId ?? selectedPool.participants[0]?.userId ?? '']?.hostRating ?? 0).toFixed(1)})</span>
                </p>
              ) : null}
              <div className="detail-grid">
                <div><span>Price</span><strong>${selectedPool.price}</strong></div>
                <div><span>Goal</span><strong>{selectedPool.quantityGoal} units</strong></div>
                <div><span>Claimed</span><strong>{selectedPool.currentTotal} units</strong></div>
                <div><span>Remaining</span><strong>{selectedPool.quantityGoal - selectedPool.currentTotal} units</strong></div>
              </div>
              <p className="detail-deadline">Closes: {new Date(selectedPool.deadline).toLocaleString()}</p>
              <div className="participants-section">
                <p className="eyebrow">Participants ({selectedPool.participants.length})</p>
                {selectedPool.participants.length === 0 ? (
                  <p className="pool-desc">No participants yet. Be the first!</p>
                ) : (
                  <ul className="participants-list">
                    {selectedPool.participants.map((p) => {
                      const showPhone = isHostedByCurrentUser(selectedPool)
                      const participantProfile = userProfiles[p.userId]
                      return (
                        <li key={p.userId}>
                          <span className="participant-main">
                            <button type="button" className="participant-name-link" onClick={() => void handleOpenUserProfile(p.userId)}>{p.username}</button>
                            <span> — {p.quantity} units</span>
                          </span>
                          <span className="participant-rating">{renderStars(participantProfile?.participantRating ?? 0)} ({(participantProfile?.participantRating ?? 0).toFixed(1)})</span>
                          {showPhone ? <span className="participant-phone">{p.phoneNumber}</span> : null}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
              <div className="join-row">
                <label className="input-group join-qty">
                  <span>Qty</span>
                  <input
                    type="number"
                    min="1"
                    value={joinQuantity}
                    onChange={(e) => setJoinQuantity(Math.max(1, Number(e.target.value)))}
                  />
                </label>
                <button type="button" className="primary-btn" onClick={() => handleJoinPool(selectedPool.id)}>
                  Request to join
                </button>
              </div>
              {poolMessage && <p className="form-message success">{poolMessage}</p>}
            </div>
          </aside>
        )}

        {selectedProfileUserId && (
          <aside className="popup popup-profile">
            <div className="popup-header">
              <h3>{selectedProfile?.username ?? 'User profile'}</h3>
              <button
                type="button"
                className="popup-close"
                onClick={() => setSelectedProfileUserId(null)}
              >
                ✕
              </button>
            </div>
            <div className="popup-body">
              {!selectedProfile ? (
                <p className="pool-desc">Loading profile...</p>
              ) : (
                <>
                  <div className="detail-grid">
                    <div><span>Host rating</span><strong>{renderStars(selectedProfile.hostRating)} ({selectedProfile.hostRating.toFixed(1)})</strong></div>
                    <div><span>Participant rating</span><strong>{renderStars(selectedProfile.participantRating)} ({selectedProfile.participantRating.toFixed(1)})</strong></div>
                  </div>
                  <div className="participants-section">
                    <p className="eyebrow">Current listings ({selectedProfile.hostingPools.length})</p>
                    {selectedProfile.hostingPools.length === 0 ? (
                      <p className="pool-desc">No active hosted listings.</p>
                    ) : (
                      <ul className="participants-list">
                        {selectedProfile.hostingPools.map((pool) => (
                          <li key={pool.id}>
                            <span className="participant-main">{pool.itemName}</span>
                            <span className="participant-rating">{Math.max(0, pool.quantityGoal - pool.currentTotal)} remaining</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </div>
          </aside>
        )}
      </div>
    </main>
  )
}

export default App

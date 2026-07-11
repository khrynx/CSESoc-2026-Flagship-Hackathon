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
    itemName: '',
    desc: '',
    price: '',
    quantityGoal: '',
    deadline: '',
    longitude: '',
    latitude: '',
    hostquantity: '',
  })
  const [poolMessage, setPoolMessage] = useState('')
  const [joinQuantity, setJoinQuantity] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSearchQuery, setActiveSearchQuery] = useState('')
  const [distanceFilter, setDistanceFilter] = useState('')
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [homeSearchQuery, setHomeSearchQuery] = useState('')
  const [homeDistanceFilter, setHomeDistanceFilter] = useState('')
  const [homeSearchResults, setHomeSearchResults] = useState<Array<{
    id: string
    itemName: string
    desc: string
    price: number
    quantityGoal: number
    currentTotal: number
    deadline: string
    longitude: number
    latitude: number
    participants: Array<{ userId: string; username: string; quantity: number; phoneNumber: string }>
  }>>([])
  const [showHomeDropdown, setShowHomeDropdown] = useState(false)
  const [displayedPools, setDisplayedPools] = useState<Array<{
    id: string
    itemName: string
    desc: string
    price: number
    quantityGoal: number
    currentTotal: number
    deadline: string
    longitude: number
    latitude: number
    participants: Array<{ userId: string; username: string; quantity: number; phoneNumber: string }>
  }>>([])
  const [selectedLocation, setSelectedLocation] = useState<{ lng: number; lat: number } | null>(null)
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null)
  const [pools, setPools] = useState<Array<{
    id: string
    itemName: string
    desc: string
    price: number
    quantityGoal: number
    currentTotal: number
    deadline: string
    longitude: number
    latitude: number
    participants: Array<{ userId: string; username: string; quantity: number; phoneNumber: string }>
  }>>([])
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const selectedLocationMarkerRef = useRef<maplibregl.Marker | null>(null)
  const hasAutoRetriedRef = useRef(false)

  const selectedPool = useMemo(
    () => pools.find((pool) => pool.id === selectedPoolId) ?? null,
    [pools, selectedPoolId],
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
    const loadPools = async () => {
      try {
        const response = await fetch('/api/pools')
        const data = await parseApiResponse(response)

        if (response.ok) {
          setPools(data.pools ?? [])
        }
      } catch {
        setPools([])
      }
    }

    loadPools()
  }, [])

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
      if (!activeSearchQuery && !distanceFilter) {
        setDisplayedPools(pools)
        return
      }
      try {
        const params = new URLSearchParams()
        if (activeSearchQuery) params.set('q', activeSearchQuery)
        if (distanceFilter && userLocation) {
          params.set('distance', (Number(distanceFilter) / 111).toFixed(6))
          params.set('lng', String(userLocation.lng))
          params.set('lat', String(userLocation.lat))
        }
        const response = await fetch(`/api/search?${params}`)
        const data = await parseApiResponse(response)
        if (response.ok) {
          setDisplayedPools(data.pools ?? [])
          setShowSearchResults(true)
        }
      } catch {
        setDisplayedPools(pools)
      }
    }
    run()
  }, [activeSearchQuery, distanceFilter, pools, userLocation])

  useEffect(() => {
    if (!homeSearchQuery.trim() && !homeDistanceFilter) {
      setHomeSearchResults([])
      setShowHomeDropdown(false)
      return
    }
    const run = async () => {
      try {
        const params = new URLSearchParams()
        if (homeSearchQuery.trim()) params.set('q', homeSearchQuery)
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
  }, [homeSearchQuery, homeDistanceFilter, userLocation])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !mapReady) {
      return
    }

    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = displayedPools.map((pool) => {
      const marker = new maplibregl.Marker({ color: '#14b8a6' })
        .setLngLat([pool.longitude, pool.latitude])
        .addTo(map)

      marker.getElement().addEventListener('click', (event) => {
        event.stopPropagation()
        setSelectedPoolId(pool.id)
        setSelectedLocation(null)
      })
      return marker
    })
  }, [mapReady, displayedPools])

  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady) {
      return
    }

    if (selectedPool) {
      mapInstanceRef.current.flyTo({
        center: [selectedPool.longitude, selectedPool.latitude],
        zoom: 13,
        essential: true,
      })
    }

    markersRef.current.forEach((marker, index) => {
      const pool = displayedPools[index]
      const element = marker.getElement()
      const isSelected = Boolean(pool && pool.id === selectedPoolId)
      element.style.width = isSelected ? '18px' : '14px'
      element.style.height = isSelected ? '18px' : '14px'
      element.style.border = isSelected ? '3px solid #10213a' : '2px solid white'
    })
  }, [pools, selectedPool, selectedPoolId, mapReady])

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

  const handlePoolFormChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target
    setPoolForm((current) => ({ ...current, [name]: value }))
  }

  const handlePoolSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!currentUser?.userId) {
      setPoolMessage('Please sign in before creating a pool.')
      return
    }

    try {
      const response = await fetch('/api/pools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.userId,
          itemName: poolForm.itemName,
          desc: poolForm.desc,
          price: Number(poolForm.price),
          quantityGoal: Number(poolForm.quantityGoal),
          deadline: poolForm.deadline,
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
        itemName: '',
        desc: '',
        price: '',
        quantityGoal: '',
        deadline: '',
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

      setPoolMessage('Joined pool successfully.')
    } catch (error) {
      setPoolMessage(error instanceof Error ? error.message : 'Unable to join pool.')
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
        <header className="home-topbar">
          <div className="brand-row home-brand">
            <div className="brand-badge">N</div>
            <span className="brand-name">Neighbourly</span>
          </div>
          <div className="home-topbar-actions">
            
            <button type="button" className="home-ghost-btn" onClick={() => { setView('auth'); setAuthMode('login'); setAuthMessage('') }}>
              Log out
            </button>
            <button type="button" className="home-start-btn" onClick={() => setView('app')}>
              Start a pool
            </button>
          </div>
        </header>

        <div className="home-hero">
          <h1 className="home-title">Find a group buy<br />near you.</h1>
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

            {showHomeDropdown && homeSearchResults.length > 0 && (
              <ul className="home-dropdown">
                {homeSearchResults.map((pool) => (
                  <li
                    key={pool.id}
                    className="home-dropdown-item"
                    onClick={() => {
                      setSelectedPoolId(pool.id)
                      setShowHomeDropdown(false)
                      setHomeSearchQuery('')
                      setView('app')
                    }}
                  >
                    <strong>{pool.itemName}</strong>
                    <span>{pool.desc}</span>
                    <span className="dropdown-meta">${pool.price} · {pool.quantityGoal - pool.currentTotal} remaining</span>
                  </li>
                ))}
              </ul>
            )}

            {(homeSearchQuery || homeDistanceFilter) && !showHomeDropdown && homeSearchResults.length === 0 && (
              <div className="home-no-results">No pools found
                {homeSearchQuery ? ` for “${homeSearchQuery}”` : ''}
                {homeDistanceFilter ? ` within ${homeDistanceFilter} km` : ''}
              </div>
            )}
          </div>
        </div>
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
          <div className="brand-badge">N</div>
          <span className="brand-name">Neighbourly</span>
        </div>
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
          <select
            className="distance-select"
            value={distanceFilter}
            onChange={(e) => { setDistanceFilter(e.target.value); setActiveSearchQuery(searchQuery) }}
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
        </form>
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

        {/* Search results popup – top center */}
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
                  {displayedPools.map((pool) => (
                    <li
                      key={pool.id}
                      className="search-result-item"
                      onClick={() => {
                        setSelectedPoolId(pool.id)
                        setSelectedLocation(null)
                        setShowSearchResults(false)
                      }}
                    >
                      <strong>{pool.itemName}</strong>
                      <span>{pool.desc}</span>
                      <span className="result-meta">${pool.price} · {pool.quantityGoal - pool.currentTotal} remaining</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        )}

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
                <span>Deadline</span>
                <input name="deadline" type="datetime-local" value={poolForm.deadline} onChange={handlePoolFormChange} required />
              </label>
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
                    {selectedPool.participants.map((p) => (
                      <li key={p.userId}>{p.username} — {p.quantity} units</li>
                    ))}
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
                  Join pool
                </button>
              </div>
              {poolMessage && <p className="form-message success">{poolMessage}</p>}
            </div>
          </aside>
        )}
      </div>
    </main>
  )
}

export default App

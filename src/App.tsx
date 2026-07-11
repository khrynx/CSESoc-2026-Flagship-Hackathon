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
  const [selectedId, setSelectedId] = useState(1)
  const [mapReady, setMapReady] = useState(false)
  const [mapError, setMapError] = useState(false)
  const [mapRetryCount, setMapRetryCount] = useState(0)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [view, setView] = useState<'app' | 'auth'>('auth')
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

  const selectedBuy = useMemo(
    () => groupBuys.find((item) => item.id === selectedId) ?? groupBuys[0],
    [selectedId],
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

  const retryMap = () => {
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

      const markReady = () => {
        setMapError(false)
        setMapReady(true)
        requestAnimationFrame(() => map.resize())
      }

      const timeoutId = window.setTimeout(() => {
        if (!mapReady) {
          setMapError(true)
          markReady()
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
    const map = mapInstanceRef.current
    if (!map) {
      return
    }

    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = pools.map((pool) => {
      const marker = new maplibregl.Marker({ color: '#14b8a6' })
        .setLngLat([pool.longitude, pool.latitude])
        .setPopup(
          new maplibregl.Popup({ offset: 20 }).setHTML(`<strong>${pool.itemName}</strong><br />${pool.desc}`),
        )
        .addTo(map)

      marker.getElement().addEventListener('click', () => setSelectedId(Number(pool.id)))
      return marker
    })
  }, [pools])

  useEffect(() => {
    if (!mapInstanceRef.current) {
      return
    }

    const selectedPool = pools.find((pool) => Number(pool.id) === selectedId)

    if (selectedPool) {
      mapInstanceRef.current.flyTo({
        center: [selectedPool.longitude, selectedPool.latitude],
        zoom: 13,
        essential: true,
      })
    }

    markersRef.current.forEach((marker, index) => {
      const pool = pools[index]
      const element = marker.getElement()
      element.style.width = pool && Number(pool.id) === selectedId ? '18px' : '14px'
      element.style.height = pool && Number(pool.id) === selectedId ? '18px' : '14px'
      element.style.border = pool && Number(pool.id) === selectedId ? '3px solid #10213a' : '2px solid white'
      element.style.transform = 'translate(-50%, -50%)'
    })
  }, [selectedId, pools])

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
        body: JSON.stringify({ userId: currentUser?.userId, quantity: 1 }),
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
      setView('app')
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
        <div>
          <p className="eyebrow">Local community bulk-buying</p>
          <h1>Neighbourly</h1>
        </div>
        <div className="topbar-actions">
          <button type="button" className="ghost-btn" onClick={() => { setView('auth'); setAuthMode('login'); setAuthMessage('') }}>
            Log out
          </button>
          <button type="button" className="ghost-btn" onClick={() => setPoolMessage('') }>
            Create group buy
          </button>
        </div>
      </header>

      <section className="hero-card">
        <div>
          <h2>One bulk item, shared across neighbours.</h2>
          <p>
            Buy a big pack once and split it fairly. A 5kg bag of rice can become 3kg for one home, 1kg for another, and 1kg for a third.
          </p>
        </div>
        <div className="hero-stats">
          <div>
            <strong>+$320</strong>
            <span>saved this week</span>
          </div>
          <div>
            <strong>14</strong>
            <span>active orders</span>
          </div>
          <div>
            <strong>6.4kg</strong>
            <span>packaging avoided</span>
          </div>
        </div>
      </section>

      <section className="dashboard">
        <div className="map-card">
          <div className="map-header">
            <div>
              <p className="eyebrow">Create a shared buy</p>
              <h3>Start a new pool</h3>
            </div>
          </div>

          <form className="auth-form" onSubmit={handlePoolSubmit}>
            <label className="input-group">
              <span>Item name</span>
              <input name="itemName" value={poolForm.itemName} onChange={handlePoolFormChange} />
            </label>
            <label className="input-group">
              <span>Description</span>
              <textarea name="desc" value={poolForm.desc} onChange={handlePoolFormChange} />
            </label>
            <label className="input-group">
              <span>Price</span>
              <input name="price" type="number" value={poolForm.price} onChange={handlePoolFormChange} />
            </label>
            <label className="input-group">
              <span>Quantity goal</span>
              <input name="quantityGoal" type="number" value={poolForm.quantityGoal} onChange={handlePoolFormChange} />
            </label>
            <label className="input-group">
              <span>Deadline</span>
              <input name="deadline" type="datetime-local" value={poolForm.deadline} onChange={handlePoolFormChange} />
            </label>
            <label className="input-group">
              <span>Longitude</span>
              <input name="longitude" type="number" value={poolForm.longitude} onChange={handlePoolFormChange} />
            </label>
            <label className="input-group">
              <span>Latitude</span>
              <input name="latitude" type="number" value={poolForm.latitude} onChange={handlePoolFormChange} />
            </label>
            <p className="auth-link">Click the map to choose the pickup location.</p>
            <label className="input-group">
              <span>Your quantity</span>
              <input name="hostquantity" type="number" value={poolForm.hostquantity} onChange={handlePoolFormChange} />
            </label>
            <button type="submit" className="primary-btn">Create pool</button>
            {poolMessage ? <p className="form-message success">{poolMessage}</p> : null}
          </form>
        </div>

        <div className="map-card">
          <div className="map-header">
            <div>
              <p className="eyebrow">Join a shared buy</p>
              <h3>Available pools</h3>
            </div>
          </div>

          <div className="detail-list">
            {pools.length === 0 ? (
              <p className="auth-link">No pools yet. Create one to get started.</p>
            ) : (
              pools.map((pool) => (
                <div key={pool.id} className="detail-list-item">
                  <div>
                    <strong>{pool.itemName}</strong>
                    <p>{pool.desc}</p>
                  </div>
                  <button type="button" className="primary-btn" onClick={() => handleJoinPool(pool.id)}>
                    Join
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="dashboard">
        <div className="map-card">
          <div className="map-header">
            <div>
              <p className="eyebrow">Live around you</p>
              <h3>Nearby shared buys</h3>
            </div>
            <div className="map-actions">
              <span className="pill">Updated 2 min ago</span>
              <button type="button" className="ghost-btn" onClick={retryMap}>
                Retry map
              </button>
            </div>
          </div>

          <div className="map-surface">
            <div ref={mapContainerRef} className="map-canvas" />
            {!mapReady ? <div className="map-loading">Loading map…</div> : null}
            {mapError ? <div className="map-loading">Map is taking longer than expected. You can still create a pool and the location picker will work.</div> : null}
          </div>
        </div>

        <aside className="detail-card">
          <div className="detail-top">
            <p className="eyebrow">Selected order</p>
            <h3>{selectedBuy.title}</h3>
            <p>{selectedBuy.item}</p>
          </div>

          <div className="detail-grid">
            <div>
              <span>Shared total</span>
              <strong>{selectedBuy.totalQty}</strong>
            </div>
            <div>
              <span>Your share</span>
              <strong>{selectedBuy.shareQty}</strong>
            </div>
            <div>
              <span>Bulk price</span>
              <strong>{selectedBuy.price}</strong>
            </div>
            <div>
              <span>Savings</span>
              <strong>{selectedBuy.savings}</strong>
            </div>
          </div>

          <ul className="detail-list">
            <li>
              <span>Suggested split</span>
              <strong>{selectedBuy.split}</strong>
            </li>
            <li>
              <span>Pickup</span>
              <strong>{selectedBuy.pickup}</strong>
            </li>
            <li>
              <span>Closes</span>
              <strong>{selectedBuy.closes}</strong>
            </li>
            <li>
              <span>Impact</span>
              <strong>{selectedBuy.impact}</strong>
            </li>
          </ul>

          <button type="button" className="primary-btn">
            Join with {selectedBuy.shareQty}
          </button>
        </aside>
      </section>
    </main>
  )
}

export default App

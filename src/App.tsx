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
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [view, setView] = useState<'app' | 'auth'>('auth')
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [loginData, setLoginData] = useState({ email: '', password: '' })
  const [signupData, setSignupData] = useState({ username: '', email: '', password: '', phoneNumber: '' })
  const [authMessage, setAuthMessage] = useState('')
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])

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
    if (!mapContainerRef.current) {
      return
    }

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new maplibregl.Map({
        container: mapContainerRef.current,
        style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
        center: userLocation ? [userLocation.lng, userLocation.lat] : [groupBuys[0].position.lng, groupBuys[0].position.lat],
        zoom: userLocation ? 13 : 12,
        attributionControl: false,
      })

      mapInstanceRef.current.addControl(new maplibregl.NavigationControl(), 'top-right')
      mapInstanceRef.current.addControl(
        new maplibregl.AttributionControl({ compact: true }),
        'bottom-right',
      )

      mapInstanceRef.current.on('load', () => {
        requestAnimationFrame(() => mapInstanceRef.current?.resize())
        setMapReady(true)
      })
    }

    const map = mapInstanceRef.current

    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = groupBuys.map((buy) => {
      const marker = new maplibregl.Marker({ color: buy.accent })
        .setLngLat([buy.position.lng, buy.position.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 20 }).setHTML(`<strong>${buy.title}</strong><br />${buy.item}`),
        )
        .addTo(map)

      marker.getElement().addEventListener('click', () => setSelectedId(buy.id))
      return marker
    })
  }, [userLocation])

  useEffect(() => {
    if (!mapInstanceRef.current) {
      return
    }

    mapInstanceRef.current.flyTo({
      center: [selectedBuy.position.lng, selectedBuy.position.lat],
      zoom: 13,
      essential: true,
    })

    markersRef.current.forEach((marker, index) => {
      const buy = groupBuys[index]
      const element = marker.getElement()
      element.style.width = buy.id === selectedBuy.id ? '18px' : '14px'
      element.style.height = buy.id === selectedBuy.id ? '18px' : '14px'
      element.style.border = buy.id === selectedBuy.id ? '3px solid #10213a' : '2px solid white'
      element.style.transform = 'translate(-50%, -50%)'
    })
  }, [selectedBuy])

  const handleLoginChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setLoginData((current) => ({ ...current, [name]: value }))
  }

  const handleSignupChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setSignupData((current) => ({ ...current, [name]: value }))
  }

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!loginData.email || !loginData.password) {
      setAuthMessage('Please enter both your email and password.')
      return
    }

    try {
      const response = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginData.email,
          password: loginData.password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to sign in right now.')
      }

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
      const response = await fetch('http://localhost:3000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData),
      })

      const data = await response.json()

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
                <input name="username" placeholder="Alex Nguyen" value={signupData.username} onChange={handleSignupChange} />
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
          <button type="button" className="ghost-btn">
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
              <p className="eyebrow">Live around you</p>
              <h3>Nearby shared buys</h3>
            </div>
            <span className="pill">Updated 2 min ago</span>
          </div>

          <div className="map-surface">
            <div ref={mapContainerRef} className="map-canvas" />
            {!mapReady ? <div className="map-loading">Loading map…</div> : null}
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

import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [message, setMessage] = useState('Connecting to backend...')

  useEffect(() => {
    fetch('/api/hello')
      .then((response) => response.json())
      .then((data) => setMessage(data.message))
      .catch(() => setMessage('Could not reach the backend. Is the server running?'))
  }, [])

  return (
    <main className="app">
      <h1>CSESoc 2026 Flagship Hackathon</h1>
      <p>the goatest hackathon project eva</p>
      <p className="api-message">{message}</p>
    </main>
  )
}
export default App

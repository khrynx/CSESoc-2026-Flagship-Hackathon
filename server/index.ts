import cors from 'cors'
import express from 'express'
import { loginUser, registerUser } from './auth.js'
import { getData } from './dataStore.js'
import poolRoutes from './route.js'

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())
app.use('/api', poolRoutes)

function ensureDemoUser() {
  const data = getData()

  if (!data.users.some((user) => user.email === 'demo@example.com')) {
    registerUser('Demo User', 'demo@example.com', 'Password123!', '0400000000')
  }
}

ensureDemoUser()

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.get('/api/hello', (_req, res) => {
  res.json({ message: 'Hello from the backend!' })
})

app.post('/api/register', (req, res) => {
  try {
    const { username, email, password, phoneNumber } = req.body ?? {}

    if (!username || !email || !password || !phoneNumber) {
      res.status(400).json({ message: 'All fields are required.' })
      return
    }

    registerUser(username, email, password, phoneNumber)

    res.status(201).json({ message: 'Account created successfully.' })
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error ? error.message : 'Unable to create account.',
    })
  }
})

app.post('/api/login', (req, res) => {
  try {
    const { email, password } = req.body ?? {}

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required.' })
      return
    }

    ensureDemoUser()
    const user = loginUser(email, password)

    res.json({
      user: {
        userId: user.userId,
        username: user.username,
        email: user.email,
      },
    })
  } catch (error) {
    res.status(401).json({
      message: error instanceof Error ? error.message : 'Invalid credentials.',
    })
  }
})

app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`)
})

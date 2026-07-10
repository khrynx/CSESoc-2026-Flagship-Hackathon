import cors from 'cors'
import express from 'express'

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.get('/api/hello', (_req, res) => {
  res.json({ message: 'Hello from the backend!' })
})

app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`)
})

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import chatRouter from './routes/chat.js'
import briefRouter from './routes/brief.js'
import agentsRouter from './routes/agents.js'
import inventoryRouter from './routes/inventory.js'

const app = express()
const PORT = parseInt(process.env.PORT || '3099', 10)

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}))
app.use(express.json())

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  })
})

// Routes
app.use('/api/chat', chatRouter)
app.use('/api/brief', briefRouter)
app.use('/api/agents', agentsRouter)
app.use('/api/inventory', inventoryRouter)

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`\n  MotoAI Server running at http://localhost:${PORT}\n`)
  console.log(`  API endpoints:`)
  console.log(`    GET  /api/health`)
  console.log(`    POST /api/chat/stream   (SSE)`)
  console.log(`    GET  /api/chat/history`)
  console.log(`    GET  /api/chat/:threadId`)
  console.log(`    GET  /api/brief/today?role=manager`)
  console.log(`    GET  /api/agents`)
  console.log(`    PATCH /api/agents/:id/status`)
  console.log(`    GET  /api/inventory`)
  console.log(`    GET  /api/inventory/alerts`)
  console.log(`    GET  /api/inventory/stores\n`)
})

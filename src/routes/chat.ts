import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { streamChat } from '../lib/qwen.js'

const router = Router()

/**
 * POST /api/chat/stream
 * SSE streaming chat endpoint
 */
router.post('/stream', async (req: Request, res: Response) => {
  const { message, threadId, domain = 'workbench' } = req.body

  if (!message || typeof message !== 'string') {
    res.status(400).json({ error: 'message is required' })
    return
  }

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  try {
    // Find or create a default user for demo
    let user = await prisma.user.findFirst()
    if (!user) {
      user = await prisma.user.create({
        data: { name: '李总监', role: 'factory_manager', phone: '13800000001' },
      })
    }

    // Find or create thread
    let thread = threadId
      ? await prisma.chatThread.findUnique({ where: { id: threadId } })
      : null

    if (!thread) {
      thread = await prisma.chatThread.create({
        data: {
          userId: user.id,
          domain,
          title: message.slice(0, 50),
        },
      })
    }

    // Save user message
    await prisma.chatMessage.create({
      data: {
        threadId: thread.id,
        role: 'user',
        content: message,
      },
    })

    // Load conversation history (last 10 messages)
    const history = await prisma.chatMessage.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: 'asc' },
      take: 10,
    })

    const chatMessages = history.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    // Send thread info event
    res.write(`event: start\ndata: ${JSON.stringify({ threadId: thread.id })}\n\n`)

    // Stream AI response
    let fullResponse = ''
    for await (const chunk of streamChat(chatMessages)) {
      fullResponse += chunk
      res.write(`event: text\ndata: ${JSON.stringify({ content: chunk })}\n\n`)
    }

    // Save assistant message
    await prisma.chatMessage.create({
      data: {
        threadId: thread.id,
        role: 'assistant',
        content: fullResponse,
      },
    })

    // Send done event
    res.write(`event: done\ndata: ${JSON.stringify({ messageId: Date.now().toString() })}\n\n`)
    res.end()
  } catch (error) {
    console.error('Chat stream error:', error)
    res.write(`event: error\ndata: ${JSON.stringify({ error: 'Internal server error' })}\n\n`)
    res.end()
  }
})

/**
 * GET /api/chat/history
 * List chat threads for current user
 */
router.get('/history', async (_req: Request, res: Response) => {
  const user = await prisma.user.findFirst()
  if (!user) {
    res.json([])
    return
  }

  const threads = await prisma.chatThread.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
    take: 20,
    include: { _count: { select: { messages: true } } },
  })

  res.json(threads.map((t) => ({
    id: t.id,
    title: t.title,
    domain: t.domain,
    messageCount: t._count.messages,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  })))
})

/**
 * GET /api/chat/:threadId
 * Get thread messages
 */
router.get('/:threadId', async (req: Request, res: Response) => {
  const threadId = req.params.threadId as string

  const thread = await prisma.chatThread.findUnique({
    where: { id: threadId },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (!thread) {
    res.status(404).json({ error: 'Thread not found' })
    return
  }

  res.json({
    id: thread.id,
    title: thread.title,
    domain: thread.domain,
    messages: (thread as typeof thread & { messages: Array<{ id: string; role: string; content: string; resultCards: string | null; createdAt: Date }> }).messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      resultCards: m.resultCards ? JSON.parse(m.resultCards) : undefined,
      createdAt: m.createdAt,
    })),
  })
})

export default router

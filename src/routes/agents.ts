import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'

const router = Router()

/**
 * GET /api/agents
 * List all agents with their status and recent events
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const agents = await prisma.agentConfig.findMany({
      include: {
        events: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    const result = agents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      type: agent.type,
      status: agent.status,
      config: agent.config ? JSON.parse(agent.config) : null,
      lastEvent: agent.events[0]?.title || '暂无事件',
      lastEventTime: agent.events[0]?.createdAt || agent.updatedAt,
      todayActions: agent.events.length,
      successRate: calculateSuccessRate(agent.events),
      events: agent.events.map((e) => ({
        id: e.id,
        agentId: e.agentId,
        type: e.type,
        title: e.title,
        description: e.description,
        timestamp: e.createdAt,
        autoResolved: e.autoResolved,
      })),
    }))

    res.json(result)
  } catch (error) {
    console.error('Agents list error:', error)
    res.status(500).json({ error: 'Failed to fetch agents' })
  }
})

/**
 * PATCH /api/agents/:id/status
 * Update agent status (pause/resume/restart)
 */
router.patch('/:id/status', async (req: Request, res: Response) => {
  const id = req.params.id as string
  const { status } = req.body

  if (!['running', 'paused', 'idle', 'error'].includes(status)) {
    res.status(400).json({ error: 'Invalid status' })
    return
  }

  try {
    const agent = await prisma.agentConfig.update({
      where: { id },
      data: { status },
    })

    // Log the status change as an event
    await prisma.agentEvent.create({
      data: {
        agentId: id,
        type: status === 'running' ? 'success' : status === 'paused' ? 'warning' : 'info',
        title: `Agent ${status === 'running' ? '已启动' : status === 'paused' ? '已暂停' : '状态变更'}`,
        description: `状态变更为 ${status}`,
        autoResolved: true,
      },
    })

    res.json({ id: agent.id, status: agent.status })
  } catch (error) {
    console.error('Agent status update error:', error)
    res.status(500).json({ error: 'Failed to update agent status' })
  }
})

function calculateSuccessRate(events: Array<{ type: string }>): number {
  if (events.length === 0) return 100
  const errors = events.filter((e) => e.type === 'error').length
  return Math.round(((events.length - errors) / events.length) * 100)
}

export default router

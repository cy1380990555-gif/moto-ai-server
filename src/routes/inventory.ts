import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'

const router = Router()

/**
 * GET /api/inventory
 * List inventory with optional store filter and alert-only flag
 */
router.get('/', async (req: Request, res: Response) => {
  const { storeId, alerts } = req.query

  try {
    const where: Record<string, unknown> = {}
    if (storeId) where.storeId = storeId

    const inventory = await prisma.inventory.findMany({
      where,
      include: { store: { select: { name: true, regionId: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    })

    let items = inventory.map((item) => ({
      id: item.id,
      storeId: item.storeId,
      storeName: item.store.name,
      regionId: item.store.regionId,
      skuName: item.skuName,
      model: item.model,
      color: item.color,
      quantity: item.quantity,
      safetyStock: item.safetyStock,
      isAlert: item.quantity <= item.safetyStock,
      updatedAt: item.updatedAt,
    }))

    // Filter to alerts only
    if (alerts === 'true') {
      items = items.filter((i) => i.isAlert)
    }

    // Summary stats
    const totalItems = items.length
    const alertCount = items.filter((i) => i.isAlert).length
    const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0)

    res.json({
      summary: { totalItems, alertCount, totalQuantity },
      items,
    })
  } catch (error) {
    console.error('Inventory error:', error)
    res.status(500).json({ error: 'Failed to fetch inventory' })
  }
})

/**
 * GET /api/inventory/alerts
 * Get inventory items below safety stock, grouped by model
 */
router.get('/alerts', async (_req: Request, res: Response) => {
  try {
    const allInventory = await prisma.inventory.findMany({
      include: { store: { select: { name: true, regionId: true } } },
    })

    const alerts = allInventory
      .filter((item) => item.quantity <= item.safetyStock)
      .map((item) => ({
        id: item.id,
        storeName: item.store.name,
        skuName: item.skuName,
        model: item.model,
        color: item.color,
        quantity: item.quantity,
        safetyStock: item.safetyStock,
        gap: item.safetyStock - item.quantity,
        suggestedRestock: (item.safetyStock - item.quantity) * 3,
      }))

    // Group by model
    const byModel: Record<string, typeof alerts> = {}
    for (const a of alerts) {
      if (!byModel[a.model]) byModel[a.model] = []
      byModel[a.model].push(a)
    }

    res.json({
      total: alerts.length,
      byModel,
      items: alerts.sort((a, b) => a.quantity - b.quantity),
    })
  } catch (error) {
    console.error('Inventory alerts error:', error)
    res.status(500).json({ error: 'Failed to fetch inventory alerts' })
  }
})

/**
 * GET /api/inventory/stores
 * List all stores
 */
router.get('/stores', async (_req: Request, res: Response) => {
  try {
    const stores = await prisma.store.findMany({
      select: { id: true, name: true, regionId: true, status: true },
      orderBy: { name: 'asc' },
    })
    res.json(stores)
  } catch (error) {
    console.error('Stores error:', error)
    res.status(500).json({ error: 'Failed to fetch stores' })
  }
})

export default router

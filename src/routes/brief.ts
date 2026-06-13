import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'

const router = Router()

/**
 * GET /api/brief/today
 * Get today's morning brief for a given role
 */
router.get('/today', async (req: Request, res: Response) => {
  const role = (req.query.role as string) || 'manager'
  const today = new Date().toISOString().split('T')[0]

  try {
    const user = await prisma.user.findFirst()
    if (!user) {
      res.status(404).json({ error: 'No user found' })
      return
    }

    let brief = await prisma.morningBrief.findUnique({
      where: { userId_date_role: { userId: user.id, date: today, role } },
    })

    // Generate brief if not exists
    if (!brief) {
      brief = await generateBrief(user.id, role, today)
    }

    res.json({
      id: brief.id,
      role: brief.role,
      date: brief.date,
      summary: brief.summary,
      kpis: JSON.parse(brief.kpis),
      anomalies: JSON.parse(brief.anomalies),
      actions: JSON.parse(brief.actions),
    })
  } catch (error) {
    console.error('Morning brief error:', error)
    res.status(500).json({ error: 'Failed to fetch morning brief' })
  }
})

/**
 * Generate a morning brief with mock data based on role
 */
async function generateBrief(userId: string, role: string, date: string) {
  const kpisByRole: Record<string, unknown[]> = {
    executive: [
      { id: 'k1', name: '今日营收', value: '218.5', change: 12.3, unit: '万', trend: 'up', category: 'revenue' },
      { id: 'k2', name: '总销量', value: '73', change: 8.7, unit: '台', trend: 'up', category: 'sales' },
      { id: 'k3', name: '线索转化率', value: '24.5', change: -1.2, unit: '%', trend: 'down', category: 'leads' },
      { id: 'k4', name: '客户满意度', value: '4.6', change: 0.1, unit: '分', trend: 'up', category: 'service' },
    ],
    manager: [
      { id: 'k1', name: '华东区营收', value: '86.2', change: 15.2, unit: '万', trend: 'up', category: 'revenue' },
      { id: 'k2', name: '华东区销量', value: '29', change: 11.5, unit: '台', trend: 'up', category: 'sales' },
      { id: 'k3', name: '新增线索', value: '42', change: 18.0, unit: '条', trend: 'up', category: 'leads' },
      { id: 'k4', name: '试驾预约', value: '15', change: -5.0, unit: '组', trend: 'down', category: 'testdrive' },
      { id: 'k5', name: '库存周转天数', value: '12', change: -2.0, unit: '天', trend: 'up', category: 'inventory' },
      { id: 'k6', name: '工单完成率', value: '92', change: 3.0, unit: '%', trend: 'up', category: 'service' },
    ],
    store: [
      { id: 'k1', name: '本店营收', value: '28.6', change: 8.3, unit: '万', trend: 'up', category: 'revenue' },
      { id: 'k2', name: '本店销量', value: '9', change: 5.0, unit: '台', trend: 'up', category: 'sales' },
      { id: 'k3', name: '今日线索', value: '8', change: 14.0, unit: '条', trend: 'up', category: 'leads' },
    ],
  }

  const anomaliesByRole: Record<string, unknown[]> = {
    executive: [
      { id: 'a1', title: '苏州工业园店连续3日销量低于目标', description: '5月销量环比下降2.1%，建议关注竞品动态', severity: 'warning', domain: 'sales', suggestion: '安排区域经理本周走访苏州门店' },
    ],
    manager: [
      { id: 'a1', title: 'XX300红色库存告急', description: '华东区总库存仅剩12台，按日均4台预计3天后断货', severity: 'critical', domain: 'inventory', affectedStores: ['上海旗舰店', '杭州西湖店'], suggestion: '已自动生成30台补货建议单，请审批' },
      { id: 'a2', title: '苏州工业园店销量持续走低', description: '连续2周低于目标，环比-2.1%', severity: 'warning', domain: 'sales', suggestion: '建议安排竞品调研和促销活动' },
    ],
    store: [
      { id: 'a1', title: 'XX300红色库存不足', description: '本店仅剩2台，安全库存5台', severity: 'critical', domain: 'inventory', suggestion: '补货申请已提交，预计2天后到货' },
    ],
  }

  const actionsByRole: Record<string, unknown[]> = {
    executive: [
      { id: 'ac1', title: '审批华东区补货申请', description: 'XX300红色30台补货单待审批', priority: 'high', status: 'pending', domain: 'inventory' },
      { id: 'ac2', title: '审阅Q2营销复盘报告', description: 'AI已生成初稿，需确认数据', priority: 'medium', status: 'pending', domain: 'marketing' },
    ],
    manager: [
      { id: 'ac1', title: '审批XX300补货单', description: '30台补货，涉及3家门店', priority: 'high', status: 'pending', domain: 'inventory' },
      { id: 'ac2', title: '跟进苏州店促销活动', description: '制定针对性促销方案，扭转下滑趋势', priority: 'high', status: 'pending', domain: 'sales' },
      { id: 'ac3', title: '确认618活动方案', description: 'AI已生成方案草稿，需编辑后提交', priority: 'medium', status: 'pending', domain: 'marketing' },
      { id: 'ac4', title: '处理2个待办工单', description: '1个高优+1个普通', priority: 'medium', status: 'pending', domain: 'service' },
    ],
    store: [
      { id: 'ac1', title: '联系XX300意向客户', description: '张先生昨天留资，建议今日回访', priority: 'high', status: 'pending', domain: 'leads' },
      { id: 'ac2', title: '确认今日试驾预约', description: '3组客户预约试驾，准备试驾车', priority: 'medium', status: 'pending', domain: 'testdrive' },
      { id: 'ac3', title: '处理1个售后工单', description: '王建国XX300发动机异响', priority: 'high', status: 'pending', domain: 'service' },
    ],
  }

  const summaries: Record<string, string> = {
    executive: '今日整体业务表现良好。华东区营收环比增长15.2%领跑全国，但苏州工业园店需重点关注。XX300红色库存告急，建议尽快审批补货。舆情方面"摩旅"话题热度上升，可考虑内容布局。',
    manager: '华东区今日营收86.2万，环比+15.2%。南京新街口店表现突出（+15.2%），苏州工业园店需关注（-2.1%）。XX300红色库存告急（仅剩12台），已自动生成30台补货单待审批。今日新增线索42条（+18%），建议优先跟进。',
    store: '本店今日营收28.6万，销量9台，表现良好。XX300红色库存不足（仅剩2台），补货申请已提交。今日重点：联系意向客户张先生、确认3组试驾、处理王建国售后工单。',
  }

  return prisma.morningBrief.create({
    data: {
      userId,
      role,
      date,
      summary: summaries[role] || summaries.manager,
      kpis: JSON.stringify(kpisByRole[role] || kpisByRole.manager),
      anomalies: JSON.stringify(anomaliesByRole[role] || anomaliesByRole.manager),
      actions: JSON.stringify(actionsByRole[role] || actionsByRole.manager),
    },
  })
}

export default router

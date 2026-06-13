import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...\n')

  // Stores
  const stores = await Promise.all([
    prisma.store.create({ data: { name: '上海旗舰店', regionId: 'east', address: '上海市浦东新区陆家嘴环路1000号' } }),
    prisma.store.create({ data: { name: '杭州西湖店', regionId: 'east', address: '杭州市西湖区龙井路88号' } }),
    prisma.store.create({ data: { name: '南京新街口店', regionId: 'east', address: '南京市秦淮区中山路18号' } }),
    prisma.store.create({ data: { name: '苏州工业园店', regionId: 'east', address: '苏州市工业园区星湖街328号' } }),
    prisma.store.create({ data: { name: '无锡太湖店', regionId: 'east', address: '无锡市滨湖区太湖大道1号' } }),
  ])
  console.log(`  Created ${stores.length} stores`)

  // Users
  const users = await Promise.all([
    prisma.user.create({ data: { name: '李总监', role: 'factory_manager', phone: '13800000001' } }),
    prisma.user.create({ data: { name: '王经理', role: 'regional_manager', phone: '13800000002', storeId: stores[0].id } }),
    prisma.user.create({ data: { name: '张店长', role: 'store_manager', phone: '13800000003', storeId: stores[0].id } }),
    prisma.user.create({ data: { name: '赵销售', role: 'store_staff', phone: '13800000004', storeId: stores[1].id } }),
  ])
  console.log(`  Created ${users.length} users`)

  // Inventory
  const models = ['XX250', 'XX300', 'XX500']
  const colors = ['红色', '白色', '黑色', '蓝色']
  let invCount = 0
  for (const store of stores) {
    for (const model of models) {
      for (const color of colors) {
        await prisma.inventory.create({
          data: {
            storeId: store.id,
            skuName: `${model} ${color}`,
            model,
            color,
            quantity: Math.floor(Math.random() * 30) + 2,
            safetyStock: 5,
          },
        })
        invCount++
      }
    }
  }
  console.log(`  Created ${invCount} inventory records`)

  // Agent configs
  const agents = await Promise.all([
    prisma.agentConfig.create({ data: { name: '舆情监控 Agent', type: 'sentiment', status: 'running', config: JSON.stringify({ interval: '30min', sources: ['微博', '抖音', '小红书'] }) } }),
    prisma.agentConfig.create({ data: { name: '库存预警 Agent', type: 'inventory', status: 'running', config: JSON.stringify({ threshold: 5, checkInterval: '1h' }) } }),
    prisma.agentConfig.create({ data: { name: '工单分配 Agent', type: 'workorder', status: 'running', config: JSON.stringify({ autoAssign: true, maxLoad: 5 }) } }),
    prisma.agentConfig.create({ data: { name: '内容生成 Agent', type: 'content', status: 'idle', config: JSON.stringify({ platforms: ['小红书', '抖音', '微信'] }) } }),
    prisma.agentConfig.create({ data: { name: '线索跟进 Agent', type: 'leads', status: 'paused', config: JSON.stringify({ followUpDelay: '2h', maxRetries: 3 }) } }),
  ])
  console.log(`  Created ${agents.length} agent configs`)

  // Agent events (for the running agents)
  const runningAgents = agents.filter(a => a.status === 'running')
  let eventCount = 0
  for (const agent of runningAgents) {
    const events = [
      { type: 'info', title: `${agent.name} 启动`, description: 'Agent 初始化完成，开始运行', autoResolved: true },
      { type: 'success', title: '任务执行成功', description: '成功处理一批数据', autoResolved: true },
      { type: 'warning', title: '异常检测', description: '检测到一条需要人工确认的记录', autoResolved: false },
    ]
    for (const evt of events) {
      await prisma.agentEvent.create({ data: { agentId: agent.id, ...evt } })
      eventCount++
    }
  }
  console.log(`  Created ${eventCount} agent events`)

  console.log('\n  Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

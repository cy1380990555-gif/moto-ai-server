# MotoAI Server

MotoAI 营销服工作台的后端服务。基于 Express 5 + Prisma + SQLite 构建，提供 SSE 流式对话、晨会日报、Agent 监控、库存预警等 API。内置通义千问（DashScope）集成，无 API Key 时自动降级为模拟回复。

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| POST | `/api/chat/stream` | SSE 流式对话（支持通义千问） |
| GET | `/api/chat/history` | 获取对话历史列表 |
| GET | `/api/chat/:threadId` | 获取单个对话详情 |
| GET | `/api/brief/today?role=manager` | 获取今日晨会日报 |
| GET | `/api/agents` | 获取 Agent 列表及事件 |
| PATCH | `/api/agents/:id/status` | 更新 Agent 状态 |
| GET | `/api/inventory` | 获取库存列表 |
| GET | `/api/inventory/alerts` | 获取库存预警 |
| GET | `/api/inventory/stores` | 获取门店列表 |

## 快速开始

### 环境要求

- Node.js 18+

### 安装与运行

```bash
git clone https://github.com/cy1380990555-gif/moto-ai-server.git
cd moto-ai-server

# 安装依赖
npm install

# 初始化数据库 + 填充种子数据
npx prisma migrate dev
npm run db:seed

# 启动开发服务器（默认端口 3099）
npm run dev
```

### 环境变量

在项目根目录创建 `.env` 文件：

```env
# 服务端口（默认 3099）
PORT=3099

# SQLite 数据库路径
DATABASE_URL="file:./dev.db"

# 通义千问 API Key（可选，不填则使用模拟回复）
# 在 https://dashscope.console.aliyun.com/ 获取
DASHSCOPE_API_KEY=sk-xxxxxxxxxxxxxxxx

# 通义千问模型（默认 qwen-turbo）
QWEN_MODEL=qwen-turbo
```

## 数据模型

```
User            用户（关联门店）
Store           门店（5家华东区门店）
Inventory       库存（SKU 级别，含安全库存预警）
ChatThread      对话线程
ChatMessage     对话消息（支持 JSON 结果卡片）
MorningBrief    晨会日报（按角色 + 日期）
AgentConfig     Agent 配置（舆情/库存/工单/内容/线索）
AgentEvent      Agent 事件日志
```

种子数据包含 5 家门店、4 个用户、60 条库存记录、5 个 Agent 配置及示例事件。

## 项目结构

```
src/
├── index.ts           # Express 入口
├── lib/
│   ├── prisma.ts      # Prisma 客户端
│   └── qwen.ts        # 通义千问 SSE 客户端
└── routes/
    ├── chat.ts        # 对话 API（SSE 流式）
    ├── brief.ts       # 晨会日报 API
    ├── agents.ts      # Agent 监控 API
    └── inventory.ts   # 库存管理 API

prisma/
├── schema.prisma      # 数据库模型定义
├── seed.ts            # 种子数据脚本
└── migrations/        # 数据库迁移
```

## 部署

### Railway / Render 部署

1. Fork 本仓库
2. 在 [Railway](https://railway.app) 或 [Render](https://render.com) 导入
3. 设置环境变量（`DATABASE_URL`, `DASHSCOPE_API_KEY` 等）
4. 构建命令: `npx prisma migrate deploy && npm run db:seed`
5. 启动命令: `npm start`

> **注意**: SQLite 在容器环境中数据不持久化。生产环境建议切换到 PostgreSQL。

### Docker 部署

```bash
docker build -t moto-ai-server .
docker run -p 3099:3099 \
  -e DATABASE_URL="file:./dev.db" \
  -e DASHSCOPE_API_KEY="sk-xxx" \
  moto-ai-server
```

或使用 [docker-compose](https://github.com/cy1380990555-gif/moto-ai-server) 一键启动前后端。

## 许可

MIT

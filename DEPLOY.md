# 部署指南

本文档介绍如何将 MotoAI 部署到云平台，让其他人可以通过互联网访问。

## 方案一：Vercel + Railway（推荐，免费额度）

### 前端部署到 Vercel

1. 前往 [vercel.com](https://vercel.com)，用 GitHub 登录
2. 点击 **Add New → Project**
3. 导入 `moto-ai-workbench` 仓库
4. 配置环境变量：

   | 变量名 | 值 |
   |--------|------|
   | `VITE_API_URL` | `https://your-backend.railway.app`（后端部署后的地址） |

5. 点击 **Deploy**，等待构建完成
6. 部署成功后会获得一个 `https://xxx.vercel.app` 地址

### 后端部署到 Railway

1. 前往 [railway.app](https://railway.app)，用 GitHub 登录
2. 点击 **New Project → Deploy from GitHub repo**
3. 选择 `moto-ai-server` 仓库
4. 在 **Variables** 中添加环境变量：

   | 变量名 | 值 |
   |--------|------|
   | `PORT` | `3099` |
   | `DATABASE_URL` | `file:./dev.db` |
   | `DASHSCOPE_API_KEY` | 你的通义千问 API Key（可选） |
   | `QWEN_MODEL` | `qwen-turbo` |

5. 在 **Settings → Build** 中配置：
   - Build Command: `npx prisma migrate deploy && npx prisma db seed`
   - Start Command: `npm start`

6. 在 **Settings → Networking** 中开启 **Public Networking**，获取公网地址

7. 回到 Vercel 项目，更新 `VITE_API_URL` 为 Railway 的公网地址，重新部署

> **注意**: Railway 免费额度每月 $5，SQLite 在容器中数据不持久化。如需持久化，建议切换到 PostgreSQL。

---

## 方案二：Vercel + Render

### 后端部署到 Render

1. 前往 [render.com](https://render.com)，用 GitHub 登录
2. 点击 **New → Web Service**
3. 连接 `moto-ai-server` 仓库
4. 配置：
   - **Runtime**: Docker
   - **Dockerfile Path**: `Dockerfile`
   - **环境变量**：同 Railway 配置

5. 点击 **Deploy**

---

## 方案三：Docker Compose（自有服务器）

适合有 Linux 服务器的团队，一条命令启动前后端。

### 前置条件

- Docker 20+ 和 Docker Compose V2
- 服务器已安装 git

### 部署步骤

```bash
# 1. 克隆两个仓库到同一目录
git clone https://github.com/cy1380990555-gif/moto-ai-server.git
git clone https://github.com/cy1380990555-gif/moto-ai-workbench.git

# 2. 配置环境变量
cd moto-ai-server
cp .env.example .env
# 编辑 .env，填入 DASHSCOPE_API_KEY（可选）

# 3. 一键启动
docker compose up -d --build

# 4. 初始化数据库（首次部署）
docker compose exec server npx prisma migrate deploy
docker compose exec server npm run db:seed
```

部署完成后：
- 前端访问: `http://你的服务器IP`
- 后端 API: `http://你的服务器IP:3099`

### Nginx 反向代理（可选）

如果需要通过域名访问，在服务器上配置 Nginx：

```nginx
server {
    listen 80;
    server_name motoai.yourcompany.com;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://localhost:3099;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_buffering off;  # SSE 需要关闭缓冲
    }
}
```

---

## 方案四：纯静态部署（最简）

如果只需要前端演示（不含后端 AI 对话功能），可以只部署前端：

```bash
# 构建
cd moto-ai-workbench
npm install
npm run build

# dist/ 目录上传到任意静态托管：
# - GitHub Pages
# - Cloudflare Pages
# - 腾讯云 COS
# - 阿里云 OSS
```

前端内置 mock fallback，即使后端不可用也能展示界面和模拟数据。

---

## 常见问题

**Q: 没有通义千问 API Key 能用吗？**
可以。后端内置了模拟回复器，没有 API Key 时自动降级为本地模拟对话，功能完整可用。

**Q: 如何切换为 PostgreSQL？**
修改 `prisma/schema.prisma` 的 datasource 为 `provider = "postgresql"`，更新 `DATABASE_URL` 为 PostgreSQL 连接串，然后运行 `npx prisma migrate dev`。

**Q: Railway/Render 的免费额度够用吗？**
- Railway: 每月 $5 免费额度，够演示和轻度使用
- Render: 免费实例会在 15 分钟无请求后休眠，首次访问需等待 30 秒唤醒
- Vercel: 免费额度非常充足，前端部署无压力

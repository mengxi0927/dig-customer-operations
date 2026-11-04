# 客户智盾 · Customer Operations

企业客户全景驾驶舱、客户准入与风险管理、经营分析及客户价值增长平台。

- 前端：Next.js 16、React 19、TypeScript、Tailwind CSS。
- 后端：Flask、Gunicorn、PostgreSQL。
- 飞书：只读查询客户多维表格；企查查默认使用 Mock 模式。

## 目录

- `src/frontend/`：前端源码，包含演示经营分析快照。
- `src/backend/`：后端源码，包含服务器部署时修复的容器路径与 PostgreSQL 查询兼容问题。
- `deploy/`：Docker Compose、Nginx 配置与部署记录。

仓库不包含真实密钥、数据库、客户缓存或真实客户及商机快照。现有服务器数据保持原样。

## 独立部署

```bash
cd deploy
cp env.example .env
# 设置强随机 POSTGRES_PASSWORD，按需配置飞书、企查查凭据。
# BIND_IP 默认仅本机访问；内网发布时改为服务器内网 IP。
docker compose config --quiet
docker compose up -d --build risk-db risk-backend risk-frontend risk-gateway
docker compose ps
```

访问 `http://127.0.0.1:8082`，健康检查 `/api/health`。新数据库自动建表。
飞书应用凭据未配置时客户同步接口不可用；经营分析页提供明确标记的合成演示数据。
企查查 `USE_QCC_MOCK=true`，不会因部署开启实时调用。

生产业务数据通过受控环境另行恢复。经营分析快照的导入工具位于 `src/frontend/scripts/`。
SQLite 迁移脚本为可选工具，需另行提供真实源数据库后使用 `migration` profile。

## 现有服务器维护

2026-11-04 已部署至 `http://10.126.50.207:8082`（公司内网）。
`deploy/docker-compose.server.yml` 和 `deploy/docker-compose.8082.yml` 是现有服务器集成配置；
依赖服务器已有网络、镜像、数据库卷与私有 `.env`，不用于空环境初始化。
服务器维护说明见 `deploy/DEPLOY-8082.md`。不要在共享生产 Compose 项目上执行 `down` 或 `--remove-orphans`。

独立部署使用默认 `deploy/docker-compose.yml`；已有服务器使用原发布目录配置，避免混用。

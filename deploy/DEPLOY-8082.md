# 客户智盾部署（2026-11-04）

访问地址：http://10.126.50.207:8082 （公司内网）
入口：risk-gateway，仅增加8082端口；8000/8001现有业务服务保留。
前后端镜像：enterprise-risk-frontend/backend:20261104-zhidun。
数据库和客户缓存：复用 feishu-interface-risk-postgres、feishu-interface-risk-runtime 持久卷。
已修复发布副本 services/feishu_customer_service.py 在容器路径下 parents[3] 越界的问题。
USE_QCC_MOCK=true：保留已有风险缓存；不启用企查查实时付费调用。

维护命令（在本文所在目录执行）：

    docker compose -f docker-compose.yml -f docker-compose.8082.yml ps
    docker compose -f docker-compose.yml -f docker-compose.8082.yml logs --tail 100 risk-backend risk-frontend risk-gateway
    docker compose -f docker-compose.yml -f docker-compose.8082.yml up -d --no-deps risk-backend risk-frontend risk-gateway

避免执行 down 或 --remove-orphans：同一 Compose 项目还有其他生产业务。
数据库及缓存部署前备份位于上两级目录的 predeploy-postgres.sql 和 predeploy-data/。

补充修复：发布副本 app.py 的客户接口改用 PostgreSQL information_schema 检查可选画像表，日期排序直接使用 ISO 日期字段，修复 SQLite 专属 SQL 导致的 500/503。

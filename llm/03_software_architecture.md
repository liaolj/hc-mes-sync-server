# 软件架构分析 (Software Architecture)

## 1. 文档目的
本文档从代码结构与业务逻辑中提炼 `hc-mes-sync-server` 的系统架构，明确系统边界、模块职责及关键数据流向。

## 2. 架构概览与风格
本项目采用的是**极简的宏观单体架构 (Monolithic Architecture)**。结合其功能特点，更确切地说是充当了一个**数据接入型微服务 / 数据网关 (Data Ingestion Gateway)**。由于代码量及复杂度极低，甚至并没有传统的“表现层-业务层-数据访问层”三层甚至多层的严格划分，而是直接通过 Controller（路由处理函数）连接底层数据。

## 3. 分层与模块边界
尽管项目是扁平化的单入口程序，逻辑和概念上具有以下层次划分：

### 3.1 接入层 (Ingestion & Routing)
* **实现载体**: `server.js` (Express.js实例初始化、鉴权与路由分发)
* **核心职责**:
  * 接收 HTTP 报文请求，使用 `express.json` 中间件进行 Body 解析。
  * `authMiddleware` 根据请求来源从 Header (`Authorization`) 或 Query (`token`) 提取 API Token 进行初步防刷与权限验证。
  * 将合法的请求按 URL 路径路由到对应的数据处理模块。

### 3.2 业务处理层 (Business Logic)
* **地位**: 弱化。本项目缺少纯正的 Service 层进行复杂的聚合与计算。
* **实现载体**: 嵌入在 `server.js` 路由函数的回调中。
* **核心职责**:
  * **上传逻辑**: 检查 Body 中的 `clientId` 与对应的 `records` 数组；基于 SQLite 并发事务 `db.transaction()` 完成针对多条数据的解析与批量插入校验。
  * **查询逻辑**: 接收 `page`、`limit`、`search` (`barcode`查询)、`client_id`，利用原生 SQL LIKE 查询拼装 `whereClause` 返回记录页与统计。
  * **客户端管理逻辑**: 关联并合并基础表中提取的 `client_id` 与映射表中的 `alias`。

### 3.3 数据持久层 (Data Access & Persistence)
* **实现载体**: `db.js`
* **核心职责**:
  * 维护 `data/sync_server.db` 的绝对路径和单例 SQLite 连接实例。
  * 控制连接以 `WAL` (Write-Ahead-Log) 并发模式工作，利用原生的文件级锁控制应对多客户机高写入的特性。
  * 管理 Schema 和数据存储结构 (`pt-sync` 结构与 `rz-sync` 结构)。

### 3.4 表现层 (Presentation - Web UI)
* **实现载体**: `views/index.ejs` & `server.js` Web 路由。
* **核心职责**: 根据后端向数据库内聚合后得出的 `total`、`page` 数据页与 `records` 内容，在服务端实时渲染为可供人工查看的 HTML 数据报表看板。

## 4. 关键组件间调用关系
客户端请求 ➜ Token 授权墙 (`server.js` Middleware)
  ➜ 如果为 `/api/upload/*` ➜ 进入数据入库事务 ➜ 连接池 (`db.js`) 写入磁盘文件。
  ➜ 如果为 `/api/records/*` 或 `/api/clients` 或 `/api/stats` ➜ 执行 SELECT 查询分析 ➜ 响应 JSON 回 Client 端。
  ➜ 如果为 `/` (页面看板) ➜ 汇总数据库记录数及对应条件页列表 ➜ 传递给 `views/index.ejs` 渲染 HTML 页面。

## 5. 架构合理性及应对
当前架构“过分简单”是为了追求零配置、易部署和应对单一环境带来的极简设计，直接将控制流挂载于 Express 主路由而不建立 `services/` 目录属于正常范围，但不适合复杂业务延拓（如需增加更多业务验证或更复杂的查询条件）。

---
*生成时间: 2026-03*
*信息来源: 源码架构反推*

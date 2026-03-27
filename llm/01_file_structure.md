# 文件结构分析 (File Structure)

## 1. 文档目的
本文档详细梳理项目的目录与文件结构，解释各个目录和核心文件的职责，帮助开发者快速定位代码位置与业务模块。

## 2. 根目录概览
项目是一个扁平化的 Node.js 服务端项目，根目录包含核心的入口代码、配置文件和自动化脚本。

```text
hc-mes-sync-server/
├── .github/             # GitHub Actions 相关自动部署配置
├── data/                # 运行时目录：存放 SQLite 数据库文件 (运行时生成)
├── views/               # 视图目录：Web 管理界面的 EJS 模板文件
├── node_modules/        # 依赖目录 (由 npm install 生成)
├── .env                 # 环境变量配置文件 (部署时生成)
├── .env.example         # 环境变量示例文件
├── .gitignore           # Git 忽略配置
├── db.js                # [核心] 数据库连接池与表结构初始化
├── deploy.sh            # [核心] 生产环境自动化部署脚本
├── package.json         # 项目元数据与依赖定义
├── package-lock.json    # 依赖版本锁定文件
├── README.md            # 项目说明文档与快速上手指南
└── server.js            # [入口文件] HTTP 服务启动、路由定义与主要业务逻辑
```

## 3. 核心源码职责说明

### 3.1 `server.js`（程序入口与核心业务逻辑）
这是本系统的最核心代码文件，职责高度集中，包含以下内容：
* **服务启动**: 初始化 Express 服务，读取 `.env` 中的 `PORT` 和安全 `TOKEN`。
* **中间件**: 配置内置的 `express.json` 用于接收大规模 JSON 上传（最高支持 `10mb`），并实现了全局 token 鉴权中间件 `authMiddleware`。
* **开放 API 路由**:
  * `/api/upload/flatness`: 接收平坦度上报数据
  * `/api/upload/thermal`: 接收热阻上报数据
  * `/api/records/*`: 数据分页查询接口
  * `/api/stats`: 数据概览与统计
  * `/api/clients*`: 客户端（设备）列表查询与别名修改 
  * `/api/reset`: 测试与运维用的数据清理接口
* **Web UI 渲染**:
  * `/`: 结合 EJS 模板引擎渲染 Web 可视化报表面板。

### 3.2 `db.js`（数据持久层配置）
* 职责：封装并导出一个全局的 `better-sqlite3` 实例。
* 特性：开启了 SQLite 的 `WAL` (Write-Ahead Logging) 模式，显著提高了系统对高并发客户端并发写入的支持能力。
* 初始化：负责在项目第一次启动时通过 `CREATE TABLE IF NOT EXISTS` 执行建表逻辑，建立 `flatness_records`、`thermal_records` 和 `client_aliases` (客户端别名映射) 表记录。

### 3.3 `deploy.sh`（运维部署脚本）
* 职责：提供一键安装系统依赖环境的能力。该脚本检查 Node.js 运行环境，自动全局安装 PM2 进程管家，拉取/安装 NPM 模块配置依赖，生成 `.env`，最后执行 PM2 项目开机自启动配置。这个文件的存在极大减轻了客户在现场（制造厂内网环境）的部署复杂度。

### 3.4 `views/index.ejs`（前端页面展示）
* [推断] EJS 提供服务端渲染支持。从 `server.js` 逻辑判断，这里包含 Web 可视化报表的 HTML 骨架片段，支持了页签切换（平坦度/热阻）以及分页表格展示。

## 4. 目录流转与依赖关系
* **编译/执行流**: `node server.js` 触发程序执行，引用 `db.js` 创建/连接 `data/sync_server.db`，最后启动指定的 Express Web Server 并向外提供调用服务。
* **数据流**: 由外层发起的 API 请求进入 `server.js` 的 Upload Router 中，直接调用 `db.js` 写入本地文件系统 `data/*.db`。

---
*生成时间: 2026-03*
*信息来源: 项目静态代码目录扫描*

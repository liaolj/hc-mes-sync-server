# 合创 MES 数据同步服务器

统一接收 **平坦度（pt-sync）** 与 **热阻（rz-sync）** 客户端上报的设备检测数据，提供数据存储、查询 API 和 Web 可视化界面。

## 技术栈

| 组件 | 技术 |
| --- | --- |
| 运行时 | Node.js 20+ |
| Web 框架 | Express 4 |
| 数据库 | SQLite（better-sqlite3），WAL 模式 |
| 模板引擎 | EJS |
| 进程管理 | PM2（推荐）/ systemd |

## 项目结构

```
hc-mes-sync-server/
├── server.js            # 主入口：路由、中间件、API
├── db.js                # 数据库初始化与表结构定义
├── deploy.sh            # 一键部署脚本
├── views/
│   └── index.ejs        # Web 管理界面模板
├── data/                # 运行时生成的 SQLite 数据库目录（已 gitignore）
├── .env.example         # 环境变量示例
├── .github/
│   └── workflows/
│       └── deploy.yml   # GitHub Actions CI/CD 自动部署
├── package.json
└── package-lock.json
```

## 一键部署

将项目上传到服务器后，执行以下命令即可完成全部部署：

```bash
bash deploy.sh
```

脚本会自动完成：环境检测 → PM2 安装 → 依赖安装 → `.env` 配置 → 启动服务 → 开机自启。

**可选参数**：

```bash
# 指定端口和令牌
bash deploy.sh --port 8080 --token my-secret-token

# 指定部署目录
bash deploy.sh --app-dir /opt/hc-mes-sync-server

# 跳过 PM2 开机自启配置
bash deploy.sh --skip-pm2-setup
```

> 前提条件：服务器已安装 **Node.js 18+**。如未安装，脚本会提示安装命令。

## 手动部署

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 访问令牌（客户端和 Web 界面共用）
SYNC_SERVER_TOKEN=hc-sync-2024-secure

# 监听端口
PORT=3200
```

### 3. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式（推荐使用 PM2）
pm2 start server.js --name hc-mes-sync-server
```

启动后终端输出：

```
╔══════════════════════════════════════════════╗
║  合创 MES 数据同步服务器已启动                ║
║  地址: http://localhost:3200                 ║
║  令牌: hc-sync-...                           ║
╚══════════════════════════════════════════════╝
```

## API 接口

所有接口均需 **Token 鉴权**，支持两种方式：

- **Header**：`Authorization: Bearer <token>`
- **Query**：`?token=<token>`

### 数据上传

#### `POST /api/upload/flatness` — 平坦度数据批量上传

```json
{
  "client_id": "PC-001",
  "records": [
    {
      "source_file": "data_2024.csv",
      "line_number": 1,
      "barcode": "SN001",
      "overall_area": 12.5,
      "adhesive_area": 8.3,
      "is_valid": 1,
      "filter_reason": null,
      "collected_at": "2024-01-01 10:00:00"
    }
  ]
}
```

#### `POST /api/upload/thermal` — 热阻数据批量上传

```json
{
  "client_id": "PC-002",
  "records": [
    {
      "source_file": "thermal_2024.csv",
      "line_number": 1,
      "product_name": "产品A",
      "barcode": "SN002",
      "channel": "CH1",
      "test_time": "2024-01-01 10:00:00",
      "fan_speed_rpm": 3000,
      "ambient_temp": 25.0,
      "chip_temp": 65.0,
      "temp_diff": 40.0,
      "threshold": 0.5,
      "result": "PASS",
      "thermal_resistance": 0.35,
      "actual_power": 100.0,
      "test_pressure": 50.0,
      "test_duration_sec": 120,
      "is_valid": 1,
      "filter_reason": null,
      "collected_at": "2024-01-01 10:00:00"
    }
  ]
}
```

**响应格式**（两个上传接口相同）：

```json
{
  "success": true,
  "received": 10,
  "inserted": 8
}
```

> `inserted` 可能小于 `received`，因为重复记录会被 `INSERT OR IGNORE` 跳过（基于 `client_id + source_file + line_number` 唯一约束）。

### 数据查询

#### `GET /api/records/flatness` — 查询平坦度记录

#### `GET /api/records/thermal` — 查询热阻记录

**查询参数**：

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `page` | number | 1 | 页码 |
| `limit` | number | 100 | 每页条数（最大 500） |
| `search` | string | — | 按条码模糊搜索 |

#### `GET /api/stats` — 统计概览

返回各数据类型的总记录数和客户端列表。

### Web 管理界面

#### `GET /` — 数据看板

浏览器访问 `http://<host>:3200/?token=<your-token>` 即可查看数据看板，支持切换平坦度/热阻标签页、分页浏览和条码搜索。

## 数据库设计

使用 SQLite 数据库，包含两张核心数据表：

### `flatness_records`（平坦度记录）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | INTEGER | 自增主键 |
| `client_id` | TEXT | 客户端标识 |
| `source_file` | TEXT | 源文件名 |
| `line_number` | INTEGER | 行号 |
| `barcode` | TEXT | 条码 |
| `overall_area` | REAL | 总面积 |
| `adhesive_area` | REAL | 胶面积 |
| `is_valid` | INTEGER | 是否有效（1/0） |
| `filter_reason` | TEXT | 过滤原因 |
| `collected_at` | TEXT | 采集时间 |
| `created_at` | DATETIME | 创建时间 |
| `synced_at` | DATETIME | 同步时间 |

唯一约束：`(client_id, source_file, line_number)`

### `thermal_records`（热阻记录）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | INTEGER | 自增主键 |
| `client_id` | TEXT | 客户端标识 |
| `source_file` | TEXT | 源文件名 |
| `line_number` | INTEGER | 行号 |
| `product_name` | TEXT | 产品名称 |
| `barcode` | TEXT | 条码 |
| `channel` | TEXT | 通道 |
| `test_time` | TEXT | 测试时间 |
| `fan_speed_rpm` | INTEGER | 风扇转速 |
| `ambient_temp` | REAL | 环境温度 |
| `chip_temp` | REAL | 芯片温度 |
| `temp_diff` | REAL | 温差 |
| `threshold` | REAL | 阈值 |
| `result` | TEXT | 结果（PASS/FAIL） |
| `thermal_resistance` | REAL | 热阻值 |
| `actual_power` | REAL | 实际功率 |
| `test_pressure` | REAL | 测试压力 |
| `test_duration_sec` | INTEGER | 测试时长（秒） |
| `is_valid` | INTEGER | 是否有效（1/0） |
| `filter_reason` | TEXT | 过滤原因 |
| `collected_at` | TEXT | 采集时间 |
| `created_at` | DATETIME | 创建时间 |
| `synced_at` | DATETIME | 同步时间 |

唯一约束：`(client_id, source_file, line_number)`

## CI/CD 部署

项目配置了 GitHub Actions 自动部署工作流（`.github/workflows/deploy.yml`）：

**触发条件**：推送到 `master` 分支 或 手动触发

**流程**：

1. **构建阶段**：检出代码 → 安装依赖 → 校验代码可加载性 → 打包产物
2. **部署阶段**：SSH 连接远程服务器 → 备份旧版本 → 解压新版本 → 安装依赖 → 重启服务

**所需 GitHub Secrets**：

| Secret | 说明 |
| --- | --- |
| `SERVER_HOST` | 服务器 IP 或域名 |
| `SERVER_USER` | SSH 用户名 |
| `SERVER_SSH_KEY` | SSH 私钥 |
| `SERVER_PORT` | SSH 端口（默认 22） |
| `APP_DIR` | 部署目录（默认 `/opt/hc-mes-sync-server`） |

## 关联项目

| 项目 | 说明 |
| --- | --- |
| `hc-mes-pt-sync-egui` | 平坦度数据同步客户端（Egui 桌面应用） |
| `hc-mes-rz-sync-egui` | 热阻数据同步客户端（Egui 桌面应用） |

## 版本管理

项目采用语义化版本（SemVer）进行管理。

### 自动化更新流程

我们提供了一键式版本更新脚本 `version-up.sh`。

**用法：**

```bash
# 升级修订号 (1.0.0 -> 1.0.1)
bash version-up.sh patch

# 升级次版本号 (1.0.0 -> 1.1.0)
bash version-up.sh minor

# 升级主版本号 (1.0.0 -> 2.0.0)
bash version-up.sh major

# 指定特定版本
bash version-up.sh 1.2.3
```

**脚本会自动：**
1. 修改 `package.json` 中的版本号。
2. 在 `README.md` 的版本历史中追加记录。
3. 执行 Git commit 提交变更。
4. 创建对应的 Git Tag（如 `v1.0.1`）。

### 版本更新新流程

1. **功能开发**：在本地完成代码修改并验证。
2. **执行更新**：运行 `bash version-up.sh [patch|minor|major]`。
3. **推送代码**：`git push origin master --tags`。
4. **自动部署**：GitHub Actions 会检测到新的推送或 Tag 并触发生产环境自动部署。

## 版本历史
- v1.0.2 (2026-03-27): 自动发布新版本

- v1.0.1 (2026-03-27): 自动发布新版本


- v1.0.0 (2024-03-27): 初始化版本，建立自动化版本同步机制。

## License

Private — 内部使用

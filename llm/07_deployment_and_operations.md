# 项目部署与运行方式 (Deployment & Operations)

## 1. 文档目的
描述服务端开发环境的搭建、生产环境服务器的自动化一键部署方式、配置环境变量及 CI/CD 工作流。

## 2. 本地开发与启动

### 2.1 基础依赖要求
* 操作系统: macOS / Linux / Windows
* 环境: Node.js 18.x 及以上 
* 无需单独安装数据库服务端。

### 2.2 启动步骤
1. **安装依赖**：
   ```bash
   npm install
   ```
2. **复制环境变量模板并修改**：
   ```bash
   cp .env.example .env
   # 按需修改 .env 中的 PORT 和 SYNC_SERVER_TOKEN
   ```
3. **运行服务**：
   ```bash
   npm start 
   # 或者基于 nodemon 的 npm run dev
   ```

---

## 3. 生产环境部署 (裸机自动化部署)

生产服务器推荐使用 Linux (Ubuntu/CentOS)。系统采用自带强大的 Shell 脚本一键收拢复杂的环境配置步骤。

### 3.1 一键部署脚本：`deploy.sh`
执行命令（可以在传入对应参数）：
```bash
# 赋予执行权限并以默认选项执行
bash deploy.sh 
# 或者手动指定端口和保护密钥
bash deploy.sh --port 8080 --token my-secret-token --app-dir /opt/hc-mes-sync-server
```

**脚本自动执行流程**：
1. 检测主机内的 `Node.js` (要求大于等于 18)。
2. 判断 `npm` 可用性，如确实 PM2 并自动全局安装 `npm install -g pm2`。
3. 对指定目录执行 `npm ci --production` 或 `npm install --production` 安装模块。
4. 如果缺失 `.env`，脚本将静默生成一份带有默认项的安全配置文件（提取传入参数进行直接覆盖置换）。
5. 检出目前是否有已经运行的重名 `hc-mes-sync-server` PM2 实例并接管其重启。
6. 使用 PM2 挂载此应用，输出日志在守护系统中，并**自动将其挂载为开机启动服务**。

### 3.2 环境变量及配置清单 

可以通过 `.env` 声明：
| 变量名 | 说明 | 默认值 | 必填 |
| :--- | :--- | :--- | :--- |
| `PORT` | Web及API服务器监听端口 | `3200` | 否 |
| `SYNC_SERVER_TOKEN` | 固定的接口通信对称安全凭证 | `hc-sync-2024-secure` | 否(强烈建议覆盖) |

---

## 4. CI/CD 流水线发布机制
项目配备有自动化远端发版流程配置 (`.github/workflows/deploy.yml`)，依托 GitHub Actions 自动进行服务器上线。
* **触发条件**: 向远程仓库推送 `master` 主分支代码；或者手工触发 (workflow_dispatch)。
* **部署逻辑**:
  1. 使用 Checkout Action 取出代码进行基本校验测试。
  2. 收罗并将源码通过 rsync 打包成 `tar` 产物。
  3. 执行 SSH Remote Pipeline 连接配置的内部服务器（基于 `SERVER_HOST`, `SERVER_USER`, `SERVER_SSH_KEY` 注入证书链）。
  4. 解压至配置的线上目录，最终触发并**回调远程生产机上的 `bash deploy.sh`**。

这是极其顺畅经典的"拉取 -> 压缩 -> 安全回传解压 -> 触发生效" 的流水线模型。

---

## 5. 常规运维操作指南
如果在生产机器运维：
* 查看服务运行列表：`pm2 list`
* 查看应用聚合日志：`pm2 logs hc-mes-sync-server`
* 重启服务与重载配置：`pm2 restart hc-mes-sync-server --update-env`
* 服务关停开机：`pm2 stop hc-mes-sync-server` 或 `pm2 kill`
* 数据库备份：在安全时间拷贝走 `data/sync_server.db` 及附随的 WAL 文件即可完成全量冷备。

---
*生成时间: 2026-03*
*信息来源: `deploy.sh` 及 README 文档*

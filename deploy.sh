#!/usr/bin/env bash
# ============================================================
# 合创 MES 数据同步服务器 — 一键部署脚本
# 用法: bash deploy.sh [选项]
#
# 功能:
#   1. 检测运行环境与依赖 (Node.js, npm, pm2)
#   2. 自动安装 PM2（如未安装）
#   3. 安装/更新 npm 依赖
#   4. 自动创建 .env 配置文件（如不存在）
#   5. 启动/重启 PM2 托管的服务进程
#   6. 配置 PM2 开机自启
#
# 选项:
#   --port PORT       指定监听端口（默认 3200）
#   --token TOKEN     指定访问令牌
#   --app-dir DIR     指定部署目录（默认为脚本所在目录）
#   --skip-pm2-setup  跳过 PM2 开机自启配置
#   -h, --help        显示帮助信息
# ============================================================

set -euo pipefail

# ---- 颜色定义 ----
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ---- 日志输出 ----
info()    { echo -e "${BLUE}ℹ${NC}  $*"; }
success() { echo -e "${GREEN}✅${NC} $*"; }
warn()    { echo -e "${YELLOW}⚠️${NC}  $*"; }
error()   { echo -e "${RED}❌${NC} $*"; }

# ---- 默认参数 ----
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$SCRIPT_DIR"
PORT=""
TOKEN=""
SKIP_PM2_SETUP=false
APP_NAME="hc-mes-sync-server"

# ---- 参数解析 ----
show_help() {
    echo ""
    echo -e "${CYAN}合创 MES 数据同步服务器 — 一键部署脚本${NC}"
    echo ""
    echo "用法: bash deploy.sh [选项]"
    echo ""
    echo "选项:"
    echo "  --port PORT       指定监听端口（默认 3200）"
    echo "  --token TOKEN     指定访问令牌"
    echo "  --app-dir DIR     指定部署目录（默认为脚本所在目录）"
    echo "  --skip-pm2-setup  跳过 PM2 开机自启配置"
    echo "  -h, --help        显示帮助信息"
    echo ""
    exit 0
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --port)     PORT="$2"; shift 2 ;;
        --token)    TOKEN="$2"; shift 2 ;;
        --app-dir)  APP_DIR="$2"; shift 2 ;;
        --skip-pm2-setup) SKIP_PM2_SETUP=true; shift ;;
        -h|--help)  show_help ;;
        *)          error "未知参数: $1"; show_help ;;
    esac
done

# ============================================================
# 开始部署
# ============================================================
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  合创 MES 数据同步服务器 — 一键部署          ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
echo ""

# ---- 步骤 1: 环境检测 ----
info "步骤 1/6: 检测运行环境..."

# 检查 Node.js
if ! command -v node &> /dev/null; then
    error "未检测到 Node.js，请先安装 Node.js 20+："
    echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    echo "  sudo apt-get install -y nodejs"
    exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    error "Node.js 版本过低（当前 v$(node -v)），需要 v18+。"
    exit 1
fi
success "Node.js $(node -v)"

# 检查 npm
if ! command -v npm &> /dev/null; then
    error "未检测到 npm，请重新安装 Node.js。"
    exit 1
fi
success "npm $(npm -v)"

# ---- 步骤 2: 安装 PM2 ----
info "步骤 2/6: 检查 PM2 进程管理器..."

if ! command -v pm2 &> /dev/null; then
    warn "PM2 未安装，正在全局安装..."
    npm install -g pm2
    success "PM2 安装完成 $(pm2 -v)"
else
    success "PM2 $(pm2 -v)"
fi

# ---- 步骤 3: 安装依赖 ----
info "步骤 3/6: 安装 npm 依赖..."
cd "$APP_DIR"

if [ ! -f "package.json" ]; then
    error "在 ${APP_DIR} 下未找到 package.json，请检查 --app-dir 参数。"
    exit 1
fi

if [ -f "package-lock.json" ]; then
    npm ci --production
else
    npm install --production
fi
success "依赖安装完成"

# ---- 步骤 4: 配置环境变量 ----
info "步骤 4/6: 配置环境变量..."

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        info "已从 .env.example 创建 .env 文件"
    else
        # 手动创建默认 .env
        cat > .env << 'EOF'
# 同步服务器访问令牌（必须配置，否则使用默认值）
SYNC_SERVER_TOKEN=hc-sync-2024-secure

# 服务器监听端口
PORT=3200
EOF
        info "已创建默认 .env 文件"
    fi
fi

# 根据命令行参数覆盖 .env 中的值
if [ -n "$PORT" ]; then
    if grep -q "^PORT=" .env; then
        sed -i "s/^PORT=.*/PORT=${PORT}/" .env
    else
        echo "PORT=${PORT}" >> .env
    fi
    info "监听端口已设置为 ${PORT}"
fi

if [ -n "$TOKEN" ]; then
    if grep -q "^SYNC_SERVER_TOKEN=" .env; then
        sed -i "s/^SYNC_SERVER_TOKEN=.*/SYNC_SERVER_TOKEN=${TOKEN}/" .env
    else
        echo "SYNC_SERVER_TOKEN=${TOKEN}" >> .env
    fi
    info "访问令牌已更新"
fi

# 读取最终配置用于展示
FINAL_PORT=$(grep "^PORT=" .env | cut -d= -f2 || echo "3200")
FINAL_TOKEN=$(grep "^SYNC_SERVER_TOKEN=" .env | cut -d= -f2 || echo "")

success ".env 配置就绪"

# 获取当前版本号
CURRENT_VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "1.0.0")

# ---- 步骤 5: 启动/重启服务 ----
info "步骤 5/6: 启动服务..."

cd "$APP_DIR"

# 检测服务是否已在 PM2 运行
if pm2 describe "$APP_NAME" &> /dev/null; then
    info "检测到已有运行实例，正在重启..."
    pm2 restart "$APP_NAME" --update-env
    success "服务已重启"
else
    info "首次部署，启动新实例..."
    pm2 start server.js \
        --name "$APP_NAME" \
        --cwd "$APP_DIR" \
        --max-memory-restart 512M \
        --log-date-format "YYYY-MM-DD HH:mm:ss" \
        --merge-logs
    success "服务已启动"
fi

pm2 save --force 2>/dev/null || true

# ---- 步骤 6: 配置开机自启 ----
if [ "$SKIP_PM2_SETUP" = false ]; then
    info "步骤 6/6: 配置 PM2 开机自启..."
    # pm2 startup 输出一条需要 sudo 执行的命令
    STARTUP_CMD=$(pm2 startup 2>/dev/null | grep "sudo" || true)
    if [ -n "$STARTUP_CMD" ]; then
        warn "请手动执行以下命令以启用开机自启："
        echo -e "  ${YELLOW}${STARTUP_CMD}${NC}"
    else
        success "PM2 开机自启已配置"
    fi
else
    info "步骤 6/6: 跳过 PM2 开机自启配置（--skip-pm2-setup）"
fi

# ---- 部署完成 ----
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  🎉 部署完成！                                ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║${NC}  应用名称:  ${CYAN}${APP_NAME}${NC}"
echo -e "${GREEN}║${NC}  当前版本:  ${YELLOW}v${CURRENT_VERSION}${NC}"
echo -e "${GREEN}║${NC}  部署目录:  ${CYAN}${APP_DIR}${NC}"
echo -e "${GREEN}║${NC}  监听端口:  ${CYAN}${FINAL_PORT}${NC}"
echo -e "${GREEN}║${NC}  访问地址:  ${CYAN}http://localhost:${FINAL_PORT}${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║${NC}  ${BLUE}常用命令:${NC}"
echo -e "${GREEN}║${NC}    查看状态:  pm2 status"
echo -e "${GREEN}║${NC}    查看日志:  pm2 logs ${APP_NAME}"
echo -e "${GREEN}║${NC}    重启服务:  pm2 restart ${APP_NAME}"
echo -e "${GREEN}║${NC}    停止服务:  pm2 stop ${APP_NAME}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""

#!/usr/bin/env bash
# ============================================================
# hc-mes-sync-server 版本更新自动化脚本
# 用法: bash version-up.sh [patch|minor|major|x.y.z]
# ============================================================

set -euo pipefail

# ---- 颜色定义 ----
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()    { echo -e "${BLUE}ℹ${NC}  $*"; }
success() { echo -e "${GREEN}✅${NC} $*"; }
error()   { echo -e "${RED}❌${NC} $*"; }

# 检查当前目录
if [ ! -f "package.json" ]; then
    error "当前目录下未找到 package.json"
    exit 1
fi

BUMP_TYPE=${1:-"patch"}
OLD_VERSION=$(node -p "require('./package.json').version")

info "当前版本: v${OLD_VERSION}"

# 1. 使用 npm version 更新版本号 (不自动打标签，我们后面手动控制)
NEW_VERSION=$(npm version "$BUMP_TYPE" --no-git-tag-version)
NEW_VERSION=${NEW_VERSION#v} # 去掉前缀 v

info "更新至新版本: v${NEW_VERSION}"

# 2. 更新 README.md 中的版本历史 (简单的追加)
DATE=$(date +%Y-%m-%d)
# 寻找 ## 版本历史 标题，在其下方插入新行
if grep -q "## 版本历史" README.md; then
    sed -i '' "/## 版本历史/a\\
- v${NEW_VERSION} ($DATE): 自动发布新版本\\
" README.md
    info "已更新 README.md 版本历史"
else
    echo -e "\n## 版本历史\n\n- v${NEW_VERSION} ($DATE): 初始化版本管理" >> README.md
    info "已添加 README.md 版本历史章节"
fi

# 3. Git 提交
git add package.json package-lock.json README.md
git commit -m "发布: v${NEW_VERSION}"
success "已完成 Git 提交: 发布: v${NEW_VERSION}"

# 4. 创建 Git Tag
git tag "v${NEW_VERSION}"
success "已打 Tag: v${NEW_VERSION}"

echo ""
success "✨ 版本更新完成！"
info "接下来你可以运行: git push origin master --tags"

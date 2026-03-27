# API 接口总文档 (API Documentation)

## 1. 文档目的
本文档是 `hc-mes-sync-server` API 通信的总览说明。本系统全部的对外接口均为 HTTP / RESTful 风格，主要服务于边缘侧应用（设备客户端）与少量的外部请求查询。

## 2. 接口认证机制 (Authentication)
所有的接口（包含 Web 看板）**均需校验请求令牌**。这是一种安全前置条件。
认证系统支持两种传参方式：
1. **Header 传参（推荐客户端使用）**: 
   ```http
   Authorization: Bearer <your-secret-token>
   ```
2. **Query 传参（供 Web 或简单脚本使用）**: 
   ```http
   GET /api/stats?token=<your-secret-token>
   ```

若令牌缺失或错误，接口将统一返回 HTTP 状态码 `401 Unauthorized`:
```json
{
  "error": "未授权：需要有效的访问令牌"
}
```

## 3. 接口分类速览
目前，接口按照通信方和职责划分为以下部分，详细内容请参见 `api/` 子目录：

* [HTTP 服务端前后端协同及客户端对接接口详情](./api/frontend_backend_apis.md) - 包含了数据批量上传、数据查询、客户端信息管理等共 8 个核心接口。
* [内部微服务交互接口](./api/internal_service_apis.md) - **（该系统暂无）** 说明：当前系统为独立数据接入单体。
* [第三方集成接口](./api/third_party_integrations.md) - **（该系统暂无）** 说明：未涉及向外部厂区或其他未标明授权的三方服务的 Hook 调用。

---
*生成时间: 2026-03*
*信息来源: `server.js` 路由解析*

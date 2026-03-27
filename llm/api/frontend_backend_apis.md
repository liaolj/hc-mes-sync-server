# 前后端及客户端通信 API 详情 (REST API)

## 1. HTTP 公共规范

### 1.1 鉴权机制
所有接口均需携带 Token 鉴权，支持两种传递方式：
* **Header 方式**（推荐）：`Authorization: Bearer <token>`
* **Query 方式**：`?token=<token>`

默认 Token 值：`hc-sync-2024-secure`（可通过环境变量 `SYNC_SERVER_TOKEN` 覆盖）。

### 1.2 请求限制
* **Body 大小上限**：`10mb`（由 Express `express.json({ limit: '10mb' })` 配置）
* **Content-Type**: `application/json`

### 1.3 响应规范
* **成功响应**: HTTP Status Code `200`，主体携带 `"success": true` 或对应数据体。
* **异常响应**: 
  * `400 Bad Request`：请求体/参数格式不符合要求。
  * `401 Unauthorized`：Token 缺失或无效（返回 `{ "error": "未授权：需要有效的访问令牌" }`）。
  * `500 Internal Server Error`：服务端执行错误。

---

## 2. 数据入库（上传）系列

### 2.1 平坦度数据批量上传
* **API 名称**: `POST /api/upload/flatness`
* **功能说明**: 供 `pt-sync` 客户端批量提交平坦度 CSV 解析出来的数据并入库。
* **调用来源**: 工控机上的桌面应用程序。
* **Body 传参** (`application/json`):
  ```json
  {
    "client_id": "PT-Mac-001",
    "records": [
      {
        "source_file": "20240410.csv",
        "line_number": 2,
        "barcode": "XN0091",
        "overall_area": 12.3,
        "adhesive_area": 8.0,
        "is_valid": 1,
        "filter_reason": null,
        "collected_at": "2024-04-10 12:00:00"
      }
    ]
  }
  ```
* **字段说明**:
  * `is_valid` (integer，可选，默认 `1`)：数据是否有效。
  * `filter_reason` (string，可选，默认 `null`)：数据被过滤的原因说明。**注：当前 `pt-sync` 客户端不上传此字段，Server 自动填充 `null`。**
  * `collected_at` (string，可选)：数据采集时间，格式 `"YYYY-MM-DD HH:mm:ss"`。
* **去重键**: 由 `INSERT OR IGNORE` 和唯一索引（`client_id` + `source_file` + `line_number`）确保重复数据自动忽略。
* **返回格式**:
  ```json
  {
    "success": true,
    "received": 1,
    "inserted": 1 
  }
  ```
* **备注**: `received` 为本次请求中 `records` 数组长度。`inserted` 代表真实被新插入的数据条数。差异部分为命中去重键被忽略的重复数据。

### 2.2 热阻数据批量上传
* **API 名称**: `POST /api/upload/thermal`
* **功能说明**: 供 `rz-sync` 客户端批量提交热阻测试结果数据。
* **Body 传参** (`application/json`):
  ```json
  {
    "client_id": "RZ-Mac-002",
    "records": [
      {
        "source_file": "20241103_TR_Report.xlsx",
        "line_number": 8,
        "product_name": "HT-CPU-Fan-Module-A",
        "barcode": "HT-202410-00100231",
        "channel": "CH-1",
        "test_time": "2024-11-03 14:02:33",
        "fan_speed_rpm": 3200,
        "ambient_temp": 24.5,
        "chip_temp": 68.2,
        "temp_diff": 43.7,
        "threshold": 45.0,
        "result": "OK",
        "thermal_resistance": 0.85,
        "actual_power": 51.4,
        "test_pressure": 1.2,
        "test_duration_sec": 120,
        "is_valid": 1,
        "filter_reason": null,
        "collected_at": "2024-11-03 14:02:40"
      }
    ]
  }
  ```
* **字段说明**:
  * `threshold` (number)：温差判定标准（单位 ℃），来自上位机测试仪输出。
  * `result` (string)：测试结论，来自上位机原始输出，典型值为 `"OK"` 或 `"NG"`。Server 不做枚举校验，原样入库。
  * `channel` (string)：通道编号，来自上位机原始输出（格式可能为 `"CH-1"` 或 `"CH1"`，取决于测试仪型号）。
  * `is_valid` (integer，可选，默认 `1`)：数据有效性标记，`1` = 有效，`0` = 无效。
  * `filter_reason` (string，可选，默认 `null`)：数据被过滤的原因说明。**注：当前 `rz-sync-py` 客户端不上传此字段，Server 自动填充 `null`。**
  * `collected_at` (string，可选)：数据采集时间，格式 `"YYYY-MM-DD HH:mm:ss"`。
* **去重键**: 由 `INSERT OR IGNORE` 和唯一索引确保重复数据自动忽略。
* **返回结构**: 同平坦度（`{ success, received, inserted }`）。

---

## 3. 数据查询系列

### 3.1 查询平坦度测试记录
* **API 名称**: `GET /api/records/flatness`
* **功能说明**: 供 Web 报表端或第三方系统查询记录。
* **Query 参数**:
  * `page` (number, 默认 1) - 页码。
  * `limit` (number, 默认 100) - 单页条数，最大强制 500 截断防爆内存。
  * `search` (string) - 根据产品条码 (`barcode`) 执行模糊查询 (`'%search%'`)。
  * `client_id` (string) - 精确筛选由某台特定机台产生的数据。
* **返回格式**:
  ```json
  {
    "records": [ { "id": 1, "barcode": "XN0091", "client_id": "PT-Mac-001", ... } ],
    "total": 1,
    "page": 1,
    "limit": 100
  }
  ```

### 3.2 查询热阻测试记录
* **API 名称**: `GET /api/records/thermal`
* **使用方式**: 参数列表与返回值结构与 `3.1平坦度查询` 接口完全一致，只是所搜寻的目标数据表变成 `thermal_records`。

### 3.3 数据大盘概览统计
* **API 名称**: `GET /api/stats`
* **功能说明**: 获取平坦度和热阻两大表中的现存总记录数和各自涉及的独立设备客户端 (`client_id`) 集合。
* **返回格式**:
  ```json
  {
    "flatness": { "total": 15000, "clients": ["PT-Mac-001", "PT-Mac-002"] },
    "thermal": { "total": 8500, "clients": ["RZ-Mac-001"] }
  }
  ```

---

## 4. 客户端（机器）管控系列

### 4.1 获取已接入客户端信息列表
* **API 名称**: `GET /api/clients`
* **功能说明**: 返回一个所有设备的信息及其所取了别名的聚合数组。
* **返回格式**:
  ```json
  {
    "clients": [
      {
        "client_id": "PT-Mac-001",
        "alias": "车间2号平坦机",
        "record_count": 8500
      }
    ]
  }
  ```

### 4.2 更新指定客户端备注名
* **API 名称**: `PUT /api/clients/:client_id/alias`
* **功能说明**: 保存或覆盖机器的自诉代称（机器通常被初始化为只携带不可读的 MAC)。
* **路径参数**:
  * `client_id` (string): 须为设备的原始设备号。
* **Body 传参**:
  ```json
  {
    "alias": "一车间平坦度测试主节点"
  }
  ```
* **返回格式**: `{ "success": true, "client_id": "...", "alias": "..." }`

---

## 5. 运维/维护接口

### 5.1 数据空间一键重置
* **API 名称**: `POST /api/reset`
* **功能说明**: 能够实现一键删除整表内全部现存数据！(Danger API)
* **Body 传参**:
  ```json
  {
    "target": "all"   // 或 "flatness", "thermal"
  }
  ```
* **返回格式**: 
  ```json
  {
    "success": true,
    "target": "all",
    "deleted": {
      "flatness": 15000,
      "thermal": 8500,
      "total": 23500
    }
  }
  ```

---
*生成时间: 2026-03*
*信息来源: `server.js` 路由解析*

# 术语表 (Glossary)

## 1. 文档目的
统一团队成员、对接方、实施方对项目中存在的缩写与专有名词描述的认知。

## 2. 词汇及含义表

| 术语 / 缩写 | 全称或英文 | 含义解释 |
| :--- | :--- | :--- |
| **pt-sync** | Flatness Sync Client | **平坦度数据同步客户端**。运行在平坦度检测设备旁的桌面通讯软件，负责抓取设备生成的 CSV 上传至服务端。 |
| **rz-sync** | Thermal Sync Client | **热阻数据同步客户端**。运行在热阻检测设备旁的桌面通讯软件，职责同上。 |
| **Barcode** | Barcode / SN | **条码 / 产品序列号**。芯片、模组加工流转环节上的唯一身份喷码追踪标识，是系统的核心溯源线索。 |
| **Client ID** | Client Identifier | **独立设备/客机标识号**。大部分情况下为检测设备连接外网的网卡 MAC 地址格式 (例如: `00-FF-AA-BB-CC-DD`) 或者管理员定义的字符串，通过它确认数据发送来源。 |
| **Alias** | Client Alias | **设备别名 / 备注名**。由于 MAC 地址不带业务含义，在 Web 后台可以赋予的诸如“检测线1号机”这类的可读描述。 |
| **Overall Area** | Overall Area | **总面积**（平坦度测试指标）。 |
| **Adhesive Area** | Adhesive Area | **胶面积**（平坦度测试指标）。 |
| **Chip Temp** | Chip Temperature | **芯片温度**（热阻测试指标）。 |
| **Thermal Resistance** | Thermal Resistance | **热阻值**（热阻测试最核心质量指标参数）。 |
| **Temp Diff** | Temperature Difference | **温差**（热阻测试指标，即测试结温与环境室温的差额数值）。 |
| **SQLite WAL** | Write-Ahead-Log | SQLite 数据库采用的一种特殊的抗并发写入缓存日志模式，本服务端利用它缓解设备群起提交时导致的“表锁定阻塞”。 |

---
*生成时间: 2026-03*
*信息来源: 源码中字段及 `README.md` 注释*

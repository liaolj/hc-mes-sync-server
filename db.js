const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// 数据目录：存放 SQLite 文件
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'sync_server.db');
const db = new Database(DB_PATH);

// 开启 WAL 模式提升并发写入性能
db.pragma('journal_mode = WAL');

// ========== 初始化表结构（与客户端 schema 保持一致） ==========

// 平坦度数据表 —— 对应 pt-sync 客户端
db.exec(`
  CREATE TABLE IF NOT EXISTS flatness_records (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id       TEXT NOT NULL DEFAULT 'unknown',
    source_file     TEXT NOT NULL,
    line_number     INTEGER NOT NULL,
    barcode         TEXT,
    overall_area    REAL,
    adhesive_area   REAL,
    is_valid        INTEGER DEFAULT 1,
    filter_reason   TEXT,
    collected_at    TEXT,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    synced_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(client_id, source_file, line_number)
  )
`);

// 热阻数据表 —— 对应 rz-sync 客户端
db.exec(`
  CREATE TABLE IF NOT EXISTS thermal_records (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id           TEXT NOT NULL DEFAULT 'unknown',
    source_file         TEXT NOT NULL,
    line_number         INTEGER NOT NULL,
    product_name        TEXT,
    barcode             TEXT,
    channel             TEXT,
    test_time           TEXT,
    fan_speed_rpm       INTEGER,
    ambient_temp        REAL,
    chip_temp           REAL,
    temp_diff           REAL,
    threshold           REAL,
    result              TEXT,
    thermal_resistance  REAL,
    actual_power        REAL,
    test_pressure       REAL,
    test_duration_sec   INTEGER,
    is_valid            INTEGER DEFAULT 1,
    filter_reason       TEXT,
    collected_at        TEXT,
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    synced_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(client_id, source_file, line_number)
  )
`);

console.log(`[数据库] 初始化完成: ${DB_PATH}`);

module.exports = db;

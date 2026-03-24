const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3200;
const TOKEN = process.env.SYNC_SERVER_TOKEN || 'hc-sync-2024-secure';

// ========== 中间件 ==========
app.use(express.json({ limit: '10mb' }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

/**
 * Token 鉴权中间件
 * 支持两种方式：
 * 1. Header: Authorization: Bearer <token>
 * 2. Query:  ?token=<token>
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const queryToken = req.query.token;

  let providedToken = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    providedToken = authHeader.slice(7);
  } else if (queryToken) {
    providedToken = queryToken;
  }

  if (!providedToken || providedToken !== TOKEN) {
    return res.status(401).json({ error: '未授权：需要有效的访问令牌' });
  }

  next();
}

// 所有路由都需要 Token 鉴权
app.use(authMiddleware);

// ========== 数据上传 API ==========

// 平坦度数据批量上传
app.post('/api/upload/flatness', (req, res) => {
  try {
    const { client_id, records } = req.body;
    if (!client_id || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: '请求格式错误：需要 client_id 和 records 数组' });
    }

    const insert = db.prepare(`
      INSERT OR IGNORE INTO flatness_records 
        (client_id, source_file, line_number, barcode, overall_area, adhesive_area, is_valid, filter_reason, collected_at)
      VALUES 
        (@client_id, @source_file, @line_number, @barcode, @overall_area, @adhesive_area, @is_valid, @filter_reason, @collected_at)
    `);

    const insertMany = db.transaction((rows) => {
      let inserted = 0;
      for (const row of rows) {
        const info = insert.run({
          client_id,
          source_file: row.source_file || '',
          line_number: row.line_number || 0,
          barcode: row.barcode || '',
          overall_area: row.overall_area || 0,
          adhesive_area: row.adhesive_area || 0,
          is_valid: row.is_valid ?? 1,
          filter_reason: row.filter_reason || null,
          collected_at: row.collected_at || null,
        });
        if (info.changes > 0) inserted++;
      }
      return inserted;
    });

    const inserted = insertMany(records);
    res.json({ success: true, received: records.length, inserted });
  } catch (err) {
    console.error('[上传错误] flatness:', err.message);
    res.status(500).json({ error: '服务器内部错误: ' + err.message });
  }
});

// 热阻数据批量上传
app.post('/api/upload/thermal', (req, res) => {
  try {
    const { client_id, records } = req.body;
    if (!client_id || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: '请求格式错误：需要 client_id 和 records 数组' });
    }

    const insert = db.prepare(`
      INSERT OR IGNORE INTO thermal_records 
        (client_id, source_file, line_number, product_name, barcode, channel, test_time,
         fan_speed_rpm, ambient_temp, chip_temp, temp_diff, threshold, result,
         thermal_resistance, actual_power, test_pressure, test_duration_sec,
         is_valid, filter_reason, collected_at)
      VALUES 
        (@client_id, @source_file, @line_number, @product_name, @barcode, @channel, @test_time,
         @fan_speed_rpm, @ambient_temp, @chip_temp, @temp_diff, @threshold, @result,
         @thermal_resistance, @actual_power, @test_pressure, @test_duration_sec,
         @is_valid, @filter_reason, @collected_at)
    `);

    const insertMany = db.transaction((rows) => {
      let inserted = 0;
      for (const row of rows) {
        const info = insert.run({
          client_id,
          source_file: row.source_file || '',
          line_number: row.line_number || 0,
          product_name: row.product_name || '',
          barcode: row.barcode || '',
          channel: row.channel || '',
          test_time: row.test_time || '',
          fan_speed_rpm: row.fan_speed_rpm || 0,
          ambient_temp: row.ambient_temp || 0,
          chip_temp: row.chip_temp || 0,
          temp_diff: row.temp_diff || 0,
          threshold: row.threshold || 0,
          result: row.result || '',
          thermal_resistance: row.thermal_resistance || 0,
          actual_power: row.actual_power || 0,
          test_pressure: row.test_pressure || 0,
          test_duration_sec: row.test_duration_sec || 0,
          is_valid: row.is_valid ?? 1,
          filter_reason: row.filter_reason || null,
          collected_at: row.collected_at || null,
        });
        if (info.changes > 0) inserted++;
      }
      return inserted;
    });

    const inserted = insertMany(records);
    res.json({ success: true, received: records.length, inserted });
  } catch (err) {
    console.error('[上传错误] thermal:', err.message);
    res.status(500).json({ error: '服务器内部错误: ' + err.message });
  }
});

// ========== 数据查询 API ==========

app.get('/api/records/flatness', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let whereClause = '1=1';
    const params = {};
    if (search) {
      whereClause = "barcode LIKE '%' || @search || '%'";
      params.search = search;
    }

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM flatness_records WHERE ${whereClause}`).get(params);
    const records = db.prepare(`SELECT * FROM flatness_records WHERE ${whereClause} ORDER BY id DESC LIMIT @limit OFFSET @offset`).all({ ...params, limit, offset });

    res.json({ records, total: countRow.total, page, limit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/records/thermal', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let whereClause = '1=1';
    const params = {};
    if (search) {
      whereClause = "barcode LIKE '%' || @search || '%'";
      params.search = search;
    }

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM thermal_records WHERE ${whereClause}`).get(params);
    const records = db.prepare(`SELECT * FROM thermal_records WHERE ${whereClause} ORDER BY id DESC LIMIT @limit OFFSET @offset`).all({ ...params, limit, offset });

    res.json({ records, total: countRow.total, page, limit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 统计概览 API
app.get('/api/stats', (req, res) => {
  try {
    const flatnessCount = db.prepare('SELECT COUNT(*) as count FROM flatness_records').get();
    const thermalCount = db.prepare('SELECT COUNT(*) as count FROM thermal_records').get();
    const flatnessClients = db.prepare('SELECT DISTINCT client_id FROM flatness_records').all();
    const thermalClients = db.prepare('SELECT DISTINCT client_id FROM thermal_records').all();

    res.json({
      flatness: { total: flatnessCount.count, clients: flatnessClients.map(r => r.client_id) },
      thermal: { total: thermalCount.count, clients: thermalClients.map(r => r.client_id) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== 数据库重置 API ==========

app.post('/api/reset', (req, res) => {
  try {
    const { target } = req.body; // 'all' | 'flatness' | 'thermal'
    if (!target || !['all', 'flatness', 'thermal'].includes(target)) {
      return res.status(400).json({ error: '参数错误：target 必须为 all、flatness 或 thermal' });
    }

    let deletedFlatness = 0;
    let deletedThermal = 0;

    // 使用事务执行删除操作
    const resetTransaction = db.transaction(() => {
      if (target === 'all' || target === 'flatness') {
        const info = db.prepare('DELETE FROM flatness_records').run();
        deletedFlatness = info.changes;
      }
      if (target === 'all' || target === 'thermal') {
        const info = db.prepare('DELETE FROM thermal_records').run();
        deletedThermal = info.changes;
      }
    });

    resetTransaction();

    console.log(`[数据库重置] 目标: ${target}, 删除平坦度: ${deletedFlatness}, 删除热阻: ${deletedThermal}`);

    res.json({
      success: true,
      target,
      deleted: {
        flatness: deletedFlatness,
        thermal: deletedThermal,
        total: deletedFlatness + deletedThermal,
      },
    });
  } catch (err) {
    console.error('[重置错误]', err.message);
    res.status(500).json({ error: '服务器内部错误: ' + err.message });
  }
});

// ========== Web 界面 ==========
app.get('/', (req, res) => {
  const tab = req.query.tab || 'flatness';
  const page = parseInt(req.query.page) || 1;
  const limit = 50;
  const offset = (page - 1) * limit;
  const search = req.query.search || '';
  const token = req.query.token || '';

  let whereClause = '1=1';
  const params = {};
  if (search) {
    whereClause = "barcode LIKE '%' || @search || '%'";
    params.search = search;
  }

  let records, total;
  if (tab === 'thermal') {
    const countRow = db.prepare(`SELECT COUNT(*) as total FROM thermal_records WHERE ${whereClause}`).get(params);
    total = countRow.total;
    records = db.prepare(`SELECT * FROM thermal_records WHERE ${whereClause} ORDER BY id DESC LIMIT @limit OFFSET @offset`).all({ ...params, limit, offset });
  } else {
    const countRow = db.prepare(`SELECT COUNT(*) as total FROM flatness_records WHERE ${whereClause}`).get(params);
    total = countRow.total;
    records = db.prepare(`SELECT * FROM flatness_records WHERE ${whereClause} ORDER BY id DESC LIMIT @limit OFFSET @offset`).all({ ...params, limit, offset });
  }

  // 统计信息
  const flatnessTotal = db.prepare('SELECT COUNT(*) as count FROM flatness_records').get().count;
  const thermalTotal = db.prepare('SELECT COUNT(*) as count FROM thermal_records').get().count;

  const totalPages = Math.ceil(total / limit) || 1;

  res.render('index', {
    tab,
    records,
    total,
    page,
    totalPages,
    limit,
    search,
    token,
    flatnessTotal,
    thermalTotal,
  });
});

// ========== 启动服务器 ==========
app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║  合创 MES 数据同步服务器已启动                ║`);
  console.log(`║  地址: http://localhost:${PORT}                 ║`);
  console.log(`║  令牌: ${TOKEN.substring(0, 8)}...                      ║`);
  console.log(`╚══════════════════════════════════════════════╝\n`);
});

const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(process.env.APPDATA, 'supermarket_pos', 'pos-local.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.exec("DELETE FROM product_keys");
db.exec("DELETE FROM preferences WHERE key IN ('product_key_raw', 'company_name')");
console.log('Product key cleared.');
db.close();

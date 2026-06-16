const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

class LocalDB {
    constructor(dbPath = null) {
        const resolvedPath = dbPath || path.join(app.getPath('userData'), 'pos-local.db');
        this.db = new Database(resolvedPath);
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('foreign_keys = ON');
        this.db.pragma('busy_timeout = 5000');
        this.#migrate();
    }

    #migrate() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS branches (
                id INTEGER PRIMARY KEY,
                branch_name TEXT,
                address TEXT,
                is_active INTEGER DEFAULT 1,
                created_at TEXT,
                updated_at TEXT
            );

            CREATE TABLE IF NOT EXISTS warehouses (
                id INTEGER PRIMARY KEY,
                branch_id INTEGER,
                name TEXT NOT NULL,
                phone TEXT,
                email TEXT,
                address TEXT NOT NULL DEFAULT '',
                kra TEXT NOT NULL DEFAULT '',
                is_active INTEGER DEFAULT 1,
                created_at TEXT,
                updated_at TEXT
            );

            CREATE TABLE IF NOT EXISTS units (
                id INTEGER PRIMARY KEY,
                unit_code TEXT NOT NULL,
                unit_name TEXT NOT NULL,
                base_unit INTEGER,
                operator TEXT,
                operation_value REAL,
                is_active INTEGER DEFAULT 1,
                created_at TEXT,
                updated_at TEXT
            );

            CREATE TABLE IF NOT EXISTS taxes (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                rate REAL NOT NULL,
                is_active INTEGER DEFAULT 1,
                created_at TEXT,
                updated_at TEXT
            );

            CREATE TABLE IF NOT EXISTS billers (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                image TEXT,
                company_name TEXT NOT NULL,
                vat_number TEXT,
                email TEXT NOT NULL,
                phone_number TEXT NOT NULL,
                address TEXT NOT NULL,
                city TEXT NOT NULL,
                state TEXT,
                postal_code TEXT,
                country TEXT,
                is_active INTEGER DEFAULT 1,
                created_at TEXT,
                updated_at TEXT
            );

            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                password TEXT NOT NULL,
                remember_token TEXT,
                phone TEXT NOT NULL DEFAULT '',
                company_name TEXT,
                role_id INTEGER NOT NULL DEFAULT 0,
                designation_id INTEGER,
                designation_name TEXT,
                biller_id INTEGER,
                warehouse_id INTEGER,
                branch_id INTEGER,
                is_active INTEGER NOT NULL DEFAULT 1,
                is_deleted INTEGER NOT NULL DEFAULT 0,
                created_at TEXT,
                updated_at TEXT
            );

            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                code TEXT NOT NULL,
                type TEXT NOT NULL DEFAULT 'standard',
                barcode_symbology TEXT NOT NULL DEFAULT '',
                brand_id INTEGER,
                category_id INTEGER NOT NULL DEFAULT 0,
                unit_id INTEGER NOT NULL DEFAULT 0,
                purchase_unit_id INTEGER NOT NULL DEFAULT 0,
                sale_unit_id INTEGER NOT NULL DEFAULT 0,
                cost REAL NOT NULL DEFAULT 0,
                price REAL NOT NULL DEFAULT 0,
                qty REAL DEFAULT 0,
                alert_quantity REAL DEFAULT 0,
                promotion INTEGER DEFAULT 0,
                promotion_price TEXT,
                starting_date TEXT,
                last_date TEXT,
                tax_id INTEGER DEFAULT 0,
                tax_method INTEGER DEFAULT 2,
                image TEXT,
                is_variant INTEGER DEFAULT 0,
                is_batch INTEGER DEFAULT 0,
                is_diffPrice INTEGER DEFAULT 0,
                is_imei INTEGER DEFAULT 0,
                featured INTEGER DEFAULT 0,
                product_details TEXT,
                is_active INTEGER DEFAULT 1,
                created_at TEXT,
                updated_at TEXT
            );

            CREATE TABLE IF NOT EXISTS product_warehouse (
                id INTEGER PRIMARY KEY,
                product_id INTEGER NOT NULL,
                product_batch_id INTEGER,
                variant_id INTEGER,
                imei_number TEXT,
                warehouse_id INTEGER NOT NULL,
                qty REAL NOT NULL DEFAULT 0,
                price REAL DEFAULT 0,
                created_at TEXT,
                updated_at TEXT
            );

            CREATE TABLE IF NOT EXISTS sales (
                id TEXT PRIMARY KEY,
                reference_no TEXT NOT NULL,
                user_id INTEGER NOT NULL DEFAULT 0,
                customer_id INTEGER NOT NULL DEFAULT 1,
                warehouse_id INTEGER NOT NULL DEFAULT 0,
                biller_id INTEGER DEFAULT 0,
                terminal_id TEXT NOT NULL,
                item INTEGER NOT NULL DEFAULT 0,
                total_qty REAL NOT NULL DEFAULT 0,
                total_discount REAL NOT NULL DEFAULT 0,
                total_tax REAL NOT NULL DEFAULT 0,
                total_price REAL NOT NULL DEFAULT 0,
                grand_total REAL NOT NULL DEFAULT 0,
                order_tax_rate REAL DEFAULT 0,
                order_tax REAL DEFAULT 0,
                order_discount REAL DEFAULT 0,
                coupon_discount REAL DEFAULT 0,
                shipping_cost REAL DEFAULT 0,
                sale_status INTEGER NOT NULL DEFAULT 0,
                payment_status INTEGER DEFAULT 0,
                paid_amount REAL DEFAULT 0,
                sale_note TEXT,
                staff_note TEXT,
                sync_status TEXT NOT NULL DEFAULT 'pending_sync',
                created_at TEXT NOT NULL,
                synced_at TEXT
            );

            CREATE TABLE IF NOT EXISTS sale_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sale_id TEXT NOT NULL,
                product_id INTEGER NOT NULL,
                qty REAL NOT NULL,
                net_unit_price REAL NOT NULL,
                discount REAL NOT NULL DEFAULT 0,
                tax_rate REAL NOT NULL DEFAULT 0,
                tax REAL NOT NULL DEFAULT 0,
                total REAL NOT NULL,
                created_at TEXT
            );

            CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                payment_reference TEXT NOT NULL,
                user_id INTEGER NOT NULL DEFAULT 0,
                sale_id TEXT NOT NULL,
                cash_register_id INTEGER DEFAULT 0,
                amount REAL NOT NULL,
                used_points REAL DEFAULT 0,
                change_amount REAL NOT NULL DEFAULT 0,
                paying_method TEXT NOT NULL DEFAULT 'Cash',
                payment_note TEXT,
                sync_status TEXT NOT NULL DEFAULT 'pending_sync',
                created_at TEXT NOT NULL,
                synced_at TEXT
            );

            CREATE TABLE IF NOT EXISTS cash_registers (
                id INTEGER PRIMARY KEY,
                cash_in_hand REAL NOT NULL DEFAULT 0,
                user_id INTEGER NOT NULL,
                warehouse_id INTEGER NOT NULL,
                status INTEGER NOT NULL DEFAULT 1,
                created_at TEXT,
                updated_at TEXT
            );

            CREATE TABLE IF NOT EXISTS product_keys (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key_hash TEXT NOT NULL,
                activated_at TEXT NOT NULL,
                expires_at TEXT,
                terminal_id TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS held_sales (
                id TEXT PRIMARY KEY,
                reference_no TEXT NOT NULL,
                user_id INTEGER NOT NULL DEFAULT 0,
                warehouse_id INTEGER NOT NULL DEFAULT 0,
                item_count INTEGER NOT NULL DEFAULT 0,
                total_qty REAL NOT NULL DEFAULT 0,
                total_price REAL NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                note TEXT
            );

            CREATE TABLE IF NOT EXISTS held_sale_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                held_sale_id TEXT NOT NULL,
                product_id INTEGER NOT NULL,
                product_name TEXT NOT NULL,
                product_code TEXT,
                price REAL NOT NULL,
                tax_method INTEGER DEFAULT 2,
                tax_per_unit REAL DEFAULT 0,
                base_price REAL NOT NULL,
                qty REAL NOT NULL,
                total REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS sync_log (
                entity_type TEXT PRIMARY KEY,
                last_synced_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS terminal_info (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                terminal_id TEXT UNIQUE NOT NULL,
                cash_register_id INTEGER DEFAULT 0,
                branch_id INTEGER DEFAULT 0,
                warehouse_id INTEGER DEFAULT 0,
                branch_name TEXT DEFAULT '',
                warehouse_name TEXT DEFAULT '',
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS preferences (
                key TEXT PRIMARY KEY,
                value TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
            CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode_symbology);
            CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
            CREATE INDEX IF NOT EXISTS idx_product_warehouse_ware ON product_warehouse(warehouse_id, product_id);
            CREATE INDEX IF NOT EXISTS idx_product_warehouse_prod ON product_warehouse(product_id);
            CREATE INDEX IF NOT EXISTS idx_sales_sync ON sales(sync_status);
            CREATE INDEX IF NOT EXISTS idx_sales_terminal ON sales(terminal_id);
            CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
            CREATE INDEX IF NOT EXISTS idx_payments_sync ON payments(sync_status);
            CREATE INDEX IF NOT EXISTS idx_payments_sale ON payments(sale_id);
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        `);
    }

    // ========================
    // PREFERENCES
    // ========================
    getPreference(key) {
        const row = this.db.prepare('SELECT value FROM preferences WHERE key = ?').get(key);
        return row ? row.value : null;
    }

    setPreference(key, value) {
        this.db.prepare(
            'INSERT INTO preferences (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
        ).run(key, value);
    }

    // ========================
    // TERMINAL INFO
    // ========================
    getTerminalInfo() {
        return this.db.prepare('SELECT * FROM terminal_info LIMIT 1').get() || null;
    }

    saveTerminalInfo(info) {
        const { terminal_id, cash_register_id, branch_id, warehouse_id, branch_name, warehouse_name } = info;
        const existing = this.getTerminalInfo();
        if (existing) {
            this.db.prepare(`
                UPDATE terminal_info SET cash_register_id=?, branch_id=?, warehouse_id=?, branch_name=?, warehouse_name=?
                WHERE terminal_id=?
            `).run(cash_register_id || 0, branch_id || 0, warehouse_id || 0, branch_name || '', warehouse_name || '', terminal_id);
        } else {
            this.db.prepare(`
                INSERT INTO terminal_info (terminal_id, cash_register_id, branch_id, warehouse_id, branch_name, warehouse_name, created_at)
                VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            `).run(terminal_id, cash_register_id || 0, branch_id || 0, warehouse_id || 0, branch_name || '', warehouse_name || '');
        }
    }

    isOnboardingDone() {
        return this.getPreference('onboarding_done') === '1';
    }

    setOnboardingDone() {
        this.setPreference('onboarding_done', '1');
    }

    // ========================
    // BRANCHES
    // ========================
    syncBranches(branches) {
        const stmt = this.db.prepare(`
            INSERT INTO branches (id, branch_name, address, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET branch_name=excluded.branch_name, address=excluded.address, is_active=excluded.is_active, updated_at=excluded.updated_at
        `);
        const tx = this.db.transaction((items) => {
            for (const b of items) {
                stmt.run(b.id, b.branch_name, b.address || '', b.is_active ? 1 : 0, b.created_at, b.updated_at);
            }
        });
        tx(branches);
    }

    // ========================
    // WAREHOUSES
    // ========================
    syncWarehouses(warehouses) {
        const stmt = this.db.prepare(`
            INSERT INTO warehouses (id, branch_id, name, phone, email, address, kra, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET branch_id=excluded.branch_id, name=excluded.name, phone=excluded.phone, email=excluded.email, address=excluded.address, kra=excluded.kra, is_active=excluded.is_active, updated_at=excluded.updated_at
        `);
        const tx = this.db.transaction((items) => {
            for (const w of items) {
                stmt.run(w.id, w.branch_id, w.name, w.phone || '', w.email || '', w.address || '', w.kra || '', w.is_active ? 1 : 0, w.created_at, w.updated_at);
            }
        });
        tx(warehouses);
    }

    // ========================
    // UNITS
    // ========================
    syncUnits(units) {
        const stmt = this.db.prepare(`
            INSERT INTO units (id, unit_code, unit_name, base_unit, operator, operation_value, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET unit_code=excluded.unit_code, unit_name=excluded.unit_name, base_unit=excluded.base_unit, operator=excluded.operator, operation_value=excluded.operation_value, is_active=excluded.is_active, updated_at=excluded.updated_at
        `);
        const tx = this.db.transaction((items) => {
            for (const u of items) {
                stmt.run(u.id, u.unit_code, u.unit_name, u.base_unit, u.operator || '', u.operation_value, u.is_active ? 1 : 0, u.created_at, u.updated_at);
            }
        });
        tx(units);
    }

    // ========================
    // TAXES
    // ========================
    syncTaxes(taxes) {
        const stmt = this.db.prepare(`
            INSERT INTO taxes (id, name, rate, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET name=excluded.name, rate=excluded.rate, is_active=excluded.is_active, updated_at=excluded.updated_at
        `);
        const tx = this.db.transaction((items) => {
            for (const t of items) {
                stmt.run(t.id, t.name, t.rate, t.is_active ? 1 : 0, t.created_at, t.updated_at);
            }
        });
        tx(taxes);
    }

    // ========================
    // BILLERS
    // ========================
    syncBillers(billers) {
        const stmt = this.db.prepare(`
            INSERT INTO billers (id, name, image, company_name, vat_number, email, phone_number, address, city, state, postal_code, country, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET name=excluded.name, image=excluded.image, company_name=excluded.company_name, vat_number=excluded.vat_number, email=excluded.email, phone_number=excluded.phone_number, address=excluded.address, city=excluded.city, state=excluded.state, postal_code=excluded.postal_code, country=excluded.country, is_active=excluded.is_active, updated_at=excluded.updated_at
        `);
        const tx = this.db.transaction((items) => {
            for (const b of items) {
                stmt.run(b.id, b.name, b.image, b.company_name, b.vat_number || '', b.email, b.phone_number, b.address, b.city, b.state || '', b.postal_code || '', b.country || '', b.is_active ? 1 : 0, b.created_at, b.updated_at);
            }
        });
        tx(billers);
    }

    // ========================
    // USERS
    // ========================
    syncUsers(users) {
        const stmt = this.db.prepare(`
            INSERT INTO users (id, name, email, password, phone, company_name, role_id, designation_id, designation_name, biller_id, warehouse_id, branch_id, is_active, is_deleted, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET name=excluded.name, email=excluded.email, password=excluded.password, phone=excluded.phone, company_name=excluded.company_name, role_id=excluded.role_id, designation_id=excluded.designation_id, designation_name=excluded.designation_name, biller_id=excluded.biller_id, warehouse_id=excluded.warehouse_id, branch_id=excluded.branch_id, is_active=excluded.is_active, is_deleted=excluded.is_deleted, updated_at=excluded.updated_at
        `);
        const tx = this.db.transaction((items) => {
            for (const u of items) {
                stmt.run(u.id, u.name, u.email, u.password || '', u.phone || '', u.company_name || '', u.role_id, u.designation_id, u.designation_name || '', u.biller_id, u.warehouse_id, u.branch_id, u.is_active ? 1 : 0, u.is_deleted ? 1 : 0, u.created_at, u.updated_at);
            }
        });
        tx(users);
    }

    getCachedUsers() {
        return this.db.prepare('SELECT id, name, email, role_id, warehouse_id, branch_id, biller_id, company_name FROM users WHERE is_active = 1 AND is_deleted = 0').all();
    }

    getUserByEmail(email) {
        return this.db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1 AND is_deleted = 0').get(email) || null;
    }

    getUserById(id) {
        return this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) || null;
    }

    cacheCredentials(userId, passwordHash) {
        this.db.prepare('UPDATE users SET password = ? WHERE id = ?').run(passwordHash, userId);
    }

    validatePassword(userId, password) {
        const crypto = require('crypto');
        const user = this.getUserById(userId);
        if (!user) return false;
        const hash = crypto.createHash('sha256').update(password).digest('hex');
        return user.password === hash;
    }

    // ========================
    // PRODUCTS
    // ========================
    syncProducts(products) {
        const productStmt = this.db.prepare(`
            INSERT INTO products (id, name, code, type, barcode_symbology, brand_id, category_id, unit_id, purchase_unit_id, sale_unit_id, cost, price, qty, alert_quantity, promotion, promotion_price, starting_date, last_date, tax_id, tax_method, image, is_variant, is_batch, is_diffPrice, is_imei, featured, product_details, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET name=excluded.name, code=excluded.code, type=excluded.type, barcode_symbology=excluded.barcode_symbology, brand_id=excluded.brand_id, category_id=excluded.category_id, unit_id=excluded.unit_id, purchase_unit_id=excluded.purchase_unit_id, sale_unit_id=excluded.sale_unit_id, cost=excluded.cost, price=excluded.price, qty=excluded.qty, alert_quantity=excluded.alert_quantity, promotion=excluded.promotion, promotion_price=excluded.promotion_price, starting_date=excluded.starting_date, last_date=excluded.last_date, tax_id=excluded.tax_id, tax_method=excluded.tax_method, image=excluded.image, is_variant=excluded.is_variant, is_batch=excluded.is_batch, is_diffPrice=excluded.is_diffPrice, is_imei=excluded.is_imei, featured=excluded.featured, product_details=excluded.product_details, is_active=excluded.is_active, updated_at=excluded.updated_at
        `);
        const tx = this.db.transaction((items) => {
            for (const p of items) {
                productStmt.run(
                    p.id, p.name, p.code, p.type || 'standard', p.barcode_symbology || '',
                    p.brand_id, p.category_id, p.unit_id, p.purchase_unit_id, p.sale_unit_id,
                    p.cost, p.price, p.qty || 0, p.alert_quantity || 0,
                    p.promotion || 0, p.promotion_price, p.starting_date, p.last_date,
                    p.tax_id || 0, p.tax_method || 2, p.image || '',
                    p.is_variant || 0, p.is_batch || 0, p.is_diffPrice || 0, p.is_imei || 0,
                    p.featured || 0, p.product_details || '',
                    p.is_active ? 1 : 0, p.created_at, p.updated_at
                );
            }
        });
        tx(products);
    }

    syncProductWarehouse(items) {
        const stmt = this.db.prepare(`
            INSERT INTO product_warehouse (id, product_id, product_batch_id, variant_id, imei_number, warehouse_id, qty, price, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET product_id=excluded.product_id, product_batch_id=excluded.product_batch_id, variant_id=excluded.variant_id, imei_number=excluded.imei_number, warehouse_id=excluded.warehouse_id, qty=excluded.qty, price=excluded.price, updated_at=excluded.updated_at
        `);
        const tx = this.db.transaction((items) => {
            for (const pw of items) {
                stmt.run(pw.id, pw.product_id, pw.product_batch_id, pw.variant_id, pw.imei_number || '', pw.warehouse_id, pw.qty, pw.price, pw.created_at, pw.updated_at);
            }
        });
        tx(items);
    }

    getProductsForWarehouse(warehouseId) {
        return this.db.prepare(`
            SELECT p.*, pw.qty as warehouse_qty, pw.price as warehouse_price
            FROM products p
            INNER JOIN product_warehouse pw ON pw.product_id = p.id AND pw.warehouse_id = ?
            WHERE p.is_active = 1
            ORDER BY p.name
        `).all(warehouseId);
    }

    searchProducts(query, warehouseId) {
        const like = `%${query}%`;
        return this.db.prepare(`
            SELECT p.*, pw.qty as warehouse_qty, pw.price as warehouse_price
            FROM products p
            INNER JOIN product_warehouse pw ON pw.product_id = p.id AND pw.warehouse_id = ?
            WHERE p.is_active = 1 AND (p.name LIKE ? OR p.code LIKE ? OR p.barcode_symbology LIKE ?)
            ORDER BY p.name
            LIMIT 20
        `).all(warehouseId, like, like, like);
    }

    getProductByCode(code, warehouseId) {
        return this.db.prepare(`
            SELECT p.*, pw.qty as warehouse_qty, pw.price as warehouse_price
            FROM products p
            INNER JOIN product_warehouse pw ON pw.product_id = p.id AND pw.warehouse_id = ?
            WHERE p.code = ? AND p.is_active = 1
            LIMIT 1
        `).get(warehouseId, code) || null;
    }

    getProductByBarcode(barcode, warehouseId) {
        return this.db.prepare(`
            SELECT p.*, pw.qty as warehouse_qty, pw.price as warehouse_price
            FROM products p
            INNER JOIN product_warehouse pw ON pw.product_id = p.id AND pw.warehouse_id = ?
            WHERE p.barcode_symbology = ? AND p.is_active = 1
            LIMIT 1
        `).get(warehouseId, barcode) || null;
    }

    getProductByName(query, warehouseId) {
        const like = `%${query}%`;
        return this.db.prepare(`
            SELECT p.*, pw.qty as warehouse_qty, pw.price as warehouse_price
            FROM products p
            INNER JOIN product_warehouse pw ON pw.product_id = p.id AND pw.warehouse_id = ?
            WHERE p.name LIKE ? AND p.is_active = 1
            LIMIT 1
        `).get(warehouseId, like) || null;
    }

    // ========================
    // SALES
    // ========================
    createSale(saleData) {
        const {
            id, reference_no, user_id, customer_id, warehouse_id, biller_id, terminal_id,
            items, payments, sale_note, staff_note, paid_amount
        } = saleData;

        const total_qty = items.reduce((sum, i) => sum + i.qty, 0);
        const total_discount = items.reduce((sum, i) => sum + (i.discount || 0), 0);
        const total_tax = items.reduce((sum, i) => sum + i.tax, 0);
        const total_price = items.reduce((sum, i) => sum + i.total, 0);
        const grand_total = total_price;

        const tx = this.db.transaction(() => {
            this.db.prepare(`
                INSERT INTO sales (id, reference_no, user_id, customer_id, warehouse_id, biller_id, terminal_id, item, total_qty, total_discount, total_tax, total_price, grand_total, sale_status, payment_status, paid_amount, sale_note, staff_note, sync_status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, 'pending_sync', datetime('now'))
            `).run(
                id, reference_no, user_id, customer_id || 1, warehouse_id || 0, biller_id || 0, terminal_id,
                items.length, total_qty, total_discount, total_tax, total_price, grand_total,
                paid_amount ? 1 : 0, paid_amount || 0, sale_note || '', staff_note || ''
            );

            const itemStmt = this.db.prepare(`
                INSERT INTO sale_items (sale_id, product_id, qty, net_unit_price, discount, tax_rate, tax, total, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `);
            for (const item of items) {
                itemStmt.run(id, item.product_id, item.qty, item.net_unit_price, item.discount || 0, item.tax_rate, item.tax, item.total);
            }

            if (payments && payments.length > 0) {
                const payStmt = this.db.prepare(`
                    INSERT INTO payments (payment_reference, user_id, sale_id, cash_register_id, amount, used_points, change_amount, paying_method, payment_note, sync_status, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_sync', datetime('now'))
                `);
                for (const p of payments) {
                    payStmt.run(
                        p.payment_reference, user_id, id, p.cash_register_id || 0,
                        p.amount, p.used_points || 0, p.change_amount || 0,
                        p.paying_method || 'Cash', p.payment_note || ''
                    );
                }
            }

            // Update warehouse qty
            const updateQty = this.db.prepare(`
                UPDATE product_warehouse SET qty = qty - ? WHERE product_id = ? AND warehouse_id = ?
            `);
            for (const item of items) {
                updateQty.run(item.qty, item.product_id, warehouse_id);
            }
        });

        tx();
    }

    getPendingSales(terminalId) {
        return this.db.prepare(`
            SELECT * FROM sales WHERE sync_status = 'pending_sync' AND terminal_id = ?
            ORDER BY created_at ASC
        `).all(terminalId);
    }

    getPendingPayments(saleId) {
        return this.db.prepare(`
            SELECT * FROM payments WHERE sale_id = ? AND sync_status = 'pending_sync'
        `).all(saleId);
    }

    getSaleItems(saleId) {
        return this.db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(saleId);
    }

    markSaleSynced(saleId) {
        this.db.prepare("UPDATE sales SET sync_status = 'synced', synced_at = datetime('now') WHERE id = ?").run(saleId);
        this.db.prepare("UPDATE payments SET sync_status = 'synced', synced_at = datetime('now') WHERE sale_id = ?").run(saleId);
    }

    voidSale(saleId) {
        const sale = this.db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId);
        if (!sale) return false;

        const tx = this.db.transaction(() => {
            this.db.prepare("UPDATE sales SET sale_status = 2, sale_note = COALESCE(sale_note, '') || ' [VOIDED]' WHERE id = ?").run(saleId);
            const items = this.getSaleItems(saleId);
            const updateQty = this.db.prepare('UPDATE product_warehouse SET qty = qty + ? WHERE product_id = ? AND warehouse_id = ?');
            for (const item of items) {
                updateQty.run(item.qty, item.product_id, sale.warehouse_id);
            }
        });
        tx();
        return true;
    }

    validateAdminPassword(password) {
        const crypto = require('crypto');
        const hash = crypto.createHash('sha256').update(password).digest('hex');
        const admin = this.db.prepare('SELECT * FROM users WHERE role_id = 1 AND is_active = 1 AND is_deleted = 0 AND password = ? LIMIT 1').get(hash);
        return !!admin;
    }

    getDaySummary() {
        const today = new Date().toISOString().substring(0, 10);
        const sales = this.db.prepare(`
            SELECT s.*, p.paying_method, p.amount as pay_amount
            FROM sales s
            LEFT JOIN payments p ON p.sale_id = s.id
            WHERE date(s.created_at) = ?
            ORDER BY s.created_at DESC
        `).all(today);

        if (!sales.length) {
            return {
                date: today,
                totalSales: 0,
                totalRevenue: 0,
                totalTax: 0,
                totalDiscount: 0,
                voidedCount: 0,
                cashTotal: 0,
                cardTotal: 0,
                checkTotal: 0,
                salesCount: 0,
                sales: []
            };
        }

        const nonVoided = sales.filter(s => s.sale_status !== 2);
        const voided = sales.filter(s => s.sale_status === 2);

        const cashTotal = nonVoided
            .filter(s => s.paying_method === 'Cash')
            .reduce((sum, s) => sum + (s.pay_amount || s.grand_total), 0);
        const cardTotal = nonVoided
            .filter(s => s.paying_method === 'Card')
            .reduce((sum, s) => sum + (s.pay_amount || s.grand_total), 0);
        const checkTotal = nonVoided
            .filter(s => s.paying_method === 'Check')
            .reduce((sum, s) => sum + (s.pay_amount || s.grand_total), 0);

        return {
            date: today,
            totalSales: nonVoided.length,
            totalRevenue: nonVoided.reduce((sum, s) => sum + s.grand_total, 0),
            totalTax: nonVoided.reduce((sum, s) => sum + s.total_tax, 0),
            totalDiscount: nonVoided.reduce((sum, s) => sum + (s.order_discount || 0), 0),
            voidedCount: voided.length,
            cashTotal,
            cardTotal,
            checkTotal,
            salesCount: sales.length,
            sales: sales
        };
    }

    getSalesHistory(limit = 50) {
        return this.db.prepare(`
            SELECT s.*, u.name as user_name
            FROM sales s
            LEFT JOIN users u ON u.id = s.user_id
            ORDER BY s.created_at DESC
            LIMIT ?
        `).all(limit);
    }

    // ========================
    // HELD SALES
    // ========================
    holdSale(saleData) {
        const { id, reference_no, user_id, warehouse_id, items, note } = saleData;
        const item_count = items.length;
        const total_qty = items.reduce((sum, i) => sum + i.qty, 0);
        const total_price = items.reduce((sum, i) => sum + i.total, 0);

        const tx = this.db.transaction(() => {
            this.db.prepare(`
                INSERT INTO held_sales (id, reference_no, user_id, warehouse_id, item_count, total_qty, total_price, created_at, note)
                VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
            `).run(id, reference_no, user_id, warehouse_id, item_count, total_qty, total_price, note || '');

            const itemStmt = this.db.prepare(`
                INSERT INTO held_sale_items (held_sale_id, product_id, product_name, product_code, price, tax_method, tax_per_unit, base_price, qty, total)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            for (const item of items) {
                itemStmt.run(id, item.product_id, item.product_name, item.product_code || '', item.price, item.tax_method || 2, item.tax_per_unit || 0, item.base_price, item.qty, item.total);
            }
        });
        tx();
    }

    getHeldSales() {
        return this.db.prepare(`
            SELECT * FROM held_sales ORDER BY created_at DESC
        `).all();
    }

    getHeldSaleItems(heldSaleId) {
        return this.db.prepare(`
            SELECT * FROM held_sale_items WHERE held_sale_id = ?
        `).all(heldSaleId);
    }

    deleteHeldSale(heldSaleId) {
        const tx = this.db.transaction(() => {
            this.db.prepare('DELETE FROM held_sale_items WHERE held_sale_id = ?').run(heldSaleId);
            this.db.prepare('DELETE FROM held_sales WHERE id = ?').run(heldSaleId);
        });
        tx();
    }

    // ========================
    // PRODUCT KEY
    // ========================
    saveProductKey(key, terminalId) {
        const crypto = require('crypto');
        const keyHash = crypto.createHash('sha256').update(key).digest('hex');
        this.db.prepare(`
            INSERT INTO product_keys (key_hash, activated_at, expires_at, terminal_id)
            VALUES (?, datetime('now'), datetime('now', '+1 year'), ?)
        `).run(keyHash, terminalId);
    }

    hasValidProductKey(terminalId) {
        const row = this.db.prepare(`
            SELECT * FROM product_keys WHERE terminal_id = ? AND expires_at > datetime('now')
            ORDER BY activated_at DESC LIMIT 1
        `).get(terminalId);
        return !!row;
    }

    // ========================
    // SYNC LOG
    // ========================
    getLastSyncTimestamp(entityType) {
        const row = this.db.prepare('SELECT last_synced_at FROM sync_log WHERE entity_type = ?').get(entityType);
        return row ? row.last_synced_at : null;
    }

    setLastSyncTimestamp(entityType, timestamp) {
        this.db.prepare(`
            INSERT INTO sync_log (entity_type, last_synced_at) VALUES (?, ?)
            ON CONFLICT(entity_type) DO UPDATE SET last_synced_at = excluded.last_synced_at
        `).run(entityType, timestamp);
    }

    // ========================
    // TAX HELPERS
    // ========================
    calculateTax(price, taxMethod) {
        const TAX_RATE = 0.16;
        if (taxMethod === 1) {
            // Tax inclusive: extract tax from price
            const base = price / (1 + TAX_RATE);
            const tax = price - base;
            return { base: parseFloat(base.toFixed(2)), tax: parseFloat(tax.toFixed(2)), total: price };
        } else if (taxMethod === 2) {
            // Tax exclusive: add tax on top
            const tax = price * TAX_RATE;
            const total = price + tax;
            return { base: price, tax: parseFloat(tax.toFixed(2)), total: parseFloat(total.toFixed(2)) };
        } else {
            // Not taxable
            return { base: price, tax: 0, total: price };
        }
    }

    // ========================
    // CASH REGISTER
    // ========================
    syncCashRegisters(registers) {
        const stmt = this.db.prepare(`
            INSERT INTO cash_registers (id, cash_in_hand, user_id, warehouse_id, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET cash_in_hand=excluded.cash_in_hand, user_id=excluded.user_id, warehouse_id=excluded.warehouse_id, status=excluded.status, updated_at=excluded.updated_at
        `);
        const tx = this.db.transaction((items) => {
            for (const r of items) {
                stmt.run(r.id, r.cash_in_hand, r.user_id, r.warehouse_id, r.status, r.created_at, r.updated_at);
            }
        });
        tx(registers);
    }

    // ========================
    // UTC HELPERS
    // ========================
    close() {
        this.db.close();
    }

    // ========================
    // DEV SEED DATA
    // ========================
    seedDevData() {
        const userCount = this.db.prepare('SELECT COUNT(*) as count FROM users').get().count;
        if (userCount > 0) return;

        const crypto = require('crypto');
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

        const tx = this.db.transaction(() => {
            this.db.prepare('INSERT OR IGNORE INTO branches (id, branch_name, address, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
                .run(1, 'Main Branch', '123 Main Street', 1, now, now);

            this.db.prepare('INSERT OR IGNORE INTO warehouses (id, branch_id, name, phone, email, address, kra, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                .run(1, 1, 'Main Store', '0700000000', 'store@pos.com', '123 Main Street', 'KRA123', 1, now, now);

            this.db.prepare('INSERT OR IGNORE INTO taxes (id, name, rate, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
                .run(1, 'VAT 16%', 16, 1, now, now);

            this.db.prepare('INSERT OR IGNORE INTO units (id, unit_code, unit_name, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
                .run(1, 'PCS', 'Pieces', 1, now, now);

            this.db.prepare('INSERT OR IGNORE INTO units (id, unit_code, unit_name, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
                .run(2, 'KG', 'Kilograms', 1, now, now);

            this.db.prepare('INSERT OR IGNORE INTO units (id, unit_code, unit_name, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
                .run(3, 'LTR', 'Litres', 1, now, now);

            this.db.prepare('INSERT OR IGNORE INTO billers (id, name, company_name, email, phone_number, address, city, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                .run(1, 'Default Biller', 'Ebiscloud POS', 'biller@pos.com', '0700000000', '123 Main St', 'Nairobi', 1, now, now);

            const passwordHash = crypto.createHash('sha256').update('password123').digest('hex');
            this.db.prepare(`INSERT OR IGNORE INTO users (id, name, email, password, phone, company_name, role_id, warehouse_id, branch_id, biller_id, is_active, is_deleted, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
                .run(1, 'Admin User', 'admin@pos.com', passwordHash, '0700000000', 'Ebiscloud', 1, 1, 1, 1, 1, 0, now, now);

            this.db.prepare(`INSERT OR IGNORE INTO users (id, name, email, password, phone, company_name, role_id, warehouse_id, branch_id, biller_id, is_active, is_deleted, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
                .run(2, 'Cashier Jane', 'jane@pos.com', passwordHash, '0711111111', 'Ebiscloud', 2, 1, 1, 1, 1, 0, now, now);

            const products = [
                { id: 1, name: 'Jam 500g', code: 'JAM001', barcode: '8901234567890', price: 80, cost: 60, tax_method: 2, unit_id: 1, sale_unit_id: 1 },
                { id: 2, name: 'Bread 400g', code: 'BRD001', barcode: '8901234567891', price: 60, cost: 45, tax_method: 2, unit_id: 1, sale_unit_id: 1 },
                { id: 3, name: 'Milk 1L', code: 'MLK001', barcode: '8901234567892', price: 55, cost: 40, tax_method: 1, unit_id: 3, sale_unit_id: 3 },
                { id: 4, name: 'Sugar 1kg', code: 'SGR001', barcode: '8901234567893', price: 45, cost: 35, tax_method: 2, unit_id: 2, sale_unit_id: 2 },
                { id: 5, name: 'Rice 5kg', code: 'RIC001', barcode: '8901234567894', price: 350, cost: 280, tax_method: 2, unit_id: 2, sale_unit_id: 2 },
                { id: 6, name: 'Coke 500ml', code: 'COK001', barcode: '8901234567895', price: 40, cost: 30, tax_method: 1, unit_id: 1, sale_unit_id: 1 },
                { id: 7, name: 'Chips 150g', code: 'CHP001', barcode: '8901234567896', price: 30, cost: 22, tax_method: 2, unit_id: 1, sale_unit_id: 1 },
                { id: 8, name: 'Butter 250g', code: 'BTR001', barcode: '8901234567897', price: 120, cost: 95, tax_method: 2, unit_id: 1, sale_unit_id: 1 },
            ];

            const pStmt = this.db.prepare(`INSERT OR IGNORE INTO products (id, name, code, type, barcode_symbology, category_id, unit_id, purchase_unit_id, sale_unit_id, cost, price, qty, tax_id, tax_method, is_active, created_at, updated_at) VALUES (?, ?, ?, 'standard', ?, 0, ?, ?, ?, ?, ?, 0, 1, ?, 1, ?, ?)`);
            for (const p of products) {
                pStmt.run(p.id, p.name, p.code, p.barcode, p.unit_id, p.unit_id, p.sale_unit_id, p.cost, p.price, p.tax_method, now, now);
            }

            const pwStmt = this.db.prepare('INSERT OR IGNORE INTO product_warehouse (id, product_id, warehouse_id, qty, price, created_at, updated_at) VALUES (?, ?, 1, 100, ?, ?, ?)');
            for (const p of products) {
                pwStmt.run(p.id * 10, p.id, p.price, now, now);
            }

            this.setPreference('onboarding_done', '1');
        });

        tx();
    }
}

module.exports = LocalDB;

const { net } = require('electron');

class SyncEngine {
    constructor(db, apiConfig = {}) {
        this.db = db;
        this.apiBaseUrl = apiConfig.baseUrl || 'http://localhost/api';
        this.apiKey = apiConfig.apiKey || '';
        this.syncInterval = apiConfig.syncInterval || 60000;
        this.isOnline = false;
        this.isSyncing = false;
        this.intervalId = null;
        this.onStatusChange = null;
        this.onSyncComplete = null;

        this.#setupOnlineDetection();
    }

    #setupOnlineDetection() {
        this.isOnline = net.online;
        this._onlinePoll = setInterval(() => {
            const wasOnline = this.isOnline;
            this.isOnline = net.online;
            if (wasOnline !== this.isOnline) {
                this.#notifyStatusChange(this.isOnline);
            }
        }, 5000);
    }

    async #checkOnline() {
        try {
            const response = await this.#apiRequest('GET', '/ping');
            this.isOnline = true;
            return true;
        } catch {
            this.isOnline = false;
            return false;
        }
    }

    #notifyStatusChange(status) {
        if (this.onStatusChange) {
            this.onStatusChange({ online: status, syncing: this.isSyncing });
        }
    }

    async #apiRequest(method, endpoint, body = null) {
        const url = `${this.apiBaseUrl}${endpoint}`;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': this.apiKey,
                'X-Terminal-ID': this.getTerminalId() || ''
            }
        };
        if (body) {
            options.body = JSON.stringify(body);
        }
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        return response.json();
    }

    getTerminalId() {
        const info = this.db.getTerminalInfo();
        return info ? info.terminal_id : null;
    }

    // ========================
    // PULL FROM CLOUD
    // ========================
    async pullAll() {
        if (!this.isOnline) return { success: false, error: 'Offline' };
        this.isSyncing = true;
        this.#notifyStatusChange(this.isOnline);
        try {
            await this.pullProducts();
            await this.pullUsers();
            await this.pullTaxes();
            await this.pullUnits();
            await this.pullBranches();
            await this.pullWarehouses();
            await this.pullBillers();
        } finally {
            this.isSyncing = false;
            this.#notifyStatusChange(this.isOnline);
        }
    }

    async pullProducts() {
        const lastSync = this.db.getLastSyncTimestamp('products') || '2000-01-01 00:00:00';
        const data = await this.#apiRequest('GET', `/sync/products?since=${encodeURIComponent(lastSync)}`);
        if (data.products && data.products.length > 0) {
            this.db.syncProducts(data.products);
        }
        if (data.product_warehouse && data.product_warehouse.length > 0) {
            this.db.syncProductWarehouse(data.product_warehouse);
        }
        this.db.setLastSyncTimestamp('products', new Date().toISOString().replace('T', ' ').substring(0, 19));
    }

    async pullUsers() {
        const lastSync = this.db.getLastSyncTimestamp('users') || '2000-01-01 00:00:00';
        const data = await this.#apiRequest('GET', `/sync/users?since=${encodeURIComponent(lastSync)}`);
        if (data.users && data.users.length > 0) {
            this.db.syncUsers(data.users);
        }
        this.db.setLastSyncTimestamp('users', new Date().toISOString().replace('T', ' ').substring(0, 19));
    }

    async pullTaxes() {
        const lastSync = this.db.getLastSyncTimestamp('taxes') || '2000-01-01 00:00:00';
        const data = await this.#apiRequest('GET', `/sync/taxes?since=${encodeURIComponent(lastSync)}`);
        if (data.taxes && data.taxes.length > 0) {
            this.db.syncTaxes(data.taxes);
        }
        this.db.setLastSyncTimestamp('taxes', new Date().toISOString().replace('T', ' ').substring(0, 19));
    }

    async pullUnits() {
        const lastSync = this.db.getLastSyncTimestamp('units') || '2000-01-01 00:00:00';
        const data = await this.#apiRequest('GET', `/sync/units?since=${encodeURIComponent(lastSync)}`);
        if (data.units && data.units.length > 0) {
            this.db.syncUnits(data.units);
        }
        this.db.setLastSyncTimestamp('units', new Date().toISOString().replace('T', ' ').substring(0, 19));
    }

    async pullBranches() {
        const lastSync = this.db.getLastSyncTimestamp('branches') || '2000-01-01 00:00:00';
        const data = await this.#apiRequest('GET', `/sync/branches?since=${encodeURIComponent(lastSync)}`);
        if (data.branches && data.branches.length > 0) {
            this.db.syncBranches(data.branches);
        }
        this.db.setLastSyncTimestamp('branches', new Date().toISOString().replace('T', ' ').substring(0, 19));
    }

    async pullWarehouses() {
        const lastSync = this.db.getLastSyncTimestamp('warehouses') || '2000-01-01 00:00:00';
        const data = await this.#apiRequest('GET', `/sync/warehouses?since=${encodeURIComponent(lastSync)}`);
        if (data.warehouses && data.warehouses.length > 0) {
            this.db.syncWarehouses(data.warehouses);
        }
        this.db.setLastSyncTimestamp('warehouses', new Date().toISOString().replace('T', ' ').substring(0, 19));
    }

    async pullBillers() {
        const lastSync = this.db.getLastSyncTimestamp('billers') || '2000-01-01 00:00:00';
        const data = await this.#apiRequest('GET', `/sync/billers?since=${encodeURIComponent(lastSync)}`);
        if (data.billers && data.billers.length > 0) {
            this.db.syncBillers(data.billers);
        }
        this.db.setLastSyncTimestamp('billers', new Date().toISOString().replace('T', ' ').substring(0, 19));
    }

    // ========================
    // PUSH TO CLOUD
    // ========================
    async pushAll() {
        if (!this.isOnline) return { success: false, error: 'Offline' };
        this.isSyncing = true;
        this.#notifyStatusChange(this.isOnline);
        try {
            const terminalId = this.getTerminalId();
            if (!terminalId) return { success: false, error: 'No terminal configured' };

            const pendingSales = this.db.getPendingSales(terminalId);
            for (const sale of pendingSales) {
                await this.pushSale(sale);
            }
            return { success: true, pushed: pendingSales.length };
        } finally {
            this.isSyncing = false;
            this.#notifyStatusChange(this.isOnline);
        }
    }

    async pushSale(sale) {
        const items = this.db.getSaleItems(sale.id);
        const payments = this.db.getPendingPayments(sale.id);

        const payload = {
            sale: {
                reference_no: sale.reference_no,
                user_id: sale.user_id,
                customer_id: sale.customer_id,
                warehouse_id: sale.warehouse_id,
                biller_id: sale.biller_id,
                item: sale.item,
                total_qty: sale.total_qty,
                total_discount: sale.total_discount,
                total_tax: sale.total_tax,
                total_price: sale.total_price,
                grand_total: sale.grand_total,
                order_tax_rate: sale.order_tax_rate,
                order_tax: sale.order_tax,
                order_discount: sale.order_discount,
                coupon_discount: sale.coupon_discount,
                shipping_cost: sale.shipping_cost,
                sale_status: sale.sale_status,
                payment_status: sale.payment_status,
                paid_amount: sale.paid_amount,
                sale_note: sale.sale_note,
                staff_note: sale.staff_note,
                created_at: sale.created_at
            },
            items: items.map(i => ({
                product_id: i.product_id,
                qty: i.qty,
                net_unit_price: i.net_unit_price,
                discount: i.discount,
                tax_rate: i.tax_rate,
                tax: i.tax,
                total: i.total
            })),
            payments: payments.map(p => ({
                payment_reference: p.payment_reference,
                amount: p.amount,
                used_points: p.used_points,
                change: p.change_amount,
                paying_method: p.paying_method,
                payment_note: p.payment_note,
                created_at: p.created_at
            }))
        };

        const result = await this.#apiRequest('POST', '/sync/sales', payload);
        if (result.success) {
            this.db.markSaleSynced(sale.id);
        }
        return result;
    }

    // ========================
    // AUTH
    // ========================
    async authenticateWithCloud(email, password) {
        if (!this.isOnline) {
            return { success: false, error: 'No internet connection' };
        }
        try {
            const result = await this.#apiRequest('POST', '/auth/login', { email, password });
            if (result.success && result.user) {
                const crypto = require('crypto');
                const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
                this.db.cacheCredentials(result.user.id, passwordHash);
            }
            return result;
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    async validateProductKeyOnCloud(productKey, terminalId) {
        if (!this.isOnline) {
            return { success: false, error: 'Internet connection required for activation' };
        }
        try {
            const result = await this.#apiRequest('POST', '/auth/activate', { product_key: productKey, terminal_id: terminalId });
            if (result.success) {
                this.db.saveProductKey(productKey, terminalId);
                if (result.company_name) {
                    this.db.setPreference('company_name', result.company_name);
                }
            }
            return result;
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    // ========================
    // FULL SYNC
    // ========================
    async fullSync() {
        const result = { pulled: false, pushed: false, errors: [] };
        try {
            await this.pullAll();
            result.pulled = true;
        } catch (e) {
            result.errors.push('pull: ' + e.message);
        }
        try {
            const pushResult = await this.pushAll();
            result.pushed = pushResult.success;
        } catch (e) {
            result.errors.push('push: ' + e.message);
        }
        if (this.onSyncComplete) {
            this.onSyncComplete(result);
        }
        return result;
    }

    // ========================
    // START / STOP
    // ========================
    start() {
        this.#checkOnline().then(() => {
            if (this.isOnline) {
                this.fullSync();
            }
        });
        this.intervalId = setInterval(() => {
            if (this.isOnline && !this.isSyncing) {
                this.pushAll().then(() => this.pullAll());
            }
        }, this.syncInterval);
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        if (this._onlinePoll) {
            clearInterval(this._onlinePoll);
            this._onlinePoll = null;
        }
    }
}

module.exports = SyncEngine;

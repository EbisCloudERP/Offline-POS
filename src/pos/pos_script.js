// src/pos/pos_script.js
let cart = [];
let currentSearchMode = 'name';
let currentUser = null;

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const newSaleBtn = document.getElementById('newSaleBtn');
const cartBody = document.getElementById('cartBody');
const subtotalSpan = document.getElementById('subtotal');
const taxSpan = document.getElementById('tax');
const totalSpan = document.getElementById('total');
const sideCanvas = document.getElementById('sideCanvas');
const canvasOverlay = document.getElementById('canvasOverlay');
const menuToggleBtn = document.getElementById('menuToggleBtn');
const signOutBtn = document.getElementById('signOutBtn');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const powerBtn = document.getElementById('powerBtn');
const powerModal = document.getElementById('powerModal');
const powerModalOverlay = document.getElementById('powerModalOverlay');
const currentDateSpan = document.getElementById('currentDate');
const syncStatusEl = document.getElementById('syncStatus');
const syncNowBtn = document.getElementById('syncNowBtn');

// Tax constant
const TAX_RATE = 0.16;

// Initialize
async function init() {
    loadUserData();
    attachEventListeners();
    await loadProducts();
    updateCartDisplay();
    setCurrentDate();
    loadThemePreference();
    setupSearchModes();
    setupSyncListener();
}

async function loadUserData() {
    try {
        currentUser = await window.electronAPI.getCurrentUser();
    } catch (e) {
        console.error('Failed to load user:', e);
    }
    if (!currentUser) {
        currentUser = { id: 1, name: 'User', email: '', warehouse_id: 1, branch_id: 1, biller_id: 0 };
    }

    const userNameSpan = document.getElementById('userName');
    const userEmailSpan = document.getElementById('userEmail');
    if (userNameSpan) userNameSpan.textContent = currentUser.name || 'User';
    if (userEmailSpan) userEmailSpan.textContent = currentUser.email || '';

    try {
        const company = await window.electronAPI.getCompanyName();
        const companyEl = document.getElementById('companyName');
        if (companyEl && company.name) {
            companyEl.textContent = company.name;
        } else if (companyEl) {
            companyEl.style.display = 'none';
        }
    } catch (e) {}
}

async function loadProducts() {
    // Products are now searched on-demand via IPC, not preloaded
}

function setupSearchModes() {
    const modeBtns = document.querySelectorAll('.mode-btn');
    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentSearchMode = btn.dataset.mode;

            const placeholders = {
                name: 'Search by name...',
                code: 'Search by product code...',
                barcode: 'Scan or enter barcode...'
            };
            searchInput.placeholder = placeholders[currentSearchMode];
            searchInput.value = '';
        });
    });
    document.querySelector('.mode-btn[data-mode="name"]').classList.add('active');
}

async function searchProducts() {
    const query = searchInput.value.trim();
    if (!query) return;

    const warehouseId = currentUser ? currentUser.warehouse_id : 1;
    let product = null;

    try {
        switch (currentSearchMode) {
            case 'name': {
                const result = await window.electronAPI.getProductByName(query, warehouseId);
                product = result.product;
                break;
            }
            case 'code': {
                const result = await window.electronAPI.getProductByCode(query, warehouseId);
                product = result.product;
                break;
            }
            case 'barcode': {
                const result = await window.electronAPI.getProductByBarcode(query, warehouseId);
                product = result.product;
                break;
            }
        }
    } catch (e) {
        console.error('Search error:', e);
    }

    if (product) {
        addToCart(product);
        searchInput.value = '';
        searchInput.focus();
    } else {
        showToast('Product not found', 'warning');
    }
}

function addToCart(product) {
    const existingItem = cart.find(item => item.id === product.id);

    if (existingItem) {
        existingItem.quantity++;
    } else {
        const price = product.price;
        const taxMethod = product.tax_method || 2;

        let basePrice, taxPerUnit;
        if (taxMethod === 1) {
            basePrice = parseFloat((price / (1 + TAX_RATE)).toFixed(2));
            taxPerUnit = parseFloat((basePrice * TAX_RATE).toFixed(2));
        } else if (taxMethod === 2) {
            basePrice = price;
            taxPerUnit = parseFloat((price * TAX_RATE).toFixed(2));
        } else {
            basePrice = price;
            taxPerUnit = 0;
        }

        cart.push({
            id: product.id,
            name: product.name,
            code: product.code,
            price: price,
            tax_method: taxMethod,
            basePrice: basePrice,
            taxPerUnit: taxPerUnit,
            quantity: 1
        });
    }

    updateCartDisplay();
    playBeep();
}

function playBeep() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.value = 880;
        gain.gain.value = 0.15;
        osc.start(ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
        // Audio not available
    }
}

function updateCartDisplay() {
    if (!cartBody) return;

    if (cart.length === 0) {
        cartBody.innerHTML = '<tr><td colspan="5" class="text-center text-secondary">No items added</td></tr>';
        updateTotals();
        return;
    }

    cartBody.innerHTML = cart.map((item, index) => `
        <tr>
            <td>
                <div class="fw-semibold">${item.name}</div>
                <small class="text-secondary">${item.code || ''}</small>
            </td>
            <td>
                <div class="quantity-control">
                    <button class="qty-btn" data-index="${index}" data-change="-1">-</button>
                    <span>${item.quantity}</span>
                    <button class="qty-btn" data-index="${index}" data-change="1">+</button>
                </div>
            </td>
            <td>${formatPrice(item.price)}</td>
            <td>${formatPrice(item.basePrice * item.quantity)}</td>
            <td><i class="bi bi-trash delete-item" data-index="${index}"></i></td>
        </tr>
    `).join('');

    document.querySelectorAll('.qty-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.dataset.index);
            const change = parseInt(btn.dataset.change);
            updateQuantity(index, change);
        });
    });

    document.querySelectorAll('.delete-item').forEach(icon => {
        icon.addEventListener('click', (e) => {
            const index = parseInt(icon.dataset.index);
            removeFromCart(index);
        });
    });

    updateTotals();
}

function updateQuantity(index, change) {
    if (!cart[index]) return;
    const newQuantity = cart[index].quantity + change;
    if (newQuantity <= 0) {
        removeFromCart(index);
    } else {
        cart[index].quantity = newQuantity;
        updateCartDisplay();
    }
}

function removeFromCart(index) {
    promptAdminPassword('Admin authorization required to delete items', () => {
        cart.splice(index, 1);
        updateCartDisplay();
    });
}

function updateTotals() {
    const subtotal = cart.reduce((sum, item) => sum + (item.basePrice * item.quantity), 0);
    const tax = cart.reduce((sum, item) => sum + (item.taxPerUnit * item.quantity), 0);
    const total = subtotal + tax;

    subtotalSpan.textContent = formatPrice(subtotal);
    taxSpan.textContent = formatPrice(tax);
    totalSpan.textContent = formatPrice(total);
}

function newSale() {
    if (cart.length > 0) {
        showConfirm('Start a new sale? Current cart will be cleared.', () => {
            cart = [];
            updateCartDisplay();
            searchInput.value = '';
            searchInput.focus();
        });
        return;
    }
    searchInput.value = '';
    searchInput.focus();
}

function formatPrice(price) {
    return price.toFixed(2);
}

// ========================
// SYNC
// ========================
function setupSyncListener() {
    if (window.electronAPI.onSyncStatusChanged) {
        window.electronAPI.onSyncStatusChanged((status) => {
            updateSyncIndicator(status.online, status.syncing);
        });
    }
    if (window.electronAPI.onSyncCompleted) {
        window.electronAPI.onSyncCompleted((result) => {
            if (result.errors && result.errors.length > 0) {
                console.error('Sync errors:', result.errors);
            }
            updateSyncIndicator(true, false);
        });
    }
    // Initial status
    window.electronAPI.getSyncStatus().then(status => {
        updateSyncIndicator(status.online, status.syncing);
    });
}

function updateSyncIndicator(online, syncing) {
    if (syncStatusEl) {
        if (syncing) {
            syncStatusEl.className = 'badge bg-warning text-dark';
            syncStatusEl.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Syncing';
        } else if (online) {
            syncStatusEl.className = 'badge bg-success';
            syncStatusEl.innerHTML = '<i class="bi bi-cloud-check"></i> Online';
        } else {
            syncStatusEl.className = 'badge bg-secondary';
            syncStatusEl.innerHTML = '<i class="bi bi-cloud-slash"></i> Offline';
        }
    }
}

async function syncNow() {
    if (syncNowBtn) {
        syncNowBtn.disabled = true;
        syncNowBtn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Syncing...';
    }
    try {
        const result = await window.electronAPI.syncNow();
        if (result.errors && result.errors.length > 0) {
            showToast('Sync completed with errors', 'warning');
        } else {
            showToast('Sync completed', 'success');
        }
    } catch (e) {
        showToast('Sync failed', 'danger');
    } finally {
        if (syncNowBtn) {
            syncNowBtn.disabled = false;
            syncNowBtn.innerHTML = '<i class="bi bi-cloud-arrow-up"></i> Sync';
        }
    }
}

// ========================
// PAYMENTS
// ========================
async function processPayment(method) {
    if (cart.length === 0) {
        showToast('Cart is empty', 'warning');
        return;
    }

    const subtotal = cart.reduce((sum, item) => sum + (item.basePrice * item.quantity), 0);
    const totalTax = cart.reduce((sum, item) => sum + (item.taxPerUnit * item.quantity), 0);
    const grandTotal = parseFloat((subtotal + totalTax).toFixed(2));

    showConfirm(
        `<strong>Process ${method} payment?</strong><br><br>
        <table style="width:100%; color:inherit;">
            <tr><td>Items:</td><td style="text-align:right">${cart.length}</td></tr>
            <tr><td>Total:</td><td style="text-align:right"><strong>${formatPrice(grandTotal)}</strong></td></tr>
        </table>`,
        async () => {
            try {
                const terminalInfo = await window.electronAPI.getTerminalInfo();
                const saleId = generateUUID();
                const referenceNo = 'POS-' + Date.now().toString(36).toUpperCase();
                const paymentRef = 'PAY-' + Date.now().toString(36).toUpperCase();
                const now = new Date();

                const saleData = {
                    id: saleId,
                    reference_no: referenceNo,
                    user_id: currentUser ? currentUser.id : 1,
                    customer_id: 1,
                    warehouse_id: currentUser ? currentUser.warehouse_id : 1,
                    biller_id: currentUser ? (currentUser.biller_id || 0) : 0,
                    terminal_id: terminalInfo.terminal_id || '',
                    items: cart.map(item => ({
                        product_id: item.id,
                        qty: item.quantity,
                        net_unit_price: item.basePrice,
                        discount: 0,
                        tax_rate: item.tax_method === 1 ? TAX_RATE : (item.tax_method === 2 ? TAX_RATE : 0),
                        tax: parseFloat((item.taxPerUnit * item.quantity).toFixed(2)),
                        total: parseFloat((item.basePrice * item.quantity).toFixed(2))
                    })),
                    payments: [{
                        payment_reference: paymentRef,
                        amount: grandTotal,
                        used_points: 0,
                        change_amount: 0,
                        paying_method: method,
                        payment_note: ''
                    }],
                    paid_amount: grandTotal,
                    payment_status: 1
                };

                const result = await window.electronAPI.createSale(saleData);
                if (result.success) {
                    const receiptData = {
                        referenceNo,
                        paymentRef,
                        method,
                        items: [...cart],
                        subtotal,
                        totalTax,
                        grandTotal,
                        date: now,
                        user: currentUser ? currentUser.name : 'User',
                        terminal: terminalInfo.terminal_id || ''
                    };
                    const soldCart = [...cart];
                    cart = [];
                    updateCartDisplay();
                    searchInput.disabled = false;
                    searchInput.value = '';
                    searchInput.focus();
                    showReceipt(receiptData);
                } else {
                    showToast('Failed to save sale: ' + (result.error || 'Unknown error'), 'danger');
                }
            } catch (e) {
                console.error('Payment error:', e);
                showToast('Payment processing failed', 'danger');
            }
        }
    );
}

// ========================
// RECEIPT
// ========================
function showReceipt(data) {
    const overlay = document.getElementById('receiptOverlay');
    const modal = document.getElementById('receiptModal');
    const content = document.getElementById('receiptContent');

    if (!overlay || !modal || !content) {
        showToast(`Sale completed! Total: ${formatPrice(data.grandTotal)}`, 'success');
        return;
    }

    const dateStr = data.date.toLocaleString();
    const itemsHtml = data.items.map(item => `
        <tr>
            <td style="padding: 3px 0;">${item.name} x${item.quantity}</td>
            <td style="text-align:right;">${formatPrice(item.basePrice * item.quantity)}</td>
        </tr>
    `).join('');

    content.innerHTML = `
        <div style="text-align:center; margin-bottom: 1rem;">
            <strong style="font-size: 1.2rem;">Ebiscloud POS</strong><br>
            <small>${dateStr}</small><br>
            <small>Ref: ${data.referenceNo}</small><br>
            <small>Cashier: ${data.user}</small>
        </div>
        <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 0.5rem 0; margin-bottom: 0.5rem;">
            <table style="width:100%; font-size: 0.9rem;">
                ${itemsHtml}
            </table>
        </div>
        <table style="width:100%; font-size: 0.9rem;">
            <tr><td>Subtotal</td><td style="text-align:right;">${formatPrice(data.subtotal)}</td></tr>
            <tr><td>Tax (16%)</td><td style="text-align:right;">${formatPrice(data.totalTax)}</td></tr>
            <tr style="font-weight:bold; font-size: 1.1rem;"><td>TOTAL</td><td style="text-align:right;">${formatPrice(data.grandTotal)}</td></tr>
            <tr><td colspan="2"><hr style="margin: 4px 0;"></td></tr>
            <tr><td>Method</td><td style="text-align:right;">${data.method}</td></tr>
            <tr><td>Pay Ref</td><td style="text-align:right; font-size: 0.8rem;">${data.paymentRef}</td></tr>
        </table>
        <div style="text-align:center; margin-top: 1rem; font-size: 0.8rem; color: #666;">
            Thank you for your purchase!<br>
            <small>Terminal: ${data.terminal.substring(0, 8)}...</small>
        </div>
    `;

    overlay.style.display = 'flex';
    modal.style.display = 'block';
}

function closeReceipt() {
    const overlay = document.getElementById('receiptOverlay');
    const modal = document.getElementById('receiptModal');
    if (overlay) overlay.style.display = 'none';
    if (modal) modal.style.display = 'none';
    searchInput.disabled = false;
    searchInput.focus();
}

function printReceipt() {
    const content = document.getElementById('receiptContent');
    if (!content) return;
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    printWindow.document.write(`
        <html><head><title>Receipt</title>
        <style>body { font-family: monospace; margin: 0; padding: 1.5rem; color: #000; }</style>
        </head><body>${content.innerHTML}</body></html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// ========================
// PRODUCT MANAGEMENT
// ========================
let allProducts = [];

async function openProductManagement() {
    const overlay = document.getElementById('productsOverlay');
    const modal = document.getElementById('productsModal');
    const tbody = document.getElementById('productsTableBody');
    if (!overlay || !modal) return;

    overlay.style.display = 'block';
    modal.style.display = 'block';
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-secondary">Loading...</td></tr>';

    const warehouseId = currentUser ? currentUser.warehouse_id : 1;
    try {
        const result = await window.electronAPI.getProducts(warehouseId);
        allProducts = result.products || [];
        renderProductsTable(allProducts);
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Failed to load products</td></tr>';
    }
}

function renderProductsTable(products) {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;

    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-secondary">No products found</td></tr>';
        return;
    }

    tbody.innerHTML = products.map(p => {
        let taxLabel = 'No Tax';
        if (p.tax_method === 1) taxLabel = 'Inclusive 16%';
        else if (p.tax_method === 2) taxLabel = 'Exclusive 16%';
        return `
            <tr>
                <td style="font-family: monospace;">${p.code}</td>
                <td>${p.name}</td>
                <td>${formatPrice(p.price)}</td>
                <td>${taxLabel}</td>
                <td><span class="badge ${p.warehouse_qty > 10 ? 'bg-success' : (p.warehouse_qty > 0 ? 'bg-warning text-dark' : 'bg-danger')}">${p.warehouse_qty || 0}</span></td>
            </tr>
        `;
    }).join('');
}

function filterProductsTable(query) {
    if (!allProducts) return;
    if (!query) {
        renderProductsTable(allProducts);
        return;
    }
    const filtered = allProducts.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.code.toLowerCase().includes(query) ||
        p.barcode_symbology.includes(query)
    );
    renderProductsTable(filtered);
}

function closeProductManagement() {
    const overlay = document.getElementById('productsOverlay');
    const modal = document.getElementById('productsModal');
    if (overlay) overlay.style.display = 'none';
    if (modal) modal.style.display = 'none';
    const searchInput = document.getElementById('productsSearchInput');
    if (searchInput) searchInput.value = '';
}

// ========================
// SALES HISTORY
// ========================
async function openSalesHistory() {
    const overlay = document.getElementById('salesOverlay');
    const modal = document.getElementById('salesModal');
    const tbody = document.getElementById('salesTableBody');
    if (!overlay || !modal) return;

    overlay.style.display = 'block';
    modal.style.display = 'block';
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-secondary">Loading...</td></tr>';

    try {
        const result = await window.electronAPI.getSalesHistory(100);
        const sales = result.sales || [];
        if (sales.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-secondary">No sales found</td></tr>';
            return;
        }

        tbody.innerHTML = sales.map(s => {
            const dateStr = s.created_at ? new Date(s.created_at + 'Z').toLocaleString() : '-';
            const syncBadge = s.sync_status === 'synced'
                ? '<span class="badge bg-success">Synced</span>'
                : '<span class="badge bg-warning text-dark">Pending</span>';
            const statusBadge = s.sale_status === 2
                ? '<span class="badge bg-danger">VOIDED</span>'
                : (s.payment_status === 1 ? '<span class="badge bg-success">Paid</span>' : '<span class="badge bg-warning text-dark">Unpaid</span>');
            const voidBtn = s.sale_status !== 2
                ? `<button class="btn btn-sm btn-outline-danger void-sale-btn" data-id="${s.id}" title="Void Sale"><i class="bi bi-x-circle"></i></button>`
                : '';
            return `
                <tr>
                    <td style="font-family: monospace; font-size: 0.85rem;">${s.reference_no}</td>
                    <td style="font-size: 0.85rem;">${dateStr}</td>
                    <td>${s.item}</td>
                    <td><strong>${formatPrice(s.grand_total)}</strong></td>
                    <td>${statusBadge}</td>
                    <td>${syncBadge}</td>
                    <td>${voidBtn}</td>
                </tr>
            `;
        }).join('');

        document.querySelectorAll('.void-sale-btn').forEach(btn => {
            btn.addEventListener('click', () => voidSale(btn.dataset.id));
        });
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Failed to load sales</td></tr>';
    }
}

function closeSalesHistory() {
    const overlay = document.getElementById('salesOverlay');
    const modal = document.getElementById('salesModal');
    if (overlay) overlay.style.display = 'none';
    if (modal) modal.style.display = 'none';
}

// ========================
// HELD SALES
// ========================
async function holdCurrentSale() {
    if (cart.length === 0) {
        showToast('Cart is empty', 'warning');
        return;
    }

    const totalPrice = cart.reduce((sum, item) => sum + (item.basePrice * item.quantity), 0);
    showConfirm(
        `<strong>Hold this sale?</strong><br><br>${cart.length} items, Total: ${formatPrice(totalPrice)}`,
        async () => {
            try {
                const saleId = generateUUID();
                const referenceNo = 'HLD-' + Date.now().toString(36).toUpperCase();

                const saleData = {
                    id: saleId,
                    reference_no: referenceNo,
                    user_id: currentUser ? currentUser.id : 1,
                    warehouse_id: currentUser ? currentUser.warehouse_id : 1,
                    items: cart.map(item => ({
                        product_id: item.id,
                        product_name: item.name,
                        product_code: item.code || '',
                        price: item.price,
                        tax_method: item.tax_method,
                        tax_per_unit: item.taxPerUnit,
                        base_price: item.basePrice,
                        qty: item.quantity,
                        total: parseFloat((item.basePrice * item.quantity).toFixed(2))
                    })),
                    note: ''
                };

                const result = await window.electronAPI.holdSale(saleData);
                if (result.success) {
                    cart = [];
                    updateCartDisplay();
                    searchInput.value = '';
                    searchInput.focus();
                    showToast('Sale held successfully', 'success');
                } else {
                    showToast('Failed to hold sale', 'danger');
                }
            } catch (e) {
                console.error('Hold error:', e);
                showToast('Failed to hold sale', 'danger');
            }
        }
    );
}

async function openHeldSales() {
    const overlay = document.getElementById('heldOverlay');
    const modal = document.getElementById('heldModal');
    const tbody = document.getElementById('heldTableBody');
    if (!overlay || !modal) return;
    closeCanvas();

    overlay.style.display = 'block';
    modal.style.display = 'block';
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-secondary">Loading...</td></tr>';

    try {
        const result = await window.electronAPI.getHeldSales();
        const heldSales = result.heldSales || [];
        if (heldSales.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-secondary">No held sales</td></tr>';
            return;
        }

        tbody.innerHTML = heldSales.map(s => {
            const dateStr = s.created_at ? new Date(s.created_at + 'Z').toLocaleString() : '-';
            return `
                <tr>
                    <td style="font-family: monospace; font-size: 0.85rem;">${s.reference_no}</td>
                    <td style="font-size: 0.85rem;">${dateStr}</td>
                    <td>${s.item_count}</td>
                    <td>${s.total_qty}</td>
                    <td><strong>${formatPrice(s.total_price)}</strong></td>
                    <td>
                        <button class="btn btn-sm btn-success me-1 resume-held-btn" data-id="${s.id}"><i class="bi bi-cart-plus"></i></button>
                        <button class="btn btn-sm btn-danger delete-held-btn" data-id="${s.id}"><i class="bi bi-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');

        document.querySelectorAll('.resume-held-btn').forEach(btn => {
            btn.addEventListener('click', () => resumeHeldSale(btn.dataset.id));
        });
        document.querySelectorAll('.delete-held-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteHeldSale(btn.dataset.id));
        });
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Failed to load held sales</td></tr>';
    }
}

async function resumeHeldSale(heldSaleId) {
    try {
        const result = await window.electronAPI.getHeldSaleItems(heldSaleId);
        const items = result.items || [];
        if (items.length === 0) {
            showToast('No items in held sale', 'warning');
            return;
        }

        // Merge with existing cart
        for (const item of items) {
            const existingItem = cart.find(ci => ci.id === item.product_id);
            if (existingItem) {
                existingItem.quantity += item.qty;
            } else {
                cart.push({
                    id: item.product_id,
                    name: item.product_name,
                    code: item.product_code || '',
                    price: item.price,
                    tax_method: item.tax_method,
                    basePrice: item.base_price,
                    taxPerUnit: item.tax_per_unit,
                    quantity: item.qty
                });
            }
        }

        await window.electronAPI.deleteHeldSale(heldSaleId);
        updateCartDisplay();
        closeHeldSales();
        showToast('Sale resumed', 'success');
    } catch (e) {
        console.error('Resume error:', e);
        showToast('Failed to resume sale', 'danger');
    }
}

async function deleteHeldSale(heldSaleId) {
    showConfirm('Delete this held sale?', async () => {
        try {
            await window.electronAPI.deleteHeldSale(heldSaleId);
            openHeldSales(); // refresh
            showToast('Held sale deleted', 'success');
        } catch (e) {
            showToast('Failed to delete', 'danger');
        }
    });
}

function closeHeldSales() {
    const overlay = document.getElementById('heldOverlay');
    const modal = document.getElementById('heldModal');
    if (overlay) overlay.style.display = 'none';
    if (modal) modal.style.display = 'none';
}

// ========================
// ADMIN AUTH & VOID
// ========================
function promptAdminPassword(message, onSuccess) {
    const overlay = document.getElementById('adminOverlay');
    const modal = document.getElementById('adminModal');
    const promptMsg = document.getElementById('adminPromptMessage');
    const passwordInput = document.getElementById('adminPasswordInput');
    const errorEl = document.getElementById('adminError');
    const confirmBtn = document.getElementById('adminConfirmBtn');
    const cancelBtn = document.getElementById('adminCancelBtn');

    if (!overlay || !modal) {
        alert('Admin authorization required');
        return;
    }

    promptMsg.textContent = message || 'Admin authorization required';
    passwordInput.value = '';
    errorEl.style.display = 'none';
    overlay.style.display = 'block';
    modal.style.display = 'block';
    passwordInput.focus();

    const cleanup = () => {
        overlay.style.display = 'none';
        modal.style.display = 'none';
        confirmBtn.removeEventListener('click', onSubmit);
        cancelBtn.removeEventListener('click', onCancel);
        overlay.removeEventListener('click', onCancel);
    };

    const onSubmit = async () => {
        const password = passwordInput.value.trim();
        if (!password) {
            errorEl.textContent = 'Enter admin password';
            errorEl.style.display = 'block';
            return;
        }
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
        try {
            const result = await window.electronAPI.verifyAdminPassword(password);
            if (result.success) {
                cleanup();
                onSuccess(password);
            } else {
                errorEl.textContent = 'Invalid admin password';
                errorEl.style.display = 'block';
                passwordInput.value = '';
                passwordInput.focus();
            }
        } catch (e) {
            errorEl.textContent = 'Verification failed';
            errorEl.style.display = 'block';
        }
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = 'Authorize';
    };

    const onCancel = () => { cleanup(); };

    confirmBtn.addEventListener('click', onSubmit);
    cancelBtn.addEventListener('click', onCancel);
    overlay.addEventListener('click', onCancel);
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') onSubmit();
    });
}

async function voidSale(saleId) {
    promptAdminPassword('Void this sale? This action cannot be undone.', async (password) => {
        try {
            const result = await window.electronAPI.voidSale(saleId, password);
            if (result.success) {
                showToast('Sale voided successfully', 'success');
                openSalesHistory();
            } else {
                showToast(result.error || 'Void failed', 'danger');
            }
        } catch (e) {
            showToast('Void failed', 'danger');
        }
    });
}

// ========================
// END OF DAY
// ========================
let eodSummary = null;

async function openEndOfDay() {
    const overlay = document.getElementById('eodOverlay');
    const modal = document.getElementById('eodModal');
    const content = document.getElementById('eodContent');
    if (!overlay || !modal || !content) return;
    closeCanvas();

    overlay.style.display = 'block';
    modal.style.display = 'block';
    content.innerHTML = '<div class="text-center text-secondary py-3"><div class="spinner-border spinner-border-sm me-2"></div> Loading...</div>';

    try {
        const result = await window.electronAPI.getDaySummary();
        eodSummary = result.summary;
        renderEndOfDay(eodSummary);
    } catch (e) {
        content.innerHTML = '<div class="text-center text-danger py-3">Failed to load summary</div>';
    }
}

function renderEndOfDay(s) {
    const content = document.getElementById('eodContent');
    const cashExpected = s.cashTotal.toFixed(2);
    const discrepancyHtml = `
        <div class="mb-3 p-2 rounded" style="background: rgba(255,255,255,0.05);">
            <label class="form-label small text-secondary mb-1">Cash Count (count drawer and enter actual cash)</label>
            <div class="d-flex gap-2">
                <input type="number" step="0.01" class="form-control" id="cashCountInput" placeholder="${cashExpected}" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white;" value="${cashExpected}">
                <button class="btn btn-sm btn-outline-light" id="recalcDiscrepancy">Check</button>
            </div>
            <div id="discrepancyResult" class="mt-2 small"></div>
        </div>
    `;

    content.innerHTML = `
        <div class="row g-3 mb-3">
            <div class="col-6">
                <div class="p-3 rounded text-center" style="background: rgba(255,255,255,0.05);">
                    <div class="small text-secondary">Total Sales</div>
                    <div class="fs-4 fw-bold">${s.totalSales}</div>
                </div>
            </div>
            <div class="col-6">
                <div class="p-3 rounded text-center" style="background: rgba(255,255,255,0.05);">
                    <div class="small text-secondary">Total Revenue</div>
                    <div class="fs-4 fw-bold">${formatPrice(s.totalRevenue)}</div>
                </div>
            </div>
        </div>

        <div class="row g-3 mb-3">
            <div class="col-4">
                <div class="p-2 rounded text-center" style="background: rgba(25,135,84,0.15);">
                    <div class="small">Cash</div>
                    <div class="fw-bold">${formatPrice(s.cashTotal)}</div>
                </div>
            </div>
            <div class="col-4">
                <div class="p-2 rounded text-center" style="background: rgba(13,110,253,0.15);">
                    <div class="small">Card</div>
                    <div class="fw-bold">${formatPrice(s.cardTotal)}</div>
                </div>
            </div>
            <div class="col-4">
                <div class="p-2 rounded text-center" style="background: rgba(255,193,7,0.15);">
                    <div class="small">Check</div>
                    <div class="fw-bold">${formatPrice(s.checkTotal)}</div>
                </div>
            </div>
        </div>

        <table style="width:100%; font-size:0.9rem;" class="mb-3">
            <tr><td class="text-secondary">Tax Collected</td><td class="text-end">${formatPrice(s.totalTax)}</td></tr>
            <tr><td class="text-secondary">Discounts</td><td class="text-end">${formatPrice(s.totalDiscount)}</td></tr>
            <tr><td class="text-secondary">Voided Sales</td><td class="text-end text-warning">${s.voidedCount}</td></tr>
            <tr><td class="text-secondary">Date</td><td class="text-end">${s.date}</td></tr>
        </table>

        ${discrepancyHtml}

        <div class="d-flex gap-2">
            <button class="btn btn-outline-light btn-sm w-50" id="eodSyncBtn"><i class="bi bi-cloud-arrow-up"></i> Sync Now</button>
            <button class="btn btn-light btn-sm w-50" id="eodPrintBtn"><i class="bi bi-printer"></i> Print</button>
        </div>
    `;

    // Wire up cash count discrepancy
    const cashInput = document.getElementById('cashCountInput');
    const recalcBtn = document.getElementById('recalcDiscrepancy');
    const discResult = document.getElementById('discrepancyResult');

    const calcDiscrepancy = () => {
        const counted = parseFloat(cashInput.value) || 0;
        const diff = counted - s.cashTotal;
        if (Math.abs(diff) < 0.01) {
            discResult.innerHTML = '<span class="text-success"><i class="bi bi-check-circle"></i> Cash matches expected</span>';
        } else if (diff > 0) {
            discResult.innerHTML = `<span class="text-warning"><i class="bi bi-exclamation-triangle"></i> Over by ${formatPrice(diff)}</span>`;
        } else {
            discResult.innerHTML = `<span class="text-danger"><i class="bi bi-x-circle"></i> Short by ${formatPrice(Math.abs(diff))}</span>`;
        }
    };

    if (recalcBtn) recalcBtn.addEventListener('click', calcDiscrepancy);
    if (cashInput) {
        cashInput.addEventListener('input', calcDiscrepancy);
        calcDiscrepancy();
    }

    // Wire sync button
    const eodSyncBtn = document.getElementById('eodSyncBtn');
    if (eodSyncBtn) {
        eodSyncBtn.addEventListener('click', async () => {
            eodSyncBtn.disabled = true;
            eodSyncBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Syncing...';
            try {
                const syncResult = await window.electronAPI.syncNow();
                showToast('Sync completed', 'success');
            } catch (e) {
                showToast('Sync failed', 'danger');
            }
            eodSyncBtn.disabled = false;
            eodSyncBtn.innerHTML = '<i class="bi bi-cloud-arrow-up"></i> Sync Now';
        });
    }

    // Wire print button
    const eodPrintBtn = document.getElementById('eodPrintBtn');
    if (eodPrintBtn) {
        eodPrintBtn.addEventListener('click', () => {
            const printWindow = window.open('', '_blank', 'width=500,height=700');
            printWindow.document.write(`
                <html><head><title>End of Day - ${s.date}</title>
                <style>body { font-family: monospace; padding: 1.5rem; color: #000; }
                h3 { text-align: center; }
                table { width: 100%; border-collapse: collapse; }
                td { padding: 4px 0; border-bottom: 1px solid #eee; }
                .total { font-weight: bold; font-size: 1.1rem; }</style>
                </head><body>
                <h3>End of Day Report</h3>
                <p style="text-align:center;">Date: ${s.date}</p>
                <table>
                    <tr><td>Total Sales</td><td style="text-align:right;">${s.totalSales}</td></tr>
                    <tr><td>Total Revenue</td><td style="text-align:right;">${formatPrice(s.totalRevenue)}</td></tr>
                    <tr><td>Cash</td><td style="text-align:right;">${formatPrice(s.cashTotal)}</td></tr>
                    <tr><td>Card</td><td style="text-align:right;">${formatPrice(s.cardTotal)}</td></tr>
                    <tr><td>Check</td><td style="text-align:right;">${formatPrice(s.checkTotal)}</td></tr>
                    <tr><td>Tax Collected</td><td style="text-align:right;">${formatPrice(s.totalTax)}</td></tr>
                    <tr><td>Discounts</td><td style="text-align:right;">${formatPrice(s.totalDiscount)}</td></tr>
                    <tr><td>Voided</td><td style="text-align:right;">${s.voidedCount}</td></tr>
                </table>
                </body></html>
            `);
            printWindow.document.close();
            printWindow.print();
        });
    }
}

function closeEndOfDay() {
    const overlay = document.getElementById('eodOverlay');
    const modal = document.getElementById('eodModal');
    if (overlay) overlay.style.display = 'none';
    if (modal) modal.style.display = 'none';
}
function showToast(message, type = 'info') {
    const toastEl = document.getElementById('posToast');
    const toastMsg = document.getElementById('toastMessage');
    if (toastEl && toastMsg) {
        const colors = {
            success: '#198754',
            danger: '#dc3545',
            warning: '#ffc107',
            info: '#0dcaf0'
        };
        toastEl.style.background = colors[type] || colors.info;
        toastEl.style.color = type === 'warning' ? '#000' : '#fff';
        toastEl.style.display = 'block';
        toastEl.style.opacity = '1';
        toastMsg.textContent = message;
        clearTimeout(toastEl._timeout);
        toastEl._timeout = setTimeout(() => {
            toastEl.style.opacity = '0';
            setTimeout(() => { toastEl.style.display = 'none'; }, 300);
        }, 3000);
    } else {
        alert(message);
    }
}

function showConfirm(message, onConfirm) {
    const overlay = document.getElementById('confirmOverlay');
    const modal = document.getElementById('confirmModal');
    const msg = document.getElementById('confirmMessage');
    const okBtn = document.getElementById('confirmOkBtn');
    const cancelBtn = document.getElementById('confirmCancelBtn');

    if (!overlay || !modal || !msg) {
        if (confirm(message.replace(/<[^>]*>/g, ''))) { onConfirm(); }
        return;
    }

    msg.innerHTML = message;
    overlay.style.display = 'block';
    modal.style.display = 'block';

    const cleanup = () => {
        overlay.style.display = 'none';
        modal.style.display = 'none';
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        overlay.removeEventListener('click', onCancel);
    };

    const onOk = () => { cleanup(); onConfirm(); };
    const onCancel = () => { cleanup(); };

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    overlay.addEventListener('click', onCancel);
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// ========================
// CANVAS & NAVIGATION
// ========================
function openCanvas() {
    sideCanvas.classList.add('open');
    canvasOverlay.classList.add('open');
}

function closeCanvas() {
    sideCanvas.classList.remove('open');
    canvasOverlay.classList.remove('open');
}

async function signOut() {
    showConfirm('Are you sure you want to sign out?', async () => {
        try {
            await window.electronAPI.clearCurrentUser();
        } catch (e) {}
        localStorage.removeItem('lastUser');
        if (window.electronAPI && window.electronAPI.navigateToLogin) {
            await window.electronAPI.navigateToLogin();
            if (window.electronAPI.closeCurrentWindow) {
                await window.electronAPI.closeCurrentWindow();
            }
        }
    });
}

// ========================
// THEME
// ========================
function toggleTheme() {
    const body = document.body;
    const isDark = body.classList.contains('dark-theme');
    if (isDark) {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
        localStorage.setItem('theme', 'light');
    } else {
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
    }
}

function loadThemePreference() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
    }
}

function setCurrentDate() {
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    if (currentDateSpan) currentDateSpan.textContent = formattedDate;
}

// ========================
// POWER
// ========================
function openPowerModal() {
    powerModal.classList.add('show');
    powerModalOverlay.classList.add('show');
}

function closePowerModal() {
    powerModal.classList.remove('show');
    powerModalOverlay.classList.remove('show');
}

function handlePowerAction(action) {
    closePowerModal();
    switch (action) {
        case 'exit':
            showConfirm('Are you sure you want to exit the application?', () => {
                window.close();
            });
            break;
        case 'restart':
            showConfirm('Restart application?', () => {
                location.reload();
            });
            break;
        case 'shutdown':
            showConfirm('Are you sure you want to turn off the PC?', () => {
                alert('Shutdown feature requires backend implementation');
            });
            break;
        case 'cancel':
            break;
    }
}

// ========================
// EVENT LISTENERS
// ========================
function attachEventListeners() {
    searchBtn.addEventListener('click', searchProducts);
    newSaleBtn.addEventListener('click', newSale);
    menuToggleBtn.addEventListener('click', openCanvas);
    canvasOverlay.addEventListener('click', closeCanvas);
    signOutBtn.addEventListener('click', signOut);
    themeToggleBtn.addEventListener('click', toggleTheme);

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchProducts();
    });

    powerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openPowerModal();
    });

    powerModalOverlay.addEventListener('click', closePowerModal);

    document.querySelectorAll('.power-modal-option').forEach(option => {
        option.addEventListener('click', () => {
            handlePowerAction(option.dataset.action);
        });
    });

    // Payment buttons
    const cashBtn = document.getElementById('cashBtn');
    const cardBtn = document.getElementById('cardBtn');
    const checkBtn = document.getElementById('checkBtn');

    if (cashBtn) {
        cashBtn.removeEventListener('click', cashBtn._clickHandler);
        cashBtn._clickHandler = () => processPayment('Cash');
        cashBtn.addEventListener('click', cashBtn._clickHandler);
    }
    if (cardBtn) {
        cardBtn.removeEventListener('click', cardBtn._clickHandler);
        cardBtn._clickHandler = () => processPayment('Card');
        cardBtn.addEventListener('click', cardBtn._clickHandler);
    }
    if (checkBtn) {
        checkBtn.removeEventListener('click', checkBtn._clickHandler);
        checkBtn._clickHandler = () => processPayment('Check');
        checkBtn.addEventListener('click', checkBtn._clickHandler);
    }

    // Sync button
    if (syncNowBtn) {
        syncNowBtn.addEventListener('click', syncNow);
    }

    // Coming soon buttons
    const comingSoonBtns = ['discountBtn', 'commentBtn', 'customerBtn',
        'saveSaleBtn', 'refundBtn', 'lockBtn', 'transferBtn',
        'voidOrderBtn', 'cashDrawerBtn',
        'cashInOutBtn',
        'creditPaymentsBtn'];

    comingSoonBtns.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', () => {
                showToast('Feature coming soon', 'warning');
            });
        }
    });

    // Receipt modal buttons
    const receiptCloseBtn = document.getElementById('receiptCloseBtn');
    const receiptPrintBtn = document.getElementById('receiptPrintBtn');
    const receiptOverlay = document.getElementById('receiptOverlay');
    if (receiptCloseBtn) receiptCloseBtn.addEventListener('click', closeReceipt);
    if (receiptPrintBtn) receiptPrintBtn.addEventListener('click', printReceipt);
    if (receiptOverlay) receiptOverlay.addEventListener('click', closeReceipt);

    // Product Management
    const productManagementBtn = document.getElementById('productManagementBtn');
    const productsCloseBtn = document.getElementById('productsCloseBtn');
    const productsOverlay = document.getElementById('productsOverlay');
    const productsSearchInput = document.getElementById('productsSearchInput');
    if (productManagementBtn) productManagementBtn.addEventListener('click', openProductManagement);
    if (productsCloseBtn) productsCloseBtn.addEventListener('click', closeProductManagement);
    if (productsOverlay) productsOverlay.addEventListener('click', closeProductManagement);
    if (productsSearchInput) {
        productsSearchInput.addEventListener('input', (e) => {
            filterProductsTable(e.target.value.toLowerCase());
        });
    }

    // Sales History
    const viewSalesHistoryBtn = document.getElementById('viewSalesHistoryBtn');
    const salesCloseBtn = document.getElementById('salesCloseBtn');
    const salesOverlay = document.getElementById('salesOverlay');
    if (viewSalesHistoryBtn) viewSalesHistoryBtn.addEventListener('click', openSalesHistory);
    if (salesCloseBtn) salesCloseBtn.addEventListener('click', closeSalesHistory);
    if (salesOverlay) salesOverlay.addEventListener('click', closeSalesHistory);

    // Hold Sale
    const holdBtn = document.getElementById('holdBtn');
    if (holdBtn) holdBtn.addEventListener('click', holdCurrentSale);

    // View Open Sales (Held)
    const viewOpenSalesBtn = document.getElementById('viewOpenSalesBtn');
    const heldCloseBtn = document.getElementById('heldCloseBtn');
    const heldOverlay = document.getElementById('heldOverlay');
    if (viewOpenSalesBtn) viewOpenSalesBtn.addEventListener('click', openHeldSales);
    if (heldCloseBtn) heldCloseBtn.addEventListener('click', closeHeldSales);
    if (heldOverlay) heldOverlay.addEventListener('click', closeHeldSales);

    // End of Day
    const endOfDayBtn = document.getElementById('endOfDayBtn');
    const eodCloseBtn = document.getElementById('eodCloseBtn');
    const eodOverlay = document.getElementById('eodOverlay');
    if (endOfDayBtn) endOfDayBtn.addEventListener('click', openEndOfDay);
    if (eodCloseBtn) eodCloseBtn.addEventListener('click', closeEndOfDay);
    if (eodOverlay) eodOverlay.addEventListener('click', closeEndOfDay);
}

document.addEventListener('DOMContentLoaded', init);

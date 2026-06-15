// src/pos/pos_script.js
let cart = [];
let currentSearchMode = 'name';
let currentUser = null;

const mockProducts = [
    { id: 1, name: 'Jam', code: 'JAM001', barcode: '8901234567890', price: 80.00 },
    { id: 2, name: 'Bread', code: 'BRD001', barcode: '8901234567891', price: 60.00 },
    { id: 3, name: 'Milk 1L', code: 'MLK001', barcode: '8901234567892', price: 55.00 },
    { id: 4, name: 'Sugar 1kg', code: 'SGR001', barcode: '8901234567893', price: 45.00 },
    { id: 5, name: 'Rice 5kg', code: 'RIC001', barcode: '8901234567894', price: 350.00 },
    { id: 6, name: 'Coke 500ml', code: 'COK001', barcode: '8901234567895', price: 40.00 },
    { id: 7, name: 'Chips', code: 'CHP001', barcode: '8901234567896', price: 30.00 },
    { id: 8, name: 'Butter', code: 'BTR001', barcode: '8901234567897', price: 120.00 }
];

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

// Initialize
function init() {
    loadUserData();
    attachEventListeners();
    updateCartDisplay();
    setCurrentDate();
    loadThemePreference();
    setupSearchModes();
}

function loadUserData() {
    const userNameSpan = document.getElementById('userName');
    const userEmailSpan = document.getElementById('userEmail');
    if (userNameSpan) userNameSpan.textContent = 'John Doe';
    if (userEmailSpan) userEmailSpan.textContent = 'john@ebiscloud.com';
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
    // Set default active
    document.querySelector('.mode-btn[data-mode="name"]').classList.add('active');
}

function searchProducts() {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) return;
    
    let product = null;
    
    switch(currentSearchMode) {
        case 'name':
            product = mockProducts.find(p => p.name.toLowerCase().includes(query));
            break;
        case 'code':
            product = mockProducts.find(p => p.code.toLowerCase() === query);
            break;
        case 'barcode':
            product = mockProducts.find(p => p.barcode === query);
            break;
    }
    
    if (product) {
        addToCart(product);
        searchInput.value = '';
        searchInput.focus();
    } else {
        alert('Product not found');
    }
}

function addToCart(product) {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1
        });
    }
    
    updateCartDisplay();
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
            <td>${item.name}</td>
            <td>
                <div class="quantity-control">
                    <button class="qty-btn" data-index="${index}" data-change="-1">-</button>
                    <span>${item.quantity}</span>
                    <button class="qty-btn" data-index="${index}" data-change="1">+</button>
                </div>
            </td>
            <td>${formatPrice(item.price)}</td>
            <td>${formatPrice(item.price * item.quantity)}</td>
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
    cart.splice(index, 1);
    updateCartDisplay();
}

function updateTotals() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = 0;
    const total = subtotal + tax;
    subtotalSpan.textContent = formatPrice(subtotal);
    taxSpan.textContent = formatPrice(tax);
    totalSpan.textContent = formatPrice(total);
}

function newSale() {
    if (cart.length > 0 && confirm('Start a new sale? Current cart will be cleared.')) {
        cart = [];
        updateCartDisplay();
        searchInput.value = '';
        searchInput.focus();
    }
}

function formatPrice(price) {
    return price.toFixed(2);
}

function openCanvas() {
    sideCanvas.classList.add('open');
    canvasOverlay.classList.add('open');
}

function closeCanvas() {
    sideCanvas.classList.remove('open');
    canvasOverlay.classList.remove('open');
}

async function signOut() {
    if (confirm('Are you sure you want to sign out?')) {
        if (window.electronAPI && window.electronAPI.navigateToLogin) {
            await window.electronAPI.navigateToLogin();
            if (window.electronAPI.closeCurrentWindow) {
                await window.electronAPI.closeCurrentWindow();
            }
        }
    }
}

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
    switch(action) {
        case 'exit':
            if (confirm('Are you sure you want to exit the application?')) {
                window.close();
            }
            break;
        case 'restart':
            if (confirm('Restart application?')) {
                location.reload();
            }
            break;
        case 'shutdown':
            if (confirm('Are you sure you want to turn off the PC?')) {
                alert('Shutdown feature requires backend implementation');
            }
            break;
        case 'cancel':
            break;
    }
}

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
    
    // Button placeholders
    const buttons = ['discountBtn', 'holdBtn', 'commentBtn', 'customerBtn', 
                     'saveSaleBtn', 'refundBtn', 'lockBtn', 'transferBtn', 
                     'voidOrderBtn', 'cashDrawerBtn', 'cashBtn', 'cardBtn', 'checkBtn',
                     'viewSalesHistoryBtn', 'viewOpenSalesBtn', 'cashInOutBtn',
                     'creditPaymentsBtn', 'endOfDayBtn', 'productManagementBtn'];
    
    buttons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', () => {
                alert(`${btnId.replace('Btn', '').toUpperCase()} feature coming soon`);
            });
        }
    });
}

document.addEventListener('DOMContentLoaded', init);
// =====================
// DATA & STATE
// =====================
let currentUser = '';
let currentRole = '';
let items = [];
let total = 0;
let transactions = [];
let currentTransaction = null;

// Default users (akan digabung dengan data dari localStorage)
const defaultUsers = {
    'admin': { password: 'admin123', role: 'admin', name: 'Administrator' },
    'ani':   { password: 'ani123',   role: 'kasir', name: 'Ani' }
};

function getUsers() {
    try {
        const saved = localStorage.getItem('fitunfoun_users');
        return saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(defaultUsers));
    } catch(e) { return JSON.parse(JSON.stringify(defaultUsers)); }
}

function saveUsers(users) {
    try { localStorage.setItem('fitunfoun_users', JSON.stringify(users)); } catch(e) {}
}

// =====================
// HELPER
// =====================
function get(id) { return document.getElementById(id); }

function fmt(num) { return 'Rp ' + Number(num).toLocaleString('id-ID'); }

function fmtDate(date) {
    return new Date(date).toLocaleString('id-ID', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
}

function showAlert(msg, type) {
    const existing = document.querySelector('.custom-alert');
    if (existing) existing.remove();
    const div = document.createElement('div');
    div.className = 'custom-alert';
    div.style.cssText = `
        position:fixed; top:24px; left:50%; transform:translateX(-50%);
        background:${type === 'success' ? '#2e7d32' : type === 'error' ? '#d32f2f' : '#1565c0'};
        color:white; padding:16px 32px; border-radius:12px; font-size:16px; font-weight:600;
        box-shadow:0 8px 24px rgba(0,0,0,0.3); z-index:9999; animation:fadeInDown 0.3s ease;
    `;
    div.textContent = msg;
    document.body.appendChild(div);
    setTimeout(() => { if (div.parentNode) div.remove(); }, 3000);
}

// =====================
// INIT
// =====================
document.addEventListener('DOMContentLoaded', function () {
    setupEnterKeyNavigation();
    loadTransactions();
});

// =====================
// ENTER KEY NAVIGATION
// =====================
function setupEnterKeyNavigation() {
    get('username').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); if (this.value.trim()) get('password').focus(); }
    });
    get('password').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); login(); }
    });
    get('itemName').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); if (this.value.trim()) get('itemPrice').focus(); }
    });
    get('itemPrice').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const price = parseFloat(this.value);
            if (price && price > 0) { const q = get('itemQty'); q.focus(); q.select(); }
        }
    });
    get('itemQty').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); addItem(); }
    });
    get('paymentAmount').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); if (!get('btnBayar').disabled) calculateChange(); }
    });
}

// =====================
// LOGIN / LOGOUT
// =====================
function login() {
    const username = get('username').value.trim();
    const password = get('password').value;
    const users = getUsers();

    if (!username) { alert('Mohon isi username!'); get('username').focus(); return; }
    if (!password) { alert('Mohon isi password!'); get('password').focus(); return; }

    if (users[username] && users[username].password === password) {
        currentUser = username;
        currentRole = users[username].role;
        get('kasirName').textContent = users[username].name + ' (' + currentRole + ')';
        get('loginScreen').style.display = 'none';
        get('dashboard').classList.add('active');

        // Tampilkan tombol Admin Panel jika role admin atau supervisor
        if (currentRole === 'admin' || currentRole === 'supervisor') {
            get('btnAdminPanel').style.display = 'inline-block';
        } else {
            get('btnAdminPanel').style.display = 'none';
        }

        setTimeout(() => get('itemName').focus(), 100);
    } else {
        alert('Username atau password salah!');
        get('username').focus();
    }
}

function logout() {
    if (!confirm('Yakin ingin logout?')) return;
    currentUser = '';
    currentRole = '';
    items = [];
    total = 0;
    currentTransaction = null;
    get('username').value = '';
    get('password').value = '';
    get('loginScreen').style.display = 'flex';
    get('dashboard').classList.remove('active');
    clearForm();
    updateTable();
    updateTotal();
    resetButtons();
}

// =====================
// TAMBAH BARANG
// =====================
function addItem() {
    const name  = get('itemName').value.trim();
    const price = parseFloat(get('itemPrice').value);
    const qty   = parseInt(get('itemQty').value);

    if (!name)              { alert('Mohon isi nama barang!');    get('itemName').focus();  return; }
    if (!price || price<=0) { alert('Mohon isi harga valid!');    get('itemPrice').focus(); return; }
    if (!qty   || qty<=0)   { alert('Mohon isi jumlah valid!');   get('itemQty').focus();   return; }

    items.push({ id: Date.now(), name, price, qty, subtotal: price * qty });
    clearForm();
    updateTable();
    updateTotal();
    enablePaymentSection();
    get('itemName').focus();
}

function deleteItem(id) {
    if (!confirm('Hapus item ini?')) return;
    items = items.filter(i => i.id !== id);
    updateTable();
    updateTotal();
    if (items.length === 0) disablePaymentSection();
}

function clearForm() {
    get('itemName').value  = '';
    get('itemPrice').value = '';
    get('itemQty').value   = '1';
}

// =====================
// TABLE & TOTAL
// =====================
function updateTable() {
    const tbody = get('itemTable');
    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-table">Belum ada barang ditambahkan</td></tr>';
        return;
    }
    tbody.innerHTML = items.map((item, i) => `
        <tr>
            <td>${i+1}. ${item.name}</td>
            <td>${fmt(item.price)}</td>
            <td>${item.qty}</td>
            <td>${fmt(item.subtotal)}</td>
            <td><button class="btn-delete" onclick="deleteItem(${item.id})">Hapus</button></td>
        </tr>
    `).join('');
}

function updateTotal() {
    total = items.reduce((s, i) => s + i.subtotal, 0);
    get('totalAmount').textContent = fmt(total);
}

// =====================
// PAYMENT CONTROLS
// =====================
function enablePaymentSection() {
    get('paymentAmount').disabled = false;
    get('btnBayar').disabled      = false;
}

function disablePaymentSection() {
    get('paymentAmount').disabled  = true;
    get('paymentAmount').value     = '';
    get('btnBayar').disabled       = true;
    get('btnBenar').disabled       = true;
    get('changeSection').classList.add('hidden');
}

function resetButtons() {
    get('paymentAmount').disabled  = true;
    get('btnBayar').disabled       = true;
    get('btnBenar').disabled       = true;
    get('btnNewTransaction').disabled = true;
    get('changeSection').classList.add('hidden');
}

// =====================
// KALKULASI BAYAR
// =====================
function calculateChange() {
    if (items.length === 0) { alert('Belum ada barang!'); return; }
    const payment = parseFloat(get('paymentAmount').value);

    if (!payment || payment <= 0) {
        alert('Mohon masukkan jumlah pembayaran!');
        get('paymentAmount').focus(); return;
    }
    if (payment < total) {
        const kurang = total - payment;
        const inp = get('paymentAmount');
        inp.classList.add('error');
        setTimeout(() => inp.classList.remove('error'), 600);
        alert('UANG KURANG!\n\nTotal   : ' + fmt(total) + '\nDibayar : ' + fmt(payment) + '\nKurang  : ' + fmt(kurang) + '\n\nSilakan masukkan jumlah yang cukup!');
        get('paymentAmount').focus();
        get('paymentAmount').select();
        return;
    }

    const change = payment - total;
    get('changeAmount').textContent = fmt(change);
    get('changeSection').classList.remove('hidden');
    get('paymentAmount').disabled    = true;
    get('btnBayar').disabled         = true;
    get('btnBenar').disabled         = false;
    get('btnBenar').focus();

    currentTransaction = {
        id:      'TRX-' + Date.now(),
        date:    new Date().toISOString(),
        items:   JSON.parse(JSON.stringify(items)),
        total:   total,
        payment: payment,
        change:  change,
        cashier: currentUser
    };
}

// =====================
// KONFIRMASI TRANSAKSI
// =====================
function confirmTransaction() {
    if (!currentTransaction) { alert('Tidak ada transaksi!'); return; }
    get('btnBenar').disabled         = true;
    get('btnNewTransaction').disabled = false;
    transactions.push(currentTransaction);
    saveTransactions();
    showReceipt(currentTransaction);
    get('btnNewTransaction').focus();
}

// =====================
// TRANSAKSI BARU
// =====================
function newTransaction() {
    if (!get('btnBenar').disabled && !get('changeSection').classList.contains('hidden')) {
        alert('PERHATIAN!\n\nKlik tombol OK (BENAR) terlebih dahulu!');
        get('btnBenar').focus(); return;
    }
    if (get('btnNewTransaction').disabled) {
        if (items.length > 0) {
            alert('PERHATIAN!\n\nSelesaikan tahapan:\n1. Isi Uang Bayar\n2. Klik BAYAR\n3. Klik OK (BENAR)\n4. Klik Transaksi Baru');
        }
        return;
    }
    items = [];
    total = 0;
    currentTransaction = null;
    get('paymentAmount').value = '';
    updateTable();
    updateTotal();
    resetButtons();
    clearForm();
    get('itemName').focus();
}

// =====================
// STRUK
// =====================
function showReceipt(trx) {
    get('receiptId').textContent          = trx.id;
    get('receiptDate').textContent        = fmtDate(trx.date);
    get('receiptCashier').textContent     = trx.cashier;
    get('receiptTotalAmount').textContent = fmt(trx.total);
    get('receiptPaid').textContent        = fmt(trx.payment);
    get('receiptChange').textContent      = fmt(trx.change);

    get('receiptItems').innerHTML = trx.items.map((item, i) => `
        <div class="receipt-item">
            <div class="item-name-qty">${i+1}. ${item.name} <span style="color:#888">x${item.qty}</span></div>
            <div class="item-price">${fmt(item.subtotal)}</div>
        </div>
    `).join('');

    get('receiptModal').classList.add('active');
}

function closeReceipt() {
    get('receiptModal').classList.remove('active');
}

function printReceipt() { window.print(); }

// =====================
// HISTORY
// =====================
function showHistory() {
    const content = get('historyContent');
    if (transactions.length === 0) {
        content.innerHTML = '<p style="text-align:center;color:#999;padding:80px;font-size:18px;">Belum ada riwayat transaksi</p>';
    } else {
        content.innerHTML = transactions.slice().reverse().map(trx => `
            <div class="history-card">
                <div class="history-card-header">
                    <div>
                        <div class="history-id">${trx.id}</div>
                        <div class="history-date">${fmtDate(trx.date)}</div>
                        <div class="history-date">Kasir: ${trx.cashier}</div>
                    </div>
                    <div class="history-total">${fmt(trx.total)}</div>
                </div>
                <div class="history-items">
                    ${trx.items.map((item,i) => `<p>${i+1}. ${item.name} &nbsp; x${item.qty} &nbsp; = &nbsp; ${fmt(item.subtotal)}</p>`).join('')}
                </div>
                <div style="border-top:1px solid #e0e0e0;margin-top:12px;padding-top:12px;display:flex;gap:20px;font-size:14px;color:#555;">
                    <span>Dibayar: <strong>${fmt(trx.payment)}</strong></span>
                    <span>Kembalian: <strong style="color:#1976d2">${fmt(trx.change)}</strong></span>
                </div>
                <button class="btn-view-receipt" onclick="showReceiptFromHistory('${trx.id}')">Lihat Struk</button>
            </div>
        `).join('');
    }
    get('historyPage').classList.add('active');
}

function showReceiptFromHistory(id) {
    const trx = transactions.find(t => t.id === id);
    if (trx) showReceipt(trx);
}

function closeHistory() { get('historyPage').classList.remove('active'); }

// =====================
// ADMIN PANEL
// =====================
function showAdminPanel() {
    if (currentRole !== 'admin' && currentRole !== 'supervisor') {
        alert('Akses ditolak! Hanya Admin dan Supervisor.');
        return;
    }
    renderUserTable();
    get('adminPage').classList.add('active');
}

function closeAdminPanel() {
    get('adminPage').classList.remove('active');
    get('userFormBox').classList.add('hidden');
}

function renderUserTable() {
    const users = getUsers();
    const tbody = get('userTableBody');
    const rows = Object.entries(users).map(([username, data]) => {
        const roleBadge = {
            admin:      '<span class="badge badge-admin">Admin</span>',
            supervisor: '<span class="badge badge-supervisor">Supervisor</span>',
            kasir:      '<span class="badge badge-kasir">Kasir</span>'
        }[data.role] || data.role;

        // Admin tidak bisa edit dirinya sendiri dari sini (keamanan)
        const isSelf = username === currentUser;
        const isAdminUser = data.role === 'admin';

        // Supervisor hanya bisa edit kasir, tidak bisa edit admin/supervisor lain
        const canEdit = currentRole === 'admin'
            ? true
            : (currentRole === 'supervisor' && data.role === 'kasir');

        return `
            <tr>
                <td><strong>${username}</strong> ${isSelf ? '<span style="color:#2e7d32;font-size:12px;">(Anda)</span>' : ''}</td>
                <td>${data.name}</td>
                <td>${roleBadge}</td>
                <td>
                    ${canEdit ? `
                        <button class="btn-edit-user" onclick="openEditUser('${username}')">Edit</button>
                        ${!isSelf && !isAdminUser ? `<button class="btn-del-user" onclick="deleteUser('${username}')">Hapus</button>` : ''}
                    ` : '<span style="color:#999;font-size:13px;">-</span>'}
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = rows.join('');
}

function openAddUser() {
    get('userFormTitle').textContent = 'Tambah Pengguna';
    get('formUsername').value    = '';
    get('formName').value        = '';
    get('formPassword').value    = '';
    get('formRole').value        = 'kasir';
    get('formUsername').disabled = false;
    get('editingUser').value     = '';

    // Supervisor hanya bisa tambah kasir
    if (currentRole === 'supervisor') {
        get('formRole').value    = 'kasir';
        get('formRole').disabled = true;
    } else {
        get('formRole').disabled = false;
    }

    get('userFormBox').classList.remove('hidden');
    get('formUsername').focus();
}

function openEditUser(username) {
    const users = getUsers();
    const user  = users[username];
    if (!user) return;

    get('userFormTitle').textContent = 'Edit Pengguna: ' + username;
    get('formUsername').value        = username;
    get('formName').value            = user.name;
    get('formPassword').value        = '';
    get('formRole').value            = user.role;
    get('formUsername').disabled     = true;
    get('editingUser').value         = username;

    if (currentRole === 'supervisor') {
        get('formRole').value    = 'kasir';
        get('formRole').disabled = true;
    } else {
        get('formRole').disabled = false;
    }

    get('userFormBox').classList.remove('hidden');
    get('formName').focus();
}

function cancelUserForm() {
    get('userFormBox').classList.add('hidden');
}

function saveUser() {
    const editingUsername = get('editingUser').value;
    const isEdit          = editingUsername !== '';

    const username = isEdit ? editingUsername : get('formUsername').value.trim().toLowerCase();
    const name     = get('formName').value.trim();
    const password = get('formPassword').value;
    const role     = get('formRole').value;
    const users    = getUsers();

    // Validasi
    if (!username)           { showAlert('Username tidak boleh kosong!', 'error');  return; }
    if (!name)               { showAlert('Nama tidak boleh kosong!', 'error');       return; }
    if (!isEdit && !password){ showAlert('Password tidak boleh kosong!', 'error');  return; }
    if (password && password.length < 4) { showAlert('Password minimal 4 karakter!', 'error'); return; }
    if (!isEdit && users[username]) { showAlert('Username sudah ada!', 'error'); return; }

    // Supervisor tidak boleh set role selain kasir
    if (currentRole === 'supervisor' && role !== 'kasir') {
        showAlert('Supervisor hanya bisa kelola kasir!', 'error'); return;
    }

    if (isEdit) {
        users[username].name = name;
        users[username].role = role;
        if (password) users[username].password = password;
        showAlert('Pengguna berhasil diupdate!', 'success');
    } else {
        users[username] = { password, role, name };
        showAlert('Pengguna berhasil ditambahkan!', 'success');
    }

    saveUsers(users);
    get('userFormBox').classList.add('hidden');
    renderUserTable();
}

function deleteUser(username) {
    if (username === currentUser) {
        showAlert('Tidak bisa hapus akun sendiri!', 'error'); return;
    }
    if (!confirm('Hapus pengguna "' + username + '"?')) return;

    const users = getUsers();
    delete users[username];
    saveUsers(users);
    showAlert('Pengguna berhasil dihapus!', 'success');
    renderUserTable();
}

function changeMyPassword() {
    const oldPass  = get('myOldPass').value;
    const newPass  = get('myNewPass').value;
    const confPass = get('myConfPass').value;
    const users    = getUsers();

    if (!oldPass || !newPass || !confPass) { showAlert('Semua field harus diisi!', 'error'); return; }
    if (users[currentUser].password !== oldPass) { showAlert('Password lama salah!', 'error'); return; }
    if (newPass.length < 4) { showAlert('Password baru minimal 4 karakter!', 'error'); return; }
    if (newPass !== confPass) { showAlert('Konfirmasi password tidak cocok!', 'error'); return; }

    users[currentUser].password = newPass;
    saveUsers(users);
    showAlert('Password berhasil diubah!', 'success');
    get('myOldPass').value  = '';
    get('myNewPass').value  = '';
    get('myConfPass').value = '';
}

// =====================
// LOCAL STORAGE
// =====================
function saveTransactions() {
    try { localStorage.setItem('fitunfoun_transactions', JSON.stringify(transactions)); } catch(e) {}
}

function loadTransactions() {
    try {
        const saved = localStorage.getItem('fitunfoun_transactions');
        if (saved) transactions = JSON.parse(saved);
    } catch(e) { transactions = []; }
}
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(express.json());
app.use(cors()); 

// 1. Static Files - PERBAIKAN: Menggunakan path.join(__dirname, 'public')
// Karena app.js dan folder public sejajar, kita tidak perlu '..'
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath)); 

// 2. Rute HTML (Admin & Supervisor)
// Menggunakan path.join agar kompatibel dengan sistem operasi Linux di Render
app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'admin.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(publicPath, 'admin.html'));
});

app.get('/supervisor', (req, res) => {
    res.sendFile(path.join(publicPath, 'supervisor.html'));
});

// 3. Koneksi Database
const mongoURI = "mongodb+srv://fitunfoun2026:Fitun2026@cluster0.p404al7.mongodb.net/supermarket_db?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(mongoURI)
    .then(() => console.log("✅ DATABASE PUSAT AKTIF"))
    .catch(err => console.error("❌ KONEKSI GAGAL:", err.message));


// 4. Definisi Schema Product - PERBAIKAN: Tambahkan 'name'
const productSchema = new mongoose.Schema({
    name: String,   // Tambahkan ini agar cocok dengan web admin
    nama: String,   // Tetap simpan jika script lain pakai ini
    harga: Number,
    stok: Number,
    kategori: String,
    barcode: String
}, { strict: false }); // Tambahkan strict: false agar lebih fleksibel saat pengembangan

// Pastikan model didaftarkan dengan benar
const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

// 5. Definisi Schema Transaksi
const transactionSchema = new mongoose.Schema({
    kasir: String, 
    total: Number, 
    items: Array, 
    waktu: { type: Date, default: Date.now }
});
const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);

// 6. Produk Route
// Pastikan file di ./routes/products.js sudah benar
const productRoutes = require('./routes/products');
app.use('/api/products', productRoutes);

// 7. Login Route
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const users = { admin: "1234", ani: "1111" };
    if (users[username] && users[username] === password) {
        res.json({ success: true, username: username });
    } else {
        res.status(401).json({ success: false, message: "Username/Password salah" });
    }
});

// 8. Transaksi Post Route
app.post('/api/transactions', async (req, res) => {
    try {
        const baru = new Transaction(req.body);
        await baru.save();
        res.status(201).json({ status: "Success" });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

// Port Environment untuk Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server Online di Port ${PORT}`);
    console.log(`📂 Folder statis di: ${publicPath}`);
});
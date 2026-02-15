const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static('public')); 

// Koneksi ke MongoDB Atlas
const mongoURI = "mongodb+srv://fitunfoun2026:Fitun2026@cluster0.p404al7.mongodb.net/supermarket_db?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(mongoURI)
    .then(() => console.log("✅ DATABASE PUSAT AKTIF"))
    .catch(err => console.log("❌ KONEKSI GAGAL:", err));

// Skema Produk
const Product = mongoose.model('Product', new mongoose.Schema({
    name: String, price: Number, stock: Number, barcode: String
}));

// Skema Transaksi
const Transaction = mongoose.model('Transaction', new mongoose.Schema({
    kasir: String, total: Number, items: Array, waktu: { type: Date, default: Date.now }
}));

// API LOGIN
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const users = { admin: "1234", ani: "1111" };
    if (users[username] && users[username] === password) {
        res.json({ success: true, username: username });
    } else {
        res.status(401).json({ success: false, message: "Username atau Password salah" });
    }
});

// API Ambil Produk (Untuk Kasir)
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find().sort({ name: 1 });
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API Update Stok
app.post('/api/products/update-stock', async (req, res) => {
    try {
        const { name, qty } = req.body;
        const product = await Product.findOne({ name: name });
        if (product) {
            product.stock -= qty;
            await product.save();
            res.json({ message: "Stok berhasil dikurangi" });
        } else {
            res.status(404).json({ message: "Produk tidak ditemukan" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- PERBAIKAN: API UNTUK WEB ADMIN/SUPERVISOR ---

// 1. Simpan Transaksi (Dari Kasir)
app.post('/api/transactions', async (req, res) => {
    try {
        const baru = new Transaction(req.body);
        await baru.save();
        res.status(201).json({ status: "Transaksi Terarsip di Pusat", data: baru });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Ambil Semua Transaksi (Untuk Web Admin/Supervisor)
app.get('/api/transactions', async (req, res) => {
    try {
        // Mengambil data terbaru agar muncul di paling atas dashboard
        const transactions = await Transaction.find().sort({ waktu: -1 });
        res.json(transactions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API Simpan Barang Baru
app.post('/api/products/add', async (req, res) => {
    try {
        const baru = new Product(req.body);
        await baru.save();
        res.json({ message: "Barang Berhasil Disimpan" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server Fitun Foun Go-Global di Port ${PORT}`);
});
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

// --- MIDDLEWARE ---
app.use(express.json());
app.use(cors()); // Mengizinkan akses dari aplikasi Electron & Web Admin
app.use(express.static('public')); 

// --- KONEKSI MONGODB ---
const mongoURI = "mongodb+srv://fitunfoun2026:Fitun2026@cluster0.p404al7.mongodb.net/supermarket_db?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(mongoURI)
    .then(() => console.log("✅ DATABASE PUSAT AKTIF"))
    .catch(err => console.log("❌ KONEKSI GAGAL:", err));

// --- SCHEMAS ---
const Product = mongoose.model('Product', new mongoose.Schema({
    name: String, 
    price: Number, 
    stock: Number, 
    barcode: String
}));

const Transaction = mongoose.model('Transaction', new mongoose.Schema({
    kasir: String, 
    total: Number, 
    items: Array, 
    waktu: { type: Date, default: Date.now }
}));

// --- API ROUTES ---

// 1. LOGIN
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const users = { admin: "1234", ani: "1111" };
    if (users[username] && users[username] === password) {
        res.json({ success: true, username: username });
    } else {
        res.status(401).json({ success: false, message: "Username atau Password salah" });
    }
});

// 2. PRODUK (GET, ADD, UPDATE)
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find().sort({ name: 1 });
        res.json(products);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Tambah Barang Baru (Admin)
app.post('/api/products/add', async (req, res) => {
    try {
        const baru = new Product(req.body);
        await baru.save();
        res.json({ message: "Barang Berhasil Ditambah", data: baru });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update Barang/Stok (Admin & Kasir)
app.post('/api/products/update-stock', async (req, res) => {
    try {
        const { name, qty, price, barcode, isFullUpdate } = req.body;
        const product = await Product.findOne({ name: name });
        
        if (product) {
            if (isFullUpdate) {
                // Jika dari Web Admin (Update harga/barcode/stok langsung)
                product.price = price ?? product.price;
                product.stock = qty ?? product.stock;
                product.barcode = barcode ?? product.barcode;
            } else {
                // Jika dari Kasir (Hanya kurangi stok)
                product.stock -= qty;
            }
            await product.save();
            res.json({ message: "Update Berhasil", data: product });
        } else {
            res.status(404).json({ message: "Produk tidak ditemukan" });
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. TRANSAKSI (SAVE & GET)
app.post('/api/transactions', async (req, res) => {
    try {
        const baru = new Transaction(req.body);
        await baru.save();
        res.status(201).json({ status: "Success", data: baru });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/transactions', async (req, res) => {
    try {
        const data = await Transaction.find().sort({ waktu: -1 });
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- SERVER START ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server Fitun Foun Online di Port ${PORT}`);
});
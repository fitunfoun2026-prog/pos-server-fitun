const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// --- MIDDLEWARE ---
app.use(express.json());
app.use(cors()); 

// Arahkan ke folder public (keluar dari src dulu)
app.use(express.static(path.join(__dirname, '../public'))); 

// --- KONEKSI MONGODB ATLAS ---
const mongoURI = "mongodb+srv://fitunfoun2026:Fitun2026@cluster0.p404al7.mongodb.net/supermarket_db?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(mongoURI)
    .then(() => console.log("✅ DATABASE PUSAT AKTIF"))
    .catch(err => console.error("❌ KONEKSI GAGAL:", err.message));

// --- MODELS ---
const Product = mongoose.models.Product || mongoose.model('Product', new mongoose.Schema({
    barcode: String,
    name: { type: String, required: true, unique: true },
    price: Number,
    stock: Number
}));

const Transaction = mongoose.model('Transaction', new mongoose.Schema({
    kasir: String, 
    total: Number, 
    items: Array, 
    waktu: { type: Date, default: Date.now }
}));

// --- API ROUTES ---

// LOGIN
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const users = { admin: "1234", ani: "1111" };
    if (users[username] && users[username] === password) {
        res.json({ success: true, username: username });
    } else {
        res.status(401).json({ success: false, message: "Username atau Password salah" });
    }
});

// PRODUK (Pastikan file src/routes/products.js ada!)
const productRoutes = require('./routes/products'); 
app.use('/api/products', productRoutes);

// TRANSAKSI
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
app.listen(PORT, () => {
    console.log(`🚀 Server Online di Port ${PORT}`);
});
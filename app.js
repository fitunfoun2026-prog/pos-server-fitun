const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// --- MIDDLEWARE ---
app.use(express.json());
app.use(cors()); 
app.use(express.static('public')); 

// --- KONEKSI MONGODB ---
const mongoURI = "mongodb+srv://fitunfoun2026:Fitun2026@cluster0.p404al7.mongodb.net/supermarket_db?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(mongoURI)
    .then(() => console.log("✅ DATABASE PUSAT AKTIF"))
    .catch(err => console.log("❌ KONEKSI GAGAL:", err));

// --- MODELS ---
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

// 2. PRODUK (Menggunakan Route Terpisah)
const productRoutes = require('./routes/products');
app.use('/api/products', productRoutes);

// 3. TRANSAKSI
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
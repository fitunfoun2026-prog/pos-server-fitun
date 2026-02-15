const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); // Penting untuk mengatur alamat folder

const app = express();

// --- MIDDLEWARE ---
app.use(express.json());
app.use(cors()); 

// SOLUSI: Mengarahkan folder statis ke luar folder 'src' agar Render bisa menemukan admin.html
app.use(express.static(path.join(__dirname, '../public'))); 

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
// Karena app.js ada di folder 'src', maka './routes/products' sudah benar
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
// Di Render, lebih aman tidak menuliskan "0.0.0.0" secara manual agar port otomatis terdeteksi
app.listen(PORT, () => {
    console.log(`🚀 Server Fitun Foun Online di Port ${PORT}`);
});
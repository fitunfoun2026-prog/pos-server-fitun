const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(express.json());
app.use(cors()); 

// 1. Agar Render bisa baca folder public yang ada di LUAR folder src
app.use(express.static(path.join(__dirname, '../public'))); 

// 2. RUTE OTOMATIS (Agar tidak perlu ketik .html di browser)
// Jika buka alamat utama (/) langsung ke admin
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// Jika buka /admin
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// Jika buka /supervisor
app.get('/supervisor', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/supervisor.html'));
});

// Koneksi Database
const mongoURI = "mongodb+srv://fitunfoun2026:Fitun2026@cluster0.p404al7.mongodb.net/supermarket_db?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(mongoURI)
    .then(() => console.log("✅ DATABASE PUSAT AKTIF"))
    .catch(err => console.error("❌ KONEKSI GAGAL:", err.message));

// Login Route
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const users = { admin: "1234", ani: "1111" };
    if (users[username] && users[username] === password) {
        res.json({ success: true, username: username });
    } else {
        res.status(401).json({ success: false, message: "Username/Password salah" });
    }
});

// Produk Route - Memanggil file di dalam folder src/routes/
const productRoutes = require('./routes/products');
app.use('/api/products', productRoutes);

// Transaksi Route
const transactionSchema = new mongoose.Schema({
    kasir: String, 
    total: Number, 
    items: Array, 
    waktu: { type: Date, default: Date.now }
});
const Transaction = mongoose.model('Transaction', transactionSchema);

app.post('/api/transactions', async (req, res) => {
    try {
        const baru = new Transaction(req.body);
        await baru.save();
        res.status(201).json({ status: "Success" });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

// Menjalankan Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server Online di Port ${PORT}`);
});
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(express.json());
app.use(cors()); 

// 1. Static Files - Menggunakan path.join agar aman di Render
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath)); 

// 2. Rute HTML (Admin & Supervisor)
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

// 4. Definisi Schema Product
const productSchema = new mongoose.Schema({
    name: String,   
    nama: String,   
    harga: Number,
    stok: Number,
    kategori: String,
    barcode: String
}, { strict: false }); 

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

// 8. Transaksi Post Route - PERBAIKAN: Menambahkan Logika Pengurangan Stok
app.post('/api/transactions', async (req, res) => {
    try {
        const { items, kasir, total } = req.body;

        // Simpan data transaksi ke koleksi transaksi
        const baru = new Transaction({ items, kasir, total });
        await baru.save();

        // Loop untuk mengurangi stok setiap produk yang ada di dalam items
        if (items && items.length > 0) {
            for (const item of items) {
                // Mencari berdasarkan barcode dan mengurangi field 'stok'
                // Pastikan Electron mengirim data 'barcode' dan 'jumlah' (qty)
                await Product.findOneAndUpdate(
                    { barcode: item.barcode },
                    { $inc: { stok: -item.jumlah } } 
                );
            }
        }

        res.status(201).json({ status: "Success", message: "Transaksi berhasil dan stok diperbarui" });
    } catch (err) { 
        console.error("❌ ERROR TRANSAKSI:", err.message);
        res.status(500).json({ error: err.message }); 
    }
});

// Port Environment untuk Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server Online di Port ${PORT}`);
    console.log(`📂 Folder statis di: ${publicPath}`);
});
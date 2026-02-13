const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static('public')); 

// Koneksi ke MongoDB Atlas kamu
const mongoURI = "mongodb+srv://fitunfoun2026:Fitun2026@cluster0.p404al7.mongodb.net/supermarket_db?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(mongoURI)
    .then(() => console.log("✅ DATABASE PUSAT AKTIF"))
    .catch(err => console.log("❌ KONEKSI GAGAL:", err));

// Skema Produk (Ada Barcode)
const Product = mongoose.model('Product', new mongoose.Schema({
    name: String, price: Number, stock: Number, barcode: String
}));

// Skema Transaksi
const Transaction = mongoose.model('Transaction', new mongoose.Schema({
    kasir: String, total: Number, items: Array, waktu: { type: Date, default: Date.now }
}));

// API Ambil Produk
app.get('/api/products', async (req, res) => {
    const products = await Product.find().sort({ name: 1 });
    res.json(products);
});

// API Simpan Barang Baru
app.post('/api/products', async (req, res) => {
    const baru = new Product(req.body);
    await baru.save();
    res.json({ message: "Barang Berhasil Disimpan" });
});

// API Sinkronisasi Transaksi (Ini yang bikin kayak Indomaret)
app.post('/api/transactions/sync', async (req, res) => {
    try {
        const data = req.body;
        if (Array.isArray(data)) {
            await Transaction.insertMany(data);
        } else {
            await new Transaction(data).save();
        }
        res.status(201).json({ status: "Terarsip di Pusat" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server Fitun Foun Go-Global di Port ${PORT}`);
});
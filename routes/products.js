const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Mengambil model Product yang sudah didefinisikan di app.js
const Product = mongoose.models.Product || mongoose.model('Product');

// 1. AMBIL SEMUA PRODUK (Untuk Admin & Supervisor)
router.get('/', async (req, res) => {
    try {
        const products = await Product.find().sort({ name: 1 });
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 2. TAMBAH ATAU UPDATE BARANG (Lengkap dengan Harga Modal & Kategori)
router.post('/update-stock', async (req, res) => {
    try {
        const { name, qty, price, barcode, costPrice, category, isFullUpdate } = req.body;

        if (isFullUpdate) {
            // Gunakan barcode sebagai acuan utama agar data tidak duplikat
            const result = await Product.findOneAndUpdate(
                { barcode: barcode }, 
                { 
                    barcode, 
                    name, 
                    price: Number(price), 
                    stock: Number(qty),
                    costPrice: Number(costPrice || 0), 
                    category: category || "Umum"
                },
                { upsert: true, new: true }
            );
            return res.json({ success: true, data: result });
        } else {
            // Logika pengurangan stok saat kasir jualan
            const product = await Product.findOne({ barcode: barcode });
            if (product) {
                product.stock -= qty;
                await product.save();
                return res.json({ success: true, newStock: product.stock });
            }
            return res.status(404).json({ message: "Barang tidak ditemukan" });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 3. HAPUS BARANG (Penting untuk Admin)
router.delete('/:barcode', async (req, res) => {
    try {
        await Product.findOneAndDelete({ barcode: req.params.barcode });
        res.json({ success: true, message: "Barang berhasil dihapus" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
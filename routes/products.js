const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Gunakan model yang sudah ada
const Product = mongoose.models.Product || mongoose.model('Product');

// Ambil semua produk
router.get('/', async (req, res) => {
    try {
        const products = await Product.find().sort({ name: 1 });
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update atau Tambah Stok
router.post('/update-stock', async (req, res) => {
    try {
        const { name, qty, price, barcode, isFullUpdate } = req.body;

        if (isFullUpdate) {
            const result = await Product.findOneAndUpdate(
                { name: name },
                { barcode, name, price: Number(price), stock: Number(qty) },
                { upsert: true, new: true }
            );
            return res.json({ success: true, data: result });
        } else {
            const product = await Product.findOne({ name });
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

module.exports = router;
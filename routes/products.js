const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Product = mongoose.models.Product || mongoose.model('Product');

// [GET] Ambil Semua Data Produk
router.get('/', async (req, res) => {
    try {
        const products = await Product.find().sort({ name: 1 });
        res.json(products);
    } catch (err) { res.status(500).json({ status: "error", message: err.message }); }
});

// [POST] Simpan/Update Produk (Full Logic)
router.post('/update-stock', async (req, res) => {
    try {
        const { barcode, name, category, qty, costPrice, price, isFullUpdate } = req.body;
        
        if (isFullUpdate) {
            // Logika Update Master Data (Admin)
            const result = await Product.findOneAndUpdate(
                { barcode: barcode },
                { 
                    name, 
                    category: category || "Umum", 
                    stock: Number(qty), 
                    costPrice: Number(costPrice), 
                    price: Number(price),
                    lastUpdate: new Date()
                },
                { upsert: true, new: true }
            );
            return res.json({ status: "success", data: result });
        } else {
            // Logika Pengurangan Stok (Kasir)
            const product = await Product.findOne({ barcode });
            if (product) {
                product.stock -= Number(qty);
                await product.save();
                return res.json({ status: "success" });
            }
            return res.status(404).json({ message: "Produk tidak ditemukan" });
        }
    } catch (err) { res.status(500).json({ status: "error", message: err.message }); }
});

// [DELETE] Hapus Produk
router.delete('/:barcode', async (req, res) => {
    try {
        await Product.findOneAndDelete({ barcode: req.params.barcode });
        res.json({ status: "success" });
    } catch (err) { res.status(500).json({ status: "error" }); }
});

module.exports = router;
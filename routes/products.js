const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Product = mongoose.models.Product || mongoose.model('Product');

// 1. AMBIL SEMUA PRODUK (Dengan Pencarian & Filter)
router.get('/', async (req, res) => {
    try {
        const { search, category } = req.query;
        let query = {};
        if (search) query.name = { $regex: search, $options: 'i' };
        if (category && category !== 'Semua') query.category = category;
        
        const products = await Product.find(query).sort({ name: 1 });
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 2. ADMIN: UPDATE MASTER DATA (Harga & Identitas)
router.post('/master-update', async (req, res) => {
    try {
        const { barcode, name, price, costPrice, category, stock, minStock } = req.body;
        const result = await Product.findOneAndUpdate(
            { barcode: barcode }, 
            { 
                barcode, 
                name, 
                price: Number(price), 
                costPrice: Number(costPrice), 
                category,
                stock: Number(stock),
                minStock: Number(minStock || 10)
            },
            { upsert: true, new: true }
        );
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 3. SUPERVISOR: TAMBAH STOK (Barang Datang)
router.post('/add-stock', async (req, res) => {
    try {
        const { barcode, qtyTambah } = req.body;
        const product = await Product.findOne({ barcode });
        if (product) {
            product.stock += Number(qtyTambah);
            await product.save();
            return res.json({ success: true, newStock: product.stock });
        }
        res.status(404).json({ message: "Barang tidak ditemukan" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 4. ADMIN: HAPUS PRODUK
router.delete('/:barcode', async (req, res) => {
    try {
        await Product.findOneAndDelete({ barcode: req.params.barcode });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
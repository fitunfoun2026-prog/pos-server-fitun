const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Product = mongoose.models.Product || mongoose.model('Product', new mongoose.Schema({
    barcode: String,
    name: String,
    category: String,
    stock: Number,
    costPrice: Number,
    price: Number,
    supplier: String,
    tax: Number, // PPN dalam %
    wastage: { type: Number, default: 0 }, // Barang rusak
    lastUpdated: { type: Date, default: Date.now }
}));

// GET ALL
router.get('/', async (req, res) => {
    try {
        const products = await Product.find().sort({ name: 1 });
        res.json(products);
    } catch (err) { res.status(500).json({ status: "error", message: err.message }); }
});

// MASTER UPDATE (ADMIN & SUPERVISOR VALIDATION)
router.post('/update-stock', async (req, res) => {
    try {
        const { barcode, name, category, qty, costPrice, price, supplier, tax, isFullUpdate } = req.body;
        
        if (isFullUpdate) {
            const result = await Product.findOneAndUpdate(
                { barcode: barcode },
                { 
                    name, category, supplier,
                    stock: Number(qty), 
                    costPrice: Number(costPrice), 
                    price: Number(price),
                    tax: Number(tax || 11),
                    lastUpdated: new Date()
                },
                { upsert: true, new: true }
            );
            return res.json({ status: "success", data: result });
        } else {
            const product = await Product.findOne({ barcode });
            if (product) {
                product.stock -= Number(qty);
                await product.save();
                return res.json({ status: "success" });
            }
            return res.status(404).json({ message: "Produk tidak terdaftar" });
        }
    } catch (err) { res.status(500).json({ status: "error" }); }
});

// LOG WASTAGE (BARANG RUSAK/EXPIRED)
router.post('/wastage', async (req, res) => {
    const { barcode, qty } = req.body;
    const product = await Product.findOne({ barcode });
    if (product) {
        product.stock -= Number(qty);
        product.wastage += Number(qty);
        await product.save();
        res.json({ status: "success" });
    }
});

router.delete('/:barcode', async (req, res) => {
    await Product.findOneAndDelete({ barcode: req.params.barcode });
    res.json({ status: "success" });
});

module.exports = router;
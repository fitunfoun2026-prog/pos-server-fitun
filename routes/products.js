const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Product = mongoose.models.Product || mongoose.model('Product');

// GET ALL PRODUCTS
router.get('/', async (req, res) => {
    try {
        const products = await Product.find().sort({ name: 1 });
        res.json(products);
    } catch (err) { res.status(500).json({ status: "error", message: err.message }); }
});

// CREATE OR UPDATE (MASTER DATA)
router.post('/update-stock', async (req, res) => {
    try {
        const { barcode, name, category, qty, costPrice, price, isFullUpdate } = req.body;
        if (isFullUpdate) {
            const result = await Product.findOneAndUpdate(
                { barcode: barcode },
                { name, category, stock: Number(qty), costPrice: Number(costPrice), price: Number(price) },
                { upsert: true, new: true }
            );
            return res.json({ status: "success", data: result });
        } else {
            // Pengurangan stok otomatis dari kasir
            const product = await Product.findOne({ barcode });
            if (product) {
                product.stock -= Number(qty);
                await product.save();
                return res.json({ status: "success", newStock: product.stock });
            }
            return res.status(404).json({ message: "Produk tidak ada" });
        }
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE PRODUCT
router.delete('/:barcode', async (req, res) => {
    try {
        await Product.findOneAndDelete({ barcode: req.params.barcode });
        res.json({ status: "success" });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Product = mongoose.models.Product || mongoose.model('Product', new mongoose.Schema({
    barcode: { type: String, unique: true },
    name: String,
    category: String,
    stock: { type: Number, default: 0 },
    costPrice: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
    supplier: String,
    tax: { type: Number, default: 11 },
    wastage: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
}));

// GET ALL PRODUCTS
router.get('/', async (req, res) => {
    try {
        const products = await Product.find().sort({ name: 1 });
        res.json(products);
    } catch (err) { res.status(500).json({ status: "error", message: err.message }); }
});

// UPDATE MASTER & STOCK (Dipakai Admin & Supervisor)
router.post('/update-stock', async (req, res) => {
    try {
        const { barcode, name, category, qty, costPrice, price, supplier, tax, isFullUpdate } = req.body;
        
        if (isFullUpdate) {
            // Jika Admin mengupdate katalog atau Supervisor melakukan Stock Opname
            const updateData = {
                lastUpdated: new Date()
            };
            if(name) updateData.name = name;
            if(category) updateData.category = category;
            if(supplier) updateData.supplier = supplier;
            if(qty !== undefined) updateData.stock = Number(qty);
            if(costPrice) updateData.costPrice = Number(costPrice);
            if(price) updateData.price = Number(price);
            if(tax) updateData.tax = Number(tax);

            const result = await Product.findOneAndUpdate(
                { barcode: barcode },
                { $set: updateData },
                { upsert: true, new: true }
            );
            return res.json({ status: "success", data: result });
        } else {
            // Jika pengurangan stok otomatis dari Kasir
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

// LOG WASTAGE (Barang Rusak)
router.post('/wastage', async (req, res) => {
    try {
        const { barcode, qty } = req.body;
        const product = await Product.findOne({ barcode });
        if (product) {
            product.stock -= Number(qty);
            product.wastage += Number(qty);
            await product.save();
            return res.json({ status: "success" });
        }
        res.status(404).json({ message: "Barcode tidak ditemukan" });
    } catch (err) { res.status(500).json({ status: "error" }); }
});

// DELETE PRODUCT
router.delete('/:barcode', async (req, res) => {
    try {
        await Product.findOneAndDelete({ barcode: req.params.barcode });
        res.json({ status: "success" });
    } catch (err) { res.status(500).json({ status: "error" }); }
});

module.exports = router;
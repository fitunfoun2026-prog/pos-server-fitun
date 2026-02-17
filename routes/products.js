const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    barcode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    category: String,
    stock: { type: Number, default: 0 },
    costPrice: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
    supplier: String,
    tax: { type: Number, default: 11 },
    wastage: { type: Number, default: 0 },
    minStock: { type: Number, default: 10 },
    lastUpdated: { type: Date, default: Date.now }
});

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

/* =========================
   GET ALL PRODUCTS
========================= */
router.get('/', async (req, res) => {
    try {
        const products = await Product.find().sort({ name: 1 });
        res.json(products);
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});

/* =========================
   LOW STOCK ALERT
========================= */
router.get('/low-stock', async (req, res) => {
    try {
        const products = await Product.find({ $expr: { $lt: ["$stock", "$minStock"] } });
        res.json(products);
    } catch (err) {
        res.status(500).json({ status: "error" });
    }
});

/* =========================
   UPDATE MASTER & STOCK
========================= */
router.post('/update-stock', async (req, res) => {
    try {
        const {
            barcode,
            name,
            category,
            qty,
            costPrice,
            price,
            supplier,
            tax,
            minStock,
            isFullUpdate
        } = req.body;

        if (!barcode) {
            return res.status(400).json({ message: "Barcode wajib diisi" });
        }

        if (isFullUpdate) {
            const updateData = { lastUpdated: new Date() };

            if (name) updateData.name = name;
            if (category) updateData.category = category;
            if (supplier) updateData.supplier = supplier;
            if (qty !== undefined) updateData.stock = Number(qty);
            if (costPrice !== undefined) updateData.costPrice = Number(costPrice);
            if (price !== undefined) updateData.price = Number(price);
            if (tax !== undefined) updateData.tax = Number(tax);
            if (minStock !== undefined) updateData.minStock = Number(minStock);

            const result = await Product.findOneAndUpdate(
                { barcode },
                { $set: updateData },
                { upsert: true, new: true }
            );

            return res.json({ status: "success", data: result });
        } else {
            const product = await Product.findOne({ barcode });

            if (!product) {
                return res.status(404).json({ message: "Produk tidak ditemukan" });
            }

            const pengurangan = Number(qty);
            if (product.stock < pengurangan) {
                return res.status(400).json({ message: "Stok tidak mencukupi" });
            }

            product.stock -= pengurangan;
            product.lastUpdated = new Date();
            await product.save();

            return res.json({ status: "success" });
        }

    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});

/* =========================
   WASTAGE
========================= */
router.post('/wastage', async (req, res) => {
    try {
        const { barcode, qty } = req.body;

        if (!barcode || !qty) {
            return res.status(400).json({ message: "Data tidak lengkap" });
        }

        const product = await Product.findOne({ barcode });
        if (!product) {
            return res.status(404).json({ message: "Produk tidak ditemukan" });
        }

        const jumlah = Number(qty);
        if (product.stock < jumlah) {
            return res.status(400).json({ message: "Stok tidak cukup" });
        }

        product.stock -= jumlah;
        product.wastage += jumlah;
        product.lastUpdated = new Date();
        await product.save();

        res.json({ status: "success" });

    } catch (err) {
        res.status(500).json({ status: "error" });
    }
});

/* =========================
   DELETE PRODUCT
========================= */
router.delete('/:barcode', async (req, res) => {
    try {
        await Product.findOneAndDelete({ barcode: req.params.barcode });
        res.json({ status: "success" });
    } catch (err) {
        res.status(500).json({ status: "error" });
    }
});

module.exports = router;

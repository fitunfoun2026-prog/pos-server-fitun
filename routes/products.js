const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Product = mongoose.models.Product || mongoose.model(
    'Product',
    new mongoose.Schema({
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
    })
);

/* =====================
   GET ALL PRODUCTS
===================== */
router.get('/', async (req, res) => {
    try {
        const products = await Product.find().sort({ name: 1 });
        res.json(products);
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});

/* =====================
   UPDATE MASTER & STOCK
===================== */
router.post('/update-stock', async (req, res) => {
    try {
        const {
            barcode, name, category, qty,
            costPrice, price, supplier, tax, isFullUpdate
        } = req.body;

        if (!barcode) {
            return res.status(400).json({ message: "Barcode wajib diisi" });
        }

        if (isFullUpdate) {
            // ADMIN / SUPERVISOR UPDATE
            const updateData = { lastUpdated: new Date() };
            if (name !== undefined)      updateData.name = name;
            if (category !== undefined)  updateData.category = category;
            if (supplier !== undefined)  updateData.supplier = supplier;
            if (qty !== undefined)       updateData.stock = Number(qty);
            if (costPrice !== undefined) updateData.costPrice = Number(costPrice);
            if (price !== undefined)     updateData.price = Number(price);
            if (tax !== undefined)       updateData.tax = Number(tax);

            const result = await Product.findOneAndUpdate(
                { barcode },
                { $set: updateData },
                { upsert: true, new: true }
            );

            // 🔴 Broadcast update produk ke semua client
            const io = req.app.get('io');
            if (io) {
                io.emit('produk_update', {
                    type: 'update',
                    barcode: result.barcode,
                    name: result.name,
                    stock: result.stock,
                    price: result.price,
                    category: result.category
                });
                // Trigger reload semua produk di client
                io.emit('stok_update', { trigger: 'admin_edit', barcode });
            }

            return res.json({ status: "success", data: result });

        } else {
            // KASIR – PENGURANGAN STOK
            const product = await Product.findOne({ barcode });
            if (!product) {
                return res.status(404).json({ message: "Produk tidak ditemukan" });
            }

            const jumlah = Number(qty) || 0;
            if (product.stock < jumlah) {
                return res.status(400).json({ message: "Stok tidak mencukupi" });
            }

            product.stock -= jumlah;
            product.lastUpdated = new Date();
            await product.save();

            // 🔴 Broadcast update stok ke semua client
            const io = req.app.get('io');
            if (io) {
                io.emit('stok_update', {
                    trigger: 'kasir',
                    barcode,
                    stockBaru: product.stock
                });
            }

            return res.json({ status: "success" });
        }

    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});

/* =====================
   WASTAGE (BARANG RUSAK)
===================== */
router.post('/wastage', async (req, res) => {
    try {
        const { barcode, qty } = req.body;

        if (!barcode || !qty) {
            return res.status(400).json({ message: "Data tidak lengkap" });
        }

        const product = await Product.findOne({ barcode });
        if (!product) {
            return res.status(404).json({ message: "Barcode tidak ditemukan" });
        }

        const jumlah = Number(qty);
        if (product.stock < jumlah) {
            return res.status(400).json({ message: "Stok tidak cukup untuk wastage" });
        }

        product.stock -= jumlah;
        product.wastage += jumlah;
        product.lastUpdated = new Date();
        await product.save();

        // 🔴 Broadcast wastage ke semua client
        const io = req.app.get('io');
        if (io) {
            io.emit('wastage_update', {
                barcode,
                nama: product.name,
                qty: jumlah,
                stockBaru: product.stock,
                totalWastage: product.wastage
            });
            io.emit('stok_update', { trigger: 'wastage', barcode });
        }

        return res.json({ status: "success" });

    } catch (err) {
        res.status(500).json({ status: "error" });
    }
});

/* =====================
   DELETE PRODUCT
===================== */
router.delete('/:barcode', async (req, res) => {
    try {
        const deleted = await Product.findOneAndDelete({ barcode: req.params.barcode });

        // 🔴 Broadcast hapus produk ke semua client
        const io = req.app.get('io');
        if (io && deleted) {
            io.emit('produk_update', {
                type: 'delete',
                barcode: req.params.barcode
            });
        }

        res.json({ status: "success" });
    } catch (err) {
        res.status(500).json({ status: "error" });
    }
});

module.exports = router;

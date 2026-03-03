const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  barcode:     { type: String, required: true, unique: true },
  name:        { type: String, required: true },
  category:    { type: String, default: 'Umum' },
  stock:       { type: Number, default: 0 },
  costPrice:   { type: Number, default: 0 },
  price:       { type: Number, default: 0 },
  supplier:    { type: String, default: '' },
  tax:         { type: Number, default: 11 },
  wastage:     { type: Number, default: 0 },
  expiredDate: { type: Date, default: null },
  expiredNote: { type: String, default: '' },
  lastUpdated: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', productSchema);

// GET semua produk
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({}).sort({ name: 1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil data produk', error: err.message });
  }
});

// POST update-stock (tambah/edit produk + support expiredDate)
router.post('/update-stock', async (req, res) => {
  try {
    const { barcode, name, category, costPrice, price, supplier, qty, tax, isFullUpdate, expiredDate, expiredNote } = req.body;
    if (!barcode || !name) return res.status(400).json({ message: 'Barcode dan nama produk wajib diisi' });

    const updateData = {
      name,
      category:  category  || 'Umum',
      costPrice: Number(costPrice) || 0,
      price:     Number(price)     || 0,
      supplier:  supplier  || '',
      tax:       Number(tax) || 11,
      lastUpdated: new Date()
    };

    // Field expired
    if (expiredDate !== undefined) updateData.expiredDate = expiredDate ? new Date(expiredDate) : null;
    if (expiredNote !== undefined) updateData.expiredNote = expiredNote || '';

    if (isFullUpdate) {
      updateData.stock = Number(qty) || 0;
      const product = await Product.findOneAndUpdate({ barcode }, { $set: updateData }, { upsert: true, new: true });
      const io = req.app.get('io');
      if (io) io.emit('produk_update', { barcode, name, stock: product.stock });
      return res.json({ message: 'Produk berhasil disimpan', product });
    } else {
      const product = await Product.findOneAndUpdate(
        { barcode },
        { $set: updateData, $inc: { stock: Number(qty) || 0 } },
        { upsert: true, new: true }
      );
      const io = req.app.get('io');
      if (io) io.emit('stok_update', { barcode, name, stock: product.stock });
      return res.json({ message: 'Stok berhasil diupdate', product });
    }
  } catch (err) {
    res.status(500).json({ message: 'Gagal update produk', error: err.message });
  }
});

// POST wastage
router.post('/wastage', async (req, res) => {
  try {
    const { barcode, qty } = req.body;
    if (!barcode || !qty || qty <= 0) return res.status(400).json({ message: 'Data tidak valid' });
    const product = await Product.findOne({ barcode });
    if (!product) return res.status(404).json({ message: 'Produk tidak ditemukan' });
    if (qty > product.stock) return res.status(400).json({ message: `Stok tidak cukup. Tersedia: ${product.stock}` });
    product.stock -= Number(qty);
    product.wastage = (product.wastage || 0) + Number(qty);
    product.lastUpdated = new Date();
    await product.save();
    const io = req.app.get('io');
    if (io) io.emit('wastage_update', { barcode, nama: product.name, qty });
    res.json({ message: `Wastage ${product.name}: ${qty} unit berhasil dilaporkan`, product });
  } catch (err) {
    res.status(500).json({ message: 'Gagal melaporkan wastage', error: err.message });
  }
});

// DELETE produk
router.delete('/:barcode', async (req, res) => {
  try {
    const { barcode } = req.params;
    const deleted = await Product.findOneAndDelete({ barcode });
    if (!deleted) return res.status(404).json({ message: 'Produk tidak ditemukan' });
    const io = req.app.get('io');
    if (io) io.emit('produk_update', { barcode, deleted: true });
    res.json({ message: 'Produk berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ message: 'Gagal menghapus produk', error: err.message });
  }
});

module.exports = router;

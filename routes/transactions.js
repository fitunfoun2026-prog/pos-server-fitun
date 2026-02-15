const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../data/transactions.json');

// Helper untuk memastikan folder data ada
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

router.get('/', (req, res) => {
    try {
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify([]));
            return res.json([]);
        }
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: "Gagal membaca data transaksi" });
    }
});

router.post('/', (req, res) => {
    try {
        const transaksi = req.body;

        // Validasi data masuk
        if (!transaksi.items || transaksi.items.length === 0) {
            return res.status(400).json({ message: 'Transaksi kosong' });
        }

        // Membaca data lama dengan lebih aman
        let data = [];
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            data = content ? JSON.parse(content) : [];
        }

        // Menyusun data transaksi akhir
        const dataFinal = {
            id: Date.now(),
            kasir: transaksi.kasir || "Unknown",
            total: transaksi.total || 0,
            items: transaksi.items,
            createdAt: new Date().toISOString()
        };

        data.push(dataFinal);

        // Simpan ke file
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        
        console.log("Transaksi baru tersimpan dari kasir:", dataFinal.kasir);
        res.json({ message: 'Transaksi tersimpan', data: dataFinal });

    } catch (error) {
        console.error("Error Post Transaksi:", error);
        res.status(500).json({ message: "Gagal menyimpan transaksi" });
    }
});

module.exports = router;
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// =============================================
// SOCKET.IO - Real-time untuk semua client
// =============================================
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// Export io supaya bisa dipakai di routes
app.set('io', io);

io.on('connection', (socket) => {
    console.log('🟢 Client terhubung:', socket.id);
    socket.on('disconnect', () => {
        console.log('🔴 Client disconnect:', socket.id);
    });
});

// =============================================
// MIDDLEWARE
// =============================================
app.use(express.json());
app.use(cors());

// =============================================
// STATIC FILES
// =============================================
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// =============================================
// RUTE HTML
// =============================================
app.get('/', (req, res) => res.sendFile(path.join(publicPath, 'admin.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(publicPath, 'admin.html')));
app.get('/supervisor', (req, res) => res.sendFile(path.join(publicPath, 'supervisor.html')));

// =============================================
// KONEKSI DATABASE
// =============================================
const mongoURI = "mongodb+srv://fitunfoun2026:Fitun2026@cluster0.p404al7.mongodb.net/supermarket_db?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(mongoURI)
    .then(() => console.log("✅ DATABASE PUSAT AKTIF"))
    .catch(err => console.error("❌ KONEKSI GAGAL:", err.message));

// =============================================
// SCHEMA TRANSAKSI (MongoDB - bukan file JSON)
// =============================================
const transactionSchema = new mongoose.Schema({
    kasir: { type: String, default: 'Unknown' },
    total: { type: Number, default: 0 },
    items: { type: Array, default: [] },
    waktu: { type: Date, default: Date.now }
});
const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);

// =============================================
// PRODUCT ROUTES (dari routes/products.js)
// =============================================
const productRoutes = require('./routes/products');
app.use('/api/products', productRoutes);

// =============================================
// LOGIN ROUTE
// =============================================
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const users = { admin: "1234", ani: "1111" };
    if (users[username] && users[username] === password) {
        res.json({ success: true, username });
    } else {
        res.status(401).json({ success: false, message: "Username/Password salah" });
    }
});

// =============================================
// GET TRANSAKSI - Ambil dari MongoDB
// =============================================
app.get('/api/transactions', async (req, res) => {
    try {
        const transactions = await Transaction.find().sort({ waktu: 1 });
        res.json(transactions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =============================================
// POST TRANSAKSI - Simpan ke MongoDB + Socket
// =============================================
app.post('/api/transactions', async (req, res) => {
    try {
        const { items, kasir, total } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ message: "Transaksi kosong" });
        }

        // Simpan transaksi ke MongoDB
        const baru = new Transaction({ items, kasir, total });
        await baru.save();

        // Potong stok otomatis
        const Product = mongoose.model('Product');
        for (const item of items) {
            await Product.findOneAndUpdate(
                { $or: [{ barcode: item.barcode }, { nama: item.nama }, { name: item.nama }] },
                { $inc: { stock: -(item.qty || 0), stok: -(item.qty || 0) } }
            );
        }

        // 🔴 Broadcast ke semua client (Admin, Supervisor, Electron)
        const io = req.app.get('io');
        io.emit('transaksi_baru', {
            _id: baru._id,
            kasir: baru.kasir,
            total: baru.total,
            items: baru.items,
            waktu: baru.waktu
        });

        // Trigger refresh stok ke semua client
        io.emit('stok_update', { trigger: 'transaksi', kasir });

        res.status(201).json({ status: "success", message: "Transaksi & Stok Terupdate" });

    } catch (err) {
        console.error("❌ ERROR TRANSAKSI:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// =============================================
// START SERVER
// =============================================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server Online di Port ${PORT}`);
    console.log(`📡 Socket.IO Real-time Aktif`);
});

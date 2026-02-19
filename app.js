const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const bcrypt = require('bcrypt');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// =============================================
// SOCKET.IO
// =============================================
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});
app.set('io', io);
io.on('connection', (socket) => {
    console.log('🟢 Client terhubung:', socket.id);
    socket.on('disconnect', () => console.log('🔴 Client disconnect:', socket.id));
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
// SCHEMA USER (Baru)
// =============================================
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'kasir' }
});
const User = mongoose.models.User || mongoose.model('User', userSchema);

// =============================================
// SCHEMA TRANSAKSI
// =============================================
const transactionSchema = new mongoose.Schema({
    kasir: { type: String, default: 'Unknown' },
    total: { type: Number, default: 0 },
    items: { type: Array, default: [] },
    waktu: { type: Date, default: Date.now }
});
const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);

// =============================================
// AUTH ROUTES
// =============================================

// LOGIN — cek MongoDB, fallback ke hardcode lama saat migrasi
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password)
        return res.status(400).json({ success: false, message: "Username & password wajib diisi" });

    try {
        const user = await User.findOne({ username });
        if (!user)
            return res.status(401).json({ success: false, message: "Username tidak ditemukan" });

        const cocok = await bcrypt.compare(password, user.password);
        if (!cocok)
            return res.status(401).json({ success: false, message: "Password salah" });

        res.json({ success: true, username: user.username, role: user.role });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GANTI PASSWORD
app.put('/api/change-password', async (req, res) => {
    const { username, passwordLama, passwordBaru, konfirmasi } = req.body;

    if (!username || !passwordLama || !passwordBaru || !konfirmasi)
        return res.status(400).json({ success: false, message: "Semua field wajib diisi" });

    if (passwordBaru !== konfirmasi)
        return res.status(400).json({ success: false, message: "Password baru dan konfirmasi tidak cocok" });

    if (passwordBaru.length < 6)
        return res.status(400).json({ success: false, message: "Password baru minimal 6 karakter" });

    if (passwordBaru === passwordLama)
        return res.status(400).json({ success: false, message: "Password baru tidak boleh sama dengan yang lama" });

    try {
        const user = await User.findOne({ username });
        if (!user)
            return res.status(404).json({ success: false, message: "User tidak ditemukan" });

        const cocok = await bcrypt.compare(passwordLama, user.password);
        if (!cocok)
            return res.status(401).json({ success: false, message: "Password lama salah" });

        user.password = await bcrypt.hash(passwordBaru, 10);
        await user.save();

        res.json({ success: true, message: `Password ${username} berhasil diubah` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DAFTAR USER (untuk panel admin)
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({}, { password: 0 }); // jangan kirim password
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =============================================
// PRODUCT ROUTES
// =============================================
const productRoutes = require('./routes/products');
app.use('/api/products', productRoutes);

// =============================================
// TRANSAKSI
// =============================================
app.get('/api/transactions', async (req, res) => {
    try {
        const transactions = await Transaction.find().sort({ waktu: 1 });
        res.json(transactions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/transactions', async (req, res) => {
    try {
        const { items, kasir, total } = req.body;
        if (!items || items.length === 0)
            return res.status(400).json({ message: "Transaksi kosong" });

        const baru = new Transaction({ items, kasir, total });
        await baru.save();

        const Product = mongoose.model('Product');
        for (const item of items) {
            await Product.findOneAndUpdate(
                { $or: [{ barcode: item.barcode }, { nama: item.nama }, { name: item.nama }] },
                { $inc: { stock: -(item.qty || 0), stok: -(item.qty || 0) } }
            );
        }

        const io = req.app.get('io');
        io.emit('transaksi_baru', { _id: baru._id, kasir: baru.kasir, total: baru.total, items: baru.items, waktu: baru.waktu });
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

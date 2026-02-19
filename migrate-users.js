// =============================================
// JALANKAN SEKALI: node migrate-users.js
// Memindahkan user hardcode ke MongoDB dengan bcrypt
// =============================================

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const mongoURI = "mongodb+srv://fitunfoun2026:Fitun2026@cluster0.p404al7.mongodb.net/supermarket_db?retryWrites=true&w=majority&appName=Cluster0";

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'kasir' }
});
const User = mongoose.model('User', userSchema);

// ⚠️ Sesuaikan daftar ini dengan user yang ada di sistem kamu
const usersLama = [
    { username: "admin",      password: "1234",          role: "admin" },
    { username: "supervisor", password: "supervisor123",  role: "supervisor" },
    { username: "ani",        password: "1111",           role: "kasir" },
];

async function migrasi() {
    await mongoose.connect(mongoURI);
    console.log("✅ Terhubung ke MongoDB\n");

    for (const u of usersLama) {
        const sudahAda = await User.findOne({ username: u.username });
        if (sudahAda) {
            console.log(`⚠️  User "${u.username}" sudah ada — dilewati`);
            continue;
        }
        const hashed = await bcrypt.hash(u.password, 10);
        await User.create({ username: u.username, password: hashed, role: u.role });
        console.log(`✅ User "${u.username}" (${u.role}) berhasil dipindahkan`);
    }

    console.log("\n🎉 Migrasi selesai! Sekarang semua password ada di MongoDB.");
    process.exit(0);
}

migrasi().catch(err => {
    console.error("❌ Error:", err.message);
    process.exit(1);
});

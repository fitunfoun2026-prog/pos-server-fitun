/**
 * script.js - Kasir Fitun Foun
 * Sistem Offline-First: tetap jalan meski internet mati
 * Sync otomatis saat internet kembali
 */

let items = [];
let total = 0;
let sudahBayar = false;
let sudahOK = false;
let confirmOpen = false;
let currentUser = "";
let isOnline = navigator.onLine;
let settingNota = null;

const BASE_URL = "https://pos-server-fitun.onrender.com";
const $ = id => document.getElementById(id);

function formatUSD(x) {
  return Number(x).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/* ================================================
   STATUS ONLINE / OFFLINE
================================================ */
function updateStatusOnline(online) {
  isOnline = online;
  const dot = $("statusDot");
  const teks = $("statusTeks");
  const bar = $("offlineBanner");
  const queueInfo = $("queueInfo");

  if (online) {
    dot.style.background = "#00ff88";
    dot.style.boxShadow = "0 0 8px #00ff88";
    teks.innerText = "ONLINE";
    teks.style.color = "#00ff88";
    if (bar) bar.style.display = "none";
  } else {
    dot.style.background = "#ff4444";
    dot.style.boxShadow = "0 0 8px #ff4444";
    teks.innerText = "OFFLINE";
    teks.style.color = "#ff4444";
    if (bar) bar.style.display = "flex";
  }

  const jml = Storage.jumlahQueue();
  if (queueInfo) {
    queueInfo.innerText = jml > 0 ? `${jml} transaksi menunggu sync` : "";
    queueInfo.style.color = jml > 0 ? "#ffaa00" : "#00ff88";
  }
}

window.addEventListener("online", () => {
  updateStatusOnline(true);
  showNotif("🌐 Internet kembali! Sinkronisasi dimulai...", "success");
  sinkronisasiOtomatis();
  loadSettingNota();
});

window.addEventListener("offline", () => {
  updateStatusOnline(false);
  showNotif("📴 Internet mati. Mode Offline aktif — transaksi tetap bisa jalan!", "warning");
});

/* ================================================
   NOTIFIKASI TOAST
================================================ */
function showNotif(pesan, tipe = "info") {
  let container = $("notifContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "notifContainer";
    container.style.cssText = `
      position: fixed; top: 14px; right: 14px; z-index: 9999;
      display: flex; flex-direction: column; gap: 8px; max-width: 320px;
    `;
    document.body.appendChild(container);
  }

  const warna = {
    success: { bg: "#064e3b", border: "#00ff88", icon: "✅" },
    warning: { bg: "#78350f", border: "#ffaa00", icon: "⚠️" },
    error:   { bg: "#7f1d1d", border: "#ff4444", icon: "❌" },
    info:    { bg: "#1e3a5f", border: "#38bdf8", icon: "ℹ️" },
    sync:    { bg: "#1e3a5f", border: "#a78bfa", icon: "🔄" }
  }[tipe] || { bg: "#1e293b", border: "#64748b", icon: "ℹ️" };

  const el = document.createElement("div");
  el.style.cssText = `
    background: ${warna.bg}; border-left: 4px solid ${warna.border};
    color: white; padding: 12px 16px; border-radius: 8px;
    font-size: 13px; font-weight: 500; display: flex; align-items: flex-start;
    gap: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    animation: slideIn 0.3s ease;
  `;
  el.innerHTML = `<span>${warna.icon}</span><span>${pesan}</span>`;
  container.appendChild(el);

  const durasi = tipe === "warning" ? 5000 : 3000;
  setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity 0.3s"; setTimeout(() => el.remove(), 300); }, durasi);
}

/* ================================================
   LOAD SETTING NOTA DARI SERVER
================================================ */
async function loadSettingNota() {
  if (navigator.onLine) {
    try {
      const res = await fetch(`${BASE_URL}/api/setting-nota`);
      if (res.ok) {
        settingNota = await res.json();
        localStorage.setItem('fitun_setting_nota', JSON.stringify(settingNota));
      }
    } catch (e) {
      const cached = localStorage.getItem('fitun_setting_nota');
      if (cached) settingNota = JSON.parse(cached);
    }
  } else {
    const cached = localStorage.getItem('fitun_setting_nota');
    if (cached) settingNota = JSON.parse(cached);
  }

  if (!settingNota) {
    settingNota = {
      namaToko: 'FITUN FOUN', alamat: '', telepon: '', headerTambahan: '',
      footerLine1: 'Obrigado 🙏', footerLine2: "sasan ne'ebe mau hola ona",
      footerLine3: 'labele fo fila fali',
      tampilkanKasir: true, tampilkanTanggal: true, tampilkanNomor: false,
    };
  }
  updateFooterHalaman();
}

function updateFooterHalaman() {
  const footer = document.querySelector('.print-footer');
  if (!footer || !settingNota) return;
  const lines = [settingNota.footerLine1, settingNota.footerLine2, settingNota.footerLine3].filter(Boolean);
  footer.innerHTML = lines.join('<br>');
}

/* ================================================
   LOGIN
================================================ */
$("btnLogin").onclick = async () => {
  const username = $("username").value.trim();
  const password = $("password").value;
  const error = $("loginError");

  if (!username || !password) {
    error.innerText = "Username & password wajib diisi";
    error.style.color = "#ff4444";
    return;
  }

  if (navigator.onLine) {
    error.innerText = "⏳ Menghubungkan ke server...";
    error.style.color = "#38bdf8";

    const mencobaLogin = async (percobaan = 1) => {
      try {
        const res = await fetch(`${BASE_URL}/api/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) { error.innerText = data.message || "❌ Username/Password salah"; error.style.color = "#ff4444"; return; }
        const cacheKey = `kasir_auth_${username}`;
        sessionStorage.setItem(cacheKey, btoa(JSON.stringify({ username: data.username, role: data.role, ts: Date.now() })));
        masukSebagai(data.username);
      } catch (e) {
        if (percobaan <= 3) {
          error.innerText = `⏳ Percobaan ${percobaan}/3...`;
          setTimeout(() => mencobaLogin(percobaan + 1), 4000);
        } else {
          loginLokal(username, password, error);
        }
      }
    };
    mencobaLogin();
  } else {
    loginLokal(username, password, error);
  }
};

function loginLokal(username, password, errorEl) {
  const cacheKey = `kasir_auth_${username}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    try {
      const data = JSON.parse(atob(cached));
      if (data.username === username && (Date.now() - data.ts) < 8 * 60 * 60 * 1000) {
        showNotif("📴 Mode offline: login dari cache session", "warning");
        masukSebagai(data.username);
        return;
      }
    } catch (e) {}
  }
  errorEl.innerText = "❌ Mode offline: login online dulu sekali agar bisa kasir offline";
  errorEl.style.color = "#ff4444";
}

function masukSebagai(username) {
  currentUser = username;
  localStorage.setItem("user", JSON.stringify({ username }));
  $("namaKasir").innerText = currentUser;
  $("loginPage").style.display = "none";
  $("kasirPage").style.display = "block";
  loadProducts();
  loadSettingNota();
  updateStatusOnline(navigator.onLine);
}

$("username").addEventListener("keydown", e => { if (e.key === "Enter") $("password").focus(); });
$("password").addEventListener("keydown", e => { if (e.key === "Enter") $("btnLogin").click(); });

/* ================================================
   LOAD PRODUK
================================================ */
async function loadProducts() {
  if (navigator.onLine) {
    try {
      const res = await fetch(`${BASE_URL}/api/products`);
      if (res.ok) {
        const data = await res.json();
        window.products = data;
        Storage.simpanProdukLokal(data);
        const sync = Storage.waktuSyncTerakhir();
        if (sync) {
          const jam = sync.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
          const el = $("lastSync");
          if (el) el.innerText = `Produk: ${data.length} SKU | Sync: ${jam}`;
        }
      }
    } catch (e) {
      window.products = Storage.ambilProdukLokal();
      showNotif("⚠️ Gagal ambil produk dari server, pakai data lokal", "warning");
    }
  } else {
    window.products = Storage.ambilProdukLokal();
    const jml = window.products.length;
    if (jml > 0) {
      showNotif(`📦 Mode offline: ${jml} produk dari cache lokal`, "info");
    } else {
      showNotif("⚠️ Belum ada cache produk. Hubungkan internet dulu sekali.", "warning");
    }
  }
}

/* ================================================
   CARI HARGA
   + PERINGATAN STOK HABIS / KRITIS
================================================ */
function cariHarga() {
  const inputUser = $("barcode").value.trim().toLowerCase();
  if (!inputUser) return;

  const products = window.products || Storage.ambilProdukLokal();
  const product = products.find(p =>
    (p.barcode && p.barcode.toLowerCase() === inputUser) ||
    (p.name && p.name.toLowerCase() === inputUser) ||
    (p.nama && p.nama.toLowerCase() === inputUser)
  );

  if (product) {
    const stok = Number(product.stock !== undefined ? product.stock : 9999);
    const namaProd = product.name || product.nama || inputUser;

    // ⛔ STOK HABIS — tolak, tidak bisa ditambah ke keranjang
    if (stok <= 0) {
      showNotif(`❌ STOK HABIS! "${namaProd}" sudah tidak tersedia.`, "error");
      $("barcode").value = "";
      $("barcode").dataset.barcode = "";
      $("barcode").dataset.name = "";
      $("barcode").dataset.stock = "";
      $("harga").value = "";
      $("barcode").focus();
      return;
    }

    $("harga").value = product.price || product.harga || 0;
    $("barcode").dataset.barcode = product.barcode || "";
    $("barcode").dataset.name = namaProd;
    $("barcode").dataset.stock = stok; // simpan stok untuk dicek di btnTambah

    // ⚠️ STOK KRITIS — boleh tambah tapi kasir dikasih tahu
    if (stok <= 5) {
      showNotif(`⚠️ Stok "${namaProd}" hampir habis! Sisa: ${stok} unit.`, "warning");
    }

    $("qty").focus();
    $("qty").select();
  } else {
    $("barcode").dataset.barcode = "";
    $("barcode").dataset.name = "";
    $("barcode").dataset.stock = "";
  }
}

$("barcode").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); cariHarga(); } });
$("harga").addEventListener("keydown", e => { if (e.key === "Enter") $("qty").focus(); });
$("qty").addEventListener("keydown", e => { if (e.key === "Enter") $("btnTambah").click(); });

/* ================================================
   TAMBAH ITEM
   + CEK STOK TIDAK MELEBIHI YANG TERSEDIA
================================================ */
$("btnTambah").onclick = () => {
  const inputNama = $("barcode").value.trim();
  const harga = Number($("harga").value);
  const qty = Number($("qty").value);

  const barcode = $("barcode").dataset.barcode || "";
  const namaProduk = $("barcode").dataset.name || inputNama;

  if (!inputNama || harga <= 0 || qty <= 0) return;

  // ===================================================
  // CEK STOK — ambil dari dataset atau cari langsung
  // dari cache produk (supaya tidak bisa bypass)
  // ===================================================
  const produkCache = window.products || Storage.ambilProdukLokal();
  const produkDitemukan = produkCache.find(p =>
    (barcode && p.barcode === barcode) ||
    (p.name && p.name.toLowerCase() === namaProduk.toLowerCase()) ||
    (p.nama && p.nama.toLowerCase() === namaProduk.toLowerCase())
  );

  // Stok dari cache (lebih akurat dari dataset)
  const stokTersedia = produkDitemukan
    ? Number(produkDitemukan.stock || 0)
    : Number($("barcode").dataset.stock) || 9999;

  // Stok habis total — tolak langsung
  if (produkDitemukan && stokTersedia <= 0) {
    showNotif(`❌ STOK HABIS! "${namaProduk}" tidak tersedia.`, "error");
    $("barcode").value = "";
    $("barcode").dataset.barcode = "";
    $("barcode").dataset.name = "";
    $("barcode").dataset.stock = "";
    $("harga").value = "";
    $("barcode").focus();
    return;
  }

  // Hitung qty yang sudah ada di keranjang untuk produk ini
  const sudahDiKeranjang = items
    .filter(i => (barcode && i.barcode === barcode) || i.nama.toLowerCase() === namaProduk.toLowerCase())
    .reduce((s, i) => s + i.qty, 0);

  const sisaStok = stokTersedia - sudahDiKeranjang;

  // Qty melebihi sisa stok — tolak atau koreksi
  if (produkDitemukan && qty > sisaStok) {
    if (sisaStok <= 0) {
      showNotif(`❌ Tidak bisa tambah! Stok "${namaProduk}" sudah habis dipakai semua.`, "error");
    } else {
      showNotif(`⚠️ Stok tidak cukup! Hanya tersisa ${sisaStok} unit lagi untuk "${namaProduk}".`, "warning");
      $("qty").value = sisaStok;
      $("qty").focus();
      $("qty").select();
    }
    return;
  }

  // Cek item sudah ada di keranjang → tambah qty saja
  const existing = items.find(i =>
    (barcode && i.barcode === barcode) ||
    i.nama.toLowerCase() === namaProduk.toLowerCase()
  );

  if (existing) {
    existing.qty += qty;
  } else {
    items.push({
      nama: namaProduk,
      harga,
      qty,
      barcode
    });
  }

  render();

  // Reset semua field + dataset
  $("barcode").value = "";
  $("barcode").dataset.barcode = "";
  $("barcode").dataset.name = "";
  $("barcode").dataset.stock = "";
  $("harga").value = "";
  $("qty").value = 1;
  $("barcode").focus();
};

function render() {
  const tb = $("listBarang");
  tb.innerHTML = "";
  total = 0;
  items.forEach((i, idx) => {
    const sub = i.harga * i.qty;
    total += sub;
    tb.innerHTML += `
      <tr>
        <td>${i.nama}</td>
        <td>${formatUSD(i.harga)}</td>
        <td>
          <button onclick="kurangiQty(${idx})" style="padding:2px 8px;margin-right:4px;">-</button>
          ${i.qty}
          <button onclick="tambahQty(${idx})" style="padding:2px 8px;margin-left:4px;">+</button>
        </td>
        <td>${formatUSD(sub)}</td>
        <td><button onclick="hapus(${idx})">X</button></td>
      </tr>`;
  });
  $("totalBayar").innerText = formatUSD(total);
}

function hapus(i) { items.splice(i, 1); render(); }
function kurangiQty(i) { if (items[i].qty > 1) { items[i].qty--; render(); } else hapus(i); }
function tambahQty(i) { items[i].qty++; render(); }

/* ================================================
   BAYAR
================================================ */
$("btnBayar").onclick = () => {
  if (items.length === 0) { $("kembalian").innerText = "⚠ BELUM ADA BARANG"; return; }
  const uang = Number($("uangBayar").value);
  if (!uang || uang < total) { $("kembalian").innerText = "❌ UANG KURANG"; return; }
  sudahBayar = true;
  $("kembalian").innerText = `Kembalian: ${formatUSD(uang - total)}`;
};

$("uangBayar").addEventListener("keydown", e => { if (e.key === "Enter") $("btnBayar").click(); });

$("btnOK").onclick = () => {
  if (items.length === 0 || !sudahBayar) { $("kembalian").innerText = "⚠ LENGKAPI TRANSAKSI"; return; }
  if (sudahOK) return;
  bukaConfirm();
};

function bukaConfirm() {
  confirmOpen = true;
  $("confirmBox").classList.remove("hidden");
  setTimeout(() => $("btnConfirmNo").focus(), 100);
}

function tutupConfirm() {
  confirmOpen = false;
  $("confirmBox").classList.add("hidden");
  $("barcode").focus();
}

$("btnConfirmYes").onclick = () => confirmOK();
$("btnConfirmNo").onclick = () => tutupConfirm();

window.addEventListener("keydown", e => {
  if (confirmOpen && e.key === "Enter") {
    if (document.activeElement !== $("btnConfirmYes")) {
      e.preventDefault();
      tutupConfirm();
    }
  }
});

/* ================================================
   KONFIRMASI & SIMPAN TRANSAKSI
================================================ */
async function confirmOK() {
  // ===================================================
  // CEK STOK SEMUA ITEM SEBELUM CHECKOUT
  // ===================================================
  const produkCache = window.products || Storage.ambilProdukLokal();
  const itemBermasalah = [];

  for (const item of items) {
    const produk = produkCache.find(p =>
      (item.barcode && p.barcode === item.barcode) ||
      (p.name && p.name.toLowerCase() === item.nama.toLowerCase()) ||
      (p.nama && p.nama.toLowerCase() === item.nama.toLowerCase())
    );

    if (produk) {
      const stokTersedia = Number(produk.stock || 0);
      if (stokTersedia <= 0) {
        itemBermasalah.push(`❌ "${item.nama}" — STOK HABIS (tersedia: 0)`);
      } else if (item.qty > stokTersedia) {
        itemBermasalah.push(`❌ "${item.nama}" — Minta ${item.qty} unit, stok hanya ${stokTersedia}`);
      }
    }
  }

  // Ada item bermasalah → blokir checkout, tampilkan notif per item
  if (itemBermasalah.length > 0) {
    $("kembalian").innerText = "❌ STOK TIDAK CUKUP";
    showNotif("❌ Checkout gagal! Periksa stok barang berikut:", "error");
    // Tampilkan notif satu per satu dengan jeda kecil supaya semua muncul
    itemBermasalah.forEach((msg, idx) => {
      setTimeout(() => showNotif(msg, "error"), (idx + 1) * 600);
    });
    return;
  }

  sudahOK = true;
  tutupConfirm();
  $("btnOK").disabled = true;
  $("kembalian").innerText = "⏳ MEMPROSES...";

  const dataTransaksi = {
    kasir: currentUser,
    total,
    items: items.map(i => ({
      nama: i.nama,
      name: i.nama,
      harga: i.harga,
      qty: i.qty,
      barcode: i.barcode || ""
    })),
    waktu: new Date().toISOString()
  };

  Storage.simpanHistory({ ...dataTransaksi });

  if (navigator.onLine) {
    try {
      const res = await fetch(`${BASE_URL}/api/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataTransaksi),
        signal: AbortSignal.timeout(8000)
      });
      if (res.ok) {
        $("kembalian").innerText = "✅ BERHASIL DIKIRIM (ONLINE)";
        showNotif("✅ Transaksi berhasil dikirim ke server!", "success");
        updateStatusOnline(true);
      } else {
        throw new Error("Server error");
      }
    } catch (e) {
      const jmlAntrian = Storage.tambahKeQueue(dataTransaksi);
      $("kembalian").innerText = `✅ TERSIMPAN (OFFLINE) — ${jmlAntrian} antrian`;
      showNotif(`📴 Gagal kirim ke server. Tersimpan lokal (${jmlAntrian} antrian).`, "warning");
      updateStatusOnline(false);
    }
  } else {
    const jmlAntrian = Storage.tambahKeQueue(dataTransaksi);
    $("kembalian").innerText = `✅ TERSIMPAN OFFLINE — ${jmlAntrian} antrian`;
    showNotif(`📴 Mode offline: tersimpan lokal. Total ${jmlAntrian} antrian.`, "warning");
  }

  updateStatusOnline(navigator.onLine);
  loadProducts();
}

/* ================================================
   SINKRONISASI OTOMATIS
================================================ */
async function sinkronisasiOtomatis() {
  if (!navigator.onLine) return;
  const queue = Storage.ambilQueue();
  if (queue.length === 0) return;

  showNotif(`🔄 Sinkronisasi ${queue.length} transaksi offline...`, "sync");
  let berhasil = 0, gagal = 0;

  for (const transaksi of [...queue]) {
    try {
      const res = await fetch(`${BASE_URL}/api/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transaksi),
        signal: AbortSignal.timeout(10000)
      });
      if (res.ok) { Storage.hapusDariQueue(transaksi._offlineId); berhasil++; }
      else { gagal++; }
    } catch (e) { gagal++; break; }
  }

  const sisaAntrian = Storage.jumlahQueue();
  if (berhasil > 0 && sisaAntrian === 0) showNotif(`✅ Semua ${berhasil} transaksi offline berhasil tersync!`, "success");
  else if (berhasil > 0) showNotif(`🔄 ${berhasil} tersync, ${sisaAntrian} masih pending`, "warning");
  else if (gagal > 0) showNotif("❌ Sync gagal, akan coba lagi otomatis", "error");

  updateStatusOnline(navigator.onLine);
  loadProducts();
}

setInterval(sinkronisasiOtomatis, 30000);
setTimeout(sinkronisasiOtomatis, 3000);

/* ================================================
   TRANSAKSI BARU & RESET
================================================ */
$("btnTransaksiBaru").onclick = () => {
  if (sudahOK) reset();
  else $("kembalian").innerText = "⚠ KLIK OK DULU";
};

function reset() {
  items = [];
  total = 0;
  sudahBayar = false;
  sudahOK = false;
  $("btnOK").disabled = false;
  render();
  $("uangBayar").value = "";
  $("kembalian").innerText = "";
  $("barcode").focus();
}

/* ================================================
   HISTORY LOKAL
================================================ */
$("btnHistory").onclick = () => {
  const history = Storage.ambilHistory();
  const modal = $("modalHistory");
  const content = $("historyContent");

  if (!history.length) {
    content.innerHTML = '<p style="color:#888;text-align:center;">Belum ada history</p>';
  } else {
    const grouped = {};
    history.forEach(t => {
      const tgl = new Date(t.waktu || t.time || t._savedAt).toLocaleDateString("id-ID");
      if (!grouped[tgl]) grouped[tgl] = [];
      grouped[tgl].push(t);
    });
    let html = "";
    Object.entries(grouped).reverse().forEach(([tgl, txs]) => {
      const totalHari = txs.reduce((s, t) => s + (t.total || 0), 0);
      html += `<div style="margin-bottom:12px;">
        <div style="color:#00ff88;font-weight:bold;padding:6px 0;border-bottom:1px solid #334155;">
          📅 ${tgl} — ${txs.length} transaksi — Total: ${formatUSD(totalHari)}
        </div>`;
      txs.reverse().forEach(t => {
        const waktu = new Date(t.waktu || t.time || t._savedAt).toLocaleTimeString("id-ID");
        const offline = t._offlineId ? ' <span style="color:#ffaa00;font-size:11px;">[OFFLINE]</span>' : '';
        html += `<div style="padding:6px 0;border-bottom:1px solid #1e293b;font-size:13px;">
          <b>${waktu}</b> — Kasir: ${t.kasir || t.user || "-"}${offline} — ${formatUSD(t.total)}
          <div style="color:#94a3b8;font-size:12px;margin-top:3px;">
            ${(t.items||[]).map(i => `${i.nama||i.name} x${i.qty}`).join(", ")}
          </div>
        </div>`;
      });
      html += "</div>";
    });
    content.innerHTML = html;
  }
  modal.classList.remove("hidden");
};

$("btnCloseHistory") && ($("btnCloseHistory").onclick = () => $("modalHistory").classList.add("hidden"));

/* ================================================
   PRINT
================================================ */
$("btnPrint").onclick = () => {
  const s = settingNota || {};
  const uang = Number($("uangBayar").value) || 0;
  const kembalian = uang - total;
  const now = new Date();
  const garis = '================================';

  let konten = `<div style="text-align:center;font-family:'Courier New',monospace;font-size:13px;">`;
  konten += `<div style="font-size:16px;font-weight:900;letter-spacing:2px;">${s.namaToko || 'FITUN FOUN'}</div>`;
  if (s.alamat) konten += `<div>${s.alamat}</div>`;
  if (s.telepon) konten += `<div>Tel: ${s.telepon}</div>`;
  if (s.headerTambahan) konten += `<div>${s.headerTambahan}</div>`;
  konten += `</div><div style="font-family:'Courier New',monospace;font-size:12px;">${garis}</div>`;
  konten += `<div style="font-family:'Courier New',monospace;font-size:12px;">`;
  if (s.tampilkanNomor) konten += `<div>No: TRX-${Date.now().toString().slice(-6)}</div>`;
  if (s.tampilkanTanggal) konten += `<div>Tgl: ${now.toLocaleDateString('id-ID')} ${now.toLocaleTimeString('id-ID')}</div>`;
  if (s.tampilkanKasir !== false) konten += `<div>Kasir: ${currentUser}</div>`;
  konten += `${garis}`;
  items.forEach(i => {
    const sub = i.harga * i.qty;
    konten += `<div style="display:flex;justify-content:space-between;"><span>${i.nama} x${i.qty}</span><span>${formatUSD(sub)}</span></div>`;
  });
  konten += `${garis}`;
  konten += `<div style="display:flex;justify-content:space-between;font-weight:700;font-size:13px;"><span>TOTAL</span><span>${formatUSD(total)}</span></div>`;
  if (uang > 0) {
    konten += `<div style="display:flex;justify-content:space-between;"><span>Bayar</span><span>${formatUSD(uang)}</span></div>`;
    konten += `<div style="display:flex;justify-content:space-between;"><span>Kembali</span><span>${formatUSD(kembalian)}</span></div>`;
  }
  konten += `${garis}<div style="text-align:center;">`;
  if (s.footerLine1) konten += `<div>${s.footerLine1}</div>`;
  if (s.footerLine2) konten += `<div>${s.footerLine2}</div>`;
  if (s.footerLine3) konten += `<div>${s.footerLine3}</div>`;
  konten += `</div></div>`;

  const win = window.open('', '_blank', 'width=400,height=600');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Nota</title>
    <style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Courier New',monospace;font-size:12px;padding:10px;width:280px;}@media print{body{width:80mm;}}</style>
    </head><body>${konten}<script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();}<\/script></body></html>`);
  win.document.close();
};

/* ================================================
   LOGOUT
================================================ */
$("btnLogout").onclick = () => {
  if (Storage.jumlahQueue() > 0) {
    if (!confirm(`⚠️ Ada ${Storage.jumlahQueue()} transaksi offline yang belum tersync!\nYakin mau logout?`)) return;
  }
  location.reload();
};

/* ================================================
   INIT
================================================ */
(function init() {
  updateStatusOnline(navigator.onLine);
  const style = document.createElement("style");
  style.textContent = `@keyframes slideIn{from{transform:translateX(110%);opacity:0;}to{transform:translateX(0);opacity:1;}}`;
  document.head.appendChild(style);
})();
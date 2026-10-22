# Website Pabrik Tahu AGR

Website frontend responsif sesuai referensi `Design file.pdf`, dibuat menggunakan HTML, CSS, dan JavaScript vanilla (tanpa framework).

## Fitur

- Dashboard, Menu Tahu dengan lima produk, pencarian, filter kategori, pengurutan harga, detail produk, dan keranjang tersimpan lokal.
- Pilihan pengambilan: ambil sendiri atau antar.
- Peta interaktif gratis berbasis Leaflet + OpenStreetMap; pengguna bisa mengeklik peta, menggeser pin tujuan, mencari alamat/tempat secara manual, atau memakai lokasi perangkat jika memberi izin.
- Rute berkendara dan jarak diperkirakan melalui OSRM public demo; ongkir = jarak rute (km) × Rp 3.000/km.
- Opsi jarak manual hanya sebagai cadangan jika layanan peta/rute tidak tersedia.
- Voucher `GORENG25`, `GRATISONGKIR`, `BARU10`, dan promo produk.
- DP wajib 25% dari total akhir sesudah diskon/voucher dan ongkir; sisa pembayaran ditampilkan otomatis.
- Dua pilihan metode pembayaran DP: QRIS atau tunai langsung kepada admin.
- Input pratinjau bukti transfer berupa gambar; setelah chat WhatsApp terbuka, pelanggan perlu melampirkan file secara manual karena tautan WhatsApp tidak dapat mengirim file otomatis.
- Rincian pesanan (produk, tanggal, lokasi, total, DP, sisa, dan metode pembayaran) dikirim ke WhatsApp admin sebagai bukti ringkasan order.
- Tombol customer service WhatsApp tersedia pada dashboard dan tombol mengambang.

## Menjalankan di Mac

1. Ekstrak ZIP.
2. Buka folder `pabrik-tahu-agr` di Terminal.
3. Jalankan:

   ```bash
   python3 -m http.server 5500
   ```

4. Buka `http://localhost:5500` di Safari atau browser lain.

Map tiles dan pencarian/rute memerlukan koneksi internet. Leaflet dimuat dari CDN.

## Konfigurasi wajib sebelum dipakai untuk pesanan nyata

Buka `config.js` lalu isi nomor admin WhatsApp dan koordinat pabrik yang benar. Contoh format nomor WhatsApp: kode negara 62 diikuti nomor, tanpa `+`, spasi, atau strip.

```js
window.APP_CONFIG = {
  adminWhatsApp: "62xxxxxxxxxxx", // Ganti dengan nomor WhatsApp admin sebenarnya
  qrisImageUrl: "assets/qris-agr.png", // Letakkan QRIS resmi di folder assets, lalu samakan nama file
  storeName: "Pabrik Tahu AGR",
  storeAddress: "Alamat pabrik yang benar",
  storeCoordinates: {
    lat: -6.9175, // Ganti dengan latitude pabrik yang benar
    lng: 107.6191 // Ganti dengan longitude pabrik yang benar
  }
};
```

Koordinat awal adalah titik demo di area Bandung, bukan koordinat pabrik yang sudah diverifikasi. Jangan menggunakan estimasi ongkir untuk transaksi nyata sebelum mengatur koordinat pabrik akurat. Alamat asal di desain juga perlu diverifikasi.

## Tentang peta dan layanan gratis

- Leaflet adalah library peta open-source.
- Data/tiles peta berasal dari OpenStreetMap dan atribusi tetap ditampilkan di peta.
- Pencarian alamat menggunakan Nominatim public API hanya saat pengguna menekan tombol pencarian, bukan autocomplete. Layanan publik memiliki batas penggunaan (maksimum 1 request per detik), kapasitas terbatas, dan melarang geocoding masif.
- Jarak jalan menggunakan OSRM public demo server. Layanan ini best-effort, dapat dibatasi atau dihentikan, dan bukan SLA untuk bisnis. Untuk produksi/traffic ramai, gunakan layanan geocoding/routing yang memiliki kuota/SLA sesuai kebutuhan atau host sendiri.
- Gratis bukan berarti tanpa batas dan availability dijamin; patuhi kebijakan tiles dan layanan Nominatim/OSRM.

## DP dan WhatsApp

Nominal DP menggunakan pembulatan ke atas (`ceil`) agar tidak kurang dari 25% saat nominal rupiah tidak habis dibagi empat. DP dihitung dari **total akhir** setelah diskon promo, voucher, dan ongkir; pembayaran tersisa = total − DP. Ringkasan dikirim ke WhatsApp agar admin dapat mengonfirmasi nominal dan metode pembayaran. Pilihan QRIS akan menampilkan gambar dari `qrisImageUrl` jika konfigurasi tersebut diisi dengan file QRIS resmi yang valid. Jangan masukkan QRIS contoh/palsu. Saat ini gambar bukti transfer hanya dipratinjau di browser dan tidak diunggah ke server; pelanggan perlu melampirkannya secara manual di chat WhatsApp setelah terbuka. Untuk metode tunai, konfirmasikan dengan admin kapan dan di mana DP akan dibayarkan.

Website ini belum memiliki payment gateway, konfirmasi transfer otomatis, database pesanan, autentikasi, atau server admin. Jangan menganggap DP telah dibayar hanya karena WhatsApp terbuka. Admin perlu memeriksa pembayaran secara manual. Pesanan terakhir hanya disimpan pada browser lokal.

## Referensi teknis

- Leaflet: https://leafletjs.com/examples/quick-start/
- Kebijakan tile OpenStreetMap: https://operations.osmfoundation.org/policies/tiles/
- Kebijakan Nominatim: https://operations.osmfoundation.org/policies/nominatim/
- Kebijakan penggunaan OSRM demo: https://github.com/Project-OSRM/osrm-backend/wiki/Api-usage-policy


## Aturan jadwal pemesanan

- Sangat dianjurkan membuat pesanan sekurang-kurangnya 1 hari sebelum tanggal pesanan.
- Pesanan dadakan untuk hari yang sama hanya dapat dikonfirmasi sampai pukul 10.00 WIB (zona waktu Asia/Jakarta).
- Kuota pesanan dadakan dibatasi maksimal 5 bungkus (sekitar 50 pcs apabila kemasan berisi 10 pcs).
- Halaman dashboard menampilkan lokasi pabrik, tautan peta, serta nomor WhatsApp admin yang dibaca dari `config.js`. Isi `adminWhatsApp` dengan nomor yang benar agar tombol chat berfungsi.
- Pesan konfirmasi tidak akan dikirim apabila keranjang kosong; website menampilkan peringatan dan meminta pelanggan menambahkan produk terlebih dahulu.
- Tombol tambah ke keranjang menampilkan animasi singkat dan notifikasi toast yang menghilang otomatis.


## Penyesuaian antarmuka terbaru

- Navigasi produk menggunakan label **Menu Tahu**.
- Tombol keranjang mengambang tampil di atas tombol Hubungi Admin.
- Tombol **Tambah produk** dibuat lebih besar dan berwarna hijau di atas daftar keranjang.
- Detail tujuan pengiriman yang dikirim ke admin hanya berupa alamat umum dan patokan opsional. Koordinat tetap digunakan secara internal untuk perhitungan rute, tetapi tidak ditampilkan di ringkasan/WhatsApp.
- Ringkasan checkout menampilkan tanggal transaksi (WIB) dan tanggal sampai/pengambilan.
- Informasi pembayaran diringkas ke DP, metode, dan bukti pembayaran.

## Upload ke GitHub

Jika repository sudah dibuat di GitHub dan masih kosong, unduh/ekstrak proyek ini ke komputer, buka Terminal pada folder `pabrik-tahu-agr`, kemudian jalankan:

```bash
git init
git add .
git commit -m "Add Pabrik Tahu AGR website"
git branch -M main
git remote add origin https://github.com/USERNAME/NAMA-REPOSITORY.git
git push -u origin main
```

Ganti URL remote dengan URL repository milik Anda. Jika repository di GitHub sudah berisi README atau commit awal, cara paling aman adalah clone repository dahulu, lalu salin file proyek ke dalam folder hasil clone sebelum menjalankan `git add .`, `git commit`, dan `git push`. Jika remote `origin` sudah ada, jangan tambahkan remote kedua; periksa dengan `git remote -v`. Hindari mengunggah kunci rahasia atau data pelanggan.

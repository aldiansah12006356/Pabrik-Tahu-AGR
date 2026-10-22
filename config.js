/*
  Konfigurasi Pabrik Tahu AGR.
  Isi adminWhatsApp memakai format internasional tanpa tanda +, spasi, atau strip.
  Contoh format: 62xxxxxxxxxxx (ganti dengan nomor admin sebenarnya).
  Koordinat di bawah adalah titik awal DEMO di area Bandung, bukan lokasi pabrik terverifikasi.
  Ganti koordinat dengan titik pabrik yang benar agar jarak/ongkir akurat.
*/
window.APP_CONFIG = {
  adminWhatsApp: "6288229004763",
  // Isi dengan path gambar QRIS resmi, misalnya "assets/qris-agr.png". Jangan gunakan QR contoh/palsu.
  qrisImageUrl: "",
  storeName: "Pabrik Tahu AGR",
  storeAddress: "Jl. Aki Padma GG. Ibu Anah 002/006, Babakan, Kec. Babakan Ciparay, Kota Bandung, Jawa Barat, Indonesia",
  storeCoordinates: {
    lat: -6.9278350396100326, 
    lng: 107.57869299821553
  }
};

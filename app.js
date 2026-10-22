/* Pabrik Tahu AGR — vanilla JavaScript, tanpa framework. */
'use strict';

const STORE_NAME = (window.APP_CONFIG && window.APP_CONFIG.storeName) || 'Pabrik Tahu AGR';
// Alamat/koordinat ini dapat diubah di config.js. Koordinat awal masih berupa titik demo Bandung.
const STORE_ADDRESS = (window.APP_CONFIG && window.APP_CONFIG.storeAddress) || 'Jl. Aki Padma GG. Ibu Anah 002/006, Babakan, Kec. Babakan Ciparay, Kota Bandung, Jawa Barat, Indonesia';
const STORE_COORDINATES = (window.APP_CONFIG && window.APP_CONFIG.storeCoordinates) || { lat: -6.9278350396100326, lng: 107.57869299821553 };
const BANDUNG_CENTER = { lat: Number(STORE_COORDINATES.lat), lng: Number(STORE_COORDINATES.lng) };
const DELIVERY_RATE_PER_KM = 3000;
const WEEKLY_DISCOUNT_PER_PACK = 3000;

const products = [
  {
    id: 'tahu-putih', name: 'Tahu Putih Segar', category: 'putih', price: 8000,
    image: 'assets/tahu-putih.svg', label: 'Terlaris', sortRank: 1, weeklyPromotion: true,
    description: 'Tahu putih kenyal, dibuat setiap pagi dari kedelai pilihan.',
    pack: '10 pcs / pack', weight: '± 450 gram', shelfLife: '2 hari di kulkas',
    detail: 'Tahu putih lembut dengan rasa kedelai yang ringan, cocok untuk sup, tumisan, gorengan, dan masakan rumahan.'
  },
  {
    id: 'tahu-goreng', name: 'Tahu Goreng Gurih', category: 'goreng', price: 12000,
    image: 'assets/tahu-goreng.svg', label: 'Favorit', sortRank: 2, weeklyPromotion: true,
    description: 'Matang sempurna, kulit renyah, gurih di dalam.',
    pack: '10 pcs / pack', weight: '± 450 gram', shelfLife: '2 hari di kulkas',
    detail: 'Tahu goreng gurih dengan kulit keemasan renyah, digoreng segar setiap pagi di dapur AGR.'
  },
  {
    id: 'tahu-sutra', name: 'Tahu Sutra Lembut', category: 'sutra', price: 10000,
    image: 'assets/tahu-sutra.svg', label: 'Baru', sortRank: 3, weeklyPromotion: false,
    description: 'Tekstur sutra halus, cocok untuk sup dan tumis.',
    pack: '8 pcs / pack', weight: '± 400 gram', shelfLife: '2 hari di kulkas',
    detail: 'Teksturnya lembut dan halus untuk sup, tumis ringan, atau hidangan yang membutuhkan tahu bertekstur sutra.'
  },
  {
    id: 'tahu-pong', name: 'Tahu Pong Crispy', category: 'lainnya', price: 9000,
    image: 'assets/tahu-pong.svg', label: 'Terlaris', sortRank: 4, weeklyPromotion: false,
    description: 'Kopong dan renyah, pas untuk camilan keluarga.',
    pack: '12 pcs / pack', weight: '± 400 gram', shelfLife: '2 hari di kulkas',
    detail: 'Tahu pong berongga dengan sensasi renyah, cocok menjadi camilan atau teman makan. Promo beli 2 pack gratis 1 pack.'
  },
  {
    id: 'tahu-bakso', name: 'Tahu Bakso AGR', category: 'lainnya', price: 18000,
    image: 'assets/tahu-bakso.svg', label: 'Premium', sortRank: 5, weeklyPromotion: false,
    description: 'Isi bakso sapi, dibumbui resep rumahan AGR.',
    pack: '6 pcs / pack', weight: '± 450 gram', shelfLife: '2 hari di kulkas',
    detail: 'Tahu dengan isian bakso sapi berbumbu resep rumahan AGR, pilihan praktis untuk camilan dan lauk.'
  }
];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const rupiah = (value) => `Rp ${Math.round(Number(value) || 0).toLocaleString('id-ID')}`;
const decimalID = (value, digits = 1) => Number(value).toLocaleString('id-ID', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

let currentPage = 'dashboard';
let activeCategory = 'semua';
let sortMode = 'popular';
let cart = readSavedCart();
let currentVoucher = '';
let deliveryMethod = 'pickup';
let distanceKm = 0;
let selectedProduct = null;
let detailQuantity = 1;
let toastTimeout = null;
let mapInstance = null;
let mapInitAttempted = false;
let leafletReady = false;
let originMarker = null;
let destinationMarker = null;
let routeLine = null;
let selectedDestination = null;
let lastSearchResults = [];
let lastNominatimRequestAt = 0;
let reverseLookupToken = 0;
let routeIsCurrent = false;
let lastRouteDurationSeconds = null;
let paymentMethod = '';
let paymentProofFile = null;
let paymentProofObjectUrl = '';

function readSavedCart() {
  try {
    const stored = JSON.parse(localStorage.getItem('agrCart') || '{}');
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {};
    const safe = {};
    products.forEach((product) => {
      const quantity = Number(stored[product.id]);
      if (Number.isInteger(quantity) && quantity > 0 && quantity <= 99) safe[product.id] = quantity;
    });
    return safe;
  } catch (_error) {
    return {};
  }
}

function saveCart() {
  try { localStorage.setItem('agrCart', JSON.stringify(cart)); } catch (_error) { /* Penyimpanan lokal opsional. */ }
}

function cartQuantity() {
  return Object.values(cart).reduce((total, quantity) => total + quantity, 0);
}

function cartSubtotal() {
  return products.reduce((sum, product) => sum + product.price * (cart[product.id] || 0), 0);
}

function getWeeklyDiscount() {
  const qualifyingPacks = products.reduce((sum, product) => sum + (product.weeklyPromotion ? (cart[product.id] || 0) : 0), 0);
  const weeklyDiscount = qualifyingPacks * WEEKLY_DISCOUNT_PER_PACK;
  const freePongPacks = Math.floor((cart['tahu-pong'] || 0) / 2);
  const buyTwoGetOneDiscount = freePongPacks * products.find((product) => product.id === 'tahu-pong').price;
  return Math.min(cartSubtotal(), weeklyDiscount + buyTwoGetOneDiscount);
}

function getShippingFee() {
  if (deliveryMethod !== 'delivery' || !Number.isFinite(distanceKm) || distanceKm <= 0) return 0;
  return Math.round(distanceKm * DELIVERY_RATE_PER_KM);
}

function calculateVoucherDiscount(subtotal, productDiscount, shippingFee) {
  if (!currentVoucher) return { amount: 0, message: 'Pilih salah satu voucher di halaman Promo.' };

  if (currentVoucher === 'GORENG25') {
    if (subtotal < 20000) return { amount: 0, message: 'GORENG25 memerlukan subtotal minimal Rp 20.000.' };
    const eligible = (cart['tahu-goreng'] || 0) * products.find((product) => product.id === 'tahu-goreng').price;
    if (eligible <= 0) return { amount: 0, message: 'Tambahkan Tahu Goreng Gurih agar voucher ini bisa dipakai.' };
    return { amount: Math.min(eligible, Math.round(eligible * 0.25)), message: 'Voucher GORENG25 aktif: diskon 25% tahu goreng.' };
  }

  if (currentVoucher === 'GRATISONGKIR') {
    if (deliveryMethod !== 'delivery') return { amount: 0, message: 'Pilih Antar ke tempat untuk memakai voucher ongkir.' };
    if (!isWeekday()) return { amount: 0, message: 'GRATISONGKIR berlaku Senin–Jumat.' };
    if (distanceKm > 5) return { amount: 0, message: 'Alamat lebih dari radius 5 km; voucher ongkir belum memenuhi syarat.' };
    return { amount: shippingFee, message: 'Voucher GRATISONGKIR aktif: biaya antar menjadi Rp 0.' };
  }

  if (currentVoucher === 'BARU10') {
    const maxAvailableDiscount = Math.max(0, subtotal - productDiscount);
    if (maxAvailableDiscount <= 0) return { amount: 0, message: 'Subtotal belum cukup untuk menerapkan voucher BARU10.' };
    return { amount: Math.min(10000, maxAvailableDiscount), message: 'Voucher BARU10 aktif: potongan hingga Rp 10.000.' };
  }

  return { amount: 0, message: 'Kode voucher tidak dikenali.' };
}

function isWeekday() {
  const day = new Date().getDay();
  return day >= 1 && day <= 5;
}

// Jadwal operasional mengacu ke zona waktu Indonesia Barat (Asia/Jakarta), bukan zona perangkat.
function getJakartaClockParts() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date());
  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
}

function getJakartaDateString() {
  const now = getJakartaClockParts();
  return `${now.year}-${now.month}-${now.day}`;
}

function getJakartaMinutesOfDay() {
  const now = getJakartaClockParts();
  return Number(now.hour) * 60 + Number(now.minute);
}

function getTomorrowDateString() {
  const [year, month, day] = getJakartaDateString().split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

function isSameDaySelected() {
  return Boolean($('#orderDate') && $('#orderDate').value === getJakartaDateString());
}

function formatOrderDate(dateString) {
  if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return 'belum dipilih';
  const [year, month, day] = dateString.split('-');
  return `${day}-${month}-${year}`;
}

function formatJakartaDateTime(date = new Date()) {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short'
  }).format(date) + ' WIB';
}

function formatJakartaDate(dateString) {
  if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return 'Pilih tanggal';
  const [year, month, day] = dateString.split('-').map(Number);
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta', day: 'numeric', month: 'long', year: 'numeric'
  }).format(new Date(Date.UTC(year, month - 1, day, 5, 0, 0)));
}

function compactLocationLabel(result) {
  const address = result && result.address ? result.address : {};
  const main = (result && result.name)
    || address.road || address.pedestrian || address.building || address.amenity
    || address.commercial || address.neighbourhood || address.suburb
    || (result && result.display_name ? result.display_name.split(',')[0].trim() : 'Area lokasi pilihan');
  const area = address.neighbourhood || address.suburb || address.village || address.town || address.city_district;
  const city = address.city || address.town || address.county || address.state_district;
  const parts = [];
  [main, area, city].forEach((part) => {
    const value = String(part || '').trim();
    if (value && !parts.some((existing) => existing.toLocaleLowerCase('id-ID') === value.toLocaleLowerCase('id-ID'))) parts.push(value);
  });
  return parts.slice(0, 3).join(', ').slice(0, 120) || 'Area lokasi pilihan';
}

function renderTransactionDates() {
  const transactionDate = $('#transactionDateDisplay');
  const arrivalDate = $('#arrivalDateDisplay');
  if (transactionDate) transactionDate.textContent = formatJakartaDateTime();
  if (arrivalDate) arrivalDate.textContent = formatJakartaDate($('#orderDate') ? $('#orderDate').value : '');
}

function configureOrderDate() {
  const input = $('#orderDate');
  if (!input) return;
  const today = getJakartaDateString();
  input.min = today;
  if (!input.value || input.value < today) input.value = getTomorrowDateString();
  input.addEventListener('change', () => { updateOrderTimingNotice(); renderTransactionDates(); });
  updateOrderTimingNotice();
}

function updateOrderTimingNotice() {
  const notice = $('#orderTimingNotice');
  renderTransactionDates();
  if (!notice) return;
  const today = getJakartaDateString();
  const selectedDate = $('#orderDate').value;
  const packs = cartQuantity();
  const afterCutoff = getJakartaMinutesOfDay() > 600; // 10.00 WIB masih termasuk batas waktu.
  notice.className = 'order-notice';

  if (!selectedDate || selectedDate < today) {
    notice.classList.add('order-notice-error');
    notice.innerHTML = '<strong>Tanggal pesanan belum valid.</strong><p>Pilih hari ini atau tanggal setelahnya.</p>';
    return;
  }

  if (selectedDate === today && afterCutoff) {
    notice.classList.add('order-notice-error');
    notice.innerHTML = '<strong>Pesanan dadakan hari ini sudah ditutup.</strong><p>Pesanan hari yang sama hanya diterima sampai pukul <b>10.00 WIB</b>. Silakan pilih tanggal besok atau setelahnya.</p>';
    return;
  }

  if (selectedDate === today && packs > 5) {
    notice.classList.add('order-notice-error');
    notice.innerHTML = '<strong>Jumlah melewati kuota order dadakan.</strong><p>Pesanan hari ini maksimal <b>5 bungkus (sekitar 50 pcs untuk kemasan isi 10)</b>. Kurangi jumlah atau pilih tanggal lain.</p>';
    return;
  }

  if (selectedDate === today) {
    notice.classList.add('order-notice-success');
    notice.innerHTML = '<strong>Order dadakan hari ini tersedia.</strong><p>Pesanan harus dikonfirmasi paling lambat pukul <b>10.00 WIB</b> dan kuota maksimal <b>5 bungkus (sekitar 50 pcs untuk kemasan isi 10)</b>.</p>';
    return;
  }

  notice.classList.add('order-notice-info');
  notice.innerHTML = `<strong>Tanggal pesanan: ${formatOrderDate(selectedDate)}.</strong><p>Sangat dianjurkan memesan minimal <b>1 hari sebelumnya</b> agar stok dan pengiriman bisa dipersiapkan.</p>`;
}

function validateOrderTiming() {
  const selectedDate = $('#orderDate').value;
  const today = getJakartaDateString();
  const packs = cartQuantity();
  const afterCutoff = getJakartaMinutesOfDay() > 600;
  if (!selectedDate || selectedDate < today) {
    showToast('Pilih tanggal pesanan hari ini atau setelahnya.');
    updateOrderTimingNotice();
    $('#orderDate').focus();
    return false;
  }
  if (selectedDate === today && afterCutoff) {
    updateOrderTimingNotice();
    showToast('Order hari ini hanya diterima sampai pukul 10.00 WIB. Pilih tanggal lain.', 2400);
    $('#orderDate').focus();
    return false;
  }
  if (selectedDate === today && packs > 5) {
    updateOrderTimingNotice();
    showToast('Order dadakan maksimal 5 bungkus. Kurangi jumlah atau pilih tanggal lain.', 2400);
    $('#orderDate').focus();
    return false;
  }
  return true;
}

function renderDashboardContact() {
  const address = $('#storeAddressText');
  const adminDisplay = $('#adminWhatsAppDisplay');
  const mapLink = $('#storeMapLink');
  if (address) address.textContent = STORE_ADDRESS;
  if (adminDisplay) {
    adminDisplay.textContent = isWhatsAppConfigured()
      ? `${formatWhatsAppDisplay(getWhatsAppNumber())}`
      : 'Nomor admin belum diatur. Pengelola perlu mengisi config.js.';
  }
  if (mapLink) {
    const lat = Number(STORE_COORDINATES.lat);
    const lng = Number(STORE_COORDINATES.lng);
    mapLink.href = Number.isFinite(lat) && Number.isFinite(lng)
      ? `https://www.openstreetmap.org/?mlat=${encodeURIComponent(lat)}&mlon=${encodeURIComponent(lng)}#map=17/${lat}/${lng}`
      : `https://www.openstreetmap.org/search?query=${encodeURIComponent(STORE_ADDRESS)}`;
  }
}

function formatWhatsAppDisplay(number) {
  const cleaned = String(number || '').replace(/\D/g, '');
  if (!cleaned) return 'Nomor admin belum diatur.';
  if (cleaned.startsWith('62')) {
    const rest = cleaned.slice(2).replace(/(\d{3})(?=\d)/g, '$1 ');
    return `+62 ${rest}`;
  }
  return `+${cleaned}`;
}

function getCartProductList() {
  return products.filter((product) => (cart[product.id] || 0) > 0);
}

function showToast(message, duration = 2800) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.remove('visible');
  // Restart transition so repeated short notices are still noticeable.
  void toast.offsetWidth;
  toast.classList.add('visible');
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('visible'), duration);
}

function navigateTo(page) {
  if (!['dashboard', 'catalog', 'promo', 'order'].includes(page)) return;
  currentPage = page;
  $$('.page').forEach((section) => {
    const active = section.id === `page-${page}`;
    section.hidden = !active;
    section.classList.toggle('active', active);
  });
  $$('[data-nav]').forEach((button) => {
    const active = button.dataset.nav === page;
    button.classList.toggle('active', active && button.classList.contains('nav-link'));
    if (button.classList.contains('mobile-nav-link')) button.classList.toggle('active', active);
    if (button.matches('a[data-nav]')) button.setAttribute('aria-current', active ? 'page' : 'false');
  });
  if (page === 'catalog') renderCatalog();
  if (page === 'order') {
    renderCartItems();
    updateOrderSummary();
    if (deliveryMethod === 'delivery') initializeMapIfNeeded();
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderPopularProducts() {
  const container = $('#popularProducts');
  container.innerHTML = products.slice(0, 2).map((product) => `
    <article class="product-card">
      <button class="product-image-button" data-action="details" data-id="${product.id}" aria-label="Lihat ${escapeHtml(product.name)}">
        <img src="${product.image}" alt="${escapeHtml(product.name)}" loading="lazy">
        <span class="product-label tag tag-yellow">${escapeHtml(product.label)}</span>
      </button>
      <div class="product-card-info"><div><button class="product-card-name" data-action="details" data-id="${product.id}">${escapeHtml(product.name)}</button><div class="price">${rupiah(product.price)}</div></div><button class="add-button" data-action="add" data-id="${product.id}" aria-label="Tambah ${escapeHtml(product.name)} ke keranjang">+</button></div>
    </article>`).join('');
}

function renderCatalog() {
  const searchTerm = ($('#catalogSearch').value || '').trim().toLocaleLowerCase('id-ID');
  let filtered = products.filter((product) => {
    const byCategory = activeCategory === 'semua' || product.category === activeCategory;
    const searchable = `${product.name} ${product.description} ${product.category}`.toLocaleLowerCase('id-ID');
    return byCategory && searchable.includes(searchTerm);
  });

  if (sortMode === 'cheapest') filtered.sort((a, b) => a.price - b.price);
  else if (sortMode === 'expensive') filtered.sort((a, b) => b.price - a.price);
  else if (sortMode === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name, 'id'));
  else filtered.sort((a, b) => a.sortRank - b.sortRank);

  $('#productCountLabel').textContent = `${filtered.length} produk`;
  $('#emptyResults').hidden = filtered.length > 0;
  $('#catalogProducts').innerHTML = filtered.map((product) => `
    <article class="catalog-card">
      <button class="catalog-photo" data-action="details" data-id="${product.id}" aria-label="Lihat detail ${escapeHtml(product.name)}"><img src="${product.image}" alt="${escapeHtml(product.name)}" loading="lazy"></button>
      <div class="catalog-details">
        <div class="catalog-name-row"><button class="catalog-name" data-action="details" data-id="${product.id}">${escapeHtml(product.name)}</button><span class="tag tag-yellow">${escapeHtml(product.label)}</span></div>
        <p class="catalog-description">${escapeHtml(product.description)}</p>
        <div class="catalog-bottom-row"><div class="catalog-price">${rupiah(product.price)} <small>/ pack ${escapeHtml(product.pack.split('/')[0].trim())}</small></div><button class="add-button" data-action="add" data-id="${product.id}" aria-label="Tambah ${escapeHtml(product.name)} ke keranjang">+</button></div>
      </div>
    </article>`).join('');
}

function updateCartBadges() {
  const quantity = cartQuantity();
  $('#cartCount').textContent = quantity;
  $('#catalogCartCount').textContent = quantity;
  const floatingBadge = $('#floatingCartCount');
  if (floatingBadge) floatingBadge.textContent = quantity;
}

function renderCartItems() {
  const items = getCartProductList();
  $('#cartItemSummary').textContent = `${quantityLabel(cartQuantity())}`;
  $('#cartEmpty').hidden = items.length > 0;
  $('#cartItems').innerHTML = items.map((product) => {
    const quantity = cart[product.id];
    return `<article class="cart-item">
      <img class="cart-item-image" src="${product.image}" alt="${escapeHtml(product.name)}">
      <div class="cart-item-info"><h3>${escapeHtml(product.name)}</h3><p>${rupiah(product.price)} / ${escapeHtml(product.pack)}</p><div class="cart-item-price">${rupiah(product.price * quantity)}</div></div>
      <div class="quantity-control" aria-label="Jumlah ${escapeHtml(product.name)}"><button data-action="decrease" data-id="${product.id}" aria-label="Kurangi ${escapeHtml(product.name)}">−</button><span>${quantity}</span><button data-action="add" data-id="${product.id}" aria-label="Tambah ${escapeHtml(product.name)}">+</button></div>
    </article>`;
  }).join('');
  // Keep the checkout button clickable when empty so the user receives an explicit warning.
  $('#placeOrderButton').disabled = false;
  $('#checkoutInlineNotice').hidden = items.length > 0;
  updateCartBadges();
  updateOrderTimingNotice();
}

function quantityLabel(quantity) {
  return `${quantity} ${quantity === 1 ? 'item' : 'item'}`;
}

function calculateDownPayment(total) {
  // Pembulatan ke atas memastikan nominal DP tidak kurang dari 25% karena rupiah tanpa pecahan.
  return Math.ceil(Math.max(0, Number(total) || 0) * 0.25);
}

function updateOrderSummary() {
  const subtotal = cartSubtotal();
  const productDiscount = getWeeklyDiscount();
  const shippingFee = getShippingFee();
  const voucherResult = calculateVoucherDiscount(subtotal, productDiscount, shippingFee);
  const total = Math.max(0, subtotal - productDiscount + shippingFee - voucherResult.amount);
  const downPayment = calculateDownPayment(total);
  const remainingPayment = Math.max(0, total - downPayment);

  $('#subtotalValue').textContent = rupiah(subtotal);
  $('#weeklyDiscountValue').textContent = `− ${rupiah(productDiscount)}`;
  $('#shippingValue').textContent = rupiah(shippingFee);
  $('#voucherDiscountValue').textContent = `− ${rupiah(voucherResult.amount)}`;
  $('#grandTotalValue').textContent = rupiah(total);
  $('#downPaymentValue').textContent = rupiah(downPayment);
  $('#remainingPaymentValue').textContent = rupiah(remainingPayment);
  $('#voucherStatus').textContent = voucherResult.message;
  $('#voucherStatus').style.color = currentVoucher && voucherResult.amount > 0 ? 'var(--green)' : 'var(--muted)';
  const summaryCaption = $('#summaryCaption');
  if (summaryCaption) summaryCaption.textContent = productDiscount > 0
    ? 'Promo produk dihitung otomatis sesuai syarat.'
    : 'Harga, ongkir, dan diskon mengikuti isi keranjang.';
  $('#distanceLabel').textContent = deliveryMethod === 'delivery' && distanceKm > 0 ? `${decimalID(distanceKm)} km` : '—';
  $('#shippingPreview').textContent = rupiah(shippingFee);
  updateOrderTimingNotice();
}

function addToCart(productId, quantity = 1, sourceButton = null) {
  const product = products.find((item) => item.id === productId);
  if (!product) return;

  // Same-day / urgent orders are capped at five packs and close after 10.00 WIB.
  if (isSameDaySelected()) {
    if (getJakartaMinutesOfDay() > 600) {
      showToast('Order hari ini ditutup setelah pukul 10.00 WIB. Pilih tanggal besok atau setelahnya.', 2200);
      return;
    }
    if (cartQuantity() + quantity > 5) {
      showToast('Order dadakan maksimal 5 bungkus (sekitar 50 pcs untuk kemasan isi 10).', 2200);
      return;
    }
  }

  cart[productId] = Math.min(99, (cart[productId] || 0) + quantity);
  saveCart();
  renderCartItems();
  updateOrderSummary();

  if (sourceButton && sourceButton.classList) {
    sourceButton.classList.remove('add-confirmed');
    void sourceButton.offsetWidth;
    sourceButton.classList.add('add-confirmed');
    setTimeout(() => sourceButton.classList.remove('add-confirmed'), 700);
    const productCard = sourceButton.closest('.product-card, .catalog-card');
    if (productCard) {
      productCard.classList.remove('cart-bump');
      void productCard.offsetWidth;
      productCard.classList.add('cart-bump');
      setTimeout(() => productCard.classList.remove('cart-bump'), 450);
    }
  }
  $$('.cart-count, #catalogCartCount').forEach((badge) => {
    badge.classList.remove('count-pop');
    void badge.offsetWidth;
    badge.classList.add('count-pop');
    setTimeout(() => badge.classList.remove('count-pop'), 500);
  });
  showToast(`${product.name} ditambahkan ke keranjang ✓`, 1650);
}

function decreaseFromCart(productId) {
  if (!cart[productId]) return;
  cart[productId] -= 1;
  if (cart[productId] <= 0) delete cart[productId];
  saveCart();
  renderCartItems();
  updateOrderSummary();
}

function openProductDetails(productId) {
  const product = products.find((item) => item.id === productId);
  if (!product) return;
  selectedProduct = product;
  detailQuantity = 1;
  const container = $('#productModalContent');
  container.innerHTML = `
    <img class="modal-product-image" src="${product.image}" alt="${escapeHtml(product.name)}">
    <div class="modal-product-body">
      <span class="tag tag-green">${escapeHtml(product.label === 'Favorit' ? 'Favorit pelanggan' : product.label)}</span>
      <h2 id="modalProductName">${escapeHtml(product.name)}</h2>
      <p>${escapeHtml(product.detail)}</p>
      <div class="modal-price-row"><div><small>Harga per pack</small><strong>${rupiah(product.price)}</strong></div><div class="quantity-control"><button data-action="modal-decrease" aria-label="Kurangi jumlah">−</button><span id="detailQuantity">1</span><button data-action="modal-increase" aria-label="Tambah jumlah">+</button></div></div>
      <div class="modal-facts"><div class="modal-fact"><small>Isi kemasan</small><strong>${escapeHtml(product.pack)}</strong></div><div class="modal-fact"><small>Berat</small><strong>${escapeHtml(product.weight)}</strong></div><div class="modal-fact"><small>Ketahanan</small><strong>${escapeHtml(product.shelfLife)}</strong></div></div>
      <div class="modal-footer-row"><span class="modal-total" id="detailTotal">${rupiah(product.price)}</span><button class="button button-green" data-action="modal-add">Tambah ke keranjang <span>→</span></button></div>
    </div>`;
  $('#productModal').hidden = false;
  document.body.classList.add('modal-open');
  $('#closeProductModal').focus();
}

function updateDetailQuantity() {
  if (!selectedProduct) return;
  $('#detailQuantity').textContent = detailQuantity;
  $('#detailTotal').textContent = rupiah(detailQuantity * selectedProduct.price);
}

function closeProductModal() {
  $('#productModal').hidden = true;
  document.body.classList.remove('modal-open');
  selectedProduct = null;
}

function setDeliveryMethod(method) {
  deliveryMethod = method === 'delivery' ? 'delivery' : 'pickup';
  $$('input[name="deliveryMethod"]').forEach((input) => { input.checked = input.value === deliveryMethod; });
  $('#pickupOption').classList.toggle('selected', deliveryMethod === 'pickup');
  $('#deliveryOption').classList.toggle('selected', deliveryMethod === 'delivery');
  $('#deliveryDetails').hidden = deliveryMethod !== 'delivery';
  if (deliveryMethod === 'delivery') {
    initializeMapIfNeeded();
    if (!leafletReady) {
      $('#manualDistanceWrap').hidden = false;
      $('#mapStatus').textContent = 'Peta tidak dapat dimuat. Jarak manual hanya tersedia sebagai cadangan dan perlu diverifikasi.';
    }
    if (mapInstance) setTimeout(() => mapInstance.invalidateSize(), 80);
  }
  updateOrderSummary();
}

function getWhatsAppNumber() {
  return String((window.APP_CONFIG && window.APP_CONFIG.adminWhatsApp) || '').replace(/\D/g, '');
}

function isWhatsAppConfigured() {
  return /^62\d{8,14}$/.test(getWhatsAppNumber());
}

function openWhatsAppMessage(message) {
  if (!isWhatsAppConfigured()) {
    showToast('Isi nomor WhatsApp admin format 62xxxxxxxxxxx di config.js terlebih dahulu.');
    return false;
  }
  const url = `https://wa.me/${getWhatsAppNumber()}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}

function getPaymentMethodLabel(method = paymentMethod) {
  if (method === 'qris') return 'QRIS';
  if (method === 'cash') return 'Tunai langsung kepada admin';
  return 'Belum dipilih';
}

function updatePaymentMethodUI() {
  const qrisDetails = $('#qrisPaymentDetails');
  const cashDetails = $('#cashPaymentDetails');
  const qrisOption = $('#qrisPaymentOption');
  const cashOption = $('#cashPaymentOption');
  qrisDetails.hidden = paymentMethod !== 'qris';
  cashDetails.hidden = paymentMethod !== 'cash';
  qrisOption.classList.toggle('selected', paymentMethod === 'qris');
  cashOption.classList.toggle('selected', paymentMethod === 'cash');
  $$('input[name="paymentMethod"]').forEach((input) => { input.checked = input.value === paymentMethod; });

  const configuredQris = String((window.APP_CONFIG && window.APP_CONFIG.qrisImageUrl) || '').trim();
  const qrisImage = $('#qrisCodeImage');
  const qrisPlaceholder = $('#qrisPlaceholder');
  if (!configuredQris) {
    qrisImage.hidden = true;
    qrisPlaceholder.hidden = false;
  } else {
    if (qrisImage.dataset.source !== configuredQris) {
      qrisImage.dataset.source = configuredQris;
      qrisImage.onerror = () => {
        qrisImage.hidden = true;
        qrisPlaceholder.hidden = false;
        qrisPlaceholder.innerHTML = '<span class="qris-placeholder-icon" aria-hidden="true">▦</span><strong>Gambar QRIS tidak dapat dimuat</strong><p>Periksa nilai qrisImageUrl di config.js. Jangan membayar sebelum QRIS resmi dapat dilihat dan diverifikasi.</p>';
      };
      qrisImage.onload = () => {
        qrisImage.hidden = false;
        qrisPlaceholder.hidden = true;
      };
      qrisImage.src = configuredQris;
    }
    if (qrisImage.complete && qrisImage.naturalWidth > 0) {
      qrisImage.hidden = false;
      qrisPlaceholder.hidden = true;
    }
  }

  const proofHelp = $('#paymentProofHelp');
  if (paymentMethod === 'qris') {
    proofHelp.textContent = 'Jika sudah membayar DP dengan QRIS, pilih screenshot bukti transfer. Setelah WhatsApp terbuka, lampirkan gambar tersebut secara manual.';
  } else if (paymentMethod === 'cash') {
    proofHelp.textContent = 'Untuk pembayaran tunai, kirim rincian pesanan ini ke admin dan konfirmasikan waktu/tempat membayar DP. File gambar bersifat opsional.';
  } else {
    proofHelp.textContent = 'Pilih metode pembayaran. Jika sudah memiliki screenshot bukti transfer, Anda dapat memilihnya di sini lalu melampirkannya secara manual di WhatsApp.';
  }
}

function resetPaymentProof() {
  if (paymentProofObjectUrl) URL.revokeObjectURL(paymentProofObjectUrl);
  paymentProofObjectUrl = '';
  paymentProofFile = null;
  $('#paymentProofInput').value = '';
  $('#paymentProofPreview').removeAttribute('src');
  $('#paymentProofPreviewWrap').hidden = true;
  $('#paymentProofFileName').textContent = '';
}

function handlePaymentProofSelected(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) {
    resetPaymentProof();
    return;
  }
  if (!file.type.startsWith('image/')) {
    resetPaymentProof();
    showToast('Pilih file gambar seperti JPG, PNG, atau WEBP sebagai bukti pembayaran.');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    resetPaymentProof();
    showToast('Ukuran gambar bukti maksimal 5 MB.');
    return;
  }
  if (paymentProofObjectUrl) URL.revokeObjectURL(paymentProofObjectUrl);
  paymentProofFile = file;
  paymentProofObjectUrl = URL.createObjectURL(file);
  $('#paymentProofPreview').src = paymentProofObjectUrl;
  $('#paymentProofFileName').textContent = file.name;
  $('#paymentProofPreviewWrap').hidden = false;
  showToast('Bukti pembayaran dipilih. Lampirkan manual setelah WhatsApp terbuka.', 2400);
}

function initializeMapIfNeeded() {
  if (mapInitAttempted) {
    if (mapInstance) setTimeout(() => mapInstance.invalidateSize(), 80);
    return;
  }
  mapInitAttempted = true;
  if (!window.L || !$('#map')) {
    leafletReady = false;
    $('#mapFallback').hidden = false;
    $('#manualDistanceWrap').hidden = false;
    $('#mapStatus').textContent = 'Library peta tidak berhasil dimuat. Periksa koneksi internet atau gunakan jarak manual yang telah diverifikasi.';
    return;
  }

  try {
    leafletReady = true;
    mapInstance = L.map('map', { scrollWheelZoom: true }).setView([BANDUNG_CENTER.lat, BANDUNG_CENTER.lng], 13);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      minZoom: 5,
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
    }).addTo(mapInstance);
    const originIcon = L.divIcon({ className: 'agr-div-icon', html: '<span class="agr-map-pin agr-map-pin-origin"></span>', iconSize: [28, 36], iconAnchor: [14, 34] });
    originMarker = L.marker([BANDUNG_CENTER.lat, BANDUNG_CENTER.lng], { icon: originIcon }).addTo(mapInstance)
      .bindPopup(`<strong>${escapeHtml(STORE_NAME)}</strong><br>${escapeHtml(STORE_ADDRESS)}<br><small>Pastikan titik asal pada config.js benar.</small>`);
    $('#mapFallback').hidden = true;
    $('#manualDistanceWrap').hidden = true;
    $('#mapStatus').textContent = 'Peta aktif. Pin hijau adalah titik asal demo; klik peta untuk memilih tujuan atau cari nama tempat/alamat.';

    mapInstance.on('click', (event) => {
      setDestinationPoint(event.latlng.lat, event.latlng.lng, { reverseLookup: true, label: 'Titik tujuan dari peta' });
    });
    setTimeout(() => mapInstance.invalidateSize(), 80);
  } catch (error) {
    console.error(error);
    leafletReady = false;
    $('#mapFallback').hidden = false;
    $('#manualDistanceWrap').hidden = false;
    $('#mapStatus').textContent = 'Peta gagal dimuat. Periksa koneksi dan gunakan mode jarak manual bila diperlukan.';
  }
}

function clearRouteLine() {
  if (routeLine && mapInstance) {
    mapInstance.removeLayer(routeLine);
    routeLine = null;
  }
}

function setDestinationPoint(lat, lng, options = {}) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    showToast('Koordinat lokasi tidak valid.');
    return;
  }
  selectedDestination = { lat: latitude, lng: longitude };
  routeIsCurrent = false;
  distanceKm = 0; // reset ongkir lama agar tidak terlihat berlaku untuk lokasi yang baru dipilih
  lastRouteDurationSeconds = null;
  clearRouteLine();
  const safeFallbackLabel = 'Area lokasi pilihan di peta';
  $('#destinationAddress').value = options.address || safeFallbackLabel;
  $('#locationSearchResults').hidden = true;
  if (mapInstance && window.L) {
    if (!destinationMarker) {
      const destinationIcon = L.divIcon({ className: 'agr-div-icon', html: '<span class="agr-map-pin agr-map-pin-destination"></span>', iconSize: [28, 36], iconAnchor: [14, 34] });
      destinationMarker = L.marker([latitude, longitude], { draggable: true, icon: destinationIcon }).addTo(mapInstance);
      destinationMarker.on('dragend', () => {
        const point = destinationMarker.getLatLng();
        setDestinationPoint(point.lat, point.lng, { reverseLookup: true, label: 'Pin tujuan digeser' });
      });
    } else destinationMarker.setLatLng([latitude, longitude]);
    destinationMarker.bindPopup('<strong>Lokasi tujuan</strong><br>Geser pin untuk menyesuaikan titik pengiriman.');
    if (options.zoom !== false) mapInstance.setView([latitude, longitude], Math.max(mapInstance.getZoom(), 15));
  }
  $('#mapStatus').textContent = `${options.label || 'Lokasi tujuan dipilih'}: ${options.address || safeFallbackLabel}. Klik “Hitung jarak & ongkir” untuk mendapatkan rute jalan.`;
  updateOrderSummary();
  if (options.reverseLookup) reverseGeocodeDestination(latitude, longitude);
}

async function waitForNominatimSlot() {
  const waitMs = Math.max(0, 1100 - (Date.now() - lastNominatimRequestAt));
  if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
  lastNominatimRequestAt = Date.now();
}

async function reverseGeocodeDestination(lat, lng) {
  const token = ++reverseLookupToken;
  try {
    await waitForNominatimSlot();
    if (token !== reverseLookupToken) return;
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Pencarian alamat gagal (${response.status}).`);
    const result = await response.json();
    if (token !== reverseLookupToken || !selectedDestination || selectedDestination.lat !== lat || selectedDestination.lng !== lng) return;
    if (result.display_name) {
      const shortAddress = compactLocationLabel(result);
      $('#destinationAddress').value = shortAddress;
      $('#mapStatus').textContent = `Tujuan dipilih: ${shortAddress}. Klik “Hitung jarak & ongkir” untuk menghitung rute.`;
    }
  } catch (error) {
    console.warn('Reverse geocoding tidak tersedia:', error);
    if (token === reverseLookupToken) $('#mapStatus').textContent = 'Titik pada peta dipilih. Tambahkan alamat umum dan patokan agar admin mudah mengenali lokasi; jarak tetap dihitung dari pin peta.';
  }
}

async function searchLocation() {
  const query = $('#destinationAddress').value.trim();
  if (query.length < 3) {
    showToast('Masukkan nama tempat atau alamat minimal 3 karakter.');
    $('#destinationAddress').focus();
    return;
  }
  if (!window.fetch) {
    showToast('Browser tidak mendukung pencarian lokasi.');
    return;
  }
  const button = $('#searchLocationButton');
  button.disabled = true;
  button.textContent = 'Mencari…';
  $('#mapStatus').textContent = 'Mencari lokasi. Layanan gratis membatasi frekuensi pencarian; gunakan tombol ini, bukan autocomplete.';
  try {
    await waitForNominatimSlot();
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=id&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Pencarian gagal (${response.status}).`);
    const results = await response.json();
    lastSearchResults = Array.isArray(results) ? results : [];
    const container = $('#locationSearchResults');
    if (!lastSearchResults.length) {
      container.hidden = false;
      container.innerHTML = '<p class="location-no-results">Lokasi tidak ditemukan. Coba nama jalan, gedung, kecamatan, atau kota yang lebih lengkap.</p>';
      $('#mapStatus').textContent = 'Tidak ada hasil. Coba kata kunci yang lebih spesifik.';
      return;
    }
    container.innerHTML = lastSearchResults.map((result, index) => { const shortLabel = compactLocationLabel(result); return `<button type="button" class="location-result" data-location-index="${index}"><strong>${escapeHtml(shortLabel.split(',')[0])}</strong><span>${escapeHtml(shortLabel)}</span></button>`; }).join('');
    container.hidden = false;
    $('#mapStatus').textContent = `Ditemukan ${lastSearchResults.length} pilihan. Klik lokasi yang paling sesuai.`;
  } catch (error) {
    console.error(error);
    $('#mapStatus').textContent = 'Pencarian lokasi tidak tersedia sekarang. Anda tetap dapat mengeklik peta untuk memilih titik.';
    showToast('Gagal mencari lokasi. Coba kembali beberapa saat lagi.');
  } finally {
    button.disabled = false;
    button.textContent = 'Cari lokasi';
  }
}

function chooseSearchResult(index) {
  const result = lastSearchResults[Number(index)];
  if (!result) return;
  setDestinationPoint(Number(result.lat), Number(result.lon), {
    address: compactLocationLabel(result),
    label: 'Lokasi hasil pencarian dipilih'
  });
  if (mapInstance) mapInstance.setView([Number(result.lat), Number(result.lon)], 16);
}

function useMyLocation() {
  if (!navigator.geolocation) {
    showToast('Browser ini tidak mendukung akses lokasi perangkat.');
    return;
  }
  $('#mapStatus').textContent = 'Meminta izin lokasi dari browser…';
  navigator.geolocation.getCurrentPosition((position) => {
    setDestinationPoint(position.coords.latitude, position.coords.longitude, { reverseLookup: true, label: 'Lokasi perangkat dipilih' });
    if (mapInstance) mapInstance.setView([position.coords.latitude, position.coords.longitude], 16);
  }, (error) => {
    const message = error.code === 1 ? 'Izin lokasi ditolak. Anda bisa memilih titik langsung di peta.' : 'Lokasi perangkat tidak dapat dibaca. Pilih titik langsung di peta.';
    $('#mapStatus').textContent = message;
    showToast(message);
  }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
}

function syncManualDistance(showMessage = true) {
  const input = $('#manualDistance');
  const value = Number(input.value);
  if (!Number.isFinite(value) || value <= 0 || value > 500) {
    if (showMessage) showToast('Masukkan jarak manual antara 0,1 sampai 500 km.');
    return false;
  }
  distanceKm = Math.round(value * 10) / 10;
  routeIsCurrent = true;
  lastRouteDurationSeconds = null;
  $('#distanceLabel').textContent = `${decimalID(distanceKm)} km`;
  $('#shippingPreview').textContent = rupiah(getShippingFee());
  if (showMessage) $('#mapStatus').textContent = `Mode cadangan manual: ongkir dihitung ${decimalID(distanceKm)} km × Rp 3.000/km. Pastikan jarak diverifikasi.`;
  updateOrderSummary();
  return true;
}

async function calculateDistance(options = {}) {
  const silent = options.silent === true;
  if (deliveryMethod !== 'delivery') setDeliveryMethod('delivery');

  if (!leafletReady || !mapInstance) {
    if (!$('#destinationAddress').value.trim()) {
      if (!silent) showToast('Masukkan alamat tujuan terlebih dahulu untuk memakai jarak manual.');
      return false;
    }
    const ok = syncManualDistance(!silent);
    if (ok && !silent) showToast('Ongkir dihitung dari jarak manual.');
    return ok;
  }
  if (!selectedDestination) {
    if (!silent) showToast('Pilih lokasi tujuan di peta atau cari alamat terlebih dahulu.');
    return false;
  }

  const button = $('#calculateDistanceButton');
  button.disabled = true;
  button.textContent = 'Menghitung…';
  try {
    $('#mapStatus').textContent = 'Menghitung rute berkendara melalui layanan rute terbuka…';
    const origin = BANDUNG_CENTER;
    const destination = selectedDestination;
    const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
    const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Layanan rute gagal (${response.status}).`);
    const data = await response.json();
    const route = data.routes && data.routes[0];
    if (data.code !== 'Ok' || !route || !Number.isFinite(route.distance)) throw new Error('Rute tidak ditemukan untuk titik tersebut.');

    distanceKm = Math.round((route.distance / 1000) * 10) / 10;
    lastRouteDurationSeconds = Number.isFinite(route.duration) ? route.duration : null;
    routeIsCurrent = true;
    clearRouteLine();
    const latLngs = (route.geometry && route.geometry.coordinates || []).map(([lng, lat]) => [lat, lng]);
    if (latLngs.length) {
      routeLine = L.polyline(latLngs, { color: '#28764b', weight: 5, opacity: 0.85 }).addTo(mapInstance);
      mapInstance.fitBounds(routeLine.getBounds(), { padding: [24, 24] });
    }
    $('#manualDistanceWrap').hidden = true;
    const durationText = lastRouteDurationSeconds ? ` · perkiraan ${Math.max(1, Math.round(lastRouteDurationSeconds / 60))} menit` : '';
    $('#mapStatus').textContent = `Rute berkendara diperkirakan ${decimalID(distanceKm)} km${durationText}. Ongkir dihitung Rp 3.000 per km. Estimasi layanan terbuka; konfirmasi jarak dengan admin.`;
    updateOrderSummary();
    if (!silent) showToast(`Jarak rute ${decimalID(distanceKm)} km berhasil dihitung.`);
    return true;
  } catch (error) {
    console.error(error);
    routeIsCurrent = false;
    $('#manualDistanceWrap').hidden = false;
    $('#mapStatus').textContent = 'Rute otomatis tidak tersedia. Coba pilih titik lain atau masukkan jarak manual yang sudah diverifikasi.';
    if (!silent) showToast('Rute belum tersedia. Periksa koneksi atau gunakan jarak manual terverifikasi.');
    return false;
  } finally {
    button.disabled = false;
    button.textContent = 'Hitung jarak & ongkir';
  }
}

function applyVoucher(code) {
  const normalized = String(code || '').trim().toUpperCase();
  const validCodes = ['GORENG25', 'GRATISONGKIR', 'BARU10'];
  if (!validCodes.includes(normalized)) {
    currentVoucher = '';
    $('#voucherCode').value = normalized;
    updateOrderSummary();
    $('#voucherStatus').textContent = 'Kode tidak ditemukan. Periksa kembali kode voucher.';
    showToast('Kode voucher tidak ditemukan.');
    return false;
  }
  currentVoucher = normalized;
  $('#voucherCode').value = normalized;
  updateOrderSummary();
  if (cartQuantity() === 0) showToast(`Kode ${normalized} disimpan. Tambahkan produk terlebih dahulu.`);
  else showToast(`Voucher ${normalized} dipilih. Periksa syarat pemakaiannya.`);
  return true;
}

function applyPromoUse(code) {
  applyVoucher(code);
  navigateTo('order');
}

function placeOrder() {
  if (cartQuantity() === 0) {
    $('#checkoutInlineNotice').hidden = false;
    showToast('Keranjang masih kosong. Tambahkan produk sebelum konfirmasi pembayaran DP.', 2200);
    $('#checkoutInlineNotice').scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  if (!validateOrderTiming()) return;
  if (!paymentMethod) {
    showToast('Pilih metode pembayaran DP: QRIS atau tunai langsung ke admin.');
    $('#paymentChoiceTitle').scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  if (!isWhatsAppConfigured()) {
    showToast('Admin belum terhubung. Isi nomor WhatsApp admin di config.js sebelum menerima pesanan.');
    return;
  }
  if (deliveryMethod === 'delivery') {
    const address = $('#destinationAddress').value.trim();
    if (!selectedDestination) {
      showToast('Pilih lokasi tujuan di peta atau gunakan pencarian lokasi.');
      $('#destinationAddress').focus();
      return;
    }
    if (!address || address === 'Area lokasi pilihan di peta') {
      showToast('Isi alamat umum, misalnya nama jalan atau kelurahan.');
      $('#destinationAddress').focus();
      return;
    }
    if (!routeIsCurrent) {
      showToast('Hitung jarak dan ongkir tujuan terlebih dahulu.');
      calculateDistance();
      return;
    }
  }

  const subtotal = cartSubtotal();
  const discount = getWeeklyDiscount();
  const shipping = getShippingFee();
  const voucher = calculateVoucherDiscount(subtotal, discount, shipping);
  const total = Math.max(0, subtotal - discount + shipping - voucher.amount);
  const downPayment = calculateDownPayment(total);
  const remainingPayment = Math.max(0, total - downPayment);
  const summaryItems = getCartProductList().map((product) => `${product.name} x${cart[product.id]} (${rupiah(product.price)} / pack)`).join('\n');
  const note = $('#orderNote').value.trim();
  const destinationText = deliveryMethod === 'delivery' ? $('#destinationAddress').value.trim() : STORE_ADDRESS;
  const destinationLandmark = deliveryMethod === 'delivery' ? $('#destinationLandmark').value.trim() : '';
  const order = {
    orderId: `AGR-${Date.now()}`,
    createdAt: new Date().toISOString(),
    transactionDate: formatJakartaDateTime(),
    orderDate: $('#orderDate').value,
    orderType: $('#orderDate').value === getJakartaDateString() ? 'Order dadakan hari ini' : 'Pesanan terjadwal',
    items: summaryItems.replace(/\n/g, ', '),
    method: deliveryMethod === 'delivery' ? 'Antar ke tempat' : 'Ambil di tempat',
    address: destinationText,
    landmark: destinationLandmark,
    distanceKm: deliveryMethod === 'delivery' ? distanceKm : 0,
    shipping,
    subtotal,
    productDiscount: discount,
    voucher: currentVoucher,
    voucherDiscount: voucher.amount,
    total,
    downPayment,
    remainingPayment,
    downPaymentPercent: 25,
    paymentMethod,
    paymentMethodLabel: getPaymentMethodLabel(),
    paymentProofFileName: paymentProofFile ? paymentProofFile.name : '',
    note
  };

  const message = [
    `Halo Admin ${STORE_NAME}, saya ingin konfirmasi pesanan.`,
    '',
    `Nomor pesanan: ${order.orderId}`,
    `Tanggal transaksi: ${order.transactionDate}`,
    `Tanggal sampai / pengambilan: ${formatJakartaDate(order.orderDate)}`,
    `Jenis pesanan: ${order.orderType}`,
    `Produk:\n${summaryItems}`,
    `Metode: ${order.method}`,
    `Alamat: ${destinationText}`,
    deliveryMethod === 'delivery' && destinationLandmark ? `Patokan: ${destinationLandmark}` : '',
    deliveryMethod === 'delivery' ? `Estimasi jarak: ${decimalID(distanceKm)} km` : '',
    '',
    `Subtotal: ${rupiah(subtotal)}`,
    `Diskon promo produk: ${rupiah(discount)}`,
    `Ongkir: ${rupiah(shipping)}`,
    `Voucher${currentVoucher ? ` (${currentVoucher})` : ''}: -${rupiah(voucher.amount)}`,
    `TOTAL PESANAN: ${rupiah(total)}`,
    `DP WAJIB 25%: ${rupiah(downPayment)}`,
    `Sisa setelah DP: ${rupiah(remainingPayment)}`,
    `METODE PEMBAYARAN DP: ${getPaymentMethodLabel()}`,
    paymentMethod === 'qris' && !String((window.APP_CONFIG && window.APP_CONFIG.qrisImageUrl) || '').trim()
      ? 'Mohon kirimkan QRIS resmi/instruksi pembayaran. Saya akan membayar setelah QRIS dikonfirmasi admin.'
      : paymentMethod === 'qris'
        ? 'Saya memilih pembayaran DP dengan QRIS. Saya akan melampirkan bukti transfer di chat WhatsApp ini setelah membayar.'
        : 'Saya memilih pembayaran DP tunai langsung kepada admin. Mohon konfirmasi waktu dan tempat pembayaran.',
    paymentProofFile ? `File bukti pembayaran yang dipilih: ${paymentProofFile.name} (akan saya lampirkan manual di WhatsApp).` : '',
    note ? `Catatan: ${note}` : '',
    '',
    'Rincian di atas adalah bukti ringkasan pesanan saya. Mohon admin mengonfirmasi stok, jadwal, metode pembayaran, dan nominal DP sebelum pesanan diproses.'
  ].filter(Boolean).join('\n');

  try { localStorage.setItem('agrLastOrder', JSON.stringify(order)); } catch (_error) { /* Penyimpanan riwayat lokal opsional. */ }
  const opened = openWhatsAppMessage(message);
  if (!opened) return;

  cart = {};
  currentVoucher = '';
  selectedDestination = null;
  routeIsCurrent = false;
  distanceKm = 0;
  saveCart();
  $('#voucherCode').value = '';
  $('#orderNote').value = '';
  $('#orderDate').value = getTomorrowDateString();
  $('#destinationAddress').value = '';
  $('#destinationLandmark').value = '';
  paymentMethod = '';
  updatePaymentMethodUI();
  resetPaymentProof();
  renderCartItems();
  setDeliveryMethod('pickup');
  updateOrderSummary();
  showToast('Ringkasan pesanan dibuka di WhatsApp. Lampirkan bukti transfer manual jika diperlukan, lalu tunggu konfirmasi admin.', 3200);
  navigateTo('dashboard');
}

function bindEvents() {
  document.addEventListener('click', (event) => {
    const navButton = event.target.closest('[data-nav]');
    if (navButton) {
      event.preventDefault();
      navigateTo(navButton.dataset.nav);
      return;
    }

    const actionButton = event.target.closest('[data-action]');
    if (actionButton) {
      const { action, id } = actionButton.dataset;
      if (action === 'add') addToCart(id, 1, actionButton);
      else if (action === 'decrease') decreaseFromCart(id);
      else if (action === 'details') openProductDetails(id);
      else if (action === 'modal-decrease') { detailQuantity = Math.max(1, detailQuantity - 1); updateDetailQuantity(); }
      else if (action === 'modal-increase') { detailQuantity = Math.min(99, detailQuantity + 1); updateDetailQuantity(); }
      else if (action === 'modal-add' && selectedProduct) {
        addToCart(selectedProduct.id, detailQuantity, actionButton);
        closeProductModal();
      }
      return;
    }

    const voucherButton = event.target.closest('[data-use-voucher]');
    if (voucherButton) { applyPromoUse(voucherButton.dataset.useVoucher); return; }
  });

  $('#openCartTop').addEventListener('click', () => navigateTo('order'));
  $('#openCartFloating').addEventListener('click', () => navigateTo('order'));
  $('#openCartCatalog').addEventListener('click', () => navigateTo('order'));
  $('#catalogSearch').addEventListener('input', renderCatalog);
  $('#clearSearch').addEventListener('click', () => { $('#catalogSearch').value = ''; renderCatalog(); $('#catalogSearch').focus(); });
  $('#sortProducts').addEventListener('change', (event) => { sortMode = event.target.value; renderCatalog(); });
  $('#categoryFilters').addEventListener('click', (event) => {
    const chip = event.target.closest('[data-category]');
    if (!chip) return;
    activeCategory = chip.dataset.category;
    $$('#categoryFilters .filter-chip').forEach((item) => item.classList.toggle('selected', item === chip));
    renderCatalog();
  });
  $('#closeProductModal').addEventListener('click', closeProductModal);
  $('#productModal').addEventListener('click', (event) => { if (event.target === $('#productModal')) closeProductModal(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !$('#productModal').hidden) closeProductModal(); });
  $$('input[name="deliveryMethod"]').forEach((input) => input.addEventListener('change', (event) => setDeliveryMethod(event.target.value)));
  $('#manualDistance').addEventListener('input', () => syncManualDistance(false));
  $('#calculateDistanceButton').addEventListener('click', () => calculateDistance());
  $('#searchLocationButton').addEventListener('click', searchLocation);
  $('#destinationAddress').addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); searchLocation(); } });
  $('#destinationAddress').addEventListener('input', () => {
    selectedDestination = null;
    routeIsCurrent = false;
    distanceKm = 0;
    clearRouteLine();
    $('#locationSearchResults').hidden = true;
    $('#mapStatus').textContent = 'Alamat berubah. Klik “Cari lokasi” lalu pilih hasil pencarian, atau klik peta untuk memilih titik.';
    updateOrderSummary();
  });
  $('#locationSearchResults').addEventListener('click', (event) => {
    const resultButton = event.target.closest('[data-location-index]');
    if (resultButton) chooseSearchResult(resultButton.dataset.locationIndex);
  });
  $('#useMyLocationButton').addEventListener('click', useMyLocation);
  $('#whatsappSupport').addEventListener('click', (event) => {
    event.preventDefault();
    openWhatsAppMessage(`Halo Admin ${STORE_NAME}, saya ingin bertanya tentang produk dan pemesanan tahu.`);
  });
  $('#applyVoucherButton').addEventListener('click', () => applyVoucher($('#voucherCode').value));
  $('#voucherCode').addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); applyVoucher($('#voucherCode').value); } });
  $$('input[name="paymentMethod"]').forEach((input) => input.addEventListener('change', (event) => {
    paymentMethod = event.target.value;
    updatePaymentMethodUI();
  }));
  $('#paymentProofInput').addEventListener('change', handlePaymentProofSelected);
  $('#removePaymentProofButton').addEventListener('click', () => {
    resetPaymentProof();
    showToast('Gambar bukti pembayaran dihapus.');
  });
  $('#placeOrderButton').addEventListener('click', placeOrder);
  $('#contactAdminDashboard').addEventListener('click', () => {
    openWhatsAppMessage(`Halo Admin ${STORE_NAME}, saya ingin bertanya tentang produk, stok, dan jadwal pemesanan.`);
  });
}

function init() {
  $('#currentYear').textContent = new Date().getFullYear();
  configureOrderDate();
  renderDashboardContact();
  renderPopularProducts();
  renderCatalog();
  renderCartItems();
  updateOrderSummary();
  updateOrderTimingNotice();
  renderTransactionDates();
  updatePaymentMethodUI();
  bindEvents();
  // Peta diinisialisasi saat metode antar dipilih, sehingga tidak memuat tile lebih awal.
  $('#mapFallback').hidden = false;
}

document.addEventListener('DOMContentLoaded', init);

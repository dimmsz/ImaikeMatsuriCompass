const venues = [
  { id: 1, name: '今池ガスホール', landmark: '今池ガスビル9F', lat: 35.16890, lng: 136.93650, note: '公式タイムテーブル会場' },
  { id: 2, name: 'ストリートコーナーパラダイス', landmark: '今池交差点・りそな銀行前', lat: 35.16972, lng: 136.93696, note: '公式タイムテーブル会場' },
  { id: 3, name: '東南会場', landmark: 'ダイエー通・JTPパーキング', lat: 35.16903, lng: 136.93800, note: '公式タイムテーブル会場' },
  { id: 4, name: '一本裏会場', landmark: 'セブンイレブン今池駅南店駐車場', lat: 35.16828, lng: 136.93695, note: '公式タイムテーブル会場' },
  { id: 5, name: '十六広場', landmark: '十六銀行 今池支店駐車場', lat: 35.16880, lng: 136.93600, note: '公式タイムテーブル会場' },
  { id: 6, name: '西南会場', landmark: '中屋50m西入る', lat: 35.16900, lng: 136.93492, note: '公式タイムテーブル会場' },
  { id: 7, name: 'Imaike Park会場', landmark: '今池公園', lat: 35.16772, lng: 136.93422, note: '公式タイムテーブル会場' },
  { id: 8, name: 'ノースアイランド', landmark: '魚清前', lat: 35.16990, lng: 136.93780, note: '公式タイムテーブル会場' },
  { id: 9, name: '4丁目Pit', landmark: '水野胃腸科P', lat: 35.16855, lng: 136.93815, note: '公式タイムテーブル会場' },
  { id: 10, name: '下町ネバーランド', landmark: 'スギヤマ調剤薬局駐車場近辺', lat: 35.16930, lng: 136.93700, note: '公式タイムテーブル会場' }
];

const mapBounds = { minLat: 35.1669, maxLat: 35.1708, minLng: 136.9334, maxLng: 136.9391 };
const markerLayer = document.getElementById('markerLayer');
const venueList = document.getElementById('venueList');
const venueCount = document.getElementById('venueCount');
const searchInput = document.getElementById('searchInput');
const dialog = document.getElementById('venueDialog');
const dialogBody = document.getElementById('dialogBody');
const locateButton = document.getElementById('locateButton');

function project(lat, lng) {
  const x = ((lng - mapBounds.minLng) / (mapBounds.maxLng - mapBounds.minLng)) * 100;
  const y = (1 - ((lat - mapBounds.minLat) / (mapBounds.maxLat - mapBounds.minLat))) * 100;
  return { x: Math.max(4, Math.min(96, x)), y: Math.max(8, Math.min(92, y)) };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function mapsUrl(venue) {
  return `https://www.google.com/maps/search/?api=1&query=${venue.lat},${venue.lng}`;
}

function showVenue(venue) {
  dialogBody.innerHTML = `
    <h2>${escapeHtml(venue.name)}</h2>
    <p><strong>目印：</strong>${escapeHtml(venue.landmark)}</p>
    <p>${escapeHtml(venue.note)}</p>
    <a class="primary-link" href="${mapsUrl(venue)}" target="_blank" rel="noopener">Google Mapsで開く</a>
  `;
  if (typeof dialog.showModal === 'function') dialog.showModal();
}

function renderMarkers(items) {
  markerLayer.innerHTML = '';
  items.forEach((venue, index) => {
    const pos = project(venue.lat, venue.lng);
    const button = document.createElement('button');
    button.className = 'marker';
    button.style.left = `${pos.x}%`;
    button.style.top = `${pos.y}%`;
    button.type = 'button';
    button.innerHTML = `<div class="marker-pin"><span>${index + 1}</span></div><div class="marker-label">${escapeHtml(venue.name)}</div>`;
    button.addEventListener('click', () => showVenue(venue));
    markerLayer.appendChild(button);
  });
}

function renderList(items) {
  venueCount.textContent = `${items.length}会場`;
  venueList.innerHTML = items.length ? items.map((venue, index) => `
    <button class="venue-card" type="button" data-venue-id="${venue.id}">
      <h3>${index + 1}. ${escapeHtml(venue.name)}</h3>
      <p>${escapeHtml(venue.landmark)}</p>
      <span class="tag">タップして詳細・地図</span>
    </button>
  `).join('') : '<p>該当する会場がありません。</p>';
  venueList.querySelectorAll('[data-venue-id]').forEach(button => {
    button.addEventListener('click', () => {
      const venue = venues.find(v => v.id === Number(button.dataset.venueId));
      if (venue) showVenue(venue);
    });
  });
}

function render() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = venues.filter(v => `${v.name} ${v.landmark}`.toLowerCase().includes(query));
  renderMarkers(filtered);
  renderList(filtered);
}

searchInput.addEventListener('input', render);
locateButton.addEventListener('click', () => {
  if (!navigator.geolocation) {
    alert('このブラウザでは現在地取得に対応していません。');
    return;
  }
  locateButton.disabled = true;
  navigator.geolocation.getCurrentPosition(
    position => {
      const { latitude, longitude } = position.coords;
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`, '_blank', 'noopener');
      locateButton.disabled = false;
    },
    () => {
      alert('現在地を取得できませんでした。ブラウザの位置情報を許可してください。');
      locateButton.disabled = false;
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

render();

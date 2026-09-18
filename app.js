const SUPABASE_URL = 'https://ufypynzhmbrozbxbqxsq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_lQvSmWOndjOMgL5sd5Xdsw_VZEv2k07';
const EVENT_DATES = ['2026-09-20', '2026-09-21'];
const venues = [
  { id: 1, name: '今池ガスホール', landmark: '今池ガスビル9F', lat: 35.16890, lng: 136.93650 },
  { id: 2, name: 'ストリートコーナーパラダイス', landmark: '今池交差点・りそな銀行前', lat: 35.16955, lng: 136.93705 },
  { id: 3, name: '東南会場', landmark: 'ダイエー通・JTPパーキング', lat: 35.16903, lng: 136.93800 },
  { id: 4, name: '一本裏会場', landmark: 'セブンイレブン今池駅南店駐車場', lat: 35.16828, lng: 136.93695 },
  { id: 5, name: '十六広場', landmark: '十六銀行 今池支店駐車場', lat: 35.16880, lng: 136.93600 },
  { id: 6, name: '西南会場', landmark: '中屋50m西入る', lat: 35.16900, lng: 136.93492 },
  { id: 7, name: 'Imaike Park会場', landmark: '今池公園', lat: 35.16772, lng: 136.93422 },
  { id: 8, name: 'ノースアイランド', landmark: '魚清前', lat: 35.16990, lng: 136.93780 },
  { id: 9, name: '4丁目Pit', landmark: '水野胃腸科P', lat: 35.16855, lng: 136.93815 },
  { id: 10, name: '下町ネバーランド', landmark: 'スギヤマ調剤薬局駐車場近辺', lat: 35.16930, lng: 136.93700 }
];
const mapBounds = { minLat: 35.1669, maxLat: 35.1708, minLng: 136.9334, maxLng: 136.9391 };
const map = L.map('map', { zoomControl: true }).setView([35.1688, 136.9365], 16);
const baseMapLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' }).addTo(map);
const majorRoadLayer = L.layerGroup();
const otherRoadLayer = L.layerGroup();
const venueLayer = L.layerGroup().addTo(map);
const venueMarkers = [];
let currentLocationMarker = null;
let schedules = [];
let schedulesLoaded = false;
let showLabels = true;

const venueList = document.getElementById('venueList');
const venueCount = document.getElementById('venueCount');
const searchInput = document.getElementById('searchInput');
const dialog = document.getElementById('venueDialog');
const dialogBody = document.getElementById('dialogBody');
const locateButton = document.getElementById('locateButton');
const showBaseMap = document.getElementById('showBaseMap');
const showMajorRoads = document.getElementById('showMajorRoads');
const showOtherRoads = document.getElementById('showOtherRoads');
const showVenuePins = document.getElementById('showVenuePins');
const showVenueLabels = document.getElementById('showVenueLabels');

function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function mapsUrl(venue) { return `https://www.google.com/maps/search/?api=1&query=${venue.lat},${venue.lng}`; }
function formatDate(value) { const d = new Date(`${value}T00:00:00Z`); return `${d.getUTCMonth() + 1}月${d.getUTCDate()}日（${['日','月','火','水','木','金','土'][d.getUTCDay()]}）`; }
function formatTime(value) { return value ? String(value).slice(0, 5) : ''; }
function venueSchedules(id) { return schedules.filter(s => Number(s.venue_id) === id); }
function genreClass(genre) { return ({ 音楽: 'music', ダンス: 'dance', ステージ: 'stage', その他: 'other' })[genre] || 'other'; }
function setLayerVisibility(layer, visible) {
  const visibleNow = map.hasLayer(layer);
  if (visible && !visibleNow) map.addLayer(layer);
  if (!visible && visibleNow) map.removeLayer(layer);
}

function showVenue(venue) {
  const items = venueSchedules(venue.id);
  const content = schedulesLoaded ? EVENT_DATES.map(date => {
    const dayItems = items.filter(i => i.event_date === date).sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)) || Number(a.sort_order || 0) - Number(b.sort_order || 0));
    if (!dayItems.length) return `<section class="schedule-day"><div class="schedule-date"><h3>${formatDate(date)}</h3><span class="day-count">0件</span></div><p class="schedule-empty">予定はありません。</p></section>`;
    return `<section class="schedule-day"><div class="schedule-date"><h3>${formatDate(date)}</h3><span class="day-count">${dayItems.length}件</span></div><div class="schedule-items">${dayItems.map(item => { const genre = item.genre || 'その他'; const tags = Array.isArray(item.tags) ? item.tags : []; const end = formatTime(item.end_time); return `<article class="schedule-item genre-${genreClass(genre)}"><div class="schedule-time"><time>${escapeHtml(formatTime(item.start_time))}</time><span>${end ? `〜${escapeHtml(end)}` : 'START'}</span></div><div class="schedule-main"><div class="schedule-meta"><span class="genre-badge">${escapeHtml(genre)}</span>${tags.map(t => `<span class="schedule-tag">#${escapeHtml(t)}</span>`).join('')}</div><div class="schedule-title">${escapeHtml(item.title)}</div>${item.description ? `<p class="schedule-description">${escapeHtml(item.description)}</p>` : ''}</div></article>`; }).join('')}</div></section>`;
  }).join('') : '<p class="schedule-loading">タイムスケジュールを読み込み中…</p>';
  dialogBody.innerHTML = `<div class="dialog-venue-header"><div><div class="dialog-kicker">会場 ${venue.id}</div><h2>${escapeHtml(venue.name)}</h2><p class="venue-landmark">📍 ${escapeHtml(venue.landmark)}</p></div><span class="venue-total">${items.length}ステージ</span></div><div class="schedule-heading-row"><div class="schedule-heading">タイムテーブル</div><span>2026</span></div><div class="schedule-note">開始時刻順に表示しています。終了時刻は公式発表がある場合のみ表示します。</div>${content}<a class="primary-link" href="${mapsUrl(venue)}" target="_blank" rel="noopener">📍 Google Mapsで会場を開く</a>`;
  if (typeof dialog.showModal === 'function') dialog.showModal();
}

function venueIcon(number) {
  return L.divIcon({ className: 'venue-marker-icon', html: `<span>${number}</span>`, iconSize: [34, 42], iconAnchor: [17, 42] });
}
function renderMarkers(items) {
  venueLayer.clearLayers();
  venueMarkers.length = 0;
  items.forEach(venue => {
    const marker = L.marker([venue.lat, venue.lng], { icon: venueIcon(venue.id), title: venue.name });
    marker.bindTooltip(venue.name, { permanent: showLabels, direction: 'top', offset: [0, -38], className: 'venue-tooltip' });
    marker.on('click', () => showVenue(venue));
    venueMarkers.push(marker);
    if (showVenuePins.checked) marker.addTo(venueLayer);
  });
}
function updateLabelVisibility() {
  showLabels = showVenueLabels.checked;
  venueMarkers.forEach(marker => showLabels ? marker.openTooltip() : marker.closeTooltip());
}
function renderList(items) {
  venueCount.textContent = `${items.length}会場`;
  venueList.innerHTML = items.length ? items.map(venue => `<button class="venue-card" type="button" data-venue-id="${venue.id}"><h3>${venue.id}. ${escapeHtml(venue.name)}</h3><p>${escapeHtml(venue.landmark)}</p><span class="tag">タイムスケジュール ${venueSchedules(venue.id).length}件</span></button>`).join('') : '<p>該当する会場がありません。</p>';
  venueList.querySelectorAll('[data-venue-id]').forEach(button => button.addEventListener('click', () => { const venue = venues.find(v => v.id === Number(button.dataset.venueId)); if (venue) { map.setView([venue.lat, venue.lng], 17); showVenue(venue); } }));
}
function render() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = venues.filter(v => `${v.name} ${v.landmark}`.toLowerCase().includes(query));
  renderMarkers(filtered);
  renderList(filtered);
}

function roadGroup(tags) {
  const highway = tags?.highway;
  const major = ['motorway', 'trunk', 'primary', 'secondary'].includes(highway);
  return { major, highway };
}
async function loadOsmRoads() {
  const bbox = `${mapBounds.minLat},${mapBounds.minLng},${mapBounds.maxLat},${mapBounds.maxLng}`;
  const query = `[out:json][timeout:25];way["highway"](${bbox});out tags geom;`;
  try {
    const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    data.elements.filter(e => Array.isArray(e.geometry) && e.geometry.length > 1).forEach(way => {
      const { major, highway } = roadGroup(way.tags || {});
      const points = way.geometry.map(p => [p.lat, p.lon]);
      const line = L.polyline(points, { color: major ? '#d97706' : '#9ca3af', weight: major ? 5 : (highway === 'tertiary' ? 3 : 1.5), opacity: major ? 0.85 : 0.65, lineCap: 'round', lineJoin: 'round' });
      line.bindTooltip(`${highway || '道路'}`, { sticky: true });
      line.addTo(major ? majorRoadLayer : otherRoadLayer);
    });
    setLayerVisibility(majorRoadLayer, showMajorRoads.checked);
    setLayerVisibility(otherRoadLayer, showOtherRoads.checked);
  } catch (error) {
    console.warn('OpenStreetMapの道路データを取得できませんでした:', error);
  }
}

showBaseMap.addEventListener('change', () => setLayerVisibility(baseMapLayer, showBaseMap.checked));
showMajorRoads.addEventListener('change', () => setLayerVisibility(majorRoadLayer, showMajorRoads.checked));
showOtherRoads.addEventListener('change', () => setLayerVisibility(otherRoadLayer, showOtherRoads.checked));
showVenuePins.addEventListener('change', () => setLayerVisibility(venueLayer, showVenuePins.checked));
showVenueLabels.addEventListener('change', updateLabelVisibility);
searchInput.addEventListener('input', render);
locateButton.addEventListener('click', () => {
  if (!navigator.geolocation) return alert('このブラウザでは現在地取得に対応していません。');
  locateButton.disabled = true;
  navigator.geolocation.getCurrentPosition(position => {
    const { latitude, longitude } = position.coords;
    map.setView([latitude, longitude], 17);
    if (currentLocationMarker) currentLocationMarker.remove();
    currentLocationMarker = L.circleMarker([latitude, longitude], { radius: 8, color: '#2563eb', fillColor: '#60a5fa', fillOpacity: 0.8 }).addTo(map).bindPopup('現在地').openPopup();
    locateButton.disabled = false;
  }, () => { alert('現在地を取得できませんでした。ブラウザの位置情報を許可してください。'); locateButton.disabled = false; }, { enableHighAccuracy: true, timeout: 10000 });
});
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });

render();
loadOsmRoads();
loadSchedules();

async function loadSchedules() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/imaike_event_schedules?select=id,event_date,start_time,end_time,title,venue_id,description,sort_order,genre,tags&order=event_date.asc,start_time.asc,sort_order.asc`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    schedules = await response.json();
  } catch (error) {
    console.error('タイムスケジュールの取得に失敗しました:', error);
    schedules = [];
  } finally {
    schedulesLoaded = true;
    render();
  }
}

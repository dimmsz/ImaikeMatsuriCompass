const SUPABASE_URL = 'https://ufypynzhmbrozbxbqxsq.supabase.co';
const SUPABASE_KEY = ['sb_', 'publishable_', 'lQvSmWOndjOMgL5sd5Xdsw_VZEv2k07'].join('');
const EVENT_DATES = ['2026-09-20', '2026-09-21'];
const CHECKLIST_STORAGE_KEY = 'imaike-matsuri-checklist-v1';
const NOTIFIED_STORAGE_KEY = 'imaike-matsuri-notified-v1';
let venues = [];
const map = L.map('map', { zoomControl: true }).setView([0, 0], 2);
const baseMapLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' }).addTo(map);
const majorRoadLayer = L.layerGroup();
const otherRoadLayer = L.layerGroup();
const venueLayer = L.layerGroup().addTo(map);
const venueMarkers = [];
let currentLocationMarker = null;
let schedules = [];
let schedulesLoaded = false;
let showLabels = true;
let selectedDate = EVENT_DATES[0];
let checklistIds = loadStoredIds(CHECKLIST_STORAGE_KEY);
let notifiedIds = loadStoredIds(NOTIFIED_STORAGE_KEY);

const venueLabelStyle = document.createElement('style');
venueLabelStyle.textContent = `
.venue-label-icon { background: transparent; border: 0; pointer-events: none; display: flex; align-items: center; justify-content: center; }
.venue-label-icon span { display: block; max-width: 190px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 4px 8px; border: 1px solid rgba(209,213,219,.95); border-radius: 7px; background: rgba(255,255,255,.94); box-shadow: 0 2px 7px rgba(0,0,0,.14); color: #111827; font-size: 11px; font-weight: 700; line-height: 18px; }
`;
document.head.appendChild(venueLabelStyle);

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
const checklistSection = document.getElementById('checklistSection');
const checklistList = document.getElementById('checklistList');
const checklistCount = document.getElementById('checklistCount');
const notificationButton = document.getElementById('notificationButton');

function loadStoredIds(key) { try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return new Set(Array.isArray(value) ? value.map(String) : []); } catch { return new Set(); } }
function saveStoredIds(key, values) { localStorage.setItem(key, JSON.stringify([...values])); }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>\"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[c])); }
function mapsUrl(venue) { return `https://www.google.com/maps/search/?api=1&query=${venue.lat},${venue.lng}`; }
function formatDate(value) { const d = new Date(`${value}T00:00:00Z`); return `${d.getUTCMonth() + 1}月${d.getUTCDate()}日（${['日','月','火','水','木','金','土'][d.getUTCDay()]}）`; }
function formatTime(value) { return value ? String(value).slice(0, 5) : ''; }
function venueSchedules(id) { return schedules.filter(s => Number(s.venue_id) === id); }
function genreClass(genre) { return ({ 音楽: 'music', ダンス: 'dance', ステージ: 'stage', その他: 'other' })[genre] || 'other'; }
function setLayerVisibility(layer, visible) { const visibleNow = map.hasLayer(layer); if (visible && !visibleNow) map.addLayer(layer); if (!visible && visibleNow) map.removeLayer(layer); }
function scheduleKey(item) { return String(item.id); }
function getScheduleDateTime(item) { return new Date(`${item.event_date}T${formatTime(item.start_time)}:00`); }
function isSameLocalDate(dateValue) { return new Date().toLocaleDateString('sv-SE') === dateValue; }
function scheduleStatus(item, dayItems) { const now = new Date(); if (!isSameLocalDate(item.event_date)) return 'upcoming'; const start = getScheduleDateTime(item); if (now < start) return 'upcoming'; const next = dayItems.find(other => getScheduleDateTime(other) > start); if (next && now >= getScheduleDateTime(next)) return 'ended'; return 'current'; }
function statusMarkup(status) { if (status === 'ended') return '<span class="schedule-status status-ended">終了</span>'; if (status === 'current') return '<span class="schedule-status status-current">● 現在上演中（推定）</span>'; return ''; }
function dateTabsMarkup() { return `<div class="date-tabs" role="tablist" aria-label="開催日">${EVENT_DATES.map(date => `<button type="button" class="date-tab${date === selectedDate ? ' is-active' : ''}" data-date="${date}" role="tab" aria-selected="${date === selectedDate}">${escapeHtml(formatDate(date))}</button>`).join('')}</div>`; }
function checklistButton(item) { const checked = checklistIds.has(scheduleKey(item)); return `<button type="button" class="checklist-toggle${checked ? ' is-checked' : ''}" data-checklist-id="${escapeHtml(scheduleKey(item))}" aria-label="${checked ? 'チェックリストから削除' : 'チェックリストに追加'}" title="${checked ? 'チェックリストから削除' : 'チェックリストに追加'}">${checked ? '✓' : '＋'}</button>`; }
function renderChecklist() {
  if (!checklistSection || !checklistList) return;
  const items = schedules.filter(item => checklistIds.has(scheduleKey(item))).sort((a, b) => String(a.event_date).localeCompare(String(b.event_date)) || String(a.start_time).localeCompare(String(b.start_time)) || Number(a.sort_order || 0) - Number(b.sort_order || 0));
  if (checklistCount) checklistCount.textContent = `${items.length}件`;
  checklistList.innerHTML = items.length ? items.map(item => { const venue = venues.find(v => Number(v.id) === Number(item.venue_id)); return `<article class="checklist-item"><div><div class="checklist-date">${escapeHtml(formatDate(item.event_date))} ${escapeHtml(formatTime(item.start_time))}</div><strong>${escapeHtml(item.title)}</strong><div class="checklist-venue">📍 ${escapeHtml(venue ? `${venue.venueNo}. ${venue.name}` : '会場未設定')}</div></div><button type="button" class="checklist-remove" data-checklist-id="${escapeHtml(scheduleKey(item))}" aria-label="チェックリストから削除">×</button></article>`; }).join('') : '<p class="checklist-empty">タイムテーブルの「＋」から、見たい演目を登録できます。</p>';
}
function toggleChecklist(itemId) { const key = String(itemId); if (checklistIds.has(key)) checklistIds.delete(key); else checklistIds.add(key); saveStoredIds(CHECKLIST_STORAGE_KEY, checklistIds); renderChecklist(); if (dialog.open) { const activeVenue = venues.find(v => Number(v.id) === Number(dialog.dataset.venueId)); if (activeVenue) renderDialog(activeVenue); } }
function requestNotifications() { if (!('Notification' in window)) { alert('このブラウザは通知に対応していません。'); return; } Notification.requestPermission().then(permission => { if (permission === 'granted') { if (notificationButton) notificationButton.textContent = '通知を許可済み'; checkUpcomingNotifications(); } else if (permission === 'denied') alert('通知が拒否されています。ブラウザの設定から許可してください。'); }); }
function checkUpcomingNotifications() { if (!('Notification' in window) || Notification.permission !== 'granted') return; const now = new Date(); schedules.filter(item => checklistIds.has(scheduleKey(item))).forEach(item => { const start = getScheduleDateTime(item); const diff = start.getTime() - now.getTime(); const key = scheduleKey(item); if (diff >= 0 && diff <= 15 * 60 * 1000 && !notifiedIds.has(key)) { const venue = venues.find(v => Number(v.id) === Number(item.venue_id)); new Notification(`まもなく開始：${item.title}`, { body: `${formatTime(item.start_time)}開始・${venue ? venue.name : '会場未設定'}（15分前通知）`, tag: `imaike-${key}` }); notifiedIds.add(key); saveStoredIds(NOTIFIED_STORAGE_KEY, notifiedIds); } }); }
function renderDialog(venue) {
  const items = venueSchedules(venue.id);
  const dayItems = items.filter(i => i.event_date === selectedDate).sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)) || Number(a.sort_order || 0) - Number(b.sort_order || 0));
  const content = schedulesLoaded ? (dayItems.length ? `<section class="schedule-day"><div class="schedule-date"><h3>${formatDate(selectedDate)}</h3><span class="day-count">${dayItems.length}件</span></div><div class="schedule-items">${dayItems.map(item => { const genre = item.genre || 'その他'; const tags = Array.isArray(item.tags) ? item.tags : []; const end = formatTime(item.end_time); const status = scheduleStatus(item, dayItems); return `<article class="schedule-item genre-${genreClass(genre)} status-${status}" data-schedule-id="${escapeHtml(scheduleKey(item))}"><div class="schedule-time"><time>${escapeHtml(formatTime(item.start_time))}</time><span>${end ? `〜${escapeHtml(end)}` : 'START'}</span></div><div class="schedule-main"><div class="schedule-item-top"><div class="schedule-meta"><span class="genre-badge">${escapeHtml(genre)}</span>${tags.map(t => `<span class="schedule-tag">#${escapeHtml(t)}</span>`).join('')}</div>${checklistButton(item)}</div><div class="schedule-title">${escapeHtml(item.title)}</div>${statusMarkup(status)}${item.description ? `<p class="schedule-description">${escapeHtml(item.description)}</p>` : ''}</div></article>`; }).join('')}</div></section>` : '<p class="schedule-empty">この日の予定はありません。</p>') : '<p class="schedule-loading">タイムスケジュールを読み込み中…</p>';
  dialog.dataset.venueId = String(venue.id);
  dialogBody.innerHTML = `<div class="dialog-venue-header"><div><div class="dialog-kicker">会場 ${venue.venueNo}</div><h2>${escapeHtml(venue.name)}</h2><p class="venue-landmark">📍 ${escapeHtml(venue.landmark)}</p></div><span class="venue-total">${items.length}ステージ</span></div><div class="schedule-heading-row"><div class="schedule-heading">タイムテーブル</div><span id="currentClock">現在時刻：--:--</span></div>${dateTabsMarkup()}<div class="schedule-note">開始時刻順に表示しています。終了時刻は公式発表がある場合のみ表示します。終了時刻がない場合は、次の演目の開始時刻を基準に状態を推定します。</div>${content}<a class="primary-link" href="${mapsUrl(venue)}" target="_blank" rel="noopener">📍 Google Mapsで会場を開く</a>`;
  updateClock();
  if (typeof dialog.showModal === 'function' && !dialog.open) dialog.showModal();
}
function showVenue(venue) { selectedDate = EVENT_DATES.includes(selectedDate) ? selectedDate : EVENT_DATES[0]; renderDialog(venue); }
function updateClock() { const clock = document.getElementById('currentClock'); if (clock) clock.textContent = `現在時刻：${new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`; }
function venueIcon(number) { return L.divIcon({ className: 'venue-marker-icon', html: `<span>${number}</span>`, iconSize: [34, 42], iconAnchor: [17, 42] }); }
function labelSize(text) { const width = Math.min(190, Math.max(76, Array.from(text).length * 12 + 18)); return { width, height: 28 }; }
function labelCandidates(point, size) { const halfW = size.width / 2; const halfH = size.height / 2; const gap = 12; return [{ x: point.x, y: point.y - 42 - halfH }, { x: point.x + 34 + halfW + gap, y: point.y - 21 }, { x: point.x - 34 - halfW - gap, y: point.y - 21 }, { x: point.x, y: point.y + 18 + halfH }, { x: point.x + 30 + halfW, y: point.y - 48 - halfH }, { x: point.x - 30 - halfW, y: point.y - 48 - halfH }, { x: point.x + 30 + halfW, y: point.y + 12 + halfH }, { x: point.x - 30 - halfW, y: point.y + 12 + halfH }]; }
function rectanglesOverlap(a, b, padding = 4) { return !(a.right + padding < b.left || a.left - padding > b.right || a.bottom + padding < b.top || a.top - padding > b.bottom); }
function layoutVenueLabels() { const occupied = []; venueMarkers.forEach(entry => { if (!showLabels || !map.hasLayer(entry.marker) || !map.hasLayer(entry.labelMarker)) return; const point = map.latLngToContainerPoint(entry.marker.getLatLng()); const size = entry.labelSize; const candidates = labelCandidates(point, size); let selected = candidates[0]; let selectedRect = null; for (const candidate of candidates) { const rect = { left: candidate.x - size.width / 2, right: candidate.x + size.width / 2, top: candidate.y - size.height / 2, bottom: candidate.y + size.height / 2 }; const inside = rect.right >= 0 && rect.left <= map.getSize().x && rect.bottom >= 0 && rect.top <= map.getSize().y; if (inside && !occupied.some(other => rectanglesOverlap(rect, other))) { selected = candidate; selectedRect = rect; break; } if (!selectedRect) selectedRect = rect; } occupied.push(selectedRect); entry.labelMarker.setLatLng(map.containerPointToLatLng(selected)); }); }
function createVenueLabel(venue) { const size = labelSize(venue.name); const labelMarker = L.marker([venue.lat, venue.lng], { icon: L.divIcon({ className: 'venue-label-icon', html: `<span>${escapeHtml(venue.name)}</span>`, iconSize: [size.width, size.height], iconAnchor: [size.width / 2, size.height / 2] }), interactive: false, keyboard: false, zIndexOffset: 1000 }); return { labelMarker, labelSize: size }; }
function renderMarkers(items) { venueLayer.clearLayers(); venueMarkers.length = 0; items.forEach(venue => { const marker = L.marker([venue.lat, venue.lng], { icon: venueIcon(venue.venueNo), title: venue.name }); const label = createVenueLabel(venue); marker.on('click', () => showVenue(venue)); const entry = { marker, labelMarker: label.labelMarker, labelSize: label.labelSize }; venueMarkers.push(entry); if (showVenuePins.checked) marker.addTo(venueLayer); if (showVenueLabels.checked) label.labelMarker.addTo(venueLayer); }); requestAnimationFrame(layoutVenueLabels); }
function updateLabelVisibility() { showLabels = showVenueLabels.checked; venueMarkers.forEach(entry => { if (showLabels) entry.labelMarker.addTo(venueLayer); else entry.labelMarker.remove(); }); requestAnimationFrame(layoutVenueLabels); }
function matchingSchedules(venue, tokens) { const items = venueSchedules(venue.id); if (!tokens.length) return items; return items.filter(item => { const searchable = [item.title, item.description, item.genre, ...(Array.isArray(item.tags) ? item.tags : [])].filter(Boolean).join(' ').toLocaleLowerCase(); return tokens.every(token => searchable.includes(token)); }); }
function searchMatchesVenue(venue, tokens) { if (!tokens.length) return true; const venueText = `${venue.name} ${venue.landmark}`.toLocaleLowerCase(); return tokens.every(token => venueText.includes(token)) || matchingSchedules(venue, tokens).length > 0; }
function renderList(items, tokens) { venueCount.textContent = `${items.length}会場`; venueList.innerHTML = items.length ? items.map(venue => { const matched = matchingSchedules(venue, tokens).length; const total = venueSchedules(venue.id).length; const scheduleText = tokens.length && matched < total ? `検索一致 ${matched}件 / ${total}件` : `タイムスケジュール ${total}件`; return `<button class="venue-card" type="button" data-venue-id="${venue.id}"><h3>${venue.venueNo}. ${escapeHtml(venue.name)}</h3><p>${escapeHtml(venue.landmark)}</p><span class="tag">${scheduleText}</span></button>`; }).join('') : '<p>該当する会場・タイムスケジュールがありません。</p>'; venueList.querySelectorAll('[data-venue-id]').forEach(button => button.addEventListener('click', () => { const venue = venues.find(v => v.id === Number(button.dataset.venueId)); if (venue) { map.setView([venue.lat, venue.lng], 17); showVenue(venue); } })); }
function render() { const query = searchInput.value.trim().toLocaleLowerCase(); const tokens = query ? query.split(/\s+/).filter(Boolean) : []; const filtered = venues.filter(venue => searchMatchesVenue(venue, tokens)); renderMarkers(filtered); renderList(filtered, tokens); }
function roadGroup(tags) { const highway = tags?.highway; const major = ['motorway', 'trunk', 'primary', 'secondary'].includes(highway); return { major, highway }; }
async function loadOsmRoads() { if (!venues.length) return; const latitudes = venues.map(v => v.lat).filter(Number.isFinite); const longitudes = venues.map(v => v.lng).filter(Number.isFinite); if (!latitudes.length || !longitudes.length) return; const paddingLat = 0.001; const paddingLng = 0.001; const bbox = `${Math.min(...latitudes) - paddingLat},${Math.min(...longitudes) - paddingLng},${Math.max(...latitudes) + paddingLat},${Math.max(...longitudes) + paddingLng}`; const query = `[out:json][timeout:25];way["highway"](${bbox});out tags geom;`; try { const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`); if (!response.ok) throw new Error(`HTTP ${response.status}`); const data = await response.json(); data.elements.filter(e => Array.isArray(e.geometry) && e.geometry.length > 1).forEach(way => { const { major, highway } = roadGroup(way.tags || {}); const points = way.geometry.map(p => [p.lat, p.lon]); const line = L.polyline(points, { color: major ? '#d97706' : '#9ca3af', weight: major ? 5 : (highway === 'tertiary' ? 3 : 1.5), opacity: major ? 0.85 : 0.65, lineCap: 'round', lineJoin: 'round' }); line.bindTooltip(`${highway || '道路'}`, { sticky: true }); line.addTo(major ? majorRoadLayer : otherRoadLayer); }); setLayerVisibility(majorRoadLayer, showMajorRoads.checked); setLayerVisibility(otherRoadLayer, showOtherRoads.checked); } catch (error) { console.warn('OpenStreetMapの道路データを取得できませんでした:', error); } }
showBaseMap.addEventListener('change', () => setLayerVisibility(baseMapLayer, showBaseMap.checked));
showMajorRoads.addEventListener('change', () => setLayerVisibility(majorRoadLayer, showMajorRoads.checked));
showOtherRoads.addEventListener('change', () => setLayerVisibility(otherRoadLayer, showOtherRoads.checked));
showVenuePins.addEventListener('change', () => { venueMarkers.forEach(entry => showVenuePins.checked ? entry.marker.addTo(venueLayer) : entry.marker.remove()); });
showVenueLabels.addEventListener('change', updateLabelVisibility);
searchInput.addEventListener('input', render);
map.on('zoomend moveend', layoutVenueLabels);
locateButton.addEventListener('click', () => { if (!navigator.geolocation) return alert('このブラウザでは現在地取得に対応していません。'); locateButton.disabled = true; navigator.geolocation.getCurrentPosition(position => { const { latitude, longitude } = position.coords; map.setView([latitude, longitude], 17); if (currentLocationMarker) currentLocationMarker.remove(); currentLocationMarker = L.circleMarker([latitude, longitude], { radius: 8, color: '#2563eb', fillColor: '#60a5fa', fillOpacity: 0.8 }).addTo(map).bindPopup('現在地').openPopup(); locateButton.disabled = false; }, () => { alert('現在地を取得できませんでした。ブラウザの位置情報を許可してください。'); locateButton.disabled = false; }, { enableHighAccuracy: true, timeout: 10000 }); });
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
dialogBody.addEventListener('click', event => { const dateButton = event.target.closest('[data-date]'); if (dateButton) { selectedDate = dateButton.dataset.date; const venue = venues.find(v => Number(v.id) === Number(dialog.dataset.venueId)); if (venue) renderDialog(venue); return; } const checklistButtonElement = event.target.closest('[data-checklist-id]'); if (checklistButtonElement) toggleChecklist(checklistButtonElement.dataset.checklistId); });
if (checklistList) checklistList.addEventListener('click', event => { const button = event.target.closest('[data-checklist-id]'); if (button) toggleChecklist(button.dataset.checklistId); });
if (notificationButton) notificationButton.addEventListener('click', requestNotifications);
setInterval(() => { updateClock(); checkUpcomingNotifications(); if (dialog.open) { const venue = venues.find(v => Number(v.id) === Number(dialog.dataset.venueId)); if (venue) renderDialog(venue); } }, 30000);
loadVenues();
loadSchedules();
renderChecklist();
async function loadVenues() { try { const response = await fetch(`${SUPABASE_URL}/rest/v1/imaike_venues?select=id,venue_no,name,location,latitude,longitude,sort_order&order=sort_order.asc`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }); if (!response.ok) throw new Error(`HTTP ${response.status}`); const rows = await response.json(); venues = rows.map(row => ({ id: Number(row.id), venueNo: Number(row.venue_no), name: row.name, landmark: row.location || '', lat: Number(row.latitude), lng: Number(row.longitude) })); if (venues.length) { const bounds = L.latLngBounds(venues.map(venue => [venue.lat, venue.lng])); map.fitBounds(bounds.pad(0.15)); await loadOsmRoads(); } } catch (error) { console.error('会場情報の取得に失敗しました:', error); venues = []; } finally { render(); renderChecklist(); } }
async function loadSchedules() { try { const response = await fetch(`${SUPABASE_URL}/rest/v1/imaike_event_schedules?select=id,event_date,start_time,end_time,title,venue_id,description,sort_order,genre,tags&order=event_date.asc,start_time.asc,sort_order.asc`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }); if (!response.ok) throw new Error(`HTTP ${response.status}`); schedules = await response.json(); } catch (error) { console.error('タイムスケジュールの取得に失敗しました:', error); schedules = []; } finally { schedulesLoaded = true; render(); renderChecklist(); } }

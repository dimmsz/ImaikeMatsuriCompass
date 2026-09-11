const SUPABASE_URL = 'https://ufypynzhmbrozbxbqxsq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_lQvSmWOndjOMgL5sd5Xdsw_VZEv2k07';
const EVENT_DATES = ['2026-09-20', '2026-09-21'];

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

let schedules = [];
let schedulesLoaded = false;

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
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function mapsUrl(venue) {
  return `https://www.google.com/maps/search/?api=1&query=${venue.lat},${venue.lng}`;
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00Z`);
  const day = ['日', '月', '火', '水', '木', '金', '土'][date.getUTCDay()];
  return `${date.getUTCMonth() + 1}月${date.getUTCDate()}日（${day}）`;
}

function formatTime(value) {
  if (!value) return '';
  return String(value).slice(0, 5);
}

function venueSchedules(venueId) {
  return schedules.filter(schedule => Number(schedule.venue_id) === venueId);
}

function genreClass(genre) {
  return ({ 音楽: 'music', ダンス: 'dance', ステージ: 'stage', その他: 'other' })[genre] || 'other';
}

function renderScheduleDay(dateString, items) {
  const dayItems = items
    .filter(item => item.event_date === dateString)
    .sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)) || Number(a.sort_order || 0) - Number(b.sort_order || 0));

  if (!dayItems.length) {
    return `<section class="schedule-day"><div class="schedule-date"><span>${formatDate(dateString)}</span><span class="day-count">0件</span></div><p class="schedule-empty">予定はありません。</p></section>`;
  }

  return `
    <section class="schedule-day">
      <div class="schedule-date">
        <h3>${formatDate(dateString)}</h3>
        <span class="day-count">${dayItems.length}件</span>
      </div>
      <div class="schedule-items">
        ${dayItems.map(item => {
          const genre = item.genre || 'その他';
          const tags = Array.isArray(item.tags) ? item.tags : [];
          const end = formatTime(item.end_time);
          return `
            <article class="schedule-item genre-${genreClass(genre)}">
              <div class="schedule-time">
                <time>${escapeHtml(formatTime(item.start_time))}</time>
                ${end ? `<span>〜${escapeHtml(end)}</span>` : '<span>START</span>'}
              </div>
              <div class="schedule-main">
                <div class="schedule-meta">
                  <span class="genre-badge">${escapeHtml(genre)}</span>
                  ${tags.map(tag => `<span class="schedule-tag">#${escapeHtml(tag)}</span>`).join('')}
                </div>
                <div class="schedule-title">${escapeHtml(item.title)}</div>
                ${item.description ? `<p class="schedule-description">${escapeHtml(item.description)}</p>` : ''}
              </div>
            </article>
          `;
        }).join('')}
      </div>
    </section>
  `;
}

function showVenue(venue) {
  const items = venueSchedules(venue.id);
  const scheduleContent = schedulesLoaded
    ? EVENT_DATES.map(date => renderScheduleDay(date, items)).join('')
    : '<p class="schedule-loading">タイムスケジュールを読み込み中…</p>';

  dialogBody.innerHTML = `
    <div class="dialog-venue-header">
      <div>
        <div class="dialog-kicker">会場 ${venue.id}</div>
        <h2>${escapeHtml(venue.name)}</h2>
        <p class="venue-landmark">📍 ${escapeHtml(venue.landmark)}</p>
      </div>
      <span class="venue-total">${items.length}ステージ</span>
    </div>
    <div class="schedule-heading-row">
      <div class="schedule-heading">タイムテーブル</div>
      <span>2026</span>
    </div>
    <div class="schedule-note">開始時刻順に表示しています。終了時刻は公式発表がある場合のみ表示します。</div>
    ${scheduleContent}
    <a class="primary-link" href="${mapsUrl(venue)}" target="_blank" rel="noopener">📍 Google Mapsで会場を開く</a>
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
  venueList.innerHTML = items.length ? items.map((venue, index) => {
    const count = venueSchedules(venue.id).length;
    return `
      <button class="venue-card" type="button" data-venue-id="${venue.id}">
        <h3>${index + 1}. ${escapeHtml(venue.name)}</h3>
        <p>${escapeHtml(venue.landmark)}</p>
        <span class="tag">タイムスケジュール ${count}件</span>
      </button>
    `;
  }).join('') : '<p>該当する会場がありません。</p>';
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

async function loadSchedules() {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/imaike_event_schedules?select=id,event_date,start_time,end_time,title,venue_id,description,sort_order,genre,tags&order=event_date.asc,start_time.asc,sort_order.asc`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`
        }
      }
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    schedules = await response.json();
    schedulesLoaded = true;
    render();
  } catch (error) {
    console.error('タイムスケジュールの取得に失敗しました:', error);
    schedulesLoaded = true;
    schedules = [];
    render();
  }
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

// <dialog> は標準では backdrop のクリックで閉じないため、枠外タップを明示的に処理する。
dialog.addEventListener('click', event => {
  if (event.target === dialog) dialog.close();
});

render();
loadSchedules();

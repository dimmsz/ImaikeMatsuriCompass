(() => {
  const genrePanel = document.getElementById('genrePanel');
  const genreList = document.getElementById('genreList');
  const tagPanel = document.getElementById('tagPanel');
  const tagList = document.getElementById('tagList');
  const tagResults = document.getElementById('tagResults');
  const tagResultTitle = document.getElementById('tagResultTitle');
  const tagResultList = document.getElementById('tagResultList');
  if (!genrePanel || !genreList || !tagPanel || !tagList || !tagResults || !tagResultTitle || !tagResultList) return;

  let activeFilter = { type: '', value: '' };

  function escape(value) {
    return String(value ?? '').replace(/[&<>\"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function formatDate(value) {
    const date = new Date(`${value}T00:00:00Z`);
    return `${date.getUTCMonth() + 1}月${date.getUTCDate()}日（${['日', '月', '火', '水', '木', '金', '土'][date.getUTCDay()]}）`;
  }

  function formatTime(value) {
    return value ? String(value).slice(0, 5) : '';
  }

  function venueName(venueId) {
    const venue = venues.find(item => Number(item.id) === Number(venueId));
    return venue ? `${venue.venueNo}. ${venue.name}` : '会場未設定';
  }

  function getGenres() {
    const values = schedules.map(item => item.genre).filter(Boolean);
    return [...new Set(values)].sort((a, b) => a.localeCompare(b, 'ja'));
  }

  function getTags() {
    const values = schedules.flatMap(item => Array.isArray(item.tags) ? item.tags : []);
    return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ja'));
  }

  function filterButton(type, value, label, className) {
    const active = activeFilter.type === type && activeFilter.value === value;
    return `<button type="button" class="filter-chip ${className}${active ? ' is-active' : ''}" data-filter-type="${type}" data-filter-value="${escape(value)}">${escape(label)}</button>`;
  }

  function renderFilters() {
    const genres = getGenres();
    const tags = getTags();

    genreList.innerHTML = genres.length
      ? genres.map(genre => filterButton('genre', genre, genre, 'genre-filter-chip')).join('')
      : '<span class="filter-empty">ジャンルはありません。</span>';

    tagList.innerHTML = tags.length
      ? tags.map(tag => filterButton('tag', tag, `#${tag}`, 'tag-filter-chip')).join('')
      : '<span class="filter-empty">タグはありません。</span>';

    document.querySelectorAll('[data-filter-type]').forEach(button => {
      button.addEventListener('click', () => {
        const type = button.dataset.filterType || '';
        const value = button.dataset.filterValue || '';
        if (activeFilter.type === type && activeFilter.value === value) {
          activeFilter = { type: '', value: '' };
        } else {
          activeFilter = { type, value };
        }
        renderFilters();
        renderResults();
      });
    });
  }

  function focusEventCard(item) {
    window.setTimeout(() => {
      const cards = [...dialogBody.querySelectorAll('.schedule-item')];
      const target = cards.find(card => {
        const title = card.querySelector('.schedule-title')?.textContent?.trim();
        const time = card.querySelector('.schedule-time time')?.textContent?.trim();
        return title === String(item.title ?? '').trim()
          && time === formatTime(item.start_time);
      });

      if (!target) return;
      cards.forEach(card => card.classList.remove('is-target-event'));
      target.classList.add('is-target-event');
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 180);
  }

  function renderResults() {
    if (!activeFilter.type || !activeFilter.value) {
      tagResults.hidden = true;
      tagResultList.innerHTML = '';
      return;
    }

    const matches = schedules
      .filter(item => activeFilter.type === 'genre'
        ? item.genre === activeFilter.value
        : Array.isArray(item.tags) && item.tags.includes(activeFilter.value))
      .sort((a, b) => String(a.event_date).localeCompare(String(b.event_date))
        || String(a.start_time).localeCompare(String(b.start_time))
        || Number(a.sort_order || 0) - Number(b.sort_order || 0));

    const prefix = activeFilter.type === 'tag' ? '#' : '';
    tagResultTitle.textContent = `${prefix}${activeFilter.value} のイベント（${matches.length}件）`;
    tagResultList.innerHTML = matches.length
      ? matches.map((item, index) => `<button type="button" class="tag-event-card" data-event-index="${index}">
          <span class="tag-event-date">${escape(formatDate(item.event_date))} ${escape(formatTime(item.start_time))}</span>
          <strong>${escape(item.title)}</strong>
          <span class="tag-event-venue">📍 ${escape(venueName(item.venue_id))}</span>
        </button>`).join('')
      : '<p class="filter-empty">該当するイベントはありません。</p>';

    tagResultList.querySelectorAll('[data-event-index]').forEach(button => {
      button.addEventListener('click', () => {
        const item = matches[Number(button.dataset.eventIndex)];
        const venue = venues.find(value => Number(value.id) === Number(item.venue_id));
        if (!venue) return;
        map.setView([venue.lat, venue.lng], 17);
        showVenue(venue);
        focusEventCard(item);
      });
    });
    tagResults.hidden = false;
  }

  function initialize() {
    if (typeof schedules === 'undefined' || typeof venues === 'undefined' || !Array.isArray(schedules) || !schedules.length || !venues.length) {
      window.setTimeout(initialize, 150);
      return;
    }
    renderFilters();
  }

  initialize();
})();

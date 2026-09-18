(() => {
  const tagPanel = document.getElementById('tagPanel');
  const tagList = document.getElementById('tagList');
  const tagResults = document.getElementById('tagResults');
  const tagResultTitle = document.getElementById('tagResultTitle');
  const tagResultList = document.getElementById('tagResultList');
  if (!tagPanel || !tagList || !tagResults || !tagResultTitle || !tagResultList) return;

  let activeTag = '';

  function escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
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

  function getTags() {
    const values = schedules.flatMap(item => Array.isArray(item.tags) ? item.tags : []);
    return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ja'));
  }

  function renderTags() {
    const tags = getTags();
    tagList.innerHTML = tags.length
      ? tags.map(tag => `<button type="button" class="filter-tag${tag === activeTag ? ' is-active' : ''}" data-tag="${escape(tag)}">#${escape(tag)}</button>`).join('')
      : '<span class="tag-empty">タグはありません。</span>';

    tagList.querySelectorAll('[data-tag]').forEach(button => {
      button.addEventListener('click', () => {
        const tag = button.dataset.tag || '';
        activeTag = activeTag === tag ? '' : tag;
        renderTags();
        renderResults();
      });
    });
  }

  function renderResults() {
    if (!activeTag) {
      tagResults.hidden = true;
      tagResultList.innerHTML = '';
      return;
    }

    const matches = schedules
      .filter(item => Array.isArray(item.tags) && item.tags.includes(activeTag))
      .sort((a, b) => String(a.event_date).localeCompare(String(b.event_date))
        || String(a.start_time).localeCompare(String(b.start_time))
        || Number(a.sort_order || 0) - Number(b.sort_order || 0));

    tagResultTitle.textContent = `#${activeTag} のイベント（${matches.length}件）`;
    tagResultList.innerHTML = matches.length
      ? matches.map((item, index) => `<button type="button" class="tag-event-card" data-event-index="${index}">
          <span class="tag-event-date">${escape(formatDate(item.event_date))} ${escape(formatTime(item.start_time))}</span>
          <strong>${escape(item.title)}</strong>
          <span class="tag-event-venue">📍 ${escape(venueName(item.venue_id))}</span>
        </button>`).join('')
      : '<p class="tag-empty">該当するイベントはありません。</p>';

    tagResultList.querySelectorAll('[data-event-index]').forEach(button => {
      button.addEventListener('click', () => {
        const item = matches[Number(button.dataset.eventIndex)];
        const venue = venues.find(value => Number(value.id) === Number(item.venue_id));
        if (!venue) return;
        map.setView([venue.lat, venue.lng], 17);
        showVenue(venue);
      });
    });
    tagResults.hidden = false;
  }

  function initialize() {
    if (typeof schedules === 'undefined' || typeof venues === 'undefined' || !Array.isArray(schedules) || !schedules.length || !venues.length) {
      window.setTimeout(initialize, 150);
      return;
    }
    renderTags();
  }

  initialize();
})();

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

  const TAG_CATEGORIES = [
    {
      name: '音楽・楽器',
      tags: ['DJ', 'ジャズ', 'ロック', 'ブルース', 'パンク', 'ソウル・R&B', 'ラテン', 'ワールド音楽', '合唱', '吹奏楽', '和楽器', '沖縄', '韓国', '打楽器', '三線', '三味線', '大正琴', 'ご当地ソング', 'ウクレレ', 'ゴスペル', 'ディスコ', 'ライブ', 'ブラジル']
    },
    {
      name: 'ダンス・舞踊',
      tags: ['フラメンコ', 'ダンススクール', 'バレエ', 'カポエイラ', 'サンバ']
    },
    {
      name: '演芸・パフォーマンス',
      tags: ['紙芝居', '演劇', '一人芝居', '詩朗読', 'マジック', '大道芸', 'クラウン', 'アクロバット', 'パフォーマンス', '落語', '伝統芸能']
    },
    {
      name: 'スポーツ',
      tags: ['プロレス', 'スポーツ', '空手', 'キック', '名古屋グランパス']
    },
    {
      name: '地域・団体・テーマ',
      tags: ['トーク', '地域交流', '商店街', '学生・学校', '社会人', '青少年', '能登', '結婚式']
    }
  ];

  function escape(value) {
    return String(value ?? '').replace(/[&<>\\"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '\\"': '&quot;', "'": '&#39;'
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
    const categorizedTags = new Set();

    genreList.innerHTML = genres.length
      ? genres.map(genre => filterButton('genre', genre, genre, 'genre-filter-chip')).join('')
      : '<span class="filter-empty">ジャンルはありません。</span>';

    const categoryHtml = TAG_CATEGORIES.map(category => {
      const categoryTags = tags.filter(tag => category.tags.includes(tag));
      categoryTags.forEach(tag => categorizedTags.add(tag));
      if (!categoryTags.length) return '';
      return `<details class="tag-category"><summary>${escape(category.name)} <span class="tag-category-count">${categoryTags.length}種類</span></summary><div class="filter-list tag-category-list">${categoryTags.map(tag => filterButton('tag', tag, `#${tag}`, 'tag-filter-chip')).join('')}</div></details>`;
    }).join('');

    const uncategorizedTags = tags.filter(tag => !categorizedTags.has(tag));
    const otherHtml = uncategorizedTags.length
      ? `<details class="tag-category"><summary>その他 <span class="tag-category-count">${uncategorizedTags.length}種類</span></summary><div class="filter-list tag-category-list">${uncategorizedTags.map(tag => filterButton('tag', tag, `#${tag}`, 'tag-filter-chip')).join('')}</div></details>`
      : '';

    tagList.innerHTML = tags.length
      ? `${categoryHtml}${otherHtml}`
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
        window.setTimeout(() => {
          const dateTab = dialogBody.querySelector(`[data-date="${item.event_date}"]`);
          if (dateTab) dateTab.click();
          focusEventCard(item);
        }, 80);
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

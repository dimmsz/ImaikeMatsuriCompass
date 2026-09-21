(() => {
  const dialogBody = document.getElementById('dialogBody');
  if (!dialogBody) return;

  const TOKYO_TIME_ZONE = 'Asia/Tokyo';

  function parseJapaneseDate(text) {
    const match = String(text || '').match(/(\d+)月(\d+)日/);
    if (!match) return null;
    return `${new Date().getFullYear()}-${String(match[1]).padStart(2, '0')}-${String(match[2]).padStart(2, '0')}`;
  }

  function todayInTokyo() {
    return new Intl.DateTimeFormat('sv-SE', {
      timeZone: TOKYO_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  }

  function toDate(dateText, timeText) {
    if (!dateText || !timeText) return null;
    const match = String(timeText).match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    return new Date(`${dateText}T${String(match[1]).padStart(2, '0')}:${match[2]}:00+09:00`);
  }

  function applyStatuses() {
    const now = new Date();
    const today = todayInTokyo();
    dialogBody.querySelectorAll('.schedule-day').forEach(day => {
      const dateText = parseJapaneseDate(day.querySelector('.schedule-date h3')?.textContent);
      if (!dateText) return;

      const cards = [...day.querySelectorAll('.schedule-item')];
      const entries = cards.map(card => ({
        card,
        startText: card.querySelector('.schedule-time time')?.textContent?.trim() || '',
        endText: (card.querySelector('.schedule-time span')?.textContent || '').replace(/^〜/, '').trim()
      }));

      entries.forEach((entry, index) => {
        const start = toDate(dateText, entry.startText);
        const explicitEnd = /^\d{1,2}:\d{2}$/.test(entry.endText) ? toDate(dateText, entry.endText) : null;
        const nextStart = entries[index + 1] ? toDate(dateText, entries[index + 1].startText) : null;
        const end = explicitEnd || nextStart;

        entry.card.classList.remove('is-ended', 'is-current', 'is-upcoming', 'status-ended', 'status-current', 'status-upcoming');
        if (dateText < today) {
          entry.card.classList.add('is-ended', 'status-ended');
        } else if (!start || now < start) {
          entry.card.classList.add('is-upcoming', 'status-upcoming');
        } else if (end && now >= end) {
          entry.card.classList.add('is-ended', 'status-ended');
        } else {
          entry.card.classList.add('is-current', 'status-current');
        }
      });
    });
  }

  const observer = new MutationObserver(() => {
    if (dialogBody.querySelector('.schedule-item')) applyStatuses();
  });
  observer.observe(dialogBody, { childList: true, subtree: true });
  window.setInterval(applyStatuses, 30000);
  applyStatuses();
})();

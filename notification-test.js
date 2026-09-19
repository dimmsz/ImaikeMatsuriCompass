(() => {
  const TEST_ID = 'local-notification-test';
  const TEST_TITLE = '【通知テスト】16分後開始のテスト演目';
  const TEST_DELAY_MS = 16 * 60 * 1000;
  const FIRST_NOTICE_MS = 1 * 60 * 1000;
  const SECOND_NOTICE_MS = 11 * 60 * 1000;
  const CHECKLIST_STORAGE_KEY = 'imaike-matsuri-checklist-v1';
  const NOTIFIED_STORAGE_KEY = 'imaike-matsuri-notified-v1';
  const SUPABASE_URL = 'https://ufypynzhmbrozbxbqxsq.supabase.co';
  const SUPABASE_KEY = ['sb_', 'publishable_', 'lQvSmWOndjOMgL5sd5Xdsw_VZEv2k07'].join('');
  const checklistList = document.getElementById('checklistList');
  const checklistCount = document.getElementById('checklistCount');
  const testButton = document.getElementById('notificationTestButton');
  if (!checklistList || !testButton) return;

  let timers = [];
  let item = null;

  const loadIds = key => {
    try { return new Set(JSON.parse(localStorage.getItem(key) || '[]').map(String)); }
    catch { return new Set(); }
  };
  const saveIds = (key, values) => localStorage.setItem(key, JSON.stringify([...values]));
  const notify = (title, message, tag) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        tag,
        vibrate: [300, 150, 300, 150, 600]
      });
    } else alert(message);
  };

  const removeTest = () => {
    timers.forEach(clearTimeout); timers = [];
    if (item?.isConnected) item.remove();
    item = null;
    if (checklistCount) {
      const current = Number.parseInt(checklistCount.textContent, 10) || 0;
      checklistCount.textContent = `${Math.max(0, current - 1)}件`;
    }
  };

  testButton.addEventListener('click', async () => {
    if ('Notification' in window && Notification.permission !== 'granted' && await Notification.requestPermission() !== 'granted') return alert('通知を許可してから、もう一度押してください。');
    if (item) removeTest();
    item = document.createElement('article');
    item.id = 'notification-test-item';
    item.className = 'checklist-item';
    const start = new Date(Date.now() + TEST_DELAY_MS);
    const dateText = start.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' });
    const timeText = start.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    item.innerHTML = `<div><div class="checklist-date">${dateText} ${timeText}開始</div><strong>${TEST_TITLE}</strong><div class="checklist-venue">この端末だけの一時テスト（本番データには保存されません）</div></div><button type="button" class="checklist-remove" aria-label="通知テストを削除">×</button>`;
    item.querySelector('button').addEventListener('click', removeTest);
    checklistList.prepend(item);
    if (checklistCount) { const current = Number.parseInt(checklistCount.textContent, 10) || 0; checklistCount.textContent = `${current + 1}件`; }
    timers.push(setTimeout(() => notify(TEST_TITLE, 'テスト演目の開始15分前です。', `${TEST_ID}-15`), FIRST_NOTICE_MS));
    timers.push(setTimeout(() => { notify(TEST_TITLE, 'テスト演目の開始5分前です。', `${TEST_ID}-5`); removeTest(); }, SECOND_NOTICE_MS));
  });

  async function checkFiveMinuteNotifications() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const checklistIds = loadIds(CHECKLIST_STORAGE_KEY);
    const notifiedIds = loadIds(NOTIFIED_STORAGE_KEY);
    let schedules;
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/imaike_event_schedules?select=id,event_date,start_time,title,venue_id&order=event_date.asc,start_time.asc`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
      if (!response.ok) return;
      schedules = await response.json();
    } catch { return; }
    const now = Date.now();
    schedules.filter(schedule => checklistIds.has(String(schedule.id))).forEach(schedule => {
      const start = new Date(`${schedule.event_date}T${String(schedule.start_time).slice(0, 5)}:00`).getTime();
      const diff = start - now;
      const key = `${schedule.id}:5`;
      if (diff >= 0 && diff <= 5 * 60 * 1000 && diff > 4 * 60 * 1000 && !notifiedIds.has(key)) {
        notify(`まもなく開始：${schedule.title}`, `${String(schedule.start_time).slice(0, 5)}開始（5分前通知）`, `imaike-${schedule.id}-5`);
        notifiedIds.add(key);
        saveIds(NOTIFIED_STORAGE_KEY, notifiedIds);
      }
    });
  }

  setInterval(checkFiveMinuteNotifications, 30000);
  checkFiveMinuteNotifications();
})();

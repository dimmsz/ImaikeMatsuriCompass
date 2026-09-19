(() => {
  const TEST_ID = 'local-notification-test';
  const TEST_TITLE = '【通知テスト】16分後開始のテスト演目';
  const TEST_DELAY_MS = 16 * 60 * 1000;
  const FIRST_NOTICE_MS = 1 * 60 * 1000;
  const SECOND_NOTICE_MS = 11 * 60 * 1000;
  const checklistList = document.getElementById('checklistList');
  const checklistCount = document.getElementById('checklistCount');
  const testButton = document.getElementById('notificationTestButton');
  if (!checklistList || !testButton) return;
  let timers = [];
  let item = null;
  const removeTest = () => {
    timers.forEach(clearTimeout); timers = [];
    if (item?.isConnected) item.remove(); item = null;
    if (checklistCount) {
      const current = Number.parseInt(checklistCount.textContent, 10) || 0;
      checklistCount.textContent = `${Math.max(0, current - 1)}件`;
    }
  };
  const notify = message => {
    if ('Notification' in window && Notification.permission === 'granted') new Notification(TEST_TITLE, { body: message, tag: `${TEST_ID}-${Date.now()}` });
    else alert(message);
  };
  testButton.addEventListener('click', async () => {
    if ('Notification' in window && Notification.permission !== 'granted' && await Notification.requestPermission() !== 'granted') return alert('通知を許可してから、もう一度押してください。');
    if (item) removeTest();
    item = document.createElement('article'); item.id = 'notification-test-item'; item.className = 'checklist-item';
    const start = new Date(Date.now() + TEST_DELAY_MS);
    const dateText = start.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' });
    const timeText = start.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    item.innerHTML = `<div><div class="checklist-date">${dateText} ${timeText}開始</div><strong>${TEST_TITLE}</strong><div class="checklist-venue">この端末だけの一時テスト（本番データには保存されません）</div></div><button type="button" class="checklist-remove" aria-label="通知テストを削除">×</button>`;
    item.querySelector('button').addEventListener('click', removeTest); checklistList.prepend(item);
    if (checklistCount) { const current = Number.parseInt(checklistCount.textContent, 10) || 0; checklistCount.textContent = `${current + 1}件`; }
    timers.push(setTimeout(() => notify('テスト演目の開始15分前です。'), FIRST_NOTICE_MS));
    timers.push(setTimeout(() => { notify('テスト演目の開始5分前です。'); removeTest(); }, SECOND_NOTICE_MS));
  });
})();

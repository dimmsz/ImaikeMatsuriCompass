(() => {
  const TEST_ID = 'local-notification-test';
  const TEST_TITLE = '【通知テスト】5分後のテスト演目';
  const TEST_DELAY_MS = 5 * 60 * 1000;
  const checklistList = document.getElementById('checklistList');
  const checklistCount = document.getElementById('checklistCount');
  if (!checklistList || document.getElementById('notification-test-item')) return;

  const item = document.createElement('article');
  item.id = 'notification-test-item';
  item.className = 'checklist-item';
  item.innerHTML = `
    <div>
      <div class="checklist-date">通知テスト・5分後</div>
      <strong>${TEST_TITLE}</strong>
      <div class="checklist-venue">この端末だけの一時テスト（本番データには保存されません）</div>
    </div>
    <button type="button" class="checklist-remove" aria-label="通知テストを削除">×</button>`;

  const removeTest = () => {
    if (item.isConnected) item.remove();
    if (checklistCount) {
      const current = Number.parseInt(checklistCount.textContent, 10) || 0;
      checklistCount.textContent = `${Math.max(0, current - 1)}件`;
    }
  };

  item.querySelector('button').addEventListener('click', () => {
    clearTimeout(timer);
    removeTest();
  });

  checklistList.prepend(item);
  if (checklistCount) {
    const current = Number.parseInt(checklistCount.textContent, 10) || 0;
    checklistCount.textContent = `${current + 1}件`;
  }

  const timer = setTimeout(async () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(TEST_TITLE, {
        body: '5分後の通知テストです。',
        tag: TEST_ID
      });
    } else {
      alert('通知テストの時刻です。ブラウザの通知許可を確認してください。');
    }
    removeTest();
  }, TEST_DELAY_MS);

  window.addEventListener('beforeunload', () => clearTimeout(timer), { once: true });
})();

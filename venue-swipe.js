(() => {
  const dialog = document.getElementById('venueDialog');
  if (!dialog) return;

  let startX = 0;
  let startY = 0;
  let tracking = false;

  dialog.addEventListener('touchstart', event => {
    if (!event.target.closest('.dialog-venue-header')) return;
    const touch = event.changedTouches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    tracking = true;
  }, { passive: true });

  dialog.addEventListener('touchend', event => {
    if (!tracking) return;
    tracking = false;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.3) return;

    const currentId = Number(dialog.dataset.venueId);
    const orderedVenues = [...venues].sort((a, b) => Number(a.venueNo) - Number(b.venueNo));
    const currentIndex = orderedVenues.findIndex(venue => Number(venue.id) === currentId);
    if (currentIndex < 0 || !orderedVenues.length) return;

    const nextIndex = dx < 0 ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0 || nextIndex >= orderedVenues.length) return;

    showVenue(orderedVenues[nextIndex]);
  }, { passive: true });
})();

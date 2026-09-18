const mapPointLayer = L.layerGroup().addTo(map);
let mapPointEntries = [];

async function loadMapPoints() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/imaike_map_points?select=id,name,location,latitude,longitude,icon,sort_order&order=sort_order.asc`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const points = await response.json();
    mapPointLayer.clearLayers();
    mapPointEntries = [];

    points.forEach(point => {
      const latitude = Number(point.latitude);
      const longitude = Number(point.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

      const marker = L.marker([latitude, longitude], {
        icon: L.divIcon({
          className: 'map-point-icon',
          html: '<span aria-hidden="true">i</span>',
          iconSize: [38, 46],
          iconAnchor: [19, 46]
        }),
        title: point.name,
        zIndexOffset: 1200
      });

      marker.bindPopup(`<strong>${escapeHtml(point.name)}</strong><br><a href="${mapsUrl({ lat: latitude, lng: longitude })}" target="_blank" rel="noopener">Google Mapsで開く</a>`);
      marker.addTo(mapPointLayer);

      marker.bindTooltip(escapeHtml(point.name), {
        permanent: true,
        direction: 'right',
        offset: [15, -18],
        className: 'map-point-label',
        opacity: 1
      });

      mapPointEntries.push({ marker });
    });

    updateMapPointVisibility();
  } catch (error) {
    console.error('補助地点情報の取得に失敗しました:', error);
  }
}

function updateMapPointVisibility() {
  const pinsVisible = showVenuePins.checked;
  const labelsVisible = showVenueLabels.checked;

  mapPointEntries.forEach(({ marker }) => {
    if (pinsVisible) marker.addTo(mapPointLayer);
    else marker.remove();

    if (labelsVisible) marker.openTooltip();
    else marker.closeTooltip();
  });
}

showVenuePins.addEventListener('change', updateMapPointVisibility);
showVenueLabels.addEventListener('change', updateMapPointVisibility);

loadMapPoints();

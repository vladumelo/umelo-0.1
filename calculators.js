
const estimateBody = document.querySelector('#estimate-body');
const estimateGrandTotal = document.querySelector('#estimate-grand-total');
const estimateAddRowButton = document.querySelector('#estimate-add-row');
const estimateAddPresetButton = document.querySelector('#estimate-add-preset');

const presetEstimateRows = [
  { name: 'Бетонное покрытие', quantity: 120, unit: 'м²', rate: 2800 },
  { name: 'Бордюр', quantity: 85, unit: 'м.п', rate: 1100 },
  { name: 'Плодородный грунт', quantity: 140, unit: 'м²', rate: 650 },
];

function formatMoney(value) {
  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0) + ' ₽';
}

function formatMetric(value, digits = 2) {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(Number.isFinite(value) ? value : 0);
}

function createEstimateRow(data = {}) {
  if (!estimateBody) return;

  const row = document.createElement('tr');
  row.innerHTML = `
    <td><input type="text" class="estimate-input estimate-input--name" value="${data.name ?? ''}" placeholder="Например, бетонное покрытие" /></td>
    <td><input type="number" class="estimate-input js-estimate-qty" value="${data.quantity ?? 0}" min="0" step="0.01" /></td>
    <td>
      <select class="estimate-input js-estimate-unit">
        <option value="м²" ${data.unit === 'м²' ? 'selected' : ''}>м²</option>
        <option value="м.п" ${data.unit === 'м.п' ? 'selected' : ''}>м.п</option>
        <option value="м³" ${data.unit === 'м³' ? 'selected' : ''}>м³</option>
        <option value="шт" ${data.unit === 'шт' ? 'selected' : ''}>шт</option>
      </select>
    </td>
    <td><input type="number" class="estimate-input js-estimate-rate" value="${data.rate ?? 0}" min="0" step="1" /></td>
    <td><strong class="estimate-line-total">0 ₽</strong></td>
    <td><button class="estimate-remove" type="button" aria-label="Удалить строку">×</button></td>
  `;

  const qtyInput = row.querySelector('.js-estimate-qty');
  const rateInput = row.querySelector('.js-estimate-rate');
  const totalCell = row.querySelector('.estimate-line-total');
  const removeButton = row.querySelector('.estimate-remove');

  const recalcRow = () => {
    const total = (parseFloat(qtyInput.value) || 0) * (parseFloat(rateInput.value) || 0);
    totalCell.textContent = formatMoney(total);
    recalcEstimateTotal();
  };

  qtyInput.addEventListener('input', recalcRow);
  rateInput.addEventListener('input', recalcRow);
  row.querySelector('.js-estimate-unit').addEventListener('change', recalcEstimateTotal);
  row.querySelector('.estimate-input--name').addEventListener('input', recalcEstimateTotal);
  removeButton.addEventListener('click', () => {
    row.remove();
    recalcEstimateTotal();
  });

  estimateBody.appendChild(row);
  recalcRow();
}

function recalcEstimateTotal() {
  if (!estimateBody || !estimateGrandTotal) return;
  let total = 0;
  estimateBody.querySelectorAll('tr').forEach((row) => {
    const qty = parseFloat(row.querySelector('.js-estimate-qty')?.value || 0);
    const rate = parseFloat(row.querySelector('.js-estimate-rate')?.value || 0);
    total += qty * rate;
  });
  estimateGrandTotal.textContent = formatMoney(total);
}

if (estimateAddRowButton && estimateBody) {
  estimateAddRowButton.addEventListener('click', () => createEstimateRow());
  estimateAddPresetButton.addEventListener('click', () => {
    if (estimateBody.children.length > 0) return;
    presetEstimateRows.forEach(createEstimateRow);
  });

  if (estimateBody.children.length === 0) {
    createEstimateRow({ name: 'Покрытие', quantity: 100, unit: 'м²', rate: 2500 });
    createEstimateRow({ name: 'Бордюр', quantity: 65, unit: 'м.п', rate: 900 });
  }
}

const keyInput = document.querySelector('#ymaps-api-key');
const connectButton = document.querySelector('#ymaps-connect');
const drawButton = document.querySelector('#draw-figure');
const clearMapButton = document.querySelector('#clear-map');
const mapStatus = document.querySelector('#map-status');
const mapPlaceholder = document.querySelector('#map-placeholder');
const mapItemsCount = document.querySelector('#map-items-count');
const mapGrandTotal = document.querySelector('#map-grand-total');
const mapResults = document.querySelector('#map-results');
const drawName = document.querySelector('#draw-name');
const drawKind = document.querySelector('#draw-kind');
const drawRate = document.querySelector('#draw-rate');
const drawFactor = document.querySelector('#draw-factor');

let ymap = null;
let ymapReadyPromise = null;
let mapItems = [];
let activeEditorItemId = null;

const DEFAULT_CENTER = [43.1155, 131.8855];
const STORAGE_KEY = 'umelo_yandex_maps_api_key';

if (keyInput) {
  const storedKey = localStorage.getItem(STORAGE_KEY);
  if (storedKey) {
    keyInput.value = storedKey;
  }
}

function setMapStatus(message, state = 'neutral') {
  if (!mapStatus) return;
  mapStatus.textContent = message;
  mapStatus.dataset.state = state;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function loadYandexMaps(apiKey) {
  if (window.ymaps && ymapReadyPromise) return ymapReadyPromise;
  if (ymapReadyPromise) return ymapReadyPromise;

  ymapReadyPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-yandex-maps="true"]');
    if (existing && window.ymaps) {
      window.ymaps.ready(() => resolve(window.ymaps));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(apiKey)}&lang=ru_RU`;
    script.async = true;
    script.dataset.yandexMaps = 'true';

    script.onload = () => {
      if (!window.ymaps) {
        reject(new Error('API не загрузился.'));
        return;
      }
      window.ymaps.ready(() => resolve(window.ymaps));
    };

    script.onerror = () => reject(new Error('Не удалось загрузить API Яндекс Карт.'));
    document.head.appendChild(script);
  });

  return ymapReadyPromise;
}

function haversineDistance(a, b) {
  const R = 6371008.8;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const lat1 = toRad(a[0]);
  const lon1 = toRad(a[1]);
  const lat2 = toRad(b[0]);
  const lon2 = toRad(b[1]);
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function lineLength(coords) {
  let total = 0;
  for (let i = 1; i < coords.length; i += 1) {
    total += haversineDistance(coords[i - 1], coords[i]);
  }
  return total;
}

function polygonArea(coords) {
  if (!coords || coords.length < 3) return 0;
  const R = 6378137;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const lat0 = coords.reduce((sum, point) => sum + point[0], 0) / coords.length;
  const lat0Rad = toRad(lat0);

  const projected = coords.map(([lat, lon]) => {
    return {
      x: R * toRad(lon) * Math.cos(lat0Rad),
      y: R * toRad(lat),
    };
  });

  let area = 0;
  for (let i = 0; i < projected.length; i += 1) {
    const current = projected[i];
    const next = projected[(i + 1) % projected.length];
    area += current.x * next.y - next.x * current.y;
  }

  return Math.abs(area / 2);
}

function createDefaultGeometry(kind) {
  const center = ymap ? ymap.getCenter() : DEFAULT_CENTER;
  const [lat, lon] = center;
  const dLat = 0.00065;
  const dLon = 0.00095;

  if (kind === 'polyline') {
    return [
      [lat - dLat, lon - dLon],
      [lat + dLat, lon + dLon],
    ];
  }

  return [[
    [lat - dLat, lon - dLon],
    [lat - dLat, lon + dLon],
    [lat + dLat, lon + dLon],
    [lat + dLat, lon - dLon],
  ]];
}

function getMetricForItem(item) {
  if (!item.object) return 0;
  if (item.kind === 'polyline') {
    const coords = item.object.geometry.getCoordinates();
    return lineLength(coords);
  }

  const rings = item.object.geometry.getCoordinates();
  return polygonArea(rings[0] || []);
}

function getUnitForKind(kind) {
  return kind === 'polyline' ? 'м.п' : 'м²';
}

function getTotalForItem(item) {
  return getMetricForItem(item) * item.rate * item.factor;
}

function focusItem(itemId) {
  const item = mapItems.find((entry) => entry.id === itemId);
  if (!item || !ymap) return;
  const bounds = item.object.geometry.getBounds?.();
  if (bounds) {
    ymap.setBounds(bounds, { checkZoomRange: true, duration: 250, zoomMargin: 32 });
  }
}

function stopAllEditors() {
  mapItems.forEach((item) => {
    if (item.object?.editor?.state.get('editing')) {
      item.object.editor.stopEditing();
    }
  });
  activeEditorItemId = null;
}

function startEditingItem(itemId) {
  stopAllEditors();
  const item = mapItems.find((entry) => entry.id === itemId);
  if (!item) return;
  item.object.editor.startEditing();
  activeEditorItemId = itemId;
  renderMapResults();
}

function attachGeometryListeners(item) {
  if (!item.object?.geometry?.events) return;
  item.object.geometry.events.add('change', () => {
    renderMapResults();
  });
}

function removeItem(itemId) {
  const item = mapItems.find((entry) => entry.id === itemId);
  if (!item || !ymap) return;
  ymap.geoObjects.remove(item.object);
  mapItems = mapItems.filter((entry) => entry.id !== itemId);
  if (activeEditorItemId === itemId) activeEditorItemId = null;
  renderMapResults();
}

function renderMapResults() {
  if (!mapResults || !mapItemsCount || !mapGrandTotal) return;

  const total = mapItems.reduce((sum, item) => sum + getTotalForItem(item), 0);
  mapItemsCount.textContent = String(mapItems.length);
  mapGrandTotal.textContent = formatMoney(total);

  if (mapItems.length === 0) {
    mapResults.innerHTML = '<div class="map-results__empty">На карте ещё нет элементов. Добавь фигуру или линию, и здесь появятся объёмы и стоимость.</div>';
    return;
  }

  mapResults.innerHTML = mapItems
    .map((item) => {
      const metric = getMetricForItem(item);
      const totalValue = getTotalForItem(item);
      const unit = getUnitForKind(item.kind);
      const isEditing = item.id === activeEditorItemId;
      return `
        <article class="map-item-card ${isEditing ? 'is-active' : ''}" data-item-id="${item.id}">
          <div class="map-item-card__head">
            <div>
              <span class="map-item-card__badge">${item.kind === 'polyline' ? 'Линия' : 'Фигура'}</span>
              <h3>${escapeHtml(item.name)}</h3>
            </div>
            <strong>${formatMoney(totalValue)}</strong>
          </div>
          <div class="map-item-card__metrics">
            <div>
              <span>Объём</span>
              <strong>${formatMetric(metric)} ${unit}</strong>
            </div>
            <div>
              <span>Ставка</span>
              <strong>${formatMetric(item.rate, 0)} ₽ / ${unit}</strong>
            </div>
            <div>
              <span>Коэфф.</span>
              <strong>${formatMetric(item.factor)}</strong>
            </div>
          </div>
          <div class="map-item-card__fields">
            <label class="field field--compact">
              <span>Название</span>
              <input type="text" value="${escapeHtml(item.name)}" data-role="name" />
            </label>
            <label class="field field--compact">
              <span>Ставка</span>
              <input type="number" min="0" step="1" value="${item.rate}" data-role="rate" />
            </label>
            <label class="field field--compact">
              <span>Коэффициент</span>
              <input type="number" min="0" step="0.01" value="${item.factor}" data-role="factor" />
            </label>
          </div>
          <div class="map-item-card__actions">
            <button class="button button--secondary" type="button" data-action="focus">Показать</button>
            <button class="button button--secondary" type="button" data-action="edit">${isEditing ? 'Завершить редактирование' : 'Редактировать'}</button>
            <button class="button button--secondary" type="button" data-action="delete">Удалить</button>
          </div>
        </article>
      `;
    })
    .join('');
}

if (mapResults) {
  mapResults.addEventListener('input', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const card = target.closest('[data-item-id]');
    if (!card) return;
    const item = mapItems.find((entry) => entry.id === card.dataset.itemId);
    if (!item) return;

    const role = target.dataset.role;
    if (role === 'name') item.name = target.value || 'Элемент';
    if (role === 'rate') item.rate = parseFloat(target.value) || 0;
    if (role === 'factor') item.factor = parseFloat(target.value) || 1;

    renderMapResults();
  });

  mapResults.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const card = button.closest('[data-item-id]');
    if (!card) return;
    const itemId = card.dataset.itemId;

    if (button.dataset.action === 'delete') removeItem(itemId);
    if (button.dataset.action === 'focus') focusItem(itemId);
    if (button.dataset.action === 'edit') {
      if (activeEditorItemId === itemId) {
        stopAllEditors();
        renderMapResults();
      } else {
        startEditingItem(itemId);
      }
    }
  });
}

function createMapObject(kind, geometry, title) {
  const commonProps = {
    balloonContentHeader: title,
    balloonContentBody: 'Элемент калькулятора Умело',
  };

  if (kind === 'polyline') {
    return new window.ymaps.Polyline(geometry, commonProps, {
      strokeColor: '#1d4ed8',
      strokeWidth: 5,
      draggable: true,
      editorMaxPoints: 500,
    });
  }

  return new window.ymaps.Polygon(geometry, commonProps, {
    fillColor: 'rgba(29, 78, 216, 0.18)',
    strokeColor: '#1d4ed8',
    strokeWidth: 3,
    draggable: true,
    editorMaxPoints: 500,
  });
}

function addDrawnItem() {
  if (!ymap || !window.ymaps) {
    setMapStatus('Сначала подключи карту.', 'warning');
    return;
  }

  const kind = drawKind?.value === 'polyline' ? 'polyline' : 'polygon';
  const item = {
    id: `item-${Date.now()}`,
    name: (drawName?.value || '').trim() || (kind === 'polyline' ? 'Линейный элемент' : 'Площадной элемент'),
    kind,
    rate: parseFloat(drawRate?.value || 0) || 0,
    factor: parseFloat(drawFactor?.value || 1) || 1,
  };

  const geometry = createDefaultGeometry(kind);
  item.object = createMapObject(kind, geometry, item.name);
  item.object.properties.set('itemId', item.id);

  ymap.geoObjects.add(item.object);
  mapItems.push(item);
  attachGeometryListeners(item);
  focusItem(item.id);
  startEditingItem(item.id);
  renderMapResults();
  setMapStatus('Элемент добавлен. Перетаскивай точки и грани, чтобы уточнить геометрию.', 'success');

  if (mapPlaceholder) mapPlaceholder.hidden = true;
}

function initMap() {
  if (ymap || !window.ymaps) return;
  ymap = new window.ymaps.Map('yandex-map', {
    center: DEFAULT_CENTER,
    zoom: 17,
    controls: ['zoomControl', 'typeSelector', 'fullscreenControl'],
  }, {
    suppressMapOpenBlock: true,
  });

  setMapStatus('Карта подключена. Теперь можно добавлять элементы.', 'success');
  if (mapPlaceholder) mapPlaceholder.hidden = true;
  renderMapResults();
}

async function connectMap() {
  const key = keyInput?.value.trim();
  if (!key) {
    setMapStatus('Вставь API-ключ, потом подключай карту.', 'warning');
    return;
  }

  connectButton.disabled = true;
  setMapStatus('Загружаю API Яндекс Карт…', 'loading');

  try {
    localStorage.setItem(STORAGE_KEY, key);
    await loadYandexMaps(key);
    initMap();
  } catch (error) {
    setMapStatus(error.message || 'Не удалось запустить карту.', 'error');
  } finally {
    connectButton.disabled = false;
  }
}

function clearMap() {
  if (!ymap) return;
  stopAllEditors();
  mapItems.forEach((item) => ymap.geoObjects.remove(item.object));
  mapItems = [];
  renderMapResults();
  setMapStatus('Карта очищена.', 'neutral');
  if (mapPlaceholder) mapPlaceholder.hidden = false;
}

if (connectButton) connectButton.addEventListener('click', connectMap);
if (drawButton) drawButton.addEventListener('click', addDrawnItem);
if (clearMapButton) clearMapButton.addEventListener('click', clearMap);
if (keyInput) {
  keyInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      connectMap();
    }
  });
}

renderMapResults();

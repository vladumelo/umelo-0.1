(function () {
  const canvas = document.getElementById('map-canvas');
  if (!canvas || typeof L === 'undefined') return;

  const nodes = {
    searchInput: document.getElementById('map-search-input'),
    searchButton: document.getElementById('map-search-button'),
    searchStatus: document.getElementById('map-search-status'),
    searchResults: document.getElementById('map-search-results'),
    searchFlyout: document.querySelector('.map-search-flyout'),
    layerList: document.getElementById('map-layer-list'),
    summaryCount: document.getElementById('map-summary-count'),
    summaryTotal: document.getElementById('map-summary-total'),
    summaryCardCount: document.getElementById('summary-card-count'),
    summaryCardTotal: document.getElementById('summary-card-total'),
    saveButton: document.getElementById('map-save-project'),
    loadInput: document.getElementById('map-load-project'),
    clearButton: document.getElementById('map-clear-project'),
    exportCsvButton: document.getElementById('map-export-csv'),
    exportDxfButton: document.getElementById('map-export-dxf'),
    activeWorktypeRate: document.getElementById('map-active-worktype-rate'),
    activeDrawLayerSelect: document.getElementById('map-active-draw-layer-select'),
    estimateLayerFilter: document.getElementById('map-estimate-layer-filter'),
    worktypeManager: document.getElementById('map-worktype-manager'),
    activeWorktypeSelect: document.getElementById('map-active-worktype-select'),
    addWorktypeButton: document.getElementById('map-add-worktype-button'),
    geometryLayerManager: document.getElementById('map-geometry-layer-manager'),
    addGeometryLayerButton: document.getElementById('map-add-geometry-layer-button'),
    addWorktypeForm: document.getElementById('map-add-worktype-form'),
    newWorktypeName: document.getElementById('map-new-worktype-name'),
    newWorktypeMode: document.getElementById('map-new-worktype-mode'),
    newWorktypeRate: document.getElementById('map-new-worktype-rate'),
    newWorktypeSave: document.getElementById('map-new-worktype-save'),
    newWorktypeCancel: document.getElementById('map-new-worktype-cancel'),
    toolbar: document.getElementById('map-toolbar'),
    basemapLabel: document.getElementById('map-basemap-label'),
    basemapRadios: Array.from(document.querySelectorAll('input[name="map-basemap"]')),
    modeStatus: document.getElementById('map-mode-status'),
    activeWorktypeLabel: document.getElementById('map-active-worktype-label'),
    leftDrawer: document.getElementById('map-left-drawer'),
    rightDrawer: document.getElementById('map-right-drawer'),
    drawerToggles: Array.from(document.querySelectorAll('[data-drawer-toggle]')),
    toggleBorders: document.getElementById('toggle-cadastral-borders'),
    toggleParcels: document.getElementById('toggle-cadastral-parcels'),
    editButton: document.getElementById('map-tool-edit'),
    deleteModeButton: document.getElementById('map-tool-delete-mode'),
    stopButton: document.getElementById('map-tool-stop'),
    exportModal: document.getElementById('map-export-modal'),
    exportModalOpen: document.getElementById('map-open-export-modal'),
    exportModalClosers: Array.from(document.querySelectorAll('[data-modal-close="export"]')),
  };

  const WORK_TYPES = {
    concrete: { label: 'Бетонное покрытие', unit: 'м²', measurement: 'area', rate: 3200, color: '#2563eb' },
    pedestrianAsphalt: { label: 'Асфальт пешеходный', unit: 'м²', measurement: 'area', rate: 1850, color: '#0f766e' },
    roadAsphalt: { label: 'Асфальт дорожный', unit: 'м²', measurement: 'area', rate: 2400, color: '#334155' },
    curb: { label: 'Бордюр / лента', unit: 'м.п', measurement: 'length', rate: 1400, color: '#b45309' },
    fertileSoil: { label: 'Плодородный грунт', unit: 'м²', measurement: 'area', rate: 650, color: '#65a30d' },
    fence: { label: 'Забор', unit: 'м.п', measurement: 'length', rate: 4900, color: '#7c3aed' },
    stairs: { label: 'Лестницы', unit: 'м³', measurement: 'volumeFromArea', factor: 0.15, rate: 19000, color: '#dc2626' },
    stormDrain: { label: 'Ливнесток', unit: 'м.п', measurement: 'length', rate: 2800, color: '#0369a1' },
    smallForm: { label: 'МАФ / точка', unit: 'шт', measurement: 'count', rate: 150000, color: '#be185d' },
  };

  const INITIAL_WORK_TYPES = JSON.parse(JSON.stringify(WORK_TYPES));
  const INITIAL_WORK_TYPE_ORDER = Object.keys(INITIAL_WORK_TYPES);
  const BASE_WORK_TYPE_KEYS = new Set(INITIAL_WORK_TYPE_ORDER);
  const CUSTOM_COLORS = ['#0ea5e9', '#8b5cf6', '#ef4444', '#14b8a6', '#f59e0b', '#ec4899', '#84cc16'];
  const MEASUREMENT_UNITS = {
    area: 'м²',
    length: 'м.п',
    count: 'шт',
    volumeFromArea: 'м³',
  };
  const INITIAL_GEOMETRY_LAYERS = {
    main: { name: 'Основной слой', color: '#22c55e', visible: true },
  };
  let workTypeOrder = [...INITIAL_WORK_TYPE_ORDER];
  let geometryLayers = JSON.parse(JSON.stringify(INITIAL_GEOMETRY_LAYERS));
  let geometryLayerOrder = Object.keys(INITIAL_GEOMETRY_LAYERS);
  let activeGeometryLayer = 'main';
  let activeEstimateLayerFilter = 'all';

  const currency = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  });

  const decimal = new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 2,
  });

  const map = L.map(canvas, {
    center: [43.1155, 131.8855],
    zoom: 15,
    zoomControl: false,
    preferCanvas: true,
  });

  L.control.zoom({ position: 'topright' }).addTo(map);
  map.attributionControl.setPrefix(false);

  const yandexScheme = L.tileLayer('https://vec0{s}.maps.yandex.net/tiles?l=map&x={x}&y={y}&z={z}&lang=ru_RU', {
    subdomains: ['1', '2', '3', '4'],
    maxZoom: 21,
    attribution: '© Yandex',
  });

  const yandexSatellite = L.tileLayer('https://sat0{s}.maps.yandex.net/tiles?l=sat&x={x}&y={y}&z={z}&lang=ru_RU', {
    subdomains: ['1', '2', '3', '4'],
    maxZoom: 21,
    attribution: '© Yandex',
  });

  yandexSatellite.addTo(map);

  const baseLayers = {
    scheme: yandexScheme,
    satellite: yandexSatellite,
  };

  const overlays = {};
  const handleOverlayLoad = () => setStatus('Публичный кадастровый слой загружен.');
  const handleOverlayError = () => setStatus('Публичный кадастровый слой временно недоступен. Базовая карта и расчёты продолжают работать.');

  overlays.borders = L.tileLayer('https://pkk.rosreestr.ru/arcgis/rest/services/PKK6/CadastreObjects/MapServer/tile/{z}/{y}/{x}', {
    opacity: 0.9,
    maxZoom: 22,
    attribution: '© Росреестр (ПКК)',
  });
  overlays.borders.on('load', handleOverlayLoad);
  overlays.borders.on('tileerror', handleOverlayError);

  if (L.esri && typeof L.esri.dynamicMapLayer === 'function') {
    overlays.parcels = L.esri.dynamicMapLayer({
      url: 'https://pkk.rosreestr.ru/arcgis/rest/services/PKK6/CadastreObjects/MapServer',
      opacity: 0.55,
      position: 'front',
      useCors: true,
    });

    overlays.parcels.on('load', handleOverlayLoad);
    overlays.parcels.on('error', handleOverlayError);
  }

  const featureGroup = new L.FeatureGroup();
  featureGroup.addTo(map);

  let activeWorkType = 'concrete';
  let selectedLayerId = null;
  let idCounter = 0;
  let activeDrawHandler = null;
  let editModeEnabled = false;
  let deleteModeEnabled = false;
  let currentBasemap = 'satellite';
  let searchMarker = null;
  const layerMeta = new Map();

  function setStatus(message) {
    if (nodes.modeStatus) nodes.modeStatus.textContent = message;
  }

  function updateSearchFlyoutState() {
    if (!nodes.searchFlyout) return;
    const hasResults = Boolean(nodes.searchResults?.children?.length);
    const hasStatus = Boolean(nodes.searchStatus?.textContent?.trim());
    nodes.searchFlyout.style.display = hasResults || hasStatus ? 'block' : 'none';
  }

  function setSearchStatus(message) {
    if (!nodes.searchStatus) return;
    nodes.searchStatus.textContent = message || '';
    nodes.searchStatus.style.display = message ? 'block' : 'none';
    updateSearchFlyoutState();
  }


  function setExportModalState(isOpen) {
    if (!nodes.exportModal) return;
    nodes.exportModal.hidden = !isOpen;
    document.body.classList.toggle('modal-open', isOpen);
  }

  function measurementLabel(measurement) {
    return MEASUREMENT_UNITS[measurement] || 'ед.';
  }

  function makeWorkTypeKey(label) {
    const stem = String(label || 'position')
      .toLowerCase()
      .replace(/[^a-zа-я0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24) || 'position';
    let key = `custom-${stem}`;
    let index = 1;
    while (WORK_TYPES[key]) {
      index += 1;
      key = `custom-${stem}-${index}`;
    }
    return key;
  }

  function getWorkTypeEntries() {
    return workTypeOrder.filter((key) => WORK_TYPES[key]).map((key) => [key, WORK_TYPES[key]]);
  }

  function setActiveWorkType(workType, withStatus = true) {
    if (!(workType in WORK_TYPES)) return;
    activeWorkType = workType;

    if (nodes.activeWorktypeSelect) {
      nodes.activeWorktypeSelect.value = workType;
    }

    if (nodes.activeWorktypeRate) {
      nodes.activeWorktypeRate.value = String(Number(WORK_TYPES[workType].rate || 0));
    }

    if (nodes.activeWorktypeLabel) {
      nodes.activeWorktypeLabel.textContent = WORK_TYPES[workType].label;
    }

    nodes.worktypeManager?.querySelectorAll('[data-action="pick-worktype"]').forEach((button) => {
      const isActive = button.dataset.workTypeKey === workType;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });

    if (withStatus) {
      setStatus(`Активный тип работ: ${WORK_TYPES[workType].label}.`);
    }
  }

  function syncExistingMetasForWorkType(workType, prevLabel, prevRate) {
    layerMeta.forEach((meta) => {
      if (meta.workType !== workType) return;
      if (meta.name === prevLabel) meta.name = WORK_TYPES[workType].label;
      if (Number(meta.rate) === Number(prevRate)) meta.rate = Number(WORK_TYPES[workType].rate || 0);
      applyLayerStyle(meta.layer, meta.workType, meta.id === selectedLayerId);
      if (!meta.manualQuantity) {
        meta.quantity = computeAutoQuantity(meta);
      }
    });
  }

  function renderWorktypeControls() {
    const entries = getWorkTypeEntries();

    if (nodes.activeWorktypeSelect) {
      nodes.activeWorktypeSelect.innerHTML = entries
        .map(([key, item]) => `<option value="${key}">${escapeHtml(item.label)}</option>`)
        .join('');
      nodes.activeWorktypeSelect.value = activeWorkType;
    }

    if (nodes.activeWorktypeRate) {
      nodes.activeWorktypeRate.value = String(Number((WORK_TYPES[activeWorkType] || {}).rate || 0));
    }

    if (nodes.worktypeManager) {
      nodes.worktypeManager.innerHTML = entries.map(([key, item]) => `
        <article class="worktype-row${key === activeWorkType ? ' is-active' : ''}" data-work-type-key="${key}">
          <button class="worktype-row__pick${key === activeWorkType ? ' is-active' : ''}" type="button" data-action="pick-worktype" data-work-type-key="${key}" aria-pressed="${key === activeWorkType ? 'true' : 'false'}"></button>
          <textarea class="worktype-row__name" rows="1" data-action="worktype-label">${escapeHtml(item.label)}</textarea>
          <span class="worktype-row__unit">${escapeHtml(item.unit || measurementLabel(item.measurement))}</span>
          <label class="worktype-row__rate-wrap">
            <span>₽</span>
            <input class="worktype-row__rate" type="number" min="0" step="1" value="${Number(item.rate || 0)}" data-action="worktype-rate" />
          </label>
          ${BASE_WORK_TYPE_KEYS.has(key) ? '<span class="worktype-row__action-spacer" aria-hidden="true"></span>' : `<button class="worktype-row__delete" type="button" data-action="delete-worktype" data-work-type-key="${key}" aria-label="Удалить позицию">×</button>`}
        </article>
      `).join('');
      requestAnimationFrame(autoSizeWorktypeNames);
    }

    setActiveWorkType(activeWorkType, false);
  }

  function toggleAddWorktypeForm(show) {
    if (!nodes.addWorktypeForm) return;
    nodes.addWorktypeForm.hidden = !show;
    if (show) {
      nodes.newWorktypeName?.focus();
    } else {
      if (nodes.newWorktypeName) nodes.newWorktypeName.value = '';
      if (nodes.newWorktypeRate) nodes.newWorktypeRate.value = '';
      if (nodes.newWorktypeMode) nodes.newWorktypeMode.value = 'area';
    }
  }

  function addCustomWorkType() {
    const label = String(nodes.newWorktypeName?.value || '').trim();
    const measurement = String(nodes.newWorktypeMode?.value || 'area');
    const rate = Number(nodes.newWorktypeRate?.value || 0);
    if (!label) {
      setStatus('Введи название новой позиции.');
      return;
    }

    const key = makeWorkTypeKey(label);
    WORK_TYPES[key] = {
      label,
      unit: measurementLabel(measurement),
      measurement,
      rate,
      factor: measurement === 'volumeFromArea' ? 0.15 : 1,
      color: CUSTOM_COLORS[workTypeOrder.length % CUSTOM_COLORS.length],
    };
    workTypeOrder.push(key);
    renderWorktypeControls();
    setActiveWorkType(key, false);
    toggleAddWorktypeForm(false);
    renderLayerList();
    setStatus(`Добавлена позиция: ${label}.`);
  }

  function deleteCustomWorkType(key) {
    if (BASE_WORK_TYPE_KEYS.has(key) || !WORK_TYPES[key]) return;
    const isUsed = Array.from(layerMeta.values()).some((meta) => meta.workType === key);
    if (isUsed) {
      setStatus('Сначала смени тип у контуров, которые используют эту позицию.');
      return;
    }
    delete WORK_TYPES[key];
    workTypeOrder = workTypeOrder.filter((item) => item !== key);
    if (activeWorkType === key) activeWorkType = 'concrete';
    renderWorktypeControls();
    renderLayerList();
    setStatus('Позиция удалена.');
  }

  function makeGeometryLayerKey(label) {
    const stem = String(label || 'layer')
      .toLowerCase()
      .replace(/[^a-zа-я0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24) || 'layer';
    let key = `geo-${stem}`;
    let index = 1;
    while (geometryLayers[key]) {
      index += 1;
      key = `geo-${stem}-${index}`;
    }
    return key;
  }

  function getGeometryLayerEntries() {
    return geometryLayerOrder.filter((key) => geometryLayers[key]).map((key) => [key, geometryLayers[key]]);
  }

  function getEstimateLayerFilterOptions() {
    return [['all', 'Все слои'], ...getGeometryLayerEntries().map(([key, item]) => [key, item.name])];
  }

  function getFilteredMetas() {
    return Array.from(layerMeta.values());
  }

  function setActiveGeometryLayer(key, withStatus = true) {
    activeGeometryLayer = 'main';
  }

  function addGeometryLayer() {
    return;
  }

  function deleteGeometryLayer(key) {
    return;
  }

  function renderGeometryLayerControls() {
    return;
  }

  function restoreGeometryLayers(savedLayers, savedActiveLayer) {
    geometryLayers = JSON.parse(JSON.stringify(INITIAL_GEOMETRY_LAYERS));
    geometryLayerOrder = Object.keys(INITIAL_GEOMETRY_LAYERS);
    activeGeometryLayer = 'main';
  }


  function autoSizeWorktypeNames() {
    nodes.worktypeManager?.querySelectorAll('.worktype-row__name').forEach((field) => {
      if (!(field instanceof HTMLTextAreaElement)) return;
      field.style.height = 'auto';
      field.style.height = `${Math.min(field.scrollHeight, 72)}px`;
    });
  }


  function syncDrawerButtons(side, isOpen) {
    nodes.drawerToggles?.forEach((button) => {
      if (button.dataset.drawerToggle !== side) return;
      button.classList.toggle('is-active', isOpen);
      button.setAttribute('aria-expanded', String(isOpen));
    });
  }

  function getDrawer(side) {
    return side === 'right' ? nodes.rightDrawer : nodes.leftDrawer;
  }

  function setDrawerState(side, isOpen) {
    const drawer = getDrawer(side);
    if (!drawer) return;
    drawer.classList.toggle('is-open', isOpen);
    syncDrawerButtons(side, isOpen);
    window.setTimeout(() => map.invalidateSize(), 280);
  }

  function toggleDrawer(side) {
    const drawer = getDrawer(side);
    if (!drawer) return;
    setDrawerState(side, !drawer.classList.contains('is-open'));
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  function getShapeOptions(workType) {
    const work = WORK_TYPES[workType] || WORK_TYPES.concrete;
    return {
      color: work.color,
      weight: 3,
      opacity: 1,
      fillColor: work.color,
      fillOpacity: 0.18,
    };
  }

  function applyLayerStyle(layer, workType, selected) {
    const work = WORK_TYPES[workType] || WORK_TYPES.concrete;
    const color = work.color;
    const selectedWeight = selected ? 5 : 3;

    if (layer instanceof L.Marker) {
      if (typeof layer.setOpacity === 'function') layer.setOpacity(1);
      return;
    }
    if (typeof layer.setStyle === 'function') {
      layer.setStyle({
        color,
        weight: selectedWeight,
        opacity: 1,
        fillColor: color,
        fillOpacity: selected ? 0.26 : 0.18,
      });
    }
  }

  function haversine(a, b) {
    const R = 6371000;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);

    const n = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
    return 2 * R * Math.atan2(Math.sqrt(n), Math.sqrt(1 - n));
  }

  function toRad(value) {
    return (value * Math.PI) / 180;
  }

  function projectMercator(latlng) {
    const originShift = 20037508.34;
    const x = (latlng.lng * originShift) / 180;
    let y = Math.log(Math.tan(((90 + latlng.lat) * Math.PI) / 360)) / (Math.PI / 180);
    y = (y * originShift) / 180;
    return { x, y };
  }

  function computePolygonArea(latlngs) {
    if (!latlngs || latlngs.length < 3) return 0;
    const radius = 6378137;
    let area = 0;
    for (let i = 0; i < latlngs.length; i += 1) {
      const current = latlngs[i];
      const next = latlngs[(i + 1) % latlngs.length];
      area +=
        (toRad(next.lng) - toRad(current.lng)) *
        (2 + Math.sin(toRad(current.lat)) + Math.sin(toRad(next.lat)));
    }
    return Math.abs((area * radius * radius) / 2);
  }

  function computePolylineLength(latlngs) {
    if (!latlngs || latlngs.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < latlngs.length - 1; i += 1) {
      total += haversine(latlngs[i], latlngs[i + 1]);
    }
    return total;
  }

  function getFlatLatLngs(layer) {
    if (layer instanceof L.Marker) return [layer.getLatLng()];
    const raw = layer.getLatLngs();
    if (!Array.isArray(raw)) return [];
    if (raw.length && Array.isArray(raw[0])) return raw[0];
    return raw;
  }

  function getLayerMetrics(layer) {
    if (layer instanceof L.Marker) {
      return { area: 0, length: 0, perimeter: 0, count: 1 };
    }

    const latlngs = getFlatLatLngs(layer);
    const isPolygon = layer instanceof L.Polygon && !(layer instanceof L.Polyline && !(layer instanceof L.Polygon));
    const isPolyline = layer instanceof L.Polyline && !(layer instanceof L.Polygon);

    let area = 0;
    let length = 0;
    let perimeter = 0;

    if (isPolygon) {
      area = computePolygonArea(latlngs);
      perimeter = computePolylineLength([...latlngs, latlngs[0]]);
    }
    if (isPolyline) {
      length = computePolylineLength(latlngs);
    }

    return { area, length, perimeter, count: 0 };
  }

  function inferGeometryType(layer) {
    if (layer instanceof L.Marker) return 'marker';
    if (layer instanceof L.Rectangle) return 'rectangle';
    if (layer instanceof L.Polygon) return 'polygon';
    return 'polyline';
  }

  function cloneGeometry(layer) {
    if (layer instanceof L.Marker) {
      const point = layer.getLatLng();
      return [point.lat, point.lng];
    }
    return getFlatLatLngs(layer).map((point) => [point.lat, point.lng]);
  }

  function computeAutoQuantity(meta) {
    const work = WORK_TYPES[meta.workType] || WORK_TYPES.concrete;
    if (work.measurement === 'count') return 1;
    if (work.measurement === 'length') {
      return meta.metrics.length || meta.metrics.perimeter || 0;
    }
    if (work.measurement === 'volumeFromArea') {
      return (meta.metrics.area || 0) * (work.factor || 1);
    }
    return meta.metrics.area || 0;
  }

  function bindLayerEvents(layer) {
    layer.on('click', () => {
      const id = layer.__umeloId;
      if (!id) return;

      if (deleteModeEnabled) {
        removeMeta(id);
        return;
      }

      selectedLayerId = id;
      if (layer.getBounds) {
        const bounds = layer.getBounds();
        if (bounds.isValid()) map.fitBounds(bounds.pad(0.25));
      } else if (layer.getLatLng) {
        map.panTo(layer.getLatLng());
      }
      renderLayerList();
    });
  }

  function createMeta(layer, workType) {
    idCounter += 1;
    const typeKey = workType in WORK_TYPES ? workType : 'concrete';
    const work = WORK_TYPES[typeKey];
    const meta = {
      id: `layer-${idCounter}`,
      layer,
      geometryType: inferGeometryType(layer),
      workType: typeKey,
      name: work.label,
      rate: work.rate,
      quantity: 0,
      manualQuantity: false,
      collapsed: false,
      drawLayer: 'main',
      metrics: getLayerMetrics(layer),
    };
    meta.quantity = computeAutoQuantity(meta);
    layerMeta.set(meta.id, meta);
    layer.__umeloId = meta.id;
    applyLayerStyle(layer, meta.workType, false);
    bindLayerEvents(layer);
    return meta;
  }

  function updateMetaFromLayer(meta) {
    meta.geometryType = inferGeometryType(meta.layer);
    meta.metrics = getLayerMetrics(meta.layer);
    if (!meta.manualQuantity) {
      meta.quantity = computeAutoQuantity(meta);
    }
  }

  function getSubtotal(meta) {
    return Number(meta.quantity || 0) * Number(meta.rate || 0);
  }

  function formatMetric(value, unit) {
    return `${decimal.format(value)} ${unit}`;
  }

  function getMetricDescription(meta) {
    const parts = [];
    if (meta.metrics.area) parts.push(`Площадь ${formatMetric(meta.metrics.area, 'м²')}`);
    if (meta.metrics.length) parts.push(`Длина ${formatMetric(meta.metrics.length, 'м')}`);
    if (meta.metrics.perimeter) parts.push(`Периметр ${formatMetric(meta.metrics.perimeter, 'м')}`);
    if (meta.geometryType === 'marker') parts.push('Точка 1 шт');
    if (meta.workType === 'stairs') parts.push('Объём = площадь × 0.15');
    return parts.join(' • ');
  }

  function selectMeta(metaId) {
    selectedLayerId = metaId;
    const meta = layerMeta.get(metaId);
    if (meta) meta.collapsed = false;
    renderLayerList();
  }

  function refreshSelectionStyles() {
    layerMeta.forEach((meta) => {
      applyLayerStyle(meta.layer, meta.workType, meta.id === selectedLayerId);
    });
  }

  function renderLayerList() {
    const allItems = Array.from(layerMeta.values());
    const items = Array.from(layerMeta.values());
    let total = 0;

    if (!allItems.length) {
      nodes.layerList.innerHTML = '<div class="layer-empty">Пока пусто. Выбери тип работ и нарисуй первый контур.</div>';
      nodes.summaryCount.textContent = '0';
      nodes.summaryTotal.textContent = currency.format(0);
      nodes.summaryCardCount.textContent = '0';
      nodes.summaryCardTotal.textContent = currency.format(0);
      persistProject();
      refreshSelectionStyles();
      return;
    }

    nodes.layerList.innerHTML = '';

    items.forEach((meta) => {
      total += getSubtotal(meta);
      const work = WORK_TYPES[meta.workType] || WORK_TYPES.concrete;
      const row = document.createElement('article');
      row.className = `map-item${selectedLayerId === meta.id ? ' is-selected' : ''}`;
      row.dataset.layerId = meta.id;
      row.innerHTML = `
        <div class="map-item__head map-item__head--compact">
          <div class="map-item__title-wrap">
            <select class="map-item__title-select" data-action="workType" aria-label="Тип покрытия">
              ${getWorkTypeEntries()
                .map(([key, item]) => `<option value="${key}" ${key === meta.workType ? 'selected' : ''}>${escapeHtml(item.label)}</option>`)
                .join('')}
            </select>
          </div>
          <div class="map-item__head-side">
            <div class="map-item__sum">${currency.format(getSubtotal(meta))}</div>
            <button type="button" class="map-icon-button map-icon-button--toggle" data-action="toggle" aria-label="${meta.collapsed ? 'Развернуть позицию' : 'Свернуть позицию'}" aria-expanded="${meta.collapsed ? 'false' : 'true'}" title="${meta.collapsed ? 'Развернуть' : 'Свернуть'}">${meta.collapsed ? '▸' : '▾'}</button>
          </div>
        </div>
        <div class="map-item__body${meta.collapsed ? ' is-collapsed' : ''}">
          <div class="map-item__meta">${escapeHtml(getMetricDescription(meta))}</div>
          <div class="map-item__edit-grid map-item__edit-grid--double">
            <label class="map-item__field">
              <span>Количество</span>
              <input type="number" min="0" step="0.01" value="${Number(meta.quantity || 0)}" data-action="quantity" aria-label="Количество" />
            </label>
            <label class="map-item__field">
              <span>Ставка</span>
              <input type="number" min="0" step="1" value="${Number(meta.rate || 0)}" data-action="rate" aria-label="Ставка" />
            </label>
          </div>
          <div class="map-item__actions-row">
            <button type="button" class="map-mini-action" data-action="focus">К объекту</button>
            <button type="button" class="map-mini-action" data-action="auto">Авто</button>
            <button type="button" class="map-mini-action map-mini-action--danger" data-action="delete">Удалить</button>
          </div>
        </div>
      `;
      nodes.layerList.appendChild(row);
    });

    const count = items.length;
    nodes.summaryCount.textContent = String(count);
    nodes.summaryTotal.textContent = currency.format(total);
    nodes.summaryCardCount.textContent = String(count);
    nodes.summaryCardTotal.textContent = currency.format(total);

    refreshSelectionStyles();
    persistProject();
  }

  function focusMeta(meta) {
    selectedLayerId = meta.id;
    meta.collapsed = false;
    if (meta.layer.getBounds) {
      const bounds = meta.layer.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds.pad(0.25));
    } else if (meta.layer.getLatLng) {
      map.panTo(meta.layer.getLatLng());
      map.setZoom(Math.max(map.getZoom(), 18));
    }
    renderLayerList();
  }

  function removeMeta(metaId) {
    const meta = layerMeta.get(metaId);
    if (!meta) return;

    stopCurrentMode();
    if (meta.layer instanceof L.Marker && meta.layer.dragging) meta.layer.dragging.disable();
    if (meta.layer.editing && typeof meta.layer.editing.disable === 'function') {
      meta.layer.editing.disable();
    }

    featureGroup.removeLayer(meta.layer);
    layerMeta.delete(metaId);
    if (selectedLayerId === metaId) {
      selectedLayerId = null;
    }
    renderLayerList();
  }

  function addLayerFromDraw(layer) {
    featureGroup.addLayer(layer);
    const meta = createMeta(layer, activeWorkType);
    selectedLayerId = meta.id;
    setStatus(`Добавлен элемент: ${WORK_TYPES[activeWorkType].label}.`);
    renderLayerList();
  }

  map.on(L.Draw.Event.CREATED, (event) => {
    stopCurrentMode();
    addLayerFromDraw(event.layer);
  });

  map.on(L.Draw.Event.EDITED, () => {
    layerMeta.forEach((meta) => updateMetaFromLayer(meta));
    renderLayerList();
    setStatus('Редактирование завершено. Значения пересчитаны.');
  });

  map.on(L.Draw.Event.DELETED, () => {
    const existingIds = new Set();
    featureGroup.eachLayer((layer) => {
      if (layer.__umeloId) existingIds.add(layer.__umeloId);
    });

    Array.from(layerMeta.keys()).forEach((metaId) => {
      if (!existingIds.has(metaId)) layerMeta.delete(metaId);
    });

    selectedLayerId = null;
    renderLayerList();
    setStatus('Удаление завершено.');
  });

  function clearToolButtons() {
    document.querySelectorAll('.map-tool-button').forEach((button) => button.classList.remove('is-active'));
  }

  function stopCurrentMode() {
    if (activeDrawHandler && typeof activeDrawHandler.disable === 'function') {
      activeDrawHandler.disable();
    }
    activeDrawHandler = null;

    if (editModeEnabled) {
      if (featureGroup.eachLayer) {
        featureGroup.eachLayer((layer) => {
          if (layer.editing && typeof layer.editing.disable === 'function') layer.editing.disable();
          if (layer.dragging && typeof layer.dragging.disable === 'function') layer.dragging.disable();
        });
      }
      editModeEnabled = false;
    }

    deleteModeEnabled = false;
    clearToolButtons();
    setStatus('Режим ожидания. Выбери инструмент.');
  }

  function startDraw(mode) {
    stopCurrentMode();
    const shapeOptions = getShapeOptions(activeWorkType);

    if (mode === 'polygon') {
      activeDrawHandler = new L.Draw.Polygon(map, { allowIntersection: false, showArea: true, shapeOptions });
    }
    if (mode === 'rectangle') {
      activeDrawHandler = new L.Draw.Rectangle(map, { shapeOptions });
    }
    if (mode === 'polyline') {
      activeDrawHandler = new L.Draw.Polyline(map, { shapeOptions });
    }
    if (mode === 'marker') {
      activeDrawHandler = new L.Draw.Marker(map);
    }

    if (!activeDrawHandler) return;
    activeDrawHandler.enable();
    document.querySelector(`[data-draw="${mode}"]`)?.classList.add('is-active');
    setStatus(`Режим: ${document.querySelector(`[data-draw="${mode}"]`)?.textContent || mode}. Нажимай по карте.`);
  }

  function startEditMode() {
    stopCurrentMode();
    editModeEnabled = true;
    featureGroup.eachLayer((layer) => {
      if (layer.editing && typeof layer.editing.enable === 'function') layer.editing.enable();
      if (layer.dragging && typeof layer.dragging.enable === 'function') layer.dragging.enable();
    });
    nodes.editButton?.classList.add('is-active');
    setStatus('Режим редактирования. Перетаскивай вершины и объекты. Затем нажми «Стоп».');
  }

  function startDeleteMode() {
    stopCurrentMode();
    deleteModeEnabled = true;
    nodes.deleteModeButton?.classList.add('is-active');
    setStatus('Режим удаления. Нажми на объект в списке и кнопку «Удалить» или на сам объект на карте — он выделится.');
  }

  async function searchLocation() {
    const query = nodes.searchInput?.value?.trim();
    if (!query) {
      setSearchStatus('Введи адрес или ориентир.');
      return;
    }

    setSearchStatus('Ищу место...');
    nodes.searchResults.innerHTML = '';
    updateSearchFlyoutState();

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&accept-language=ru&q=${encodeURIComponent(query)}`;
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('search_failed');
      const results = await response.json();

      if (!Array.isArray(results) || !results.length) {
        setSearchStatus('Ничего не найдено. Уточни адрес или переместись по карте вручную.');
        return;
      }

      setSearchStatus('Выбери подходящий вариант.');
      results.forEach((item) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'search-result';
        button.textContent = item.display_name;
        button.addEventListener('click', () => {
          const lat = Number(item.lat);
          const lon = Number(item.lon);
          if (Number.isNaN(lat) || Number.isNaN(lon)) return;

          if (searchMarker) map.removeLayer(searchMarker);
          searchMarker = L.marker([lat, lon]).addTo(map);
          map.setView([lat, lon], 18);
          searchMarker.bindPopup(item.display_name).openPopup();
          nodes.searchResults.innerHTML = '';
          updateSearchFlyoutState();
          setSearchStatus('Точка найдена. Теперь можно рисовать и считать смету.');
        });
        nodes.searchResults.appendChild(button);
      });
      updateSearchFlyoutState();
    } catch {
      setSearchStatus('Поиск временно недоступен. Переместись по карте вручную.');
    }
  }

  function switchBasemap(type = 'satellite') {
    const nextType = type === 'scheme' ? 'scheme' : 'satellite';
    currentBasemap = nextType;
    Object.values(baseLayers).forEach((layer) => {
      if (map.hasLayer(layer)) map.removeLayer(layer);
    });
    baseLayers[nextType]?.addTo(map);

    if (nodes.basemapLabel) {
      nodes.basemapLabel.textContent = nextType === 'scheme' ? 'Карта: схема' : 'Карта: спутник';
    }

    nodes.basemapRadios?.forEach((radio) => {
      radio.checked = radio.value === nextType;
      radio.closest('[data-basemap-option]')?.classList.toggle('is-active', radio.value === nextType);
    });
  }

  function toggleOverlay(kind, enabled) {
    const layer = overlays[kind];
    if (!layer) {
      setStatus('Публичный слой недоступен.');
      return;
    }
    if (enabled) {
      if (!map.hasLayer(layer)) layer.addTo(map);
      setStatus('Слой отображения включён.');
    } else if (map.hasLayer(layer)) {
      map.removeLayer(layer);
      setStatus('Слой отображения выключен.');
    }
  }

  function exportCsv() {
    setExportModalState(false);
    const rows = [['Название', 'Тип', 'Ед.', 'Количество', 'Ставка', 'Сумма']];
    layerMeta.forEach((meta) => {
      const work = WORK_TYPES[meta.workType] || WORK_TYPES.concrete;
      rows.push([
        meta.name,
        work.label,
        work.unit,
        Number(meta.quantity || 0).toFixed(2),
        meta.rate,
        Math.round(getSubtotal(meta)),
      ]);
    });

    const csv = rows
      .map((line) => line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(';'))
      .join('\n');

    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), 'umelo-map-estimate.csv');
  }

  function sanitizeLayerName(value) {
    const cleaned = String(value || 'UMELO').replace(/[^A-Za-zА-Яа-я0-9_\-]/g, '_').slice(0, 30);
    return cleaned || 'UMELO';
  }

  function layerToDxfEntity(meta) {
    const layerName = sanitizeLayerName(meta.name || meta.workType);
    const geometry = cloneGeometry(meta.layer);

    if (meta.geometryType === 'marker') {
      const [lat, lng] = geometry;
      const projected = projectMercator({ lat, lng });
      return `0\nPOINT\n8\n${layerName}\n10\n${projected.x}\n20\n${projected.y}\n30\n0\n`;
    }

    const points = geometry.map(([lat, lng]) => projectMercator({ lat, lng }));
    const isClosed = meta.geometryType === 'polygon' || meta.geometryType === 'rectangle';
    let text = `0\nLWPOLYLINE\n8\n${layerName}\n90\n${points.length}\n70\n${isClosed ? 1 : 0}\n`;
    points.forEach((point) => {
      text += `10\n${point.x}\n20\n${point.y}\n`;
    });
    return text;
  }

  function exportDxf() {
    setExportModalState(false);
    const entities = Array.from(layerMeta.values()).map(layerToDxfEntity).join('');
    const dxf = [
      '0', 'SECTION', '2', 'HEADER', '0', 'ENDSEC',
      '0', 'SECTION', '2', 'TABLES', '0', 'ENDSEC',
      '0', 'SECTION', '2', 'ENTITIES',
      entities,
      '0', 'ENDSEC', '0', 'EOF'
    ].join('\n');

    downloadBlob(new Blob([dxf], { type: 'application/dxf;charset=utf-8;' }), 'umelo-contours-webmercator.dxf');
  }

  function persistProject() {
    const payload = {
      version: 4,
      savedAt: new Date().toISOString(),
      workTypes: getWorkTypeEntries().map(([key, item]) => ({
        key,
        label: item.label,
        unit: item.unit,
        measurement: item.measurement,
        rate: item.rate,
        factor: item.factor || 1,
        color: item.color,
      })),
      items: Array.from(layerMeta.values()).map((meta) => ({
        id: meta.id,
        geometryType: meta.geometryType,
        coordinates: cloneGeometry(meta.layer),
        workType: meta.workType,
        name: meta.name,
        rate: meta.rate,
        quantity: meta.quantity,
        manualQuantity: meta.manualQuantity,
        collapsed: Boolean(meta.collapsed),
      })),
    };
    localStorage.setItem('umelo-map-project', JSON.stringify(payload));
  }

  function restoreWorkTypes(savedWorkTypes) {
    Object.keys(WORK_TYPES).forEach((key) => delete WORK_TYPES[key]);
    Object.entries(INITIAL_WORK_TYPES).forEach(([key, item]) => {
      WORK_TYPES[key] = JSON.parse(JSON.stringify(item));
    });
    workTypeOrder = [...INITIAL_WORK_TYPE_ORDER];

    if (Array.isArray(savedWorkTypes)) {
      savedWorkTypes.forEach((item) => {
        if (!item || !item.key || !item.label) return;
        WORK_TYPES[item.key] = {
          label: item.label,
          unit: item.unit || measurementLabel(item.measurement),
          measurement: item.measurement || 'area',
          rate: Number(item.rate || 0),
          factor: Number(item.factor || 1),
          color: item.color || CUSTOM_COLORS[workTypeOrder.length % CUSTOM_COLORS.length],
        };
        if (!workTypeOrder.includes(item.key)) workTypeOrder.push(item.key);
      });
    }

    if (!WORK_TYPES[activeWorkType]) activeWorkType = 'concrete';
    renderWorktypeControls();
  }

  function rebuildLayer(item) {
    let layer = null;

    if (item.geometryType === 'marker' && Array.isArray(item.coordinates) && item.coordinates.length === 2) {
      layer = L.marker(item.coordinates);
    }

    if ((item.geometryType === 'polygon' || item.geometryType === 'rectangle') && Array.isArray(item.coordinates)) {
      layer = L.polygon(item.coordinates, getShapeOptions(item.workType));
    }

    if (item.geometryType === 'polyline' && Array.isArray(item.coordinates)) {
      layer = L.polyline(item.coordinates, getShapeOptions(item.workType));
    }

    if (!layer) return;
    featureGroup.addLayer(layer);
    if (meta.manualQuantity) {
      meta.quantity = Number(item.quantity || 0);
    } else {
      updateMetaFromLayer(meta);
    }
  }

  function loadProjectFromStorage() {
    try {
      const raw = localStorage.getItem('umelo-map-project');
      if (!raw) return;
      const project = JSON.parse(raw);
      if (!project || !Array.isArray(project.items)) return;
      restoreWorkTypes(project.workTypes);
      project.items.forEach(rebuildLayer);
      renderWorktypeControls();
      renderLayerList();
    } catch {
      // ignore corrupted storage
    }
  }

  function saveProjectToFile() {
    setExportModalState(false);
    const raw = localStorage.getItem('umelo-map-project');
    const payload = raw || JSON.stringify({ version: 2, items: [] }, null, 2);
    downloadBlob(new Blob([payload], { type: 'application/json;charset=utf-8;' }), 'umelo-map-project.json');
  }

  function loadProjectFromFile(file) {
    setExportModalState(false);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result || '{}'));
        if (!data || !Array.isArray(data.items)) throw new Error('invalid');
        clearProject(false);
        restoreWorkTypes(data.workTypes);
        data.items.forEach(rebuildLayer);
        renderWorktypeControls();
        renderLayerList();
        setStatus('Проект загружен.');
      } catch {
        setStatus('Не удалось прочитать JSON проекта.');
      }
    };
    reader.readAsText(file, 'utf-8');
  }

  function clearProject(withStatus = true) {
    setExportModalState(false);
    stopCurrentMode();
    featureGroup.clearLayers();
    layerMeta.clear();
    selectedLayerId = null;
    if (searchMarker) {
      map.removeLayer(searchMarker);
      searchMarker = null;
    }
    renderLayerList();
    setSearchStatus('');
  updateSearchFlyoutState();
    if (withStatus) setStatus('Карта очищена.');
  }

  function downloadBlob(blob, filename) {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  nodes.toolbar?.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const drawMode = target.dataset.draw;
    if (drawMode) {
      startDraw(drawMode);
      return;
    }
  });

  nodes.editButton?.addEventListener('click', startEditMode);
  nodes.deleteModeButton?.addEventListener('click', startDeleteMode);
  nodes.stopButton?.addEventListener('click', stopCurrentMode);

  nodes.activeWorktypeSelect?.addEventListener('change', (event) => {
    const value = event.target.value;
    if (!value || !(value in WORK_TYPES)) return;
    setActiveWorkType(value);
  });

  nodes.activeWorktypeRate?.addEventListener('change', (event) => {
    const work = WORK_TYPES[activeWorkType];
    if (!work) return;
    const prevRate = Number(work.rate || 0);
    work.rate = Number(event.target.value || 0);
    syncExistingMetasForWorkType(activeWorkType, work.label, prevRate);
    renderWorktypeControls();
    renderLayerList();
  });

  nodes.basemapRadios?.forEach((radio) => {
    radio.addEventListener('change', () => {
      if (radio.checked) switchBasemap(radio.value);
    });
  });

  nodes.toggleBorders?.addEventListener('change', (event) => {
    toggleOverlay('borders', Boolean(event.target.checked));
  });

  nodes.toggleParcels?.addEventListener('change', (event) => {
    toggleOverlay('parcels', Boolean(event.target.checked));
  });

  nodes.worktypeManager?.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const key = target.dataset.workTypeKey || target.closest('.worktype-row')?.dataset.workTypeKey;
    if (target.dataset.action === 'pick-worktype' && key) {
      setActiveWorkType(key);
      return;
    }
    if (target.dataset.action === 'delete-worktype' && key) {
      deleteCustomWorkType(key);
    }
  });

  nodes.worktypeManager?.addEventListener('input', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLTextAreaElement)) return;
    if (target.dataset.action !== 'worktype-label') return;
    autoSizeWorktypeNames();
  });

  nodes.worktypeManager?.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
    const row = target.closest('.worktype-row');
    const key = row?.dataset.workTypeKey;
    if (!key || !WORK_TYPES[key]) return;
    const work = WORK_TYPES[key];

    if (target.dataset.action === 'worktype-label') {
      const prevLabel = work.label;
      work.label = String(target.value || '').trim() || prevLabel;
      syncExistingMetasForWorkType(key, prevLabel, work.rate);
      renderWorktypeControls();
      renderLayerList();
      return;
    }

    if (target.dataset.action === 'worktype-rate' && target instanceof HTMLInputElement) {
      const prevRate = work.rate;
      work.rate = Number(target.value || 0);
      syncExistingMetasForWorkType(key, work.label, prevRate);
      renderWorktypeControls();
      renderLayerList();
    }
  });

  nodes.addWorktypeButton?.addEventListener('click', () => {
    toggleAddWorktypeForm(nodes.addWorktypeForm?.hidden ?? true);
  });
  nodes.newWorktypeCancel?.addEventListener('click', () => toggleAddWorktypeForm(false));
  nodes.newWorktypeSave?.addEventListener('click', addCustomWorkType);
  nodes.newWorktypeName?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addCustomWorkType();
    }
  });
  nodes.newWorktypeRate?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addCustomWorkType();
    }
  });

  nodes.searchButton?.addEventListener('click', searchLocation);
  nodes.searchInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      searchLocation();
    }
  });

  nodes.layerList?.addEventListener('input', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
    const row = target.closest('.map-item');
    if (!row) return;
    const meta = layerMeta.get(row.dataset.layerId || '');
    if (!meta) return;

    const action = target.dataset.action;
    if (action === 'name') {
      meta.name = target.value;
    }

    if (action === 'quantity' && target instanceof HTMLInputElement) {
      meta.manualQuantity = true;
      meta.quantity = Number(target.value || 0);
    }

    if (action === 'rate' && target instanceof HTMLInputElement) {
      meta.rate = Number(target.value || 0);
    }

    if (action === 'workType' && target.value in WORK_TYPES) {
      const prevLabel = (WORK_TYPES[meta.workType] || {}).label;
      meta.workType = target.value;
      const work = WORK_TYPES[meta.workType];
      if (!meta.name || meta.name === prevLabel || Object.values(WORK_TYPES).some((item) => item.label === meta.name)) {
        meta.name = work.label;
      }
      meta.manualQuantity = false;
      meta.quantity = computeAutoQuantity(meta);
      meta.rate = Number(work.rate || 0);
      applyLayerStyle(meta.layer, meta.workType, meta.id === selectedLayerId);
    }

    renderLayerList();
  });

  nodes.layerList?.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const row = target.closest('.map-item');
    if (!row) return;
    const meta = layerMeta.get(row.dataset.layerId || '');
    if (!meta) return;

    if (deleteModeEnabled && !target.dataset.action) {
      removeMeta(meta.id);
      return;
    }

    const action = target.dataset.action;
    if (!action) {
      selectMeta(meta.id);
      return;
    }

    if (action === 'toggle') {
      meta.collapsed = !meta.collapsed;
      renderLayerList();
      return;
    }

    if (action === 'focus') focusMeta(meta);
    if (action === 'auto') {
      meta.manualQuantity = false;
      meta.quantity = computeAutoQuantity(meta);
      renderLayerList();
      return;
    }
    if (action === 'delete') removeMeta(meta.id);
  });

  nodes.drawerToggles?.forEach((button) => {
    button.addEventListener('click', () => {
      const side = button.dataset.drawerToggle;
      if (!side) return;
      toggleDrawer(side);
    });
  });

  nodes.saveButton?.addEventListener('click', saveProjectToFile);
  nodes.loadInput?.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    loadProjectFromFile(file);
    event.target.value = '';
  });
  nodes.clearButton?.addEventListener('click', () => clearProject(true));
  nodes.exportCsvButton?.addEventListener('click', exportCsv);
  nodes.exportDxfButton?.addEventListener('click', exportDxf);
  nodes.exportModalOpen?.addEventListener('click', () => setExportModalState(true));
  nodes.exportModalClosers?.forEach((button) => {
    button.addEventListener('click', () => setExportModalState(false));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (nodes.exportModal && !nodes.exportModal.hidden) {
        setExportModalState(false);
        return;
      }
      stopCurrentMode();
    }
  });


  if (window.innerWidth <= 1080) {
    setDrawerState('left', false);
    setDrawerState('right', false);
  } else {
    syncDrawerButtons('left', true);
    syncDrawerButtons('right', true);
  }

  function updateWorkbenchLayout() {
    const workbench = document.getElementById('map-workbench');
    const topbar = document.getElementById('map-topbar');
    const toolstrip = document.getElementById('map-toolstrip');
    if (!workbench || !topbar || !toolstrip) return;
    const toolTop = topbar.offsetTop + topbar.offsetHeight + 10;
    const drawerTop = toolTop + toolstrip.offsetHeight + 12;
    workbench.style.setProperty('--map-toolstrip-top', `${toolTop}px`);
    workbench.style.setProperty('--map-drawer-top', `${drawerTop}px`);
  }

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      updateWorkbenchLayout();
      map.invalidateSize();
    }, 180);
  });

  renderWorktypeControls();
  renderGeometryLayerControls();
  switchBasemap('satellite');
  loadProjectFromStorage();
  renderWorktypeControls();
  renderLayerList();
  setActiveWorkType(activeWorkType, false);
  setSearchStatus('');
  updateSearchFlyoutState();
  updateWorkbenchLayout();
  setStatus('Режим ожидания. Выбери тип работ и инструмент рисования.');
})();

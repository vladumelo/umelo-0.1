(function () {
  const table = document.querySelector('#estimate-table tbody');
  const addRowButton = document.querySelector('#estimate-add-row');
  const exportButton = document.querySelector('#estimate-export');
  const resetButton = document.querySelector('#estimate-reset');
  const totalNode = document.querySelector('#estimate-grand-total');
  const metaNode = document.querySelector('#estimate-grand-meta');

  if (!table) return;

  const defaultRows = [
    { name: 'Бетонное покрытие', unit: 'м²', quantity: 120, rate: 3200 },
    { name: 'Асфальт пешеходный', unit: 'м²', quantity: 240, rate: 1850 },
    { name: 'Бордюр / бетонная лента', unit: 'м.п', quantity: 80, rate: 1400 },
    { name: 'Плодородный грунт', unit: 'м²', quantity: 160, rate: 650 },
  ];

  const currency = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  });

  const units = ['м²', 'м.п', 'м³', 'шт'];

  function cloneDefaults() {
    return defaultRows.map((row) => ({ ...row }));
  }

  let rows = loadRows();

  function loadRows() {
    try {
      const raw = localStorage.getItem('umelo-estimate-rows');
      if (!raw) return cloneDefaults();
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length ? parsed : cloneDefaults();
    } catch {
      return cloneDefaults();
    }
  }

  function saveRows() {
    localStorage.setItem('umelo-estimate-rows', JSON.stringify(rows));
  }

  function recalcAndRender() {
    table.innerHTML = '';
    let grandTotal = 0;

    rows.forEach((row, index) => {
      const total = Number(row.quantity || 0) * Number(row.rate || 0);
      grandTotal += total;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td data-label="Наименование"><input type="text" value="${escapeHtml(row.name)}" data-field="name" data-index="${index}" /></td>
        <td data-label="Ед.">
          <select data-field="unit" data-index="${index}">
            ${units
              .map((unit) => `<option value="${unit}" ${unit === row.unit ? 'selected' : ''}>${unit}</option>`)
              .join('')}
          </select>
        </td>
        <td data-label="Объём"><input type="number" min="0" step="0.01" value="${row.quantity}" data-field="quantity" data-index="${index}" /></td>
        <td data-label="Ставка"><input type="number" min="0" step="1" value="${row.rate}" data-field="rate" data-index="${index}" /></td>
        <td class="table-row-total" data-label="Сумма">${currency.format(total)}</td>
        <td data-label="Удалить"><button class="row-remove" type="button" data-remove-index="${index}" aria-label="Удалить строку">Удалить строку</button></td>
      `;
      table.appendChild(tr);
    });

    totalNode.textContent = currency.format(grandTotal);
    metaNode.textContent = `${rows.length} ${pluralize(rows.length, ['строка', 'строки', 'строк'])}`;
    saveRows();
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  function pluralize(number, words) {
    const n = Math.abs(number) % 100;
    const n1 = n % 10;
    if (n > 10 && n < 20) return words[2];
    if (n1 > 1 && n1 < 5) return words[1];
    if (n1 === 1) return words[0];
    return words[2];
  }

  function exportCsv() {
    const rowsForCsv = [['Наименование', 'Ед.', 'Объём', 'Ставка', 'Сумма']];
    rows.forEach((row) => {
      rowsForCsv.push([
        row.name,
        row.unit,
        row.quantity,
        row.rate,
        Number(row.quantity || 0) * Number(row.rate || 0),
      ]);
    });

    const csv = rowsForCsv
      .map((line) => line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(';'))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'umelo-estimate.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  table.addEventListener('input', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const index = Number(target.dataset.index);
    const field = target.dataset.field;
    if (Number.isNaN(index) || !field || !rows[index]) return;

    const value = target.value;
    rows[index][field] = field === 'name' || field === 'unit' ? value : Number(value || 0);
    recalcAndRender();
  });

  table.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const index = Number(target.dataset.index);
    const field = target.dataset.field;
    if (Number.isNaN(index) || !field || !rows[index]) return;

    const value = target.value;
    rows[index][field] = field === 'name' || field === 'unit' ? value : Number(value || 0);
    recalcAndRender();
  });

  table.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const removeIndex = target.dataset.removeIndex;
    if (removeIndex === undefined) return;

    rows.splice(Number(removeIndex), 1);
    if (!rows.length) rows = cloneDefaults();
    recalcAndRender();
  });

  addRowButton?.addEventListener('click', () => {
    rows.push({ name: 'Новая работа', unit: 'м²', quantity: 0, rate: 0 });
    recalcAndRender();
  });

  exportButton?.addEventListener('click', exportCsv);

  resetButton?.addEventListener('click', () => {
    rows = cloneDefaults();
    recalcAndRender();
  });

  recalcAndRender();
})();

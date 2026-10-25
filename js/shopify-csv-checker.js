(() => {
  const currentInput = document.querySelector('#current-file');
  const updateInput = document.querySelector('#update-file');
  const handleSelect = document.querySelector('#product-handle');
  const compareButton = document.querySelector('#compare-button');
  const errorBox = document.querySelector('#error-message');
  const results = document.querySelector('#results');
  const currentName = document.querySelector('#current-name');
  const updateName = document.querySelector('#update-name');
  let currentCsv = null;
  let updateCsv = null;

  document.querySelector('#year').textContent = new Date().getFullYear();

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (quoted) {
        if (char === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
        else if (char === '"') quoted = false;
        else cell += char;
      } else if (char === '"' && cell.length === 0) quoted = true;
      else if (char === ',') { row.push(cell); cell = ''; }
      else if (char === '\n' || char === '\r') {
        if (char === '\r' && text[i + 1] === '\n') i += 1;
        row.push(cell); cell = '';
        if (row.some(value => value.trim() !== '')) rows.push(row);
        row = [];
      } else cell += char;
    }
    if (cell.length || row.length) { row.push(cell); if (row.some(value => value.trim() !== '')) rows.push(row); }
    if (rows.length < 2) throw new Error('This file has no product rows below its header.');
    const aliases = new Map([
      ['url handle', 'Handle'], ['handle', 'Handle'],
      ['description', 'Body (HTML)'], ['body (html)', 'Body (HTML)'],
      ['product category', 'Product Category'],
      ['option1 name', 'Option1 Name'], ['option1 value', 'Option1 Value'],
      ['option2 name', 'Option2 Name'], ['option2 value', 'Option2 Value'],
      ['option3 name', 'Option3 Name'], ['option3 value', 'Option3 Value'],
      ['sku', 'Variant SKU'], ['variant sku', 'Variant SKU'],
      ['price', 'Variant Price'], ['variant price', 'Variant Price'],
      ['image position', 'Image Position'], ['image alt text', 'Image Alt Text']
    ]);
    const headers = rows.shift().map((header, index) => {
      const trimmed = (index === 0 ? header.replace(/^\uFEFF/, '') : header).trim();
      return aliases.get(trimmed.toLowerCase()) || trimmed;
    });
    if (!headers.includes('Handle')) throw new Error('The CSV must include a Shopify “URL handle” (or older “Handle”) column.');
    if (new Set(headers).size !== headers.length) throw new Error('This CSV contains duplicate column names. Please check the header row.');
    return { headers, rows: rows.map(values => Object.fromEntries(headers.map((header, index) => [header, (values[index] ?? '').trim()]))) };
  }

  async function readFile(input, nameTarget, slot) {
    errorBox.hidden = true;
    results.hidden = true;
    const file = input.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) { showError('Please choose a .csv file.'); input.value = ''; return; }
    if (file.size > 15 * 1024 * 1024) { showError('This preview supports files up to 15 MB.'); input.value = ''; return; }
    try {
      const parsed = parseCsv(await file.text());
      if (slot === 'current') currentCsv = parsed;
      else updateCsv = parsed;
      nameTarget.textContent = file.name;
      nameTarget.closest('.file-card').classList.add('has-file');
      prepareHandles();
    } catch (error) {
      if (slot === 'current') currentCsv = null; else updateCsv = null;
      nameTarget.textContent = 'Choose CSV file';
      nameTarget.closest('.file-card').classList.remove('has-file');
      input.value = '';
      showError(error.message || 'Could not read this file. Please check that it is a Shopify product CSV.');
      prepareHandles();
    }
  }

  function showError(message) { errorBox.textContent = message; errorBox.hidden = false; }
  function handlesIn(csv) { return csv ? [...new Set(csv.rows.map(row => row.Handle).filter(Boolean))] : []; }

  function prepareHandles() {
    const handles = [...new Set([...handlesIn(currentCsv), ...handlesIn(updateCsv)])].sort((a, b) => a.localeCompare(b));
    handleSelect.replaceChildren();
    if (!currentCsv || !updateCsv) {
      handleSelect.add(new Option('Upload both CSV files first', ''));
      handleSelect.disabled = true;
      compareButton.disabled = true;
      return;
    }
    if (!handles.length) {
      handleSelect.add(new Option('No product Handles found', ''));
      handleSelect.disabled = true;
      compareButton.disabled = true;
      return;
    }
    handleSelect.add(new Option('Select a product…', ''));
    handles.forEach(handle => handleSelect.add(new Option(handle, handle)));
    handleSelect.disabled = false;
    compareButton.disabled = true;
  }

  handleSelect.addEventListener('change', () => { compareButton.disabled = !handleSelect.value; });
  currentInput.addEventListener('change', () => readFile(currentInput, currentName, 'current'));
  updateInput.addEventListener('change', () => readFile(updateInput, updateName, 'update'));
  document.querySelector('#sample-button').addEventListener('click', () => {
    const headers = 'URL handle,Title,Vendor,Option1 name,Option1 value,Option2 name,Option2 value,SKU,Price';
    currentCsv = parseCsv(`${headers}\nlinen-shirt,Linen Shirt,Studio North,Color,Blue,Size,Small,LIN-BLU-S,48.00\nlinen-shirt,,,,Blue,Size,Medium,LIN-BLU-M,48.00`);
    updateCsv = parseCsv(`${headers}\nlinen-shirt,Linen Shirt,,Color,Blue,Size,Small,LIN-BLU-S,52.00\nlinen-shirt,,,,Blue,Size,Medium,LIN-BLU-M,`);
    currentInput.value = '';
    updateInput.value = '';
    currentName.textContent = 'sample-current.csv';
    updateName.textContent = 'sample-update.csv';
    currentName.closest('.file-card').classList.add('has-file');
    updateName.closest('.file-card').classList.add('has-file');
    prepareHandles();
    handleSelect.value = 'linen-shirt';
    compareButton.disabled = false;
    errorBox.hidden = true;
    results.hidden = true;
  });
  compareButton.addEventListener('click', () => {
    if (!handleSelect.value || !currentCsv || !updateCsv) return;
    errorBox.hidden = true;
    try { renderComparison(handleSelect.value); }
    catch (error) { showError(error.message || 'Could not compare these product rows.'); }
  });

  const productColumns = ['Title', 'Body (HTML)', 'Vendor', 'Product Category', 'Type', 'Tags', 'Published', 'Status', 'Template Suffix'];
  const optionColumns = ['Option1 Value', 'Option2 Value', 'Option3 Value'];
  const ignoredForVariants = new Set(['Handle', ...productColumns, 'Image Src', 'Image Position', 'Image Alt Text']);
  function rowsFor(csv, handle) { return csv.rows.filter(row => row.Handle === handle); }
  function displayValue(value) { return value === '' ? '(blank)' : value; }
  function variantKey(row, index) {
    const options = optionColumns.map(name => row[name] || '').join(' / ');
    if (options.replaceAll('/', '').trim()) return `option:${options}`;
    if (row['Variant SKU']) return `sku:${row['Variant SKU']}`;
    return `row:${index + 1}`;
  }
  function indexVariants(rows) {
    const map = new Map();
    const duplicates = [];
    rows.forEach((row, index) => {
      const key = variantKey(row, index);
      if (map.has(key)) duplicates.push(key);
      else map.set(key, row);
    });
    return { map, duplicates };
  }
  function addChange(list, kind, title, detail, before, after) {
    list.push({ kind, title, detail, before, after });
  }

  function renderComparison(handle) {
    const oldRows = rowsFor(currentCsv, handle);
    const newRows = rowsFor(updateCsv, handle);
    const changes = [];
    const notices = [];
    const oldHeaders = new Set(currentCsv.headers);
    const newHeaders = new Set(updateCsv.headers);
    const absentFromNew = currentCsv.headers.filter(header => !newHeaders.has(header) && header !== 'Image Position');
    const onlyInNew = updateCsv.headers.filter(header => !oldHeaders.has(header) && header !== 'Image Position');

    if (!oldRows.length) addChange(changes, 'NEW PRODUCT', 'Handle is not in the current export', 'This Handle appears in the update CSV only.', 'Not found', `${newRows.length} row(s)`);
    else if (!newRows.length) addChange(changes, 'NOT IN UPDATE', 'Product is missing from the update file', 'This comparison cannot tell whether you intend to remove or simply leave this product unchanged.', `${oldRows.length} row(s)`, 'Not found');

    if (oldRows.length && newRows.length) {
      const productRow = rows => rows.find(row => productColumns.some(col => row[col])) || rows[0];
      const oldProduct = productRow(oldRows);
      const newProduct = productRow(newRows);
      for (const column of productColumns) {
        if (!oldHeaders.has(column) || !newHeaders.has(column)) continue;
        const before = oldProduct[column] || '';
        const after = newProduct[column] || '';
        if (before !== after) addChange(changes, after ? 'CHANGED' : 'BLANK VALUE', column, 'Product-level field', before, after);
      }

      const oldVariant = indexVariants(oldRows);
      const newVariant = indexVariants(newRows);
      if (oldVariant.duplicates.length || newVariant.duplicates.length) {
        addChange(changes, 'DUPLICATE KEY', 'Some variants share the same matching key', 'The checker matches variants by option values first, then SKU. Review duplicate option values or SKUs manually.', oldVariant.duplicates.join(', ') || 'None', newVariant.duplicates.join(', ') || 'None');
      }
      const duplicateSkus = rows => {
        const counts = new Map();
        rows.map(row => row['Variant SKU']).filter(Boolean).forEach(sku => counts.set(sku, (counts.get(sku) || 0) + 1));
        return [...counts].filter(([, count]) => count > 1).map(([sku]) => sku);
      };
      const oldDuplicateSkus = duplicateSkus(oldRows);
      const newDuplicateSkus = duplicateSkus(newRows);
      if (oldDuplicateSkus.length || newDuplicateSkus.length) {
        addChange(changes, 'DUPLICATE SKU', 'A SKU appears on more than one variant row', 'Check that each variant has the intended SKU before importing.', oldDuplicateSkus.join(', ') || 'None', newDuplicateSkus.join(', ') || 'None');
      }
      for (const [key, oldRow] of oldVariant.map) {
        const newRow = newVariant.map.get(key);
        if (!newRow) {
          addChange(changes, 'VARIANT MISSING', 'A current variant row is absent from the update', key, 'Present', 'Not found');
          continue;
        }
        for (const column of updateCsv.headers) {
          if (ignoredForVariants.has(column) || !oldHeaders.has(column)) continue;
          const before = oldRow[column] || '';
          const after = newRow[column] || '';
          if (before !== after) addChange(changes, after ? 'CHANGED' : 'BLANK VALUE', column, key, before, after);
        }
      }
      for (const [key] of newVariant.map) {
        if (!oldVariant.map.has(key)) addChange(changes, 'NEW VARIANT', 'A variant row is new in the update', key, 'Not found', 'Present');
      }
      if (absentFromNew.length) notices.push(`${absentFromNew.length} column(s) from the current file are omitted in the update CSV. Omitted columns and blank cells can have different import effects.`);
      if (onlyInNew.length) notices.push(`${onlyInNew.length} column(s) appear only in the update CSV and cannot be compared with the current export.`);
    }

    const blankCount = changes.filter(change => change.kind === 'BLANK VALUE').length;
    const structuralCount = changes.filter(change => ['VARIANT MISSING', 'NEW VARIANT', 'DUPLICATE KEY', 'DUPLICATE SKU', 'NOT IN UPDATE', 'NEW PRODUCT'].includes(change.kind)).length;
    const changedCount = changes.filter(change => change.kind === 'CHANGED').length;
    document.querySelector('#result-title').textContent = handle;
    document.querySelector('#result-count').textContent = changes.length ? `${changes.length} item${changes.length === 1 ? '' : 's'} to review` : 'No differences found';
    const cards = document.querySelector('#summary-cards');
    cards.replaceChildren(
      summaryCard(changedCount, 'Changed values', ''),
      summaryCard(blankCount, 'Values becoming blank', blankCount ? 'warn' : ''),
      summaryCard(structuralCount, 'Variant / product checks', structuralCount ? 'warn' : '')
    );
    const list = document.querySelector('#change-list');
    list.replaceChildren();
    changes.forEach(change => list.append(makeChangeElement(change)));
    notices.forEach(message => list.append(makeNotice(message)));
    document.querySelector('#no-changes').hidden = changes.length > 0;
    results.hidden = false;
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function summaryCard(number, label, kind) {
    const card = document.createElement('div');
    card.className = `summary-card ${kind}`.trim();
    const count = document.createElement('b'); count.textContent = number;
    const text = document.createElement('span'); text.textContent = label;
    card.append(count, text);
    return card;
  }
  function makeChangeElement(change) {
    const item = document.createElement('article'); item.className = 'change-item';
    const kind = document.createElement('span'); kind.className = 'change-kind'; kind.textContent = change.kind;
    const body = document.createElement('div');
    const title = document.createElement('h3'); title.textContent = change.title;
    const detail = document.createElement('p'); detail.textContent = change.detail;
    body.append(title, detail);
    if (change.before !== undefined) {
      const values = document.createElement('div'); values.className = 'change-values';
      const old = document.createElement('span'); old.innerHTML = '<b>Current</b>'; old.append(document.createTextNode(displayValue(change.before)));
      const fresh = document.createElement('span'); fresh.className = 'new-value'; fresh.innerHTML = '<b>Update file</b>'; fresh.append(document.createTextNode(displayValue(change.after)));
      values.append(old, fresh); body.append(values);
    }
    item.append(kind, body); return item;
  }
  function makeNotice(message) {
    const item = document.createElement('article'); item.className = 'change-item';
    const kind = document.createElement('span'); kind.className = 'change-kind'; kind.textContent = 'COLUMN NOTE';
    const body = document.createElement('div'); const title = document.createElement('h3'); title.textContent = 'CSV columns differ';
    const detail = document.createElement('p'); detail.textContent = message;
    body.append(title, detail); item.append(kind, body); return item;
  }
})();

(() => {
  function parse(text) {
    text = text.replace(/^\uFEFF/, '');
    const rows = []; let row = [], cell = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') quoted = false; else cell += c; }
      else if (c === '"' && cell === '') quoted = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); if (row.some(v => v !== '')) rows.push(row); row = []; cell = ''; }
      else cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); if (row.some(v => v !== '')) rows.push(row); }
    if (rows.length < 2) throw new Error('CSVファイルにデータ行がありません。');
    const headers = rows.shift();
    if (new Set(headers).size !== headers.length) throw new Error('同じ名前の列が複数あります。Shopifyから再度エクスポートしてください。');
    return { headers, rows: rows.map(r => [...r, ...Array(Math.max(0, headers.length - r.length)).fill('')].slice(0, headers.length)) };
  }
  function serialize(headers, rows) { return [headers, ...rows].map(row => row.map(value => { const s = String(value ?? ''); return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s; }).join(',')).join('\r\n'); }
  function header(headers, names) { return headers.findIndex(h => names.some(n => h.trim().toLowerCase() === n.toLowerCase())); }
  function download(name, content) { const url = URL.createObjectURL(new Blob(['\uFEFF', content], { type: 'text/csv;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  function read(file) { return file.text().then(parse); }
  window.ShopifyCsv = { parse, serialize, header, download, read };
})();

(() => {
  const $ = id => document.getElementById(id);
  let data;
  const error = $('error-message');
  const guesses = {
    order: ['Order ID', 'Order ID (do not edit)', '注文 ID', '注文ID'],
    sales: ['Order Value', 'Item Total', 'Price', '売上'],
    date: ['Sale Date', 'Date', '注文日'],
    title: ['Item Name', 'Title', '商品名'],
    discount: ['Discounts Amount', 'Discount Amount', '割引額'],
    fee: ['Fees', 'Fee', 'Fees & Taxes', '手数料'],
    cost: ['Cost', 'COGS', 'Product Cost', '原価'],
    shipping: ['Shipping Cost', 'Postage', '送料原価']
  };
  function options(id, names, required) {
    const select = $(id);
    select.replaceChildren();
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = required ? '列を選択' : '（なし）';
    select.append(empty);
    data.headers.forEach((header, i) => {
      const option = document.createElement('option');
      option.value = i;
      option.textContent = header;
      select.append(option);
    });
    const guess = ShopifyCsv.header(data.headers, names);
    if (guess >= 0) select.value = guess;
  }
  $('orders-file').addEventListener('change', async () => {
    error.hidden = true;
    $('results').hidden = true;
    try {
      data = await ShopifyCsv.read($('orders-file').files[0]);
      $('orders-name').textContent = $('orders-file').files[0].name;
      $('mapping').hidden = false;
      options('order-col', guesses.order, true);
      options('sales-col', guesses.sales, true);
      options('date-col', guesses.date, false);
      options('title-col', guesses.title, false);
      options('discount-col', guesses.discount, false);
      options('fee-col', guesses.fee, false);
      options('cost-col', guesses.cost, false);
      options('shipping-col', guesses.shipping, false);
      $('calculate').disabled = false;
    } catch (e) {
      error.textContent = e.message;
      error.hidden = false;
    }
  });
  function number(value) {
    const raw = String(value ?? '').trim();
    if (!raw) return 0;
    const normalized = raw.replace(/[￥¥$€£,\s]/g, '').replace(/^\((.*)\)$/, '-$1');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  $('calculate').addEventListener('click', () => {
    const cols = Object.fromEntries(['order','sales','date','title','discount','fee','cost','shipping'].map(key => [key, $(key + '-col').value === '' ? -1 : Number($(key + '-col').value)]));
    if (cols.order < 0 || cols.sales < 0) {
      error.textContent = '注文IDと売上額の列を選択してください。';
      error.hidden = false;
      return;
    }
    const grouped = new Map();
    let skipped = 0;
    for (const row of data.rows) {
      const id = String(row[cols.order] ?? '').trim();
      const sales = number(row[cols.sales]);
      if (!id || !Number.isFinite(sales)) { skipped++; continue; }
      const values = ['discount','fee','cost','shipping'].map(key => cols[key] < 0 ? 0 : number(row[cols[key]]));
      if (values.some(v => !Number.isFinite(v))) { skipped++; continue; }
      if (!grouped.has(id)) grouped.set(id, { id, date: cols.date < 0 ? '' : row[cols.date], title: new Set(), sales: 0, discount: 0, fee: 0, cost: 0, shipping: 0 });
      const order = grouped.get(id);
      if (cols.title >= 0 && row[cols.title]) order.title.add(row[cols.title]);
      order.sales += sales;
      order.discount += Math.abs(values[0]);
      order.fee += Math.abs(values[1]);
      order.cost += Math.abs(values[2]);
      order.shipping += Math.abs(values[3]);
    }
    if (!grouped.size) {
      error.textContent = '集計できる注文がありません。列の選択とCSVの内容を確認してください。';
      error.hidden = false;
      return;
    }
    const orders = [...grouped.values()].map(order => ({ ...order, revenue: order.sales - order.discount, expenses: order.fee + order.cost + order.shipping, profit: order.sales - order.discount - order.fee - order.cost - order.shipping }));
    const totals = orders.reduce((sum, order) => ({ revenue: sum.revenue + order.revenue, fees: sum.fees + order.fee, costs: sum.costs + order.cost + order.shipping, profit: sum.profit + order.profit }), { revenue: 0, fees: 0, costs: 0, profit: 0 });
    const format = n => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);
    $('summary-cards').innerHTML = [['売上（割引後）', totals.revenue], ['手数料', totals.fees], ['原価＋送料', totals.costs], ['概算利益', totals.profit]].map(([label, value], i) => `<div class="summary-card ${i === 3 && value < 0 ? 'warn' : ''}"><b>${format(value)}</b><span>${label}</span></div>`).join('');
    $('order-results').innerHTML = orders.sort((a,b) => b.profit-a.profit).map(order => `<tr><td>${escape(order.id)}</td><td>${escape(order.date)}</td><td>${escape([...order.title].join(' / ') || '—')}</td><td>${format(order.revenue)}</td><td>${format(order.expenses)}</td><td>${format(order.profit)}</td></tr>`).join('');
    $('count').textContent = `${orders.length} 注文${skipped ? ` · ${skipped} 行を除外` : ''}`;
    $('margin-note').textContent = `概算利益率：${format(totals.revenue ? totals.profit / totals.revenue * 100 : 0)}%。注文CSV上の行を注文IDで合算しています。注文額が商品行ごとに繰り返される形式のCSVでは二重計上に注意してください。費用列が未選択の場合、その費用は0円として扱われます。`;
    $('results').hidden = false;
    error.hidden = true;
    window.NinjalensAnalytics?.etsy?.orderProfit();
  });
})();

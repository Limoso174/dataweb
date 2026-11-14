/* ==========================================================================
   这个文件归【D · 交互和发布】管。其他人不要改这个文件。
   这里负责：把算好的数字摆到页面上、画图、处理点击、控制"加载中/出错/没数据"三种状态。

   数据从哪来？→ data.js 里的 DATA 和 DataLib（A 管）
   长什么样？  → index.html 的结构（B 管）+ style.css 的样式（C 管）
   ========================================================================== */

(function () {
  'use strict';

  /* ---- 页面当前的状态，改完就调 render() 重画 ---- */
  var state = {
    status: 'loading',   // loading 加载中 / error 出错 / ready 正常
    range: 'all',        // 时间范围
    channel: 'all'       // 渠道
  };

  var ALL_ROWS = DataLib.normalise(DATA.records);

  function el(id) { return document.getElementById(id); }


  /* ==========================================================================
     一、数字格式化
     页面上所有数字都从这里过一遍，不要在各个地方手写 toFixed。
     ========================================================================== */

  function formatInt(n) {
    if (n === null || n === undefined) return '—';
    return new Intl.NumberFormat('zh-CN').format(Math.round(n));   // 14560 → 14,560
  }

  function formatMoney(n) {
    if (n === null || n === undefined) return '—';
    return '¥' + new Intl.NumberFormat('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(n);
  }

  function formatPercent(n) {
    if (n === null || n === undefined) return '—';
    return (n * 100).toFixed(2) + '%';
  }

  function formatTime(iso) {
    if (!iso) return '未知';
    var t = new Date(iso);
    if (isNaN(t.getTime())) return iso;
    return t.getFullYear() + '-' + pad2(t.getMonth() + 1) + '-' + pad2(t.getDate()) +
      ' ' + pad2(t.getHours()) + ':' + pad2(t.getMinutes());
  }

  function pad2(s) {
    s = String(s);
    return s.length === 1 ? '0' + s : s;
  }


  /* ==========================================================================
     二、画各个部分
     ========================================================================== */

  /* ---- 指标卡 ---- */
  function card(label, value, hint) {
    return '<div class="card">' +
             '<div class="label">' + label +
               '<span class="hint" title="' + hint + '">?</span>' +
             '</div>' +
             '<div class="value">' + value + '</div>' +
           '</div>';
  }

  function renderCards(m) {
    return [
      card('总访问量', formatInt(m.visits), '筛选范围内，所有完整记录的访问数相加'),
      card('订单数',   formatInt(m.orders), '筛选范围内，所有完整记录的订单数相加'),
      card('成交金额', formatMoney(m.revenue), '不含金额缺失的记录；单位：元，已含税'),
      card('转化率',   formatPercent(m.conversion), '订单数 ÷ 访问量'),
      card('客单价',   formatMoney(m.aov), '成交金额 ÷ 订单数')
    ].join('');
  }

  /* ---- 柱状图（手写 SVG，不依赖任何图表库） ---- */
  function renderChart(byDate) {
    if (!byDate.length) return '<p class="muted">暂无数据</p>';

    var W = 720, H = 200, PAD_T = 14, PAD_B = 26, PAD_X = 6;
    var innerW = W - PAD_X * 2;
    var innerH = H - PAD_T - PAD_B;

    var max = 1;
    byDate.forEach(function (d) { if (d.visits > max) max = d.visits; });

    var slot = innerW / byDate.length;
    var barW = Math.min(slot * 0.6, 56);

    var parts = ['<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" ' +
                 'aria-label="每日访问量柱状图" class="chart">'];

    // 底部基线
    parts.push('<line x1="' + PAD_X + '" y1="' + (PAD_T + innerH) +
               '" x2="' + (W - PAD_X) + '" y2="' + (PAD_T + innerH) +
               '" stroke="#e2e8f0" stroke-width="1"/>');

    byDate.forEach(function (d, i) {
      var h = Math.max((d.visits / max) * innerH, 2);   // 最小 2px，否则 0 值看不见
      var x = PAD_X + slot * i + (slot - barW) / 2;
      var y = PAD_T + innerH - h;

      parts.push('<g>');
      parts.push('<title>' + d.date + '：' + formatInt(d.visits) + ' 次访问</title>');  // 鼠标悬停提示
      parts.push('<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) +
                 '" width="' + barW.toFixed(1) + '" height="' + h.toFixed(1) +
                 '" rx="3" fill="#4f6ef7"/>');
      parts.push('<text x="' + (x + barW / 2).toFixed(1) + '" y="' + (H - 8) +
                 '" text-anchor="middle" font-size="10" fill="#94a3b8">' +
                 d.date.slice(5) + '</text>');
      parts.push('</g>');
    });

    parts.push('</svg>');
    return parts.join('');
  }

  /* ---- 明细表 ---- */
  function renderTable(rows) {
    var head = '<thead><tr>' +
      '<th>日期</th><th>渠道</th><th class="num">访问量</th>' +
      '<th class="num">订单</th><th class="num">金额</th><th>状态</th>' +
      '</tr></thead>';

    var body = rows.slice().sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      return a.channel.localeCompare(b.channel);
    }).map(function (r) {
      return '<tr class="' + (r.complete ? '' : 'row-bad') + '">' +
        '<td>' + r.date + '</td>' +
        '<td>' + r.channel + '</td>' +
        '<td class="num">' + formatInt(r.visits) + '</td>' +
        '<td class="num">' + formatInt(r.orders) + '</td>' +
        '<td class="num">' + formatMoney(r.revenue) + '</td>' +
        '<td>' + (r.complete ? '正常' : '<span class="tag">不完整，已排除</span>') + '</td>' +
        '</tr>';
    }).join('');

    return head + '<tbody>' + body + '</tbody>';
  }


  /* ==========================================================================
     三、总渲染：根据 state 决定显示"加载中 / 出错 / 没数据 / 正常"
     改任何状态之后，调一次 render() 就够了。
     ========================================================================== */

  function render() {
    var loading = el('state-loading');
    var error   = el('state-error');
    var empty   = el('state-empty');
    var content = el('content');
    var note    = el('note');

    // 先把所有状态藏起来，下面只打开该打开的那个
    loading.hidden = state.status !== 'loading';
    error.hidden   = state.status !== 'error';
    empty.hidden   = true;
    content.hidden = true;

    if (state.status !== 'ready') return;

    // 明细表显示全部记录（含不完整的），指标只算完整记录
    var filtered = DataLib.applyFilters(ALL_ROWS, state.range, state.channel);

    if (!filtered.length) {
      note.textContent = '';
      empty.hidden = false;
      return;                                  // 没数据就到此为止
    }

    var usable   = filtered.filter(function (r) { return r.complete; });
    var excluded = filtered.length - usable.length;

    note.textContent = excluded > 0 ? '有 ' + excluded + ' 条记录因数据不完整被排除' : '';

    var m = DataLib.computeMetrics(usable);

    el('cards').innerHTML = renderCards(m);
    el('chart').innerHTML = renderChart(m.byDate);
    el('table').innerHTML = renderTable(filtered);
    content.hidden = false;
  }


  /* ==========================================================================
     四、启动和交互
     ========================================================================== */

  /* 假装在联网拿数据：先显示"加载中"，500 毫秒后再显示内容。
     以后换成真的 fetch，把 setTimeout 那段替换掉就行。 */
  function load() {
    state.status = 'loading';
    render();
    window.setTimeout(function () {
      state.status = 'ready';
      render();
    }, 500);
  }

  function init() {
    // 顶上两行：数据来源、更新时间
    el('source').textContent = DATA.source;
    el('fetched-at').textContent = formatTime(DATA.fetchedAt);

    // 渠道下拉框的选项，从数据里自动提取
    var channels = {};
    ALL_ROWS.forEach(function (r) { if (r.complete) channels[r.channel] = true; });

    var channelSelect = el('channel');
    Object.keys(channels).sort().forEach(function (c) {
      var opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      channelSelect.appendChild(opt);
    });

    // 三个交互
    channelSelect.addEventListener('change', function (e) {
      state.channel = e.target.value;
      render();
    });

    el('range').addEventListener('change', function (e) {
      state.range = e.target.value;
      render();
    });

    el('retry').addEventListener('click', load);

    el('simulate-error').addEventListener('click', function () {
      state.status = 'error';
      render();
    });

    load();
  }

  document.addEventListener('DOMContentLoaded', init);
})();

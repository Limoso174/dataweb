/* ==========================================================================
   这个文件归【A · 数据】管。其他人不要改这个文件。
   要改数字、改指标算法、加新字段 → 找 A。

   文件里有两块东西：
     1. window.DATA     —— 假数据。以后换成真实数据，只改这一块。
     2. window.DataLib  —— 计算函数。页面显示什么，全靠这里算出来。
   ========================================================================== */


/* --------------------------------------------------------------------------
   第一块：假数据
   --------------------------------------------------------------------------
   一行 = 某个渠道在某一天的汇总。

   现在这份数据是故意做"脏"的，包含五种真实情况：
     1. 缺渠道           → channel: null
     2. 数字写成文字     → visits: "980"
     3. 日期格式不一样   → "2024-3-5" / "2024/03/09"
     4. 特别大的数字     → revenue: 99999999
     5. 不完整的记录     → complete: false

   换成你们自己的数据时，照着这个格式填就行，但要【保留这五种脏数据】，
   否则等真实数据进来，页面会直接崩。
   -------------------------------------------------------------------------- */

window.DATA = {
  // 数据是什么时候拿到的，会显示在页面顶部
  fetchedAt: '2024-03-11T09:30:00+08:00',

  // 数据从哪来，会显示在页面顶部（做统计页面，这一行非常重要）
  source: '示例数据（非真实业务数据）',

  records: [
    { date: '2024-03-01', channel: '自然搜索', visits: 1280, orders: 64, revenue: 12800.5, complete: true },
    { date: '2024-03-01', channel: '信息流',   visits: 860,  orders: 21, revenue: 4200,    complete: true },
    { date: '2024-03-02', channel: '自然搜索', visits: 1340, orders: 71, revenue: 14200,   complete: true },
    { date: '2024-03-02', channel: '私域',     visits: 420,  orders: 19, revenue: 3800,    complete: true },
    { date: '2024-03-03', channel: '信息流',   visits: 1520, orders: 33, revenue: 6600,    complete: true },
    { date: '2024-03-04', channel: null,       visits: '980', orders: 41, revenue: 8200,   complete: true },
    { date: '2024-3-5',   channel: '信息流',   visits: 1610, orders: 38, revenue: 7600,    complete: true },
    { date: '2024-03-06', channel: '私域',     visits: 640,  orders: 0,  revenue: 0,       complete: true },
    { date: '2024-03-07', channel: '自然搜索', visits: 1420, orders: 88, revenue: 99999999, complete: true },
    { date: '2024-03-08', channel: '私域',     visits: 720,  orders: 31, revenue: null,    complete: false },
    { date: '2024/03/09', channel: '信息流',   visits: 1750, orders: 70, revenue: 14000,   complete: true },
    { date: '2024-03-10', channel: '自然搜索', visits: 1560, orders: 79, revenue: 15800,   complete: true },
    { date: '2024-03-10', channel: '信息流',   visits: 1180, orders: 46, revenue: 9200,    complete: true }
  ]
};


/* --------------------------------------------------------------------------
   第二块：计算函数
   --------------------------------------------------------------------------
   这里的函数都是"纯函数"：给同样的输入，永远得到同样的输出，
   不碰页面、不联网、不弹窗。好处是能单独测试，出错好查。
   -------------------------------------------------------------------------- */

window.DataLib = (function () {
  'use strict';

  /* ---- 小工具：把任何东西尽量变成一个数字（变不了就返回 null） ---- */
  function toNumber(value) {
    if (typeof value === 'number') return isFinite(value) ? value : null;
    if (typeof value === 'string') {
      var n = Number(value.replace(/[,\s]/g, ''));   // "1,234" → 1234
      return isFinite(n) ? n : null;
    }
    return null;
  }

  function pad2(s) {
    s = String(s);
    return s.length === 1 ? '0' + s : s;
  }

  /* ---- 小工具：把各种写法的日期统一成 2024-03-05 这种 ---- */
  function toISODate(value) {
    if (typeof value !== 'string') return null;
    var m = value.trim().match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
    if (!m) return null;
    var iso = m[1] + '-' + pad2(m[2]) + '-' + pad2(m[3]);
    var t = Date.parse(iso + 'T00:00:00Z');
    if (isNaN(t)) return null;
    if (new Date(t).toISOString().slice(0, 10) !== iso) return null;  // 挡掉 2024-02-31
    return iso;
  }

  /* ---- 第一道关：把原始数据洗干净 ---- */
  function normalise(records) {
    var rows = [];
    (records || []).forEach(function (raw) {
      var date = toISODate(raw.date);
      if (!date) return;                                  // 日期都读不出来，整行丢掉

      var channel = typeof raw.channel === 'string' ? raw.channel.trim() : '';

      rows.push({
        date: date,
        channel: channel || '未知渠道',
        visits: toNumber(raw.visits) || 0,
        orders: toNumber(raw.orders) || 0,
        revenue: toNumber(raw.revenue),                   // null 表示"没有这个数"，不能当 0
        complete: raw.complete !== false
      });
    });
    return rows;
  }

  /* ---- 第二道关：算指标 ---- */
  function computeMetrics(rows) {
    var visits = 0, orders = 0, revenue = 0, byDate = {};

    rows.forEach(function (r) {
      visits += r.visits;
      orders += r.orders;
      if (r.revenue !== null) revenue += r.revenue;       // 缺失的金额直接跳过
      byDate[r.date] = (byDate[r.date] || 0) + r.visits;
    });

    var dates = Object.keys(byDate).sort();

    return {
      visits: visits,
      orders: orders,
      revenue: revenue,
      conversion: visits > 0 ? orders / visits : null,    // 转化率
      aov: orders > 0 ? revenue / orders : null,          // 客单价
      byDate: dates.map(function (d) { return { date: d, visits: byDate[d] }; })
    };
  }

  /* ---- 第三道关：按筛选条件过滤 ---- */
  function applyFilters(rows, range, channel) {
    var out = rows;

    if (channel !== 'all') {
      out = out.filter(function (r) { return r.channel === channel; });
    }

    if (range !== 'all') {
      // 截止日取"全部数据里最新的一天"，而不是筛选之后的
      var allDates = rows.map(function (r) { return r.date; }).sort();
      var latest = allDates[allDates.length - 1];
      if (latest) {
        var cutoff = new Date(latest + 'T00:00:00Z');
        cutoff.setUTCDate(cutoff.getUTCDate() - (Number(range) - 1));
        var from = cutoff.toISOString().slice(0, 10);
        out = out.filter(function (r) { return r.date >= from; });
      }
    }

    return out;
  }

  return {
    normalise: normalise,
    computeMetrics: computeMetrics,
    applyFilters: applyFilters
  };
})();

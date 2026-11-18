// Lumenfall Token Radar — the dashboard's rendering.
//
// Three views, all from the generated data.js (window.RADAR), no network:
//   ?view=board    (default)  the ranked board, sortable and filterable
//   ?view=detail&slug=<slug>  one protocol: its figures, its model factors, its farm plan
//   ?view=filtered&category=<cat> | &chain=<chain> | &min_tvl=<usd>
//                              the filtered subset of the board
//   ?view=live                protocols that already record a token, with market caps
//
// The page never fetches: data.js is written beside it by main.ts.

(function () {
  'use strict';

  var R = window.RADAR;
  var app = document.getElementById('app');
  var statsEl = document.getElementById('stats');
  var viewsEl = document.getElementById('views');
  var modelNote = document.getElementById('model-note');

  if (!R || !Array.isArray(R.rows)) {
    app.innerHTML = '<div class="panel"><h2>No radar data</h2><p>The generated data.js did not load. Run main.ts first.</p></div>';
    return;
  }

  var params = new URLSearchParams(window.location.search);
  var view = params.get('view') || 'board';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function money(n) {
    if (n == null) return '—';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + n;
  }
  function fullMoney(n) {
    if (n == null) return '—';
    return '$' + Math.round(n).toLocaleString('en-US');
  }
  function pct(n) {
    if (n == null) return '<span class="flat">n/a</span>';
    var cls = n > 0 ? 'up' : n < 0 ? 'down' : 'flat';
    var sign = n > 0 ? '+' : '';
    return '<span class="' + cls + '">' + sign + n.toFixed(2) + '%</span>';
  }
  // The watchlist slugs ride in data.js so the page can mark watchlist rows.
  var WATCH = new Set(R.watchlist_slugs || []);

  function renderStats() {
    statsEl.innerHTML =
      stat(R.scanned, 'protocols scanned') +
      stat(R.watchlist_size, 'on the watchlist') +
      stat(R.board_size, 'ranked pre-token') +
      stat(R.token_bearing, 'already have a token', true) +
      stat(money(R.rows[0] ? R.rows[0].implied_value_usd : 0), 'top implied value');
    function stat(value, label, warn) {
      return '<div' + (warn ? ' class="warn"' : '') + '><dt>' + esc(label) + '</dt><dd>' + esc(String(value)) + '</dd></div>';
    }
  }

  function renderNav() {
    var links = [
      ['board', 'Board'],
      ['filtered', 'Filtered'],
      ['live', 'Already launched'],
    ];
    viewsEl.innerHTML = links.map(function (pair) {
      var key = pair[0]; var label = pair[1];
      var active = (view === key) || (view === 'detail' && key === 'board');
      var href = key === 'board' ? '?view=board' : key === 'live' ? '?view=live' : '?view=filtered';
      return active
        ? '<span class="on">' + esc(label) + '</span>'
        : '<a href="' + href + '">' + esc(label) + '</a>';
    }).join('');
  }

  function rowHtml(r) {
    var badge = WATCH.has(r.slug)
      ? ' <span class="badge watch">watchlist</span>'
      : ' <span class="badge pre">pre-token</span>';
    return '<tr data-slug="' + esc(r.slug) + '">' +
      '<td class="rank">' + r.rank + '</td>' +
      '<td class="name">' + esc(r.name) + badge + '<span class="slug">' + esc(r.slug) + '</span></td>' +
      '<td>' + esc(r.category || '—') + '</td>' +
      '<td>' + esc(r.chains.slice(0, 3).join(', ') || '—') + (r.chains.length > 3 ? ' +' + (r.chains.length - 3) : '') + '</td>' +
      '<td class="num">' + money(r.tvl_usd) + '</td>' +
      '<td class="num">' + pct(r.change_7d) + '</td>' +
      '<td class="value">' + money(r.implied_value_usd) + '</td>' +
      '</tr>';
  }

  function boardTable(rows, opts) {
    opts = opts || {};
    var sortKey = opts.sortKey || 'rank';
    var sortDir = opts.sortDir || 1;
    var sorted = rows.slice();
    var keys = {
      rank: function (r) { return r.rank; },
      name: function (r) { return r.name.toLowerCase(); },
      tvl: function (r) { return r.tvl_usd; },
      change: function (r) { return r.change_7d == null ? -Infinity : r.change_7d; },
      value: function (r) { return r.implied_value_usd; },
    };
    sorted.sort(function (a, b) {
      var ka = keys[sortKey](a); var kb = keys[sortKey](b);
      if (ka < kb) return -1 * sortDir;
      if (ka > kb) return 1 * sortDir;
      return a.rank - b.rank;
    });
    function th(label, key) {
      var arrow = sortKey === key ? (sortDir === 1 ? ' ▲' : ' ▼') : '';
      return '<th><button type="button" data-sort="' + key + '">' + esc(label) + arrow + '</button></th>';
    }
    return '<table class="board"><thead><tr>' +
      th('#', 'rank') + th('Protocol', 'name') + '<th>Category</th><th>Chains</th>' +
      th('TVL', 'tvl') + th('7d', 'change') + th('Implied value', 'value') +
      '</tr></thead><tbody>' + sorted.map(rowHtml).join('') + '</tbody></table>';
  }

  function bindTable(container, rows, state) {
    container.querySelectorAll('[data-sort]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-sort');
        if (state.sortKey === key) state.sortDir = -state.sortDir;
        else { state.sortKey = key; state.sortDir = key === 'name' ? 1 : -1; }
        renderBoardView(state);
      });
    });
    container.querySelectorAll('tbody tr').forEach(function (tr) {
      tr.addEventListener('click', function () {
        window.location.search = '?view=detail&slug=' + encodeURIComponent(tr.getAttribute('data-slug'));
      });
    });
  }

  function renderBoardView(state) {
    state = state || { sortKey: 'rank', sortDir: 1, q: '', category: '', chain: '' };
    var rows = R.rows;
    var cats = Array.from(new Set(rows.map(function (r) { return r.category || '—'; }))).sort();
    var chains = Array.from(new Set(rows.flatMap(function (r) { return r.chains; }))).sort();
    var panel = document.createElement('div');
    panel.className = 'panel';
    panel.innerHTML =
      '<h2>The board — ' + R.board_size + ' pre-token protocols, ranked by implied value</h2>' +
      '<p>Every row records no token in the snapshot (no CoinGecko id, no symbol) and is not a wrapped, staked or bridged product. ' +
      'Rows marked <span class="badge watch">watchlist</span> are the snapshot\u2019s 40: TVL at or above ' + money(R.floor_usd) + '. ' +
      'The rest are the early finds below the floor, by TVL. Click a row for its farm plan.</p>' +
      '<div class="toolbar">' +
      '<input type="search" id="q" placeholder="Search name or slug…" value="' + esc(state.q) + '" aria-label="Search">' +
      '<label>Category <select id="cat"><option value="">All</option>' + cats.map(function (c) {
        return '<option value="' + esc(c) + '"' + (state.category === c ? ' selected' : '') + '>' + esc(c) + '</option>';
      }).join('') + '</select></label>' +
      '<label>Chain <select id="chain"><option value="">All</option>' + chains.map(function (c) {
        return '<option value="' + esc(c) + '"' + (state.chain === c ? ' selected' : '') + '>' + esc(c) + '</option>';
      }).join('') + '</select></label>' +
      '<span class="count" id="count"></span>' +
      '</div>' +
      '<div id="table-wrap"></div>';
    app.innerHTML = '';
    app.appendChild(panel);
    var wrap = panel.querySelector('#table-wrap');
    var countEl = panel.querySelector('#count');

    function apply() {
      var q = (panel.querySelector('#q').value || '').trim().toLowerCase();
      var cat = panel.querySelector('#cat').value;
      var ch = panel.querySelector('#chain').value;
      state.q = q; state.category = cat; state.chain = ch;
      var filtered = rows.filter(function (r) {
        if (q && (r.name.toLowerCase().indexOf(q) < 0 && r.slug.toLowerCase().indexOf(q) < 0)) return false;
        if (cat && (r.category || '—') !== cat) return false;
        if (ch && r.chains.indexOf(ch) < 0) return false;
        return true;
      });
      countEl.textContent = filtered.length + ' of ' + rows.length + ' rows';
      wrap.innerHTML = filtered.length ? boardTable(filtered, state) : '<p>No protocols match that filter.</p>';
      bindTable(wrap, filtered, state);
    }
    panel.querySelector('#q').addEventListener('input', apply);
    panel.querySelector('#cat').addEventListener('change', apply);
    panel.querySelector('#chain').addEventListener('change', apply);
    apply();
    renderLiveStrip();
  }

  function renderLiveStrip() {
    var div = document.createElement('div');
    div.className = 'panel';
    div.innerHTML = '<h3>Already launched — set aside, not ranked</h3>' +
      '<p>' + R.token_bearing + ' of the ' + R.scanned + ' scanned protocols already record a token, so the radar does not model them: their market cap is the market\u2019s own number. Top by market cap:</p>' +
      '<div class="live-list">' + R.live.map(function (l) {
        return '<span><b>' + esc(l.name) + '</b> · mcap ' + money(l.mcap_usd) + '</span>';
      }).join('') + '</div>' +
      '<p><a href="?view=live">See the full live list →</a></p>';
    app.appendChild(div);
  }

  function renderDetail() {
    var slug = params.get('slug') || '';
    var r = R.rows.find(function (x) { return x.slug === slug; });
    if (!r) {
      app.innerHTML = '<div class="panel"><h2>Protocol not found</h2><p>No ranked protocol has the slug <code>' + esc(slug) + '</code>.</p><p><a href="?view=board">← Back to the board</a></p></div>';
      return;
    }
    var age = r.age_days == null ? 'not reported' : r.age_days + ' days tracked';
    app.innerHTML =
      '<a class="back" href="?view=board">← Back to the board</a>' +
      '<div class="panel"><h2>#' + r.rank + ' · ' + esc(r.name) + (WATCH.has(r.slug) ? ' <span class="badge watch">watchlist</span>' : ' <span class="badge pre">pre-token</span>') + '</h2>' +
      '<p>' + esc(r.name) + ' records no token in the snapshot and is ranked by the implied value its token would carry if it launched on today\u2019s figures.</p>' +
      '<dl class="kv">' +
      '<dt>Implied value</dt><dd><strong>' + fullMoney(r.implied_value_usd) + '</strong></dd>' +
      '<dt>TVL</dt><dd>' + fullMoney(r.tvl_usd) + '</dd>' +
      '<dt>7-day change</dt><dd>' + pct(r.change_7d) + '</dd>' +
      '<dt>Category</dt><dd>' + esc(r.category || '—') + '</dd>' +
      '<dt>Chains</dt><dd>' + esc(r.chains.slice(0, 6).join(', ') || '—') + (r.chains.length > 6 ? ' +' + (r.chains.length - 6) + ' more' : '') + '</dd>' +
      '<dt>Tracked since</dt><dd>' + esc(r.listed_at || '—') + ' (' + esc(age) + ')</dd>' +
      '<dt>Snapshot date</dt><dd>' + esc(R.as_of) + '</dd>' +
      '</dl>' +
      '<h3>Why this value — the model\u2019s factors</h3>' +
      '<dl class="factors">' +
      '<div><dt>Category multiple</dt><dd>×' + r.category_multiple.toFixed(2) + '</dd></div>' +
      '<div><dt>Growth factor</dt><dd>×' + r.growth_factor.toFixed(2) + '</dd></div>' +
      '<div><dt>Maturity factor</dt><dd>×' + r.maturity_factor.toFixed(2) + '</dd></div>' +
      '<div><dt>Chain factor</dt><dd>×' + r.chain_factor.toFixed(2) + '</dd></div>' +
      '</dl>' +
      '<p>implied = TVL × category multiple × growth × maturity × chains, capped at $100B. ' +
      'Growth uses the 7-day TVL change (clamped −50%…+100%, null → neutral); maturity rewards protocols that have run longer with no token; chains reward multi-chain reach.</p>' +
      '<h3>Farm plan — what to do before it launches</h3>' +
      '<ol class="steps">' + r.farm_steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' +
      '</div>';
  }

  function renderFiltered() {
    var cat = params.get('category') || '';
    var chain = params.get('chain') || '';
    var minTvl = params.get('min_tvl') ? Number(params.get('min_tvl')) : 0;
    var rows = R.rows.filter(function (r) {
      if (cat && (r.category || '—') !== cat) return false;
      if (chain && r.chains.indexOf(chain) < 0) return false;
      if (minTvl && r.tvl_usd < minTvl) return false;
      return true;
    });
    var desc = [];
    if (cat) desc.push('category ' + cat);
    if (chain) desc.push('chain ' + chain);
    if (minTvl) desc.push('TVL ≥ ' + money(minTvl));
    var title = desc.length ? desc.join(' · ') : 'all ranked protocols';
    var cats = Array.from(new Set(R.rows.map(function (r) { return r.category || '—'; }))).sort();
    app.innerHTML =
      '<a class="back" href="?view=board">← Back to the board</a>' +
      '<div class="panel"><h2>Filtered view — ' + esc(title) + '</h2>' +
      '<p>' + rows.length + ' of ' + R.board_size + ' ranked protocols match. Pick another filter:</p>' +
      '<div class="toolbar">' + cats.map(function (c) {
        return '<a href="?view=filtered&category=' + encodeURIComponent(c) + '"' + (c === cat ? ' class="on"' : '') + ' style="padding:6px 12px;border-radius:999px;border:1px solid var(--line);color:var(--muted);text-decoration:none;font-size:13px">' + esc(c) + '</a>';
      }).join(' ') + '</div>' +
      (rows.length ? '<div id="table-wrap">' + boardTable(rows, { sortKey: 'rank', sortDir: 1 }) + '</div>' : '<p>No protocols match that filter.</p>') +
      '</div>';
    var wrap = document.getElementById('table-wrap');
    if (wrap) bindTable(wrap, rows, { sortKey: 'rank', sortDir: 1, q: '', category: '', chain: '' });
  }

  function renderLive() {
    app.innerHTML =
      '<div class="panel"><h2>Already launched — ' + R.token_bearing + ' protocols record a token</h2>' +
      '<p>These protocols are <strong>not</strong> on the ranked board: a token already trades, so there is nothing to imply. Their market cap is the market\u2019s own number, shown for contrast with the board\u2019s modelled values. The top ' + R.live.length + ' by market cap:</p>' +
      '<table class="board"><thead><tr><th>Protocol</th><th>Category</th><th>Chains</th><th>TVL</th><th>Market cap</th><th>7d</th></tr></thead><tbody>' +
      R.live.map(function (l) {
        return '<tr><td class="name">' + esc(l.name) + ' <span class="badge live">token live</span><span class="slug">' + esc(l.slug) + '</span></td>' +
          '<td>' + esc(l.category || '—') + '</td>' +
          '<td>' + esc(l.chains.slice(0, 3).join(', ') || '—') + '</td>' +
          '<td class="num">' + money(l.tvl_usd) + '</td>' +
          '<td class="num">' + money(l.mcap_usd) + '</td>' +
          '<td class="num">' + pct(l.change_7d) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  renderStats();
  renderNav();
  modelNote.innerHTML = 'Model <code>' + esc(R.model_version) + '</code>: implied = TVL × category multiple × growth (7d change, clamped −50%…+100%) × maturity (age, up to 4 yrs) × chains (up to 8 extra) — capped at $100B. Snapshot ' + esc(R.as_of) + ' · floor ' + money(R.floor_usd) + '.';
  if (view === 'detail') renderDetail();
  else if (view === 'filtered') renderFiltered();
  else if (view === 'live') renderLive();
  else renderBoardView();
})();

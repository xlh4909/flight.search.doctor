// 公共导航栏 & 环境切换 —— 所有页面共享，修改一处即全局生效
(function() {
    var path = window.location.pathname;

    // 当前页面对应的激活菜单组和链接
    var activeConfig = {
        '/':                    { group: '产品站',   link: '/' },
        '/gateway.html':        { group: '网关站',   link: '/gateway.html' },
        '/b15-standard.html':   { group: '网关站',   link: '/b15-standard.html' },
        '/snapshot.html':       { group: '网关站',   link: '/snapshot.html' },
        '/huixing.html':        { group: '产品站',   link: '/huixing.html' },
        '/b15.html':            { group: '产品站',   link: '/b15.html' },
        '/proxy-log.html':      { group: '日志追踪', link: '/proxy-log.html' },
        '/real-interline.html': { group: '联程最小价', link: '/real-interline.html' },
        '/interline-lowest.html':  { group: '联程最低价', link: '/interline-lowest.html' },
        '/multi-trip-lowest.html': { group: '联程最低价', link: '/multi-trip-lowest.html' },
        '/open-jaw-lowest.html':   { group: '联程最低价', link: '/open-jaw-lowest.html' }
    };
    var current = activeConfig[path] || {};

    // 导航菜单数据结构
    var groups = [
        {
            name: '网关站',
            links: [
                { href: '/gateway.html',      text: '下沉版本排查' },
                { href: '/b15-standard.html', text: 'Book1.5标准版' },
                { href: '/snapshot.html',     text: '快照查询' }
            ]
        },
        {
            name: '产品站',
            links: [
                { href: '/',              text: 'B1方案比对' },
                { href: '/huixing.html',  text: '慧行方案查询' },
                { href: '/b15.html',      text: 'B15产品列表' }
            ]
        },
        {
            name: '联程最小价',
            links: [
                { href: '/real-interline.html', text: '真联程最小价' }
            ]
        },
        {
            name: '联程最低价',
            links: [
                { href: '/interline-lowest.html', text: '联程最低价' },
                { href: '/multi-trip-lowest.html', text: '多程最低价' },
                { href: '/open-jaw-lowest.html', text: '缺口程最低价' }
            ]
        },
        {
            name: '日志追踪',
            links: [
                { href: '/proxy-log.html',  text: '站点代理日志' }
            ]
        }
    ];

    // ── per-menu-group env key ──
    var currentGroup = current.group || 'default';
    var envKey = 'doctorEnv_' + currentGroup;

    // ── 构建导航 HTML ──
    var html = '<nav class="nav-bar">';
    html += '<select class="env-select" id="envSelect" onchange="switchEnv(this.value)" title="切换环境"></select>';
    html += '<input type="text" id="customDomainInput" class="custom-domain-input" placeholder="自定义域名 (默认 http://localhost:63974/)" style="display:none;margin-right:8px;background:rgba(255,255,255,0.15);color:white;border:1px solid rgba(255,255,255,0.3);border-radius:6px;padding:6px 10px;font-size:12px;font-weight:600;outline:none;width:220px;" oninput="onCustomDomainChange()">';
    for (var i = 0; i < groups.length; i++) {
        var g = groups[i];
        var groupActive = current.group === g.name;
        html += '<div class="nav-group' + (groupActive ? ' has-active' : '') + '">';
        html += '<button class="nav-group-btn">' + g.name + ' ▾</button>';
        html += '<div class="nav-dropdown">';
        for (var j = 0; j < g.links.length; j++) {
            var l = g.links[j];
            var linkActive = current.link === l.href;
            var cls = linkActive ? ' class="active"' : '';
            var style = l.disabled ? ' style="color:rgba(255,255,255,0.4);cursor:default;"' : '';
            html += '<a href="' + l.href + '"' + cls + style + '>' + l.text + '</a>';
        }
        html += '</div></div>';
    }
    html += '</nav>';

    document.getElementById('nav-placeholder').outerHTML = html;

    var styleEl = document.createElement('style');
    styleEl.textContent = '.custom-domain-input::placeholder{color:rgba(255,255,255,0.5);} .custom-domain-input:focus{border-color:rgba(255,255,255,0.5);background:rgba(255,255,255,0.2);}';
    document.head.appendChild(styleEl);

    // ── 环境切换（per-menu-group 独立） ──
    var stored = localStorage.getItem(envKey);
    if (!stored) {
        stored = 'prod';
        localStorage.setItem(envKey, stored);
    }
    window._currentEnv = stored;

    window.switchEnv = function(env) {
        window._currentEnv = env;
        localStorage.setItem(envKey, env);
        toggleCustomDomainInput(env === 'custom');
    };

    window.envQs = function() {
        var qs = 'env=' + encodeURIComponent(window._currentEnv);
        if (window._currentEnv === 'custom') {
            var input = document.getElementById('customDomainInput');
            if (input && input.value.trim()) {
                qs += '&customDomain=' + encodeURIComponent(input.value.trim());
            }
        }
        return qs;
    };

    function toggleCustomDomainInput(show) {
        var input = document.getElementById('customDomainInput');
        if (input) input.style.display = show ? 'inline-block' : 'none';
    }
    window.toggleCustomDomainInput = toggleCustomDomainInput;

    window.onCustomDomainChange = function() {
        var input = document.getElementById('customDomainInput');
        if (input) {
            localStorage.setItem(envKey + '_customDomain', input.value.trim());
        }
    };

    // ── 初始化环境选择下拉框 ──
    (function() {
        var sel = document.getElementById('envSelect');
        if (!sel) return;
        var envs = [
            { key: 'prod',          label: '线上' },
            { key: 'qa',            label: 'QA' },
            { key: 'uat',           label: 'UAT' },
            { key: 't',             label: 'T环境' },
            { key: 't2',            label: 'T2环境' },
            { key: 'lane',          label: 'Lane环境' },
            { key: 'local_gateway', label: 'Local-Gateway' },
            { key: 'local_engine',  label: 'Local-Engine' },
            { key: 'custom',        label: '自定义' }
        ];
        var opts = '';
        for (var i = 0; i < envs.length; i++) {
            var e = envs[i];
            opts += '<option value="' + e.key + '"' + (e.key === window._currentEnv ? ' selected' : '') + '>' + e.label + '</option>';
        }
        sel.innerHTML = opts;
        sel.value = window._currentEnv;

        if (window._currentEnv === 'custom') {
            var input = document.getElementById('customDomainInput');
            if (input) {
                input.value = localStorage.getItem(envKey + '_customDomain') || '';
                input.style.display = 'inline-block';
            }
        }
    })();
})();

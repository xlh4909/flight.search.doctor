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
        '/real-interline.html': { group: '联程最小价', link: '/real-interline.html' }
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
                { href: 'javascript:void(0)', text: '暂未开放', disabled: true }
            ]
        },
        {
            name: '日志追踪',
            links: [
                { href: '/proxy-log.html',  text: '站点代理日志' }
            ]
        }
    ];

    // 构建导航 HTML
    var html = '<nav class="nav-bar">';
    html += '<select class="env-select" id="envSelect" onchange="switchEnv(this.value)" title="切换环境"></select>';
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

    // ── 环境切换（所有页面共享） ──
    window._currentEnv = localStorage.getItem('doctorEnv') || 'prod';

    window.switchEnv = function(env) {
        window._currentEnv = env;
        localStorage.setItem('doctorEnv', env);
    };

    window.envQs = function() {
        return 'env=' + encodeURIComponent(window._currentEnv);
    };

    // 初始化环境选择下拉框
    (function() {
        var sel = document.getElementById('envSelect');
        if (!sel) return;
        var envs = [
            { key: 'prod', label: '线上' },
            { key: 'qa',   label: 'QA' },
            { key: 'uat',  label: 'UAT' },
            { key: 't',    label: 'T环境' },
            { key: 't2',   label: 'T2环境' },
            { key: 'lane', label: 'Lane环境' }
        ];
        var opts = '';
        for (var i = 0; i < envs.length; i++) {
            var e = envs[i];
            opts += '<option value="' + e.key + '"' + (e.key === window._currentEnv ? ' selected' : '') + '>' + e.label + '</option>';
        }
        sel.innerHTML = opts;
        sel.value = window._currentEnv;
    })();
})();

const {
    API_TIMEOUT, SKYEYE_LOG_URL, SKYEYE_APP_ID, SKYEYE_TOKEN,
    PROXY_LOG_APP_IDS, PROXY_LOG_TOKENS
} = require('../config');

function formatTime(d) {
    const pad = (n, l = 2) => String(n).padStart(l, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.000`;
}

function formatSkyeyeError(prefix, err) {
    if (err.code === 'ECONNABORTED') return prefix + '超时';
    if (err.response) return `${prefix}错误: HTTP ${err.response.status}`;
    if (err.message) return `${prefix}错误: ${err.message}`;
    return prefix + '失败';
}

    // 模糊查询用：4个站点的 appId 与 token —— 按用户指定顺序一一对应
    const FUZZY_SITES = [
        { appId: '102781',  token: '1c0e970a-beeb-4f8b-963d-d300acb4fed8' },
        { appId: '3295971', token: 'a9c8dd1c-a77c-40c5-a7e9-b15685361024' },
        { appId: '3303660', token: 'e987efa1-aacc-4809-a619-41528ed1781e' },
        { appId: '106711',  token: '97c08bf9-0133-4889-95d7-18d8922f53a7' }
    ];

    module.exports = function(app, httpClient) {
    app.post('/api/skyeye/proxy-log-fuzzy', async (req, res) => {
        try {
            const { keyword, appId, beginTime: customBegin, endTime: customEnd } = req.body;
            if (!keyword) {
                return res.status(400).json({ success: false, error: 'keyword is required' });
            }
            if (!appId) {
                return res.status(400).json({ success: false, error: 'appId is required' });
            }

            const site = FUZZY_SITES.find(s => s.appId === appId);
            if (!site) {
                return res.status(400).json({ success: false, error: 'unknown appId: ' + appId });
            }

            const now = new Date();
            const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000);
            const beginTime = customBegin || formatTime(tenMinAgo);
            const endTime = customEnd || formatTime(now);

            const skyeyeBody = {
                appIds: [site.appId],
                module: 'Application',
                category: 'ServiceProxy',
                indexContext: keyword,
                beginTime: beginTime,
                endTime: endTime,
                tokens: [site.token],
                pageSize: 500
            };

            console.log(`[ProxyLogFuzzy] site appId=${site.appId}, keyword=${keyword}, timeRange=${beginTime} ~ ${endTime}`);

            const result = await httpClient.post(SKYEYE_LOG_URL, skyeyeBody, {
                timeout: API_TIMEOUT,
                headers: { 'Content-Type': 'application/json' }
            });

            const list = (result.data && result.data.result && result.data.result.list) || [];
            const totalCount = (result.data && result.data.result && result.data.result.totalCount) || 0;
            console.log(`[ProxyLogFuzzy] site=${site.appId}, totalCount=${totalCount}, list.length=${list.length}`);

            res.json({
                success: true,
                data: {
                    appId: site.appId,
                    list: list,
                    totalCount: totalCount
                }
            });
        } catch (err) {
            res.json({ success: false, error: formatSkyeyeError('模糊日志查询', err) });
        }
    });

    app.post('/api/skyeye/log', async (req, res) => {
        try {
            const { traceId } = req.body;
            if (!traceId) {
                return res.status(400).json({ success: false, error: 'traceId is required' });
            }

            const now = new Date();
            const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

            const skyeyeBody = {
                appIds: [SKYEYE_APP_ID],
                module: 'Infrastructure',
                category: 'TransitLineV2Adapter',
                subCategory: 'FindApiAsync',
                contextId: traceId,
                beginTime: formatTime(twoHoursAgo),
                endTime: formatTime(now),
                tokens: [SKYEYE_TOKEN],
                pageSize: 500
            };

            const requestHeaders = {
                'Content-Type': 'application/json'
            };
            const result = await httpClient.post(SKYEYE_LOG_URL, skyeyeBody, {
                timeout: API_TIMEOUT,
                headers: requestHeaders
            });

            res.json({
                success: true,
                data: result.data,
                _debug: {
                    requestUrl: SKYEYE_LOG_URL,
                    requestBody: skyeyeBody,
                    responseStatus: result.status,
                    rawData: result.data
                }
            });
        } catch (err) {
            res.json({ success: false, error: formatSkyeyeError('天网日志查询', err) });
        }
    });

    app.post('/api/skyeye/proxy-log', async (req, res) => {
        try {
            const { traceId, beginTime: customBegin, endTime: customEnd } = req.body;
            if (!traceId) {
                return res.status(400).json({ success: false, error: 'traceId is required' });
            }

            const now = new Date();
            const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
            const beginTime = customBegin || formatTime(twoHoursAgo);
            const endTime = customEnd || formatTime(now);

            const skyeyeBody = {
                appIds: PROXY_LOG_APP_IDS,
                modules: ['Application','Infrastructure'],
                categories: ['ServiceProxy','PipeSearch.Resource.ConnectMinPrice.ConnectMinPriceAdapter'],
                contextId: traceId,
                beginTime: beginTime,
                endTime: endTime,
                tokens: PROXY_LOG_TOKENS,
                pageSize: 500
            };

            const requestHeaders = {
                'Content-Type': 'application/json'
            };

            console.log(`[ProxyLog] traceId=${traceId}, appIds=${PROXY_LOG_APP_IDS.join(',')}, timeRange=${beginTime} ~ ${endTime}`);

            const result = await httpClient.post(SKYEYE_LOG_URL, skyeyeBody, {
                timeout: API_TIMEOUT,
                headers: requestHeaders
            });

            const list = (result.data && result.data.result && result.data.result.list) || [];
            console.log(`[ProxyLog] response status=${result.status}, totalCount=${result.data && result.data.result && result.data.result.totalCount || 0}, list.length=${list.length}`);
            if (list.length === 0) {
                console.log(`[ProxyLog] Raw response:`, JSON.stringify(result.data).substring(0, 500));
            }

            res.json({
                success: true,
                data: result.data,
                _debug: {
                    requestUrl: SKYEYE_LOG_URL,
                    requestBody: skyeyeBody,
                    responseStatus: result.status,
                    rawData: result.data
                }
            });
        } catch (err) {
            res.json({ success: false, error: formatSkyeyeError('代理日志查询', err) });
        }
    });
};

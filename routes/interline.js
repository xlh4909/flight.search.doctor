const { getInterlineSearchUrl, getEnvFromRequest, API_TIMEOUT } = require('../config');

// 4 种联程最低价接口定义
const ENDPOINTS = [
    {
        path: '/api/interline/searchoneway',
        apiPath: '/interline/connect/searchoneway',
        label: '假联程'
    },
    {
        path: '/api/interline/searchconnect',
        apiPath: '/interline/connect/searchconnect',
        label: '真联程'
    },
    {
        path: '/api/interline/fakeconnect',
        apiPath: '/interline/connect/fakeconnect',
        label: '拼接假联程'
    },
    {
        path: '/api/interline/searchtransfer',
        apiPath: '/interline/connect/searchtransfer',
        label: '云上公交'
    }
];

module.exports = function(app, httpClient) {
    ENDPOINTS.forEach(function(ep) {
        app.post(ep.path, async (req, res) => {
            try {
                const requestBody = req.body;
                const env = getEnvFromRequest(req);
                const customDomain = req.query.customDomain || '';
                const baseUrl = getInterlineSearchUrl(env, customDomain);

                if (!requestBody || typeof requestBody !== 'object' || Object.keys(requestBody).length === 0) {
                    return res.status(400).json({ success: false, error: 'Invalid request body' });
                }

                const targetUrl = baseUrl + ep.apiPath;
                const axiosConfig = {
                    timeout: API_TIMEOUT,
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                };

                const result = await httpClient.post(targetUrl, requestBody, axiosConfig);
                const apmTraceId = (result.headers || {})['apm-traceid'] || (result.headers || {})['apmtraceid'] || (result.headers || {})['ApmTraceId'] || '';
                res.json({ success: true, data: result.data, apmTraceId });
            } catch (err) {
                let errorMessage = `${ep.label} API 调用失败`;
                if (err.code === 'ECONNABORTED') {
                    errorMessage = `${ep.label} API 超时`;
                } else if (err.response) {
                    errorMessage = `${ep.label} API 返回错误: HTTP ${err.response.status}`;
                } else if (err.message) {
                    errorMessage = `${ep.label} API 错误: ${err.message}`;
                }
                res.json({ success: false, error: errorMessage });
            }
        });
    });
};

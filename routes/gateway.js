const { getGatewayUrl, API_TIMEOUT } = require('../config');

module.exports = function(app, httpClient) {
    app.post('/api/gateway/search', async (req, res) => {
        try {
            const { site, plat, queryParams } = req.body;
            const env = req.query.env || 'prod';
            const customDomain = req.query.customDomain || '';
            const baseUrl = getGatewayUrl(env, customDomain);
            const s = site || 'wechatcore';
            const p = plat || '852';

            if (!queryParams || typeof queryParams !== 'object') {
                return res.status(400).json({ success: false, error: '缺少 queryParams (文本框中的JSON参数)' });
            }

            const url = `${baseUrl}/${s}/connectbigsearch/searchflights/${p}/str`;
            const jsonBody = JSON.stringify(queryParams);

            const result = await httpClient.post(url, jsonBody, {
                timeout: API_TIMEOUT,
                headers: {
                    'Content-Type': 'application/json',
                    'token': '12345'
                }
            });

            const apmTraceId = (result.headers || {})['apm-traceid'] || (result.headers || {})['apmtraceid'] || (result.headers || {})['ApmTraceId'] || '';
            res.json({ success: true, data: result.data, apmTraceId, requestUrl: url, requestParams: queryParams });
        } catch (err) {
            let errorMessage = '网关站 API 调用失败';
            if (err.code === 'ECONNABORTED') {
                errorMessage = '网关站 API 超时';
            } else if (err.response) {
                errorMessage = `网关站 API 返回错误: HTTP ${err.response.status}`;
            } else if (err.message) {
                errorMessage = `网关站 API 错误: ${err.message}`;
            }
            res.json({ success: false, error: errorMessage });
        }
    });
};

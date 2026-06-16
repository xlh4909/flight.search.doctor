const { getEnvConfigWithFallback, getEnvFromRequest, getHuixingUrl, API_TIMEOUT } = require('../config');

module.exports = function(app, httpClient) {
    app.post('/api/huixing/search', async (req, res) => {
        try {
            const requestBody = req.body;
            const hxApi = req.query.hxApi || 'hx';
            const envConfig = getEnvConfigWithFallback(getEnvFromRequest(req));

            if (!requestBody || typeof requestBody !== 'object' || Object.keys(requestBody).length === 0) {
                return res.status(400).json({ success: false, error: 'Invalid request body' });
            }

            const hxUrl = getHuixingUrl(envConfig, hxApi);
            const axiosConfig = {
                timeout: API_TIMEOUT,
                headers: { 'Content-Type': 'application/json' }
            };

            const result = await httpClient.post(hxUrl, requestBody, axiosConfig);
            const apmTraceId = (result.headers || {})['apm-traceid'] || (result.headers || {})['apmtraceid'] || (result.headers || {})['ApmTraceId'] || '';
            res.json({ success: true, data: result.data, apmTraceId: apmTraceId });
        } catch (err) {
            let errorMessage = '慧行 API 调用失败';
            if (err.code === 'ECONNABORTED') {
                errorMessage = '慧行 API 超时';
            } else if (err.response) {
                errorMessage = `慧行 API 返回错误: HTTP ${err.response.status}`;
            } else if (err.message) {
                errorMessage = `慧行 API 错误: ${err.message}`;
            }
            res.json({ success: false, error: errorMessage });
        }
    });
};

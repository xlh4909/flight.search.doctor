const { getEnvConfig, getEnvFromRequest, API_TIMEOUT } = require('../config');

module.exports = function(app, httpClient) {
    app.post('/api/b15/search', async (req, res) => {
        try {
            const requestBody = req.body;
            const envConfig = getEnvConfig(getEnvFromRequest(req));

            if (!requestBody || typeof requestBody !== 'object' || Object.keys(requestBody).length === 0) {
                return res.status(400).json({ success: false, error: 'Invalid request body' });
            }

            const axiosConfig = {
                timeout: API_TIMEOUT,
                headers: { 'Content-Type': 'application/json' }
            };

            const result = await httpClient.post(envConfig.b15, requestBody, axiosConfig);
            const apmTraceId = (result.headers || {})['apm-traceid'] || (result.headers || {})['apmtraceid'] || (result.headers || {})['ApmTraceId'] || '';
            res.json({ success: true, data: result.data, apmTraceId: apmTraceId });
        } catch (err) {
            let errorMessage = 'B15 API 调用失败';
            if (err.code === 'ECONNABORTED') {
                errorMessage = 'B15 API 超时';
            } else if (err.response) {
                errorMessage = `B15 API 返回错误: HTTP ${err.response.status}`;
            } else if (err.message) {
                errorMessage = `B15 API 错误: ${err.message}`;
            }
            res.json({ success: false, error: errorMessage });
        }
    });
};

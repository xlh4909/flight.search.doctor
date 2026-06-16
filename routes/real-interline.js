const { getEnvConfigWithFallback, getEnvFromRequest, API_TIMEOUT } = require('../config');
const { extractApmTraceId } = require('../utils');

module.exports = function(app, httpClient) {
    app.post('/api/real-interline', async (req, res) => {
        try {
            const requestBody = req.body;
            const envConfig = getEnvConfigWithFallback(getEnvFromRequest(req));

            if (!requestBody || typeof requestBody !== 'object' || Object.keys(requestBody).length === 0) {
                return res.status(400).json({ success: false, error: 'Invalid request body' });
            }

            const axiosConfig = {
                timeout: API_TIMEOUT,
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            };

            const result = await httpClient.post(envConfig.realInterline, requestBody, axiosConfig);
            const apmTraceId = extractApmTraceId(result);
            res.json({ success: true, data: result.data, apmTraceId: apmTraceId });
        } catch (err) {
            let errorMessage = '真联程最小价 API 调用失败';
            if (err.code === 'ECONNABORTED') {
                errorMessage = '真联程最小价 API 超时';
            } else if (err.response) {
                errorMessage = `真联程最小价 API 返回错误: HTTP ${err.response.status}`;
            } else if (err.message) {
                errorMessage = `真联程最小价 API 错误: ${err.message}`;
            }
            res.json({ success: false, error: errorMessage });
        }
    });
};

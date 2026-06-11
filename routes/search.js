const { getEnvConfig, getEnvFromRequest, getHuixingUrl, API_TIMEOUT } = require('../config');
const { transformToHuixingRequest, formatResult, extractApmTraceId } = require('../utils');

module.exports = function(app, httpClient) {
    app.post('/api/search', async (req, res) => {
        try {
            const requestBody = req.body;
            const hxApi = req.query.hxApi || 'hx';
            const envConfig = getEnvConfig(getEnvFromRequest(req));

            if (!requestBody || typeof requestBody !== 'object' || Object.keys(requestBody).length === 0) {
                return res.status(400).json({
                    book1: { success: false, error: 'Invalid request body' },
                    huixing: { success: false, error: 'Invalid request body' }
                });
            }

            const huixingBody = transformToHuixingRequest(requestBody);
            const hxUrl = getHuixingUrl(envConfig, hxApi);

            const axiosConfig = {
                timeout: API_TIMEOUT,
                headers: { 'Content-Type': 'application/json' }
            };

            const results = await Promise.allSettled([
                httpClient.post(envConfig.book1, requestBody, axiosConfig),
                httpClient.post(hxUrl, huixingBody, axiosConfig)
            ]);

            const response = {
                book1: formatResult(results[0], 'Book1'),
                huixing: formatResult(results[1], '慧行'),
                huixingRequest: huixingBody,
                apmTraceIds: {
                    book1: extractApmTraceId(results[0]),
                    huixing: extractApmTraceId(results[1])
                }
            };

            res.json(response);
        } catch (err) {
            res.status(500).json({
                book1: { success: false, error: `Server error: ${err.message}` },
                huixing: { success: false, error: `Server error: ${err.message}` }
            });
        }
    });
};

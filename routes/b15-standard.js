const { getGatewayUrl, API_TIMEOUT } = require('../config');

async function postWithRetry(httpClient, url, jsonBody, retries = 2) {
    for (let i = 0; i <= retries; i++) {
        try {
            const result = await httpClient.post(url, jsonBody, {
                timeout: API_TIMEOUT,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            return { result, retryCount: i };
        } catch (err) {
            const status = err.response ? err.response.status : 0;
            // Only retry on 502/503/504
            if (i < retries && (status === 502 || status === 503 || status === 504 || err.code === 'ECONNRESET')) {
                await new Promise(r => setTimeout(r, 1000 * (i + 1)));
                continue;
            }
            throw err;
        }
    }
}

module.exports = function(app, httpClient) {
    app.post('/api/b15-standard/search', async (req, res) => {
        try {
            const { site, plat, queryParams } = req.body;
            const env = req.query.env || 'prod';
            const customDomain = req.query.customDomain || '';
            const baseUrl = getGatewayUrl(env, customDomain);
            const s = site || 'connectgateway';
            const p = plat || '852';

            if (!queryParams || typeof queryParams !== 'object') {
                return res.status(400).json({ success: false, error: '缺少 queryParams (文本框中的JSON参数)' });
            }

            const url = `${baseUrl}/${s}/interline/structured/searchcabins/${p}`;
            const jsonBody = JSON.stringify(queryParams);

            const { result, retryCount } = await postWithRetry(httpClient, url, jsonBody);

            const apmTraceId = (result.headers || {})['apm-traceid'] || (result.headers || {})['apmtraceid'] || (result.headers || {})['ApmTraceId'] || '';
            const extra = retryCount > 0 ? { retried: retryCount } : {};
            res.json({ success: true, data: result.data, apmTraceId, requestUrl: url, requestParams: queryParams, ...extra });
        } catch (err) {
            const status = err.response ? err.response.status : 0;
            const responseData = err.response ? err.response.data : null;
            let errorMessage = 'Book1.5 标准版 API 调用失败';
            if (err.code === 'ECONNABORTED') {
                errorMessage = 'Book1.5 标准版 API 超时（请重试）';
            } else if (status) {
                errorMessage = `Book1.5 标准版 API 返回错误: HTTP ${status}`;
            } else if (err.message) {
                errorMessage = `Book1.5 标准版 API 错误: ${err.message}`;
            }
            const s = req.body.site || 'connectgateway';
            const p = req.body.plat || '852';
            const env = req.query.env || 'prod';
            const customDomain = req.query.customDomain || '';
            const baseUrl = getGatewayUrl(env, customDomain);
            const url = `${baseUrl}/${s}/interline/structured/searchcabins/${p}`;
            res.json({
                success: false,
                error: errorMessage,
                debug: {
                    requestUrl: url,
                    requestParams: req.body.queryParams || null,
                    upstreamStatus: status,
                    upstreamBody: typeof responseData === 'string' ? responseData.substring(0, 500) : responseData,
                    errorCode: err.code || null,
                    errorMessage: err.message || null
                }
            });
        }
    });
};
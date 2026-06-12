const { FARE_RULE_URLS, API_TIMEOUT } = require('../config');

module.exports = function(app, httpClient) {
    // 运价规则详情接口
    app.post('/api/fare-rule/detail', async (req, res) => {
        try {
            const { ruleId } = req.body;
            const env = req.query.env || 'prod';
            const baseUrl = FARE_RULE_URLS[env] || FARE_RULE_URLS.prod;

            if (!ruleId || typeof ruleId !== 'string' || !ruleId.trim()) {
                return res.status(400).json({ success: false, error: '缺少 ruleId 参数' });
            }

            const url = `${baseUrl}/fareruleapi/farerule/detail`;
            const result = await httpClient.post(url, { ruleId: ruleId }, {
                timeout: API_TIMEOUT,
                headers: { 'Content-Type': 'application/json' }
            });

            res.json({ success: true, data: result.data, requestUrl: url });
        } catch (err) {
            let errorMessage = '运价规则详情接口调用失败';
            if (err.code === 'ECONNABORTED') {
                errorMessage = '运价规则详情接口超时';
            } else if (err.response) {
                errorMessage = `运价规则详情接口返回错误: HTTP ${err.response.status}`;
            } else if (err.message) {
                errorMessage = `运价规则详情接口错误: ${err.message}`;
            }
            res.json({ success: false, error: errorMessage });
        }
    });

    // 官网运价规则详情接口
    app.post('/api/fare-rule/official-detail', async (req, res) => {
        try {
            const { ruleId } = req.body;
            const env = req.query.env || 'prod';
            const baseUrl = FARE_RULE_URLS[env] || FARE_RULE_URLS.prod;

            if (!ruleId || typeof ruleId !== 'string' || !ruleId.trim()) {
                return res.status(400).json({ success: false, error: '缺少 ruleId 参数' });
            }

            const url = `${baseUrl}/fareruleapi/interfaceresourceconfig/config`;
            const result = await httpClient.post(url, { ruleId: ruleId }, {
                timeout: API_TIMEOUT,
                headers: { 'Content-Type': 'application/json' }
            });

            res.json({ success: true, data: result.data, requestUrl: url });
        } catch (err) {
            let errorMessage = '官网运价规则详情接口调用失败';
            if (err.code === 'ECONNABORTED') {
                errorMessage = '官网运价规则详情接口超时';
            } else if (err.response) {
                errorMessage = `官网运价规则详情接口返回错误: HTTP ${err.response.status}`;
            } else if (err.message) {
                errorMessage = `官网运价规则详情接口错误: ${err.message}`;
            }
            res.json({ success: false, error: errorMessage });
        }
    });
};

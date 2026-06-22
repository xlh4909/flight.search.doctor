const { getSnapshotUrl, API_TIMEOUT } = require('../config');

module.exports = function(app, httpClient) {
    // 获取快照生成时间
    app.post('/api/snapshot/generateTime', async (req, res) => {
        try {
            const { tag, site } = req.body;
            const env = req.query.env || 'prod';
            const baseUrl = getSnapshotUrl(env);
            const s = site || 'wechatcore';

            if (!tag || typeof tag !== 'string') {
                return res.status(400).json({ success: false, error: '缺少 Tag 参数' });
            }

            const url = `${baseUrl}/${s}/slim/SearchSnapshotGenerateTime`;
            const result = await httpClient.post(url, { Tag: tag }, {
                timeout: API_TIMEOUT,
                headers: { 'Content-Type': 'application/json' }
            });

            res.json({ success: true, data: result.data, requestUrl: url });
        } catch (err) {
            let errorMessage = '快照生成时间接口调用失败';
            if (err.code === 'ECONNABORTED') {
                errorMessage = '快照生成时间接口超时';
            } else if (err.response) {
                errorMessage = `快照生成时间接口返回错误: HTTP ${err.response.status}`;
            } else if (err.message) {
                errorMessage = `快照生成时间接口错误: ${err.message}`;
            }
            res.json({ success: false, error: errorMessage });
        }
    });

    // 获取快照详情
    app.post('/api/snapshot/detail', async (req, res) => {
        try {
            const { tag, site } = req.body;
            const env = req.query.env || 'prod';
            const baseUrl = getSnapshotUrl(env);
            const s = site || 'wechatcore';

            if (!tag || typeof tag !== 'string') {
                return res.status(400).json({ success: false, error: '缺少 Tag 参数' });
            }

            const url = `${baseUrl}/${s}/slim/snapshot`;
            const result = await httpClient.post(url, { Tag: tag }, {
                timeout: API_TIMEOUT,
                headers: { 'Content-Type': 'application/json' }
            });

            res.json({ success: true, data: result.data, requestUrl: url });
        } catch (err) {
            let errorMessage = '快照详情接口调用失败';
            if (err.code === 'ECONNABORTED') {
                errorMessage = '快照详情接口超时';
            } else if (err.response) {
                errorMessage = `快照详情接口返回错误: HTTP ${err.response.status}`;
            } else if (err.message) {
                errorMessage = `快照详情接口错误: ${err.message}`;
            }
            res.json({ success: false, error: errorMessage });
        }
    });

    // 解析 Tag 内容（还原快照查询参数）
    app.post('/api/snapshot/replay', async (req, res) => {
        try {
            const { tag, site } = req.body;
            const env = req.query.env || 'prod';
            const baseUrl = getSnapshotUrl(env);
            const s = site || 'wechatcore';

            if (!tag || typeof tag !== 'string') {
                return res.status(400).json({ success: false, error: '缺少 Tag 参数' });
            }

            const url = `${baseUrl}/${s}/function/cabinsnapshotreplay`;
            const result = await httpClient.post(url, { Tag: tag }, {
                timeout: API_TIMEOUT,
                headers: { 'Content-Type': 'application/json' }
            });

            res.json({ success: true, data: result.data, requestUrl: url });
        } catch (err) {
            let errorMessage = 'Tag 解析接口调用失败';
            if (err.code === 'ECONNABORTED') {
                errorMessage = 'Tag 解析接口超时';
            } else if (err.response) {
                errorMessage = `Tag 解析接口返回错误: HTTP ${err.response.status}`;
            } else if (err.message) {
                errorMessage = `Tag 解析接口错误: ${err.message}`;
            }
            res.json({ success: false, error: errorMessage });
        }
    });
};

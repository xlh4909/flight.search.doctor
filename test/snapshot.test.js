import { describe, it, expect, vi, beforeEach } from 'vitest';
import supertest from 'supertest';

const { createApp } = require('../server');

function makeRequest(app, method, url, body = null) {
    const req = supertest(app)[method](url);
    if (body) req.send(body).set('Content-Type', 'application/json');
    return req;
}

describe('Snapshot Replay API', () => {
    let mockHttpClient;
    let app;

    beforeEach(() => {
        mockHttpClient = { post: vi.fn() };
        app = createApp(mockHttpClient);
    });

    describe('POST /api/snapshot/replay', () => {
        it('should return replay data on success', async () => {
            const mockData = {
                Success: true,
                SnapshotParametereModel: { FlightId: 'CnGJgvE2LqMujz6duJU3a6', From: 'FOC', To: 'PKX' },
                CabinData: { ValueKind: 1 }
            };
            mockHttpClient.post.mockResolvedValue({ data: mockData, headers: {} });

            const res = await makeRequest(app, 'post', '/api/snapshot/replay', { tag: 'aZqeLogp5Ymz3W6pG1eEUNLbxQA' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toEqual(mockData);
            expect(res.body.requestUrl).toContain('/function/cabinsnapshotreplay');
            expect(mockHttpClient.post).toHaveBeenCalledTimes(1);

            const [url, body] = mockHttpClient.post.mock.calls[0];
            expect(url).toContain('search.fly.17usoft.com');
            expect(url).toContain('/wechatcore/function/cabinsnapshotreplay');
            expect(body).toEqual({ Tag: 'aZqeLogp5Ymz3W6pG1eEUNLbxQA' });
        });

        it('should default site to wechatcore when not provided', async () => {
            mockHttpClient.post.mockResolvedValue({ data: { Success: true }, headers: {} });

            await makeRequest(app, 'post', '/api/snapshot/replay', { tag: 'someTag' });

            const [url] = mockHttpClient.post.mock.calls[0];
            expect(url).toContain('/wechatcore/function/cabinsnapshotreplay');
        });

        it('should respect site=app in url path', async () => {
            mockHttpClient.post.mockResolvedValue({ data: { Success: true }, headers: {} });

            await makeRequest(app, 'post', '/api/snapshot/replay', { tag: 'someTag', site: 'app' });

            const [url] = mockHttpClient.post.mock.calls[0];
            expect(url).toContain('/app/function/cabinsnapshotreplay');
        });

        it('should switch env via query string', async () => {
            mockHttpClient.post.mockResolvedValue({ data: { Success: true }, headers: {} });

            await makeRequest(app, 'post', '/api/snapshot/replay?env=qa', { tag: 'someTag' });

            const [url] = mockHttpClient.post.mock.calls[0];
            expect(url).toContain('search.qa.fly.17usoft.com');
        });

        it('should return 400 when tag is missing', async () => {
            const res = await makeRequest(app, 'post', '/api/snapshot/replay', {});

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toContain('Tag');
            expect(mockHttpClient.post).not.toHaveBeenCalled();
        });

        it('should return 400 when tag is empty string', async () => {
            const res = await makeRequest(app, 'post', '/api/snapshot/replay', { tag: '' });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(mockHttpClient.post).not.toHaveBeenCalled();
        });

        it('should return failure on timeout', async () => {
            const timeoutErr = new Error('timeout');
            timeoutErr.code = 'ECONNABORTED';
            mockHttpClient.post.mockRejectedValue(timeoutErr);

            const res = await makeRequest(app, 'post', '/api/snapshot/replay', { tag: 'someTag' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toContain('超时');
        });

        it('should return failure on HTTP error from upstream', async () => {
            const httpErr = new Error('bad request');
            httpErr.response = { status: 500 };
            mockHttpClient.post.mockRejectedValue(httpErr);

            const res = await makeRequest(app, 'post', '/api/snapshot/replay', { tag: 'someTag' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toContain('HTTP 500');
        });

        it('should return failure on generic error', async () => {
            mockHttpClient.post.mockRejectedValue(new Error('connection reset'));

            const res = await makeRequest(app, 'post', '/api/snapshot/replay', { tag: 'someTag' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toContain('connection reset');
        });
    });
});

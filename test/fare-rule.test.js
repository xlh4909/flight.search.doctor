import { describe, it, expect, vi, beforeEach } from 'vitest';
import supertest from 'supertest';

const { createApp } = require('../server');

function makeRequest(app, method, url, body = null) {
    const req = supertest(app)[method](url);
    if (body) req.send(body).set('Content-Type', 'application/json');
    return req;
}

describe('Fare Rule API', () => {
    let mockHttpClient;
    let app;

    beforeEach(() => {
        mockHttpClient = { post: vi.fn() };
        app = createApp(mockHttpClient);
    });

    describe('POST /api/fare-rule/detail', () => {
        it('should return fare rule detail on success', async () => {
            const mockData = { ruleContent: 'some rule data', ruleId: 'CFR106636' };
            mockHttpClient.post.mockResolvedValue({ data: mockData, headers: {} });

            const res = await makeRequest(app, 'post', '/api/fare-rule/detail', { ruleId: 'CFR106636' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toEqual(mockData);
            expect(res.body.requestUrl).toContain('/fareruleapi/farerule/detail');
            expect(mockHttpClient.post).toHaveBeenCalledTimes(1);

            const [url, body] = mockHttpClient.post.mock.calls[0];
            expect(url).toContain('phoenix.fly.17usoft.com');
            expect(body).toEqual({ ruleId: 'CFR106636' });
        });

        it('should return 400 when ruleId is missing', async () => {
            const res = await makeRequest(app, 'post', '/api/fare-rule/detail', {});

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toContain('ruleId');
            expect(mockHttpClient.post).not.toHaveBeenCalled();
        });

        it('should return 400 when ruleId is empty string', async () => {
            const res = await makeRequest(app, 'post', '/api/fare-rule/detail', { ruleId: '' });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('should return 400 when ruleId is whitespace only', async () => {
            const res = await makeRequest(app, 'post', '/api/fare-rule/detail', { ruleId: '   ' });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('should handle timeout errors', async () => {
            const err = new Error('timeout');
            err.code = 'ECONNABORTED';
            mockHttpClient.post.mockRejectedValue(err);

            const res = await makeRequest(app, 'post', '/api/fare-rule/detail', { ruleId: 'CFR106636' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toContain('超时');
        });

        it('should handle HTTP error responses', async () => {
            mockHttpClient.post.mockRejectedValue({ response: { status: 500 } });

            const res = await makeRequest(app, 'post', '/api/fare-rule/detail', { ruleId: 'CFR106636' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toContain('HTTP 500');
        });

        it('should use correct environment URL for qa', async () => {
            mockHttpClient.post.mockResolvedValue({ data: {}, headers: {} });

            await makeRequest(app, 'post', '/api/fare-rule/detail?env=qa', { ruleId: 'CFR106636' });

            const [url] = mockHttpClient.post.mock.calls[0];
            expect(url).toContain('phoenix.qa.fly.17usoft.com');
        });

        it('should use prod URL for unknown env', async () => {
            mockHttpClient.post.mockResolvedValue({ data: {}, headers: {} });

            await makeRequest(app, 'post', '/api/fare-rule/detail?env=unknown', { ruleId: 'CFR106636' });

            const [url] = mockHttpClient.post.mock.calls[0];
            expect(url).toContain('phoenix.fly.17usoft.com');
            expect(url).not.toContain('phoenix.unknown');
        });
    });

    describe('POST /api/fare-rule/official-detail', () => {
        it('should return official fare rule detail on success', async () => {
            const mockData = { config: 'official rule data', ruleId: 'IFR106636' };
            mockHttpClient.post.mockResolvedValue({ data: mockData, headers: {} });

            const res = await makeRequest(app, 'post', '/api/fare-rule/official-detail', { ruleId: 'IFR106636' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toEqual(mockData);
            expect(res.body.requestUrl).toContain('/fareruleapi/interfaceresourceconfig/config');
            expect(mockHttpClient.post).toHaveBeenCalledTimes(1);

            const [url, body] = mockHttpClient.post.mock.calls[0];
            expect(url).toContain('phoenix.fly.17usoft.com');
            expect(body).toEqual({ ruleId: 'IFR106636' });
        });

        it('should return 400 when ruleId is missing', async () => {
            const res = await makeRequest(app, 'post', '/api/fare-rule/official-detail', {});

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toContain('ruleId');
            expect(mockHttpClient.post).not.toHaveBeenCalled();
        });

        it('should return 400 when ruleId is empty string', async () => {
            const res = await makeRequest(app, 'post', '/api/fare-rule/official-detail', { ruleId: '' });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('should handle timeout errors', async () => {
            const err = new Error('timeout');
            err.code = 'ECONNABORTED';
            mockHttpClient.post.mockRejectedValue(err);

            const res = await makeRequest(app, 'post', '/api/fare-rule/official-detail', { ruleId: 'IFR106636' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toContain('超时');
        });

        it('should handle HTTP error responses', async () => {
            mockHttpClient.post.mockRejectedValue({ response: { status: 503 } });

            const res = await makeRequest(app, 'post', '/api/fare-rule/official-detail', { ruleId: 'IFR106636' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toContain('HTTP 503');
        });

        it('should use correct environment URL for uat', async () => {
            mockHttpClient.post.mockResolvedValue({ data: {}, headers: {} });

            await makeRequest(app, 'post', '/api/fare-rule/official-detail?env=uat', { ruleId: 'IFR106636' });

            const [url] = mockHttpClient.post.mock.calls[0];
            expect(url).toContain('phoenix.uat.fly.17usoft.com');
        });
    });
});

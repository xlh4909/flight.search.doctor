import { describe, it, expect, vi, beforeEach } from 'vitest';
import supertest from 'supertest';

const { createApp } = require('../server');

function makeRequest(app, method, url, body = null) {
    const req = supertest(app)[method](url);
    if (body) req.send(body).set('Content-Type', 'application/json');
    return req;
}

describe('Interline API - searchoneway (假联程)', () => {
    let mockHttpClient;
    let app;

    beforeEach(() => {
        mockHttpClient = { post: vi.fn() };
        app = createApp(mockHttpClient);
    });

    it('should call searchoneway API and return result', async () => {
        const mockData = { success: true, data: { items: [] } };

        mockHttpClient.post.mockImplementation((url, body) => {
            expect(url).toContain('/interline/connect/searchoneway');
            expect(body.departure).toBe('SHA');
            return Promise.resolve({ data: mockData, headers: {} });
        });

        const res = await makeRequest(app, 'post', '/api/interline/searchoneway', {
            departure: 'SHA',
            arrival: 'CTU',
            depDate: '2026-06-17',
            channel: '174',
            psgType: 1,
            userType: '1'
        });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.success).toBe(true);
        expect(mockHttpClient.post).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for empty body', async () => {
        const res = await supertest(app)
            .post('/api/interline/searchoneway')
            .set('Content-Type', 'application/json')
            .send('');

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error).toBe('Invalid request body');
    });

    it('should handle API failure gracefully', async () => {
        mockHttpClient.post.mockRejectedValue(new Error('Connection refused'));

        const res = await makeRequest(app, 'post', '/api/interline/searchoneway', {
            departure: 'SHA'
        });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(false);
        expect(res.body.error).toContain('假联程');
    });

    it('should handle timeout errors with 超时 message', async () => {
        const timeoutError = new Error('timeout');
        timeoutError.code = 'ECONNABORTED';
        mockHttpClient.post.mockRejectedValue(timeoutError);

        const res = await makeRequest(app, 'post', '/api/interline/searchoneway', {
            departure: 'SHA'
        });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(false);
        expect(res.body.error).toContain('假联程');
        expect(res.body.error).toContain('超时');
    });

    it('should handle HTTP error status codes', async () => {
        const httpError = new Error('Bad Request');
        httpError.response = { status: 400 };
        mockHttpClient.post.mockRejectedValue(httpError);

        const res = await makeRequest(app, 'post', '/api/interline/searchoneway', {
            departure: 'SHA'
        });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(false);
        expect(res.body.error).toContain('假联程');
        expect(res.body.error).toContain('HTTP 400');
    });

    it('should use prod URL by default', async () => {
        mockHttpClient.post.mockResolvedValue({ data: {}, headers: {} });

        await makeRequest(app, 'post', '/api/interline/searchoneway', { departure: 'SHA' });

        const callUrl = mockHttpClient.post.mock.calls[0][0];
        expect(callUrl).toBe('http://search.fly.17usoft.com/interline/connect/searchoneway');
    });

    it('should use QA URL when env=qa', async () => {
        mockHttpClient.post.mockResolvedValue({ data: {}, headers: {} });

        const req = supertest(app)
            .post('/api/interline/searchoneway?env=qa')
            .send({ departure: 'SHA' })
            .set('Content-Type', 'application/json');

        await req;

        const callUrl = mockHttpClient.post.mock.calls[0][0];
        expect(callUrl).toBe('http://search.qa.fly.17usoft.com/interline/connect/searchoneway');
    });
});

describe('Interline API - searchconnect (真联程)', () => {
    let mockHttpClient;
    let app;

    beforeEach(() => {
        mockHttpClient = { post: vi.fn() };
        app = createApp(mockHttpClient);
    });

    it('should call searchconnect API and return result', async () => {
        const mockData = { success: true, data: { items: [] } };

        mockHttpClient.post.mockImplementation((url, body) => {
            expect(url).toContain('/interline/connect/searchconnect');
            expect(body.departure).toBe('SYX');
            expect(body.transitPorts).toEqual(['KWE']);
            return Promise.resolve({ data: mockData, headers: {} });
        });

        const res = await makeRequest(app, 'post', '/api/interline/searchconnect', {
            departure: 'SYX',
            arrival: 'TFU',
            depDate: '2026-06-23',
            channel: 174,
            psgType: 1,
            transitPorts: ['KWE'],
            resourceTypes: [1, 2]
        });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(mockHttpClient.post).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for empty body', async () => {
        const res = await supertest(app)
            .post('/api/interline/searchconnect')
            .set('Content-Type', 'application/json')
            .send('');

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it('should handle API failure gracefully', async () => {
        mockHttpClient.post.mockRejectedValue(new Error('Network error'));

        const res = await makeRequest(app, 'post', '/api/interline/searchconnect', {
            departure: 'SYX'
        });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(false);
        expect(res.body.error).toContain('真联程');
    });
});

describe('Interline API - fakeconnect (拼接假联程)', () => {
    let mockHttpClient;
    let app;

    beforeEach(() => {
        mockHttpClient = { post: vi.fn() };
        app = createApp(mockHttpClient);
    });

    it('should call fakeconnect API and return result', async () => {
        const mockData = { success: true, data: { items: [] } };

        mockHttpClient.post.mockImplementation((url) => {
            expect(url).toContain('/interline/connect/fakeconnect');
            return Promise.resolve({ data: mockData, headers: {} });
        });

        const res = await makeRequest(app, 'post', '/api/interline/fakeconnect', {
            departure: 'SHA',
            arrival: 'CTU',
            depDate: '2026-06-17'
        });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(mockHttpClient.post).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for empty body', async () => {
        const res = await supertest(app)
            .post('/api/interline/fakeconnect')
            .set('Content-Type', 'application/json')
            .send('');

        expect(res.status).toBe(400);
    });
});

describe('Interline API - searchtransfer (云上公交)', () => {
    let mockHttpClient;
    let app;

    beforeEach(() => {
        mockHttpClient = { post: vi.fn() };
        app = createApp(mockHttpClient);
    });

    it('should call searchtransfer API and return result', async () => {
        const mockData = { success: true, data: { items: [] } };

        mockHttpClient.post.mockImplementation((url) => {
            expect(url).toContain('/interline/connect/searchtransfer');
            return Promise.resolve({ data: mockData, headers: {} });
        });

        const res = await makeRequest(app, 'post', '/api/interline/searchtransfer', {
            departure: 'SHA',
            arrival: 'CTU',
            depDate: '2026-06-17'
        });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(mockHttpClient.post).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for empty body', async () => {
        const res = await supertest(app)
            .post('/api/interline/searchtransfer')
            .set('Content-Type', 'application/json')
            .send('');

        expect(res.status).toBe(400);
    });
});

describe('Interline API - Environment switching', () => {
    let mockHttpClient;
    let app;

    beforeEach(() => {
        mockHttpClient = { post: vi.fn().mockResolvedValue({ data: {}, headers: {} }) };
        app = createApp(mockHttpClient);
    });

    it('should use UAT URL when env=uat', async () => {
        const req = supertest(app)
            .post('/api/interline/searchoneway?env=uat')
            .send({ departure: 'SHA' })
            .set('Content-Type', 'application/json');

        await req;

        const callUrl = mockHttpClient.post.mock.calls[0][0];
        expect(callUrl).toBe('http://search.uat.fly.17usoft.com/interline/connect/searchoneway');
    });

    it('should use T URL when env=t', async () => {
        const req = supertest(app)
            .post('/api/interline/searchconnect?env=t')
            .send({ departure: 'SHA' })
            .set('Content-Type', 'application/json');

        await req;

        const callUrl = mockHttpClient.post.mock.calls[0][0];
        expect(callUrl).toBe('http://search.t.fly.17usoft.com/interline/connect/searchconnect');
    });

    it('should use local_gateway URL for local_gateway env', async () => {
        const req = supertest(app)
            .post('/api/interline/fakeconnect?env=local_gateway')
            .send({ departure: 'SHA' })
            .set('Content-Type', 'application/json');

        await req;

        const callUrl = mockHttpClient.post.mock.calls[0][0];
        expect(callUrl).toBe('http://localhost:63974/interline/connect/fakeconnect');
    });

    it('should fall back to prod for unknown env', async () => {
        const req = supertest(app)
            .post('/api/interline/searchtransfer?env=nonexistent')
            .send({ departure: 'SHA' })
            .set('Content-Type', 'application/json');

        await req;

        const callUrl = mockHttpClient.post.mock.calls[0][0];
        expect(callUrl).toBe('http://search.fly.17usoft.com/interline/connect/searchtransfer');
    });

    it('should read env from x-env header', async () => {
        const req = supertest(app)
            .post('/api/interline/searchoneway')
            .set('x-env', 'qa')
            .send({ departure: 'SHA' })
            .set('Content-Type', 'application/json');

        await req;

        const callUrl = mockHttpClient.post.mock.calls[0][0];
        expect(callUrl).toBe('http://search.qa.fly.17usoft.com/interline/connect/searchoneway');
    });
});

describe('Interline API - apmTraceId extraction', () => {
    let mockHttpClient;
    let app;

    beforeEach(() => {
        mockHttpClient = { post: vi.fn() };
        app = createApp(mockHttpClient);
    });

    it('should extract apmtraceid from response headers', async () => {
        mockHttpClient.post.mockResolvedValue({
            data: {},
            headers: { 'apmtraceid': 'trace-abc-123' }
        });

        const res = await makeRequest(app, 'post', '/api/interline/searchoneway', { departure: 'SHA' });

        expect(res.status).toBe(200);
        expect(res.body.apmTraceId).toBe('trace-abc-123');
    });

    it('should extract apm-traceid from response headers', async () => {
        mockHttpClient.post.mockResolvedValue({
            data: {},
            headers: { 'apm-traceid': 'trace-hyphen-456' }
        });

        const res = await makeRequest(app, 'post', '/api/interline/searchconnect', { departure: 'SYX' });

        expect(res.status).toBe(200);
        expect(res.body.apmTraceId).toBe('trace-hyphen-456');
    });

    it('should return empty string when no trace header present', async () => {
        mockHttpClient.post.mockResolvedValue({
            data: {},
            headers: {}
        });

        const res = await makeRequest(app, 'post', '/api/interline/fakeconnect', { departure: 'SHA' });

        expect(res.status).toBe(200);
        expect(res.body.apmTraceId).toBe('');
    });
});

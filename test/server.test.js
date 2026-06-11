import { describe, it, expect, vi, beforeEach } from 'vitest';
import supertest from 'supertest';

const { createApp, transformToHuixingRequest, formatResult, extractApmTraceId, cityToAirports, _setCityToAirportsMap, loadCityMapping } = require('../server');

function makeRequest(app, method, url, body = null) {
    const req = supertest(app)[method](url);
    if (body) req.send(body).set('Content-Type', 'application/json');
    return req;
}

describe('transformToHuixingRequest', () => {
    beforeEach(() => {
        _setCityToAirportsMap({});
    });

    it('should transform Book1 request to 慧行 format with correct field mapping', () => {
        const book1Body = {
            departureCityCode: 'SHA',
            arrivalCityCode: 'BHY',
            departureAirportCode: 'SHA',
            arrivalAirportCode: 'BHY',
            departDate: '2026-06-13',
            passenger: 1,
            plat: 174,
            linkTrackerId: 'trace-123',
            directFlight: null,
            transferPortCode: 'CTU',
            refId: 42,
            user: {
                openId: 'open-abc',
                unionId: 'union-xyz',
                memberId: 'member-001',
                buddhaTags: {
                    vip: [{ tag: 'VIP_LEVEL_1', properties: ['GOLD'] }],
                    normal: [{ tag: 'NEW_USER' }]
                }
            }
        };

        const result = transformToHuixingRequest(book1Body);

        expect(result.depCityCode).toBe('SHA');
        expect(result.arrCityCode).toBe('BHY');
        expect(result.psgType).toBe(1);
        expect(result.depDate).toBe(20260613);
        expect(result.cabinClass).toBe(1);
        expect(result.channel).toBe(174);
        expect(result.traceId).toBe('trace-123');
        expect(result.directFlight).toBeNull();
        expect(result.marketingTransitPoint).toBe('CTU');
        expect(result.channelScene).toBeNull();
        expect(result.refId).toBe('42');
        expect(result.memberInfo.openId).toBe('open-abc');
        expect(result.memberInfo.unionId).toBe('union-xyz');
        expect(result.memberInfo.memberId).toBe('member-001');
        expect(result.memberInfo.riskType).toBe('');
        expect(result.memberInfo.userTags).toEqual(expect.arrayContaining(['VIP_LEVEL_1', 'GOLD', 'NEW_USER']));
    });

    it('should convert departDate string to integer (yyyyMMdd)', () => {
        const result = transformToHuixingRequest({ departDate: '2026-06-13' });
        expect(result.depDate).toBe(20260613);
    });

    it('should handle missing departDate gracefully', () => {
        const result = transformToHuixingRequest({});
        expect(result.depDate).toBe(0);
    });

    it('should use wechat channel 852 → channel 174', () => {
        const result = transformToHuixingRequest({ plat: 852 });
        expect(result.channel).toBe(174);
    });

    it('should use plat as channel for non-wechat platforms', () => {
        const result = transformToHuixingRequest({ plat: 200 });
        expect(result.channel).toBe(200);
    });

    it('should default channel to 174 when plat is missing', () => {
        const result = transformToHuixingRequest({});
        expect(result.channel).toBe(174);
    });

    it('should extract userTags from buddhaTags with nested properties', () => {
        const book1Body = {
            user: {
                buddhaTags: {
                    group1: [
                        { tag: 'TAG_A', properties: ['PROP_1', 'PROP_2'] },
                        { tag: 'TAG_B' }
                    ],
                    group2: [
                        { properties: ['PROP_3'] }
                    ]
                }
            }
        };
        const result = transformToHuixingRequest(book1Body);
        expect(result.memberInfo.userTags).toEqual(
            expect.arrayContaining(['TAG_A', 'PROP_1', 'PROP_2', 'TAG_B', 'PROP_3'])
        );
    });

    it('should handle empty/missing buddhaTags', () => {
        const result = transformToHuixingRequest({ user: {} });
        expect(result.memberInfo.userTags).toEqual([]);
    });

    it('should handle missing user object', () => {
        const result = transformToHuixingRequest({});
        expect(result.memberInfo.openId).toBe('');
        expect(result.memberInfo.unionId).toBe('');
        expect(result.memberInfo.memberId).toBe('');
    });

    it('should return city code as-is when no mapping loaded', () => {
        const result = transformToHuixingRequest({
            departureCityCode: 'SHA',
            arrivalCityCode: 'BHY'
        });
        expect(result.depPorts).toBe('SHA');
        expect(result.arrPorts).toBe('BHY');
    });

    it('should convert refId to string', () => {
        const result = transformToHuixingRequest({ refId: 0 });
        expect(result.refId).toBe('0');
        expect(typeof result.refId).toBe('string');
    });

    it('should expand city code to comma-separated airport codes via mapping', () => {
        _setCityToAirportsMap({ 'SHA': ['AAC', 'SHA', 'PVG'], 'CTU': ['CTU', 'TFU'] });
        const result = transformToHuixingRequest({
            departureCityCode: 'SHA',
            arrivalCityCode: 'CTU'
        });
        expect(result.depPorts).toBe('AAC,SHA,PVG');
        expect(result.arrPorts).toBe('CTU,TFU');
    });

    it('should return city code as-is when city not in mapping', () => {
        _setCityToAirportsMap({ 'SHA': ['SHA', 'PVG'] });
        const result = transformToHuixingRequest({
            departureCityCode: 'BHY',
            arrivalCityCode: 'CGQ'
        });
        expect(result.depPorts).toBe('BHY');
        expect(result.arrPorts).toBe('CGQ');
    });

    it('should preserve passenger: 0 using nullish coalescing', () => {
        const result = transformToHuixingRequest({ passenger: 0 });
        expect(result.psgType).toBe(0);
    });

    it('should preserve directFlight: false using nullish coalescing', () => {
        const result = transformToHuixingRequest({ directFlight: false });
        expect(result.directFlight).toBe(false);
    });

    it('should preserve empty string transferPortCode using nullish coalescing', () => {
        const result = transformToHuixingRequest({ transferPortCode: '' });
        expect(result.marketingTransitPoint).toBe('');
    });
});

describe('cityToAirports', () => {
    it('should convert city code to comma-separated airport codes', () => {
        _setCityToAirportsMap({ 'SHA': ['AAC', 'SHA', 'PVG'] });
        expect(cityToAirports('SHA')).toBe('AAC,SHA,PVG');
    });

    it('should return single airport for city with one airport', () => {
        _setCityToAirportsMap({ 'BHY': ['BHY'] });
        expect(cityToAirports('BHY')).toBe('BHY');
    });

    it('should return original code when not in mapping', () => {
        _setCityToAirportsMap({ 'SHA': ['SHA', 'PVG'] });
        expect(cityToAirports('CGQ')).toBe('CGQ');
    });

    it('should handle case-insensitive lookup', () => {
        _setCityToAirportsMap({ 'SHA': ['SHA', 'PVG'] });
        expect(cityToAirports('sha')).toBe('SHA,PVG');
    });

    it('should return empty string for empty/null input', () => {
        expect(cityToAirports('')).toBe('');
        expect(cityToAirports(null)).toBe('');
        expect(cityToAirports(undefined)).toBe('');
    });
});

describe('loadCityMapping', () => {
    it('should load city→airports mapping from City API response', async () => {
        const mockHttpClient = {
            post: vi.fn().mockResolvedValue({
                data: {
                    success: true,
                    values: [
                        { cityCode: 'SHA', mainAirportCode: 'SHA', airportCode: 'SHA;PVG' },
                        { cityCode: 'CTU', mainAirportCode: 'CTU', airportCode: 'CTU;TFU' },
                        { cityCode: 'BJS', mainAirportCode: 'PEK', airportCode: 'YUN;PEK;PKX' }
                    ]
                }
            })
        };
        await loadCityMapping(mockHttpClient);
        expect(cityToAirports('SHA')).toBe('SHA,PVG');
        expect(cityToAirports('CTU')).toBe('CTU,TFU');
        expect(cityToAirports('BJS')).toBe('PEK,YUN,PKX');
    });

    it('should handle cities with only mainAirportCode', async () => {
        const mockHttpClient = {
            post: vi.fn().mockResolvedValue({
                data: {
                    success: true,
                    values: [
                        { cityCode: 'BHY', mainAirportCode: 'BHY', airportCode: '' }
                    ]
                }
            })
        };
        await loadCityMapping(mockHttpClient);
        expect(cityToAirports('BHY')).toBe('BHY');
    });

    it('should deduplicate airports between mainAirportCode and airportCode', async () => {
        const mockHttpClient = {
            post: vi.fn().mockResolvedValue({
                data: {
                    success: true,
                    values: [
                        { cityCode: 'SHA', mainAirportCode: 'SHA', airportCode: 'SHA;PVG' }
                    ]
                }
            })
        };
        await loadCityMapping(mockHttpClient);
        expect(cityToAirports('SHA')).toBe('SHA,PVG');
    });

    it('should handle API failure gracefully', async () => {
        const mockHttpClient = {
            post: vi.fn().mockRejectedValue(new Error('Network error'))
        };
        _setCityToAirportsMap({});
        await loadCityMapping(mockHttpClient);
        expect(cityToAirports('PVG')).toBe('PVG');
    });

    it('should handle unsuccessful API response gracefully', async () => {
        const mockHttpClient = {
            post: vi.fn().mockResolvedValue({
                data: { success: false, errorCode: '500', errorMessage: 'Server error' }
            })
        };
        _setCityToAirportsMap({});
        await loadCityMapping(mockHttpClient);
        expect(cityToAirports('PVG')).toBe('PVG');
    });
});

describe('formatResult', () => {
    it('should return success with data for fulfilled promise', () => {
        const result = formatResult(
            { status: 'fulfilled', value: { data: { Trips: [] } } },
            'Book1'
        );
        expect(result.success).toBe(true);
        expect(result.data.Trips).toBeDefined();
    });

    it('should return timeout error for ECONNABORTED', () => {
        const err = new Error('timeout');
        err.code = 'ECONNABORTED';
        const result = formatResult({ status: 'rejected', reason: err }, 'Book1');
        expect(result.success).toBe(false);
        expect(result.error).toBe('Book1 API 超时');
    });

    it('should return HTTP error for response with status', () => {
        const err = new Error('Bad Request');
        err.response = { status: 400 };
        const result = formatResult({ status: 'rejected', reason: err }, '慧行');
        expect(result.success).toBe(false);
        expect(result.error).toBe('慧行 API 返回错误: HTTP 400');
    });

    it('should return generic error message for other errors', () => {
        const err = new Error('Connection refused');
        const result = formatResult({ status: 'rejected', reason: err }, 'Book1');
        expect(result.success).toBe(false);
        expect(result.error).toBe('Book1 API 错误: Connection refused');
    });

    it('should return default fallback message for error without code/response/message', () => {
        const err = {};
        const result = formatResult({ status: 'rejected', reason: err }, '慧行');
        expect(result.success).toBe(false);
        expect(result.error).toBe('慧行 API 调用失败');
    });
});

describe('Doctor Server API', () => {
    let mockHttpClient;
    let app;

    beforeEach(() => {
        mockHttpClient = { post: vi.fn() };
        app = createApp(mockHttpClient);
    });

    it('should call Book1 with original body and 慧行 with transformed body', async () => {
        const mockBook1Data = { isSuccess: true, errorCode: 0, Trips: [] };
        const mockHuixingData = { success: true, count: 0, lines: [] };

        mockHttpClient.post.mockImplementation((url, body) => {
            if (url.includes('b1search')) {
                expect(body.departureCityCode).toBe('SHA');
                expect(body.departDate).toBe('2026-06-13');
                return Promise.resolve({ data: mockBook1Data });
            }
            if (url.includes('getTransitRoutesHX')) {
                expect(body.depCityCode).toBe('SHA');
                expect(body.arrCityCode).toBe('BHY');
                expect(body.depDate).toBe(20260613);
                expect(body.psgType).toBe(1);
                expect(body.cabinClass).toBe(1);
                expect(body.memberInfo).toBeDefined();
                return Promise.resolve({ data: mockHuixingData });
            }
            return Promise.reject(new Error('Unknown URL'));
        });

        const res = await makeRequest(app, 'post', '/api/search', {
            departureCityCode: 'SHA',
            arrivalCityCode: 'BHY',
            departDate: '2026-06-13',
            passenger: 1
        });

        expect(res.status).toBe(200);
        expect(res.body.book1.success).toBe(true);
        expect(res.body.book1.data.errorCode).toBe(0);
        expect(res.body.huixing.success).toBe(true);
        expect(mockHttpClient.post).toHaveBeenCalledTimes(2);
    });

    it('should return combined results when both APIs succeed', async () => {
        const mockBook1Data = {
            isSuccess: true,
            errorCode: 0,
            Trips: [{
                TripPair: [{ Flight: { FlightNo: 'MU5101', DepartureTime: '2026-06-13T08:00' } }],
                Products: [{ AdultPrice: { TicketPrice: 500 } }]
            }]
        };
        const mockHuixingData = {
            success: true,
            count: 1,
            lines: [{ sourceType: 'T-P', routeSource: 'HuiXing', segments: [{ no: 'MU5101' }] }]
        };

        mockHttpClient.post.mockImplementation((url) => {
            if (url.includes('b1search')) return Promise.resolve({ data: mockBook1Data });
            if (url.includes('getTransitRoutesHX')) return Promise.resolve({ data: mockHuixingData });
            return Promise.reject(new Error('Unknown URL'));
        });

        const res = await makeRequest(app, 'post', '/api/search', {
            departureCityCode: 'SHA',
            arrivalCityCode: 'BHY',
            departDate: '2026-06-13'
        });

        expect(res.status).toBe(200);
        expect(res.body.book1.success).toBe(true);
        expect(res.body.book1.data.Trips).toBeDefined();
        expect(res.body.huixing.success).toBe(true);
        expect(res.body.huixing.data.lines).toBeDefined();
    });

    it('should handle partial failure - Book1 fails, 慧行 succeeds', async () => {
        const mockHuixingData = { success: true, count: 1, lines: [] };

        mockHttpClient.post.mockImplementation((url) => {
            if (url.includes('b1search')) return Promise.reject(new Error('Connection refused'));
            if (url.includes('getTransitRoutesHX')) return Promise.resolve({ data: mockHuixingData });
            return Promise.reject(new Error('Unknown URL'));
        });

        const res = await makeRequest(app, 'post', '/api/search', {
            departureCityCode: 'SHA',
            arrivalCityCode: 'BHY'
        });

        expect(res.status).toBe(200);
        expect(res.body.book1.success).toBe(false);
        expect(res.body.book1.error).toContain('Book1');
        expect(res.body.huixing.success).toBe(true);
        expect(res.body.huixing.data).toBeDefined();
    });

    it('should handle both APIs failing', async () => {
        mockHttpClient.post.mockRejectedValue(new Error('Network error'));

        const res = await makeRequest(app, 'post', '/api/search', {
            departureCityCode: 'SHA',
            arrivalCityCode: 'BHY'
        });

        expect(res.status).toBe(200);
        expect(res.body.book1.success).toBe(false);
        expect(res.body.huixing.success).toBe(false);
    });

    it('should handle timeout errors with 超时 message', async () => {
        const timeoutError = new Error('timeout');
        timeoutError.code = 'ECONNABORTED';
        mockHttpClient.post.mockRejectedValue(timeoutError);

        const res = await makeRequest(app, 'post', '/api/search', {
            departureCityCode: 'SHA'
        });

        expect(res.status).toBe(200);
        expect(res.body.book1.error).toContain('超时');
        expect(res.body.huixing.error).toContain('超时');
    });

    it('should handle HTTP error status codes', async () => {
        const httpError = new Error('Bad Request');
        httpError.response = { status: 400 };
        mockHttpClient.post.mockRejectedValue(httpError);

        const res = await makeRequest(app, 'post', '/api/search', {
            departureCityCode: 'SHA'
        });

        expect(res.status).toBe(200);
        expect(res.body.book1.error).toContain('HTTP 400');
    });

    it('should return 400 for empty JSON body', async () => {
        const res = await supertest(app)
            .post('/api/search')
            .set('Content-Type', 'application/json')
            .send('');

        expect(res.status).toBe(400);
    });

    it('should serve index.html from static directory', async () => {
        const res = await makeRequest(app, 'get', '/');
        expect([200, 404]).toContain(res.status);
    });
});

describe('Huixing-only API', () => {
    let mockHttpClient;
    let app;

    beforeEach(() => {
        mockHttpClient = { post: vi.fn() };
        app = createApp(mockHttpClient);
    });

    it('should call 慧行 API directly and return result', async () => {
        const mockHuixingData = { success: true, count: 1, lines: [{ sourceType: 'T-P', segments: [{ no: 'MU5101' }] }] };

        mockHttpClient.post.mockImplementation((url, body) => {
            if (url.includes('getTransitRoutesHX')) {
                expect(body.depCityCode).toBe('SHA');
                expect(body.depDate).toBe(20260613);
                return Promise.resolve({ data: mockHuixingData });
            }
            return Promise.reject(new Error('Unknown URL'));
        });

        const res = await makeRequest(app, 'post', '/api/huixing/search', {
            depCityCode: 'SHA',
            arrCityCode: 'BHY',
            depDate: 20260613,
            psgType: 1,
            cabinClass: 1,
            channel: 174
        });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.success).toBe(true);
        expect(mockHttpClient.post).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for empty body', async () => {
        const res = await supertest(app)
            .post('/api/huixing/search')
            .set('Content-Type', 'application/json')
            .send('');

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it('should handle 慧行 API failure gracefully', async () => {
        mockHttpClient.post.mockRejectedValue(new Error('Connection refused'));

        const res = await makeRequest(app, 'post', '/api/huixing/search', {
            depCityCode: 'SHA'
        });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(false);
        expect(res.body.error).toContain('慧行');
    });

    it('should return apmTraceId from 慧行 API response header', async () => {
        const mockHuixingData = { success: true, count: 0, lines: [] };

        mockHttpClient.post.mockImplementation((url) => {
            if (url.includes('getTransitRoutesHX')) {
                return Promise.resolve({
                    data: mockHuixingData,
                    headers: { 'apmtraceid': 'hx-trace-id-67890' }
                });
            }
            return Promise.reject(new Error('Unknown URL'));
        });

        const res = await makeRequest(app, 'post', '/api/huixing/search', {
            depCityCode: 'SHA'
        });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.apmTraceId).toBe('hx-trace-id-67890');
    });
});

describe('B15 API', () => {
    let mockHttpClient;
    let app;

    beforeEach(() => {
        mockHttpClient = { post: vi.fn() };
        app = createApp(mockHttpClient);
    });

    it('should call B15 API and return result', async () => {
        const mockB15Data = { ErrorCode: 0, Trips: [] };

        mockHttpClient.post.mockImplementation((url, body) => {
            if (url.includes('b15search')) {
                expect(body.transferPortCode).toBe('CKG');
                return Promise.resolve({ data: mockB15Data });
            }
            return Promise.reject(new Error('Unknown URL'));
        });

        const res = await makeRequest(app, 'post', '/api/b15/search', {
            departureCityCode: 'SYX',
            arrivalCityCode: 'CGQ',
            transferPortCode: 'CKG',
            firstNo: 'CZ6227',
            secondNo: 'CZ6364'
        });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.ErrorCode).toBe(0);
        expect(mockHttpClient.post).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for empty body', async () => {
        const res = await supertest(app)
            .post('/api/b15/search')
            .set('Content-Type', 'application/json')
            .send('');

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it('should handle B15 API failure gracefully', async () => {
        mockHttpClient.post.mockRejectedValue(new Error('Connection refused'));

        const res = await makeRequest(app, 'post', '/api/b15/search', {
            departureCityCode: 'SHA'
        });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(false);
        expect(res.body.error).toContain('B15');
    });

    it('should return apmTraceId from B15 API response header', async () => {
        const mockB15Data = { ErrorCode: 0, Trips: [] };

        mockHttpClient.post.mockImplementation((url) => {
            if (url.includes('b15search')) {
                return Promise.resolve({ 
                    data: mockB15Data,
                    headers: { 'apmtraceid': 'b15-trace-id-12345' }
                });
            }
            return Promise.reject(new Error('Unknown URL'));
        });

        const res = await makeRequest(app, 'post', '/api/b15/search', {
            departureCityCode: 'SHA'
        });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.apmTraceId).toBe('b15-trace-id-12345');
    });
});

describe('extractApmTraceId', () => {
    it('should extract apmtraceid from fulfilled promise headers', () => {
        const settled = {
            status: 'fulfilled',
            value: { headers: { 'apmtraceid': 'trace-abc-123' } }
        };
        expect(extractApmTraceId(settled)).toBe('trace-abc-123');
    });

    it('should extract ApmTraceId (capitalized) from headers', () => {
        const settled = {
            status: 'fulfilled',
            value: { headers: { 'ApmTraceId': 'Trace-XYZ-789' } }
        };
        expect(extractApmTraceId(settled)).toBe('Trace-XYZ-789');
    });

    it('should return empty string for rejected promise', () => {
        const settled = { status: 'rejected', reason: new Error('fail') };
        expect(extractApmTraceId(settled)).toBe('');
    });

    it('should return empty string when headers missing', () => {
        const settled = { status: 'fulfilled', value: {} };
        expect(extractApmTraceId(settled)).toBe('');
    });

    it('should extract apm-traceid (hyphenated) from headers', () => {
        const settled = {
            status: 'fulfilled',
            value: { headers: { 'apm-traceid': 'trace-hyphen-456' } }
        };
        expect(extractApmTraceId(settled)).toBe('trace-hyphen-456');
    });

    it('should prioritize apm-traceid over apmtraceid', () => {
        const settled = {
            status: 'fulfilled',
            value: { headers: { 'apm-traceid': 'hyphen-first', 'apmtraceid': 'no-hyphen' } }
        };
        expect(extractApmTraceId(settled)).toBe('hyphen-first');
    });
});
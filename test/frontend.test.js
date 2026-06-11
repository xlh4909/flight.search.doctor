import { describe, it, expect } from 'vitest';

const {
    normalizeDate, buildSchemeKey, getConnectPairTypeLabel, getTrafficTypeLabel,
    getSourceTypeLabel, extractBook1Schemes, extractHuixingSchemes, generateB15Json,
    extractRouteServicesLabels, compareRouteServices, computeGlobalLowestPrice
} = require('../public/js/logic');

describe('normalizeDate', () => {
    it('converts yyyyMMdd int', () => expect(normalizeDate(20260613)).toBe('2026-06-13'));
    it('converts yyyyMMdd string', () => expect(normalizeDate('20260613')).toBe('2026-06-13'));
    it('preserves yyyy-MM-dd', () => expect(normalizeDate('2026-06-13')).toBe('2026-06-13'));
    it('extracts date from datetime', () => expect(normalizeDate('2026-06-13 08:00')).toBe('2026-06-13'));
    it('returns empty for null', () => expect(normalizeDate(null)).toBe(''));
    it('returns empty for undefined', () => expect(normalizeDate(undefined)).toBe(''));
});

describe('buildSchemeKey', () => {
    it('builds key from flights and dates', () => {
        expect(buildSchemeKey('MU5101', '2026-06-13', 'MU5102', '2026-06-14'))
            .toBe('MU5101_2026-06-13_MU5102_2026-06-14');
    });
    it('normalizes int dates', () => {
        expect(buildSchemeKey('MU5101', 20260613, 'MU5102', 20260614))
            .toBe('MU5101_2026-06-13_MU5102_2026-06-14');
    });
});

describe('extractBook1Schemes', () => {
    it('returns 4 categories for null', () => {
        const r = extractBook1Schemes(null);
        expect(r).toHaveProperty('空空');
        expect(r).toHaveProperty('空铁');
        expect(r).toHaveProperty('云上公交');
        expect(r).toHaveProperty('通程');
    });

    it('puts FlightPairType=1 Trips into 空空', () => {
        const r = extractBook1Schemes({
            success: true, data: { ErrorCode: 0, Trips: [{
                FlightPairType: 1, ConnectPairType: 1,
                TripPair: [
                    { Flight: { FlightNo: 'CZ6227', DepartureTime: '2026-05-12T07:00' }, DepartureAirport: { AirportCode: 'SYX' }, ArrivalAirport: { AirportCode: 'CKG' } },
                    { Flight: { FlightNo: 'CZ6364', DepartureTime: '2026-05-12T14:00' }, DepartureAirport: { AirportCode: 'CKG' }, ArrivalAirport: { AirportCode: 'CGQ' } }
                ],
                Products: [{ AdultPrice: { TicketPrice: 500 } }],
                RouteServices: [{ groupTitle: '行李直挂', services: [{ serviceName: '行李直挂服务' }] }]
            }], TripsPlusTrain: [], TransferTrips: [] }
        });
        expect(r['空空'].length).toBe(1);
        expect(r['空空'][0].category).toBe('空空');
        expect(r['空空'][0].type).toBe('空空');
        expect(r['空空'][0].lowestPrice).toBe(500);
        expect(r['空空'][0].seg1DepPort).toBe('SYX');
        expect(r['空空'][0].seg1ArrPort).toBe('CKG');
        expect(r['空空'][0].seg2DepPort).toBe('CKG');
        expect(r['空空'][0].seg2ArrPort).toBe('CGQ');
        expect(r['空空'][0].transferPort).toBe('CKG');
        expect(r['空空'][0].routeServices).toContain('行李直挂');
        expect(r['空空'][0].routeServices).toContain('行李直挂服务');
        expect(r['通程'].length).toBe(0);
    });

    it('extracts airport codes from DepartureAirport/ArrivalAirport on tripPair item', () => {
        const r = extractBook1Schemes({
            success: true, data: { ErrorCode: 0, Trips: [{
                FlightPairType: 1, ConnectPairType: 1,
                TripPair: [
                    { Flight: { FlightNo: 'MU5328', DepartureTime: '2026-06-13T09:00' }, DepartureAirport: { AirportCode: 'CAN', CityCode: 'CAN' }, ArrivalAirport: { AirportCode: 'PVG', CityCode: 'SHA' } },
                    { Flight: { FlightNo: 'MU5161', DepartureTime: '2026-06-13T15:30' }, DepartureAirport: { AirportCode: 'PVG', CityCode: 'SHA' }, ArrivalAirport: { AirportCode: 'PEK', CityCode: 'BJS' } }
                ],
                Products: [{ AdultPrice: { TicketPrice: 800 } }]
            }], TripsPlusTrain: [], TransferTrips: [] }
        });
        expect(r['空空'][0].seg1DepPort).toBe('CAN');
        expect(r['空空'][0].seg1ArrPort).toBe('PVG');
        expect(r['空空'][0].seg2DepPort).toBe('PVG');
        expect(r['空空'][0].seg2ArrPort).toBe('PEK');
        expect(r['空空'][0].transferPort).toBe('PVG');
    });

    it('puts FlightPairType=3 Trips into 通程', () => {
        const r = extractBook1Schemes({
            success: true, data: { ErrorCode: 0, Trips: [{
                FlightPairType: 3, ConnectPairType: 1,
                TripPair: [
                    { Flight: { FlightNo: 'CZ6227', DepartureTime: '2026-05-12T07:00' }, DepartureAirport: { AirportCode: 'SYX' }, ArrivalAirport: { AirportCode: 'CKG' } },
                    { Flight: { FlightNo: 'CZ6364', DepartureTime: '2026-05-12T14:00' }, DepartureAirport: { AirportCode: 'CKG' }, ArrivalAirport: { AirportCode: 'CGQ' } }
                ],
                Products: [{ AdultPrice: { TicketPrice: 600 } }]
            }], TripsPlusTrain: [], TransferTrips: [] }
        });
        expect(r['通程'].length).toBe(1);
        expect(r['通程'][0].category).toBe('通程');
        expect(r['通程'][0].type).toBe('通程');
        expect(r['空空'].length).toBe(0);
    });

    it('extracts TripsPlusTrain into 空铁', () => {
        const r = extractBook1Schemes({
            success: true, data: { ErrorCode: 0, Trips: [],
                TripsPlusTrain: [{
                    FlightTrip: { Flight: { FlightNo: 'MU5101', DepartureTime: '2026-06-13T08:00' }, DepartureAirport: { AirportCode: 'SHA' }, ArrivalAirport: { AirportCode: 'CKG' } },
                    TrainTrip: { TrainNo: 'G1234', FromTime: '2026-06-14T12:00', DepPortCode: 'CKG', ArrPortCode: 'CGQ' },
                    Products: [{ AdultPrice: { TicketPrice: 300 } }]
                }], TransferTrips: [] }
        });
        expect(r['空铁'].length).toBe(1);
        expect(r['空铁'][0].category).toBe('空铁');
    });

    it('extracts TransferTrips into 云上公交', () => {
        const r = extractBook1Schemes({
            success: true, data: { ErrorCode: 0, Trips: [], TripsPlusTrain: [],
                TransferTrips: [{
                    TripItems: [
                        { FlightNo: 'MU5101', DepartureTime: '2026-06-13T08:00', DepartureAirportCode: 'SHA', ArrivalAirportCode: 'CKG' },
                        { FlightNo: 'MU5102', DepartureTime: '2026-06-14T10:00', DepartureAirportCode: 'CKG', ArrivalAirportCode: 'CGQ' }
                    ],
                    Products: [{ AdultPrice: { TicketPrice: 400 } }]
                }]
            }
        });
        expect(r['云上公交'].length).toBe(1);
        expect(r['云上公交'][0].category).toBe('云上公交');
    });
});

describe('extractHuixingSchemes', () => {
    it('returns 4 categories for null', () => {
        const r = extractHuixingSchemes(null);
        expect(r).toHaveProperty('空空');
        expect(r).toHaveProperty('空铁');
        expect(r).toHaveProperty('云上公交');
        expect(r).toHaveProperty('通程');
    });

    it('puts lines with type=1 segments into 空空', () => {
        const r = extractHuixingSchemes({
            success: true, data: { success: true, lines: [{
                sourceType: 'T-P', cabinType: 'ECONOMIC',
                segments: [{ no: 'CZ6227', depDate: 20260512, depPort: 'SYX', arrPort: 'CKG', type: 1 }, { no: 'CZ6364', depDate: 20260512, depPort: 'CKG', arrPort: 'CGQ', type: 1 }],
                routeServices: [{ groupTitle: '中转休息室', services: [{ serviceName: '休息室A' }] }]
            }], aviationRealLines: [], cloudBusLines: [] }
        });
        expect(r['空空'].length).toBe(1);
        expect(r['空空'][0].routeServices).toContain('中转休息室');
    });

    it('puts lines with type=2 segment into 空铁, ignoring type=1000', () => {
        const r = extractHuixingSchemes({
            success: true, data: { success: true, lines: [{
                sourceType: 'T-P', cabinType: 'ECONOMIC',
                segments: [{ no: 'MU5101', depDate: 20260613, depPort: 'SHA', arrPort: 'CKG', type: 1 },
                           { no: 'G1234', depDate: 20260614, depPort: 'CKG', arrPort: 'CGQ', type: 2 },
                           { no: '', depPort: 'CKG', arrPort: 'CKG', type: 1000 }]
            }], aviationRealLines: [], cloudBusLines: [] }
        });
        expect(r['空铁'].length).toBe(1);
        expect(r['空空'].length).toBe(0);
    });

    it('puts aviationRealLines into 通程', () => {
        const r = extractHuixingSchemes({
            success: true, data: { success: true, lines: [],
                aviationRealLines: [{
                    sourceType: 'T-C', cabinType: 'ECONOMIC',
                    segments: [{ no: 'CZ6227', depDate: 20260512, depPort: 'SYX', arrPort: 'CKG', type: 1 }, { no: 'CZ6364', depDate: 20260512, depPort: 'CKG', arrPort: 'CGQ', type: 1 }]
                }], cloudBusLines: [] }
        });
        expect(r['通程'].length).toBe(1);
        expect(r['通程'][0].category).toBe('通程');
    });

    it('puts cloudBusLines into 云上公交', () => {
        const r = extractHuixingSchemes({
            success: true, data: { success: true, lines: [], aviationRealLines: [],
                cloudBusLines: [{
                    sourceType: 'T-Y', cabinType: 'ECONOMIC',
                    segments: [{ no: 'MU5101', depDate: 20260613, depPort: 'SHA', arrPort: 'CKG', type: 1 }, { no: 'MU5102', depDate: 20260614, depPort: 'CKG', arrPort: 'CGQ', type: 1 }]
                }] }
        });
        expect(r['云上公交'].length).toBe(1);
    });

    it('merges duplicate keys with different cabinType', () => {
        const r = extractHuixingSchemes({
            success: true, data: { success: true,
                lines: [
                    { sourceType: 'T-P', cabinType: 'ECONOMIC', segments: [{ no: 'CZ6227', depDate: 20260512, depPort: 'SYX', arrPort: 'CKG', type: 1 }, { no: 'CZ6364', depDate: 20260512, depPort: 'CKG', arrPort: 'CGQ', type: 1 }],
                      routeServices: [{ groupTitle: '行李直挂', services: [{ serviceName: '行李直挂服务' }] }] },
                    { sourceType: 'T-P', cabinType: 'SUPERIOR', segments: [{ no: 'CZ6227', depDate: 20260512, depPort: 'SYX', arrPort: 'CKG', type: 1 }, { no: 'CZ6364', depDate: 20260512, depPort: 'CKG', arrPort: 'CGQ', type: 1 }],
                      routeServices: [{ groupTitle: 'VIP休息室', services: [{ serviceName: 'VIP服务' }] }] }
                ], aviationRealLines: [], cloudBusLines: [] }
        });
        expect(r['空空'].length).toBe(1);
        expect(r['空空'][0].cabinType).toBe('ECONOMIC/SUPERIOR');
        expect(r['空空'][0].routeServicesDiff.length).toBe(1);
        expect(r['空空'][0].routeServicesDiff[0].cabinType).toBe('SUPERIOR');
    });

    it('no diff when same services across cabinTypes', () => {
        const r = extractHuixingSchemes({
            success: true, data: { success: true,
                lines: [
                    { sourceType: 'T-P', cabinType: 'ECONOMIC', segments: [{ no: 'CZ6227', depDate: 20260512, depPort: 'SYX', arrPort: 'CKG', type: 1 }, { no: 'CZ6364', depDate: 20260512, depPort: 'CKG', arrPort: 'CGQ', type: 1 }],
                      routeServices: [{ groupTitle: '行李直挂', services: [{ serviceName: '行李直挂服务' }] }] },
                    { sourceType: 'T-P', cabinType: 'SUPERIOR', segments: [{ no: 'CZ6227', depDate: 20260512, depPort: 'SYX', arrPort: 'CKG', type: 1 }, { no: 'CZ6364', depDate: 20260512, depPort: 'CKG', arrPort: 'CGQ', type: 1 }],
                      routeServices: [{ groupTitle: '行李直挂', services: [{ serviceName: '行李直挂服务' }] }] }
                ], aviationRealLines: [], cloudBusLines: [] }
        });
        expect(r['空空'][0].routeServicesDiff.length).toBe(0);
    });
});

describe('compareRouteServices', () => {
    it('returns match=true when both empty', () => {
        expect(compareRouteServices([], []).match).toBe(true);
    });
    it('returns match=true when same services', () => {
        expect(compareRouteServices(['行李直挂', '休息室'], ['行李直挂', '休息室']).match).toBe(true);
    });
    it('returns match=false with onlyInB1 and onlyInHx', () => {
        const r = compareRouteServices(['行李直挂', '休息室A'], ['行李直挂', '休息室B']);
        expect(r.match).toBe(false);
        expect(r.onlyInB1).toContain('休息室a');
        expect(r.onlyInHx).toContain('休息室b');
    });
});

describe('computeGlobalLowestPrice', () => {
    it('returns null when no schemes', () => {
        const r = computeGlobalLowestPrice({ '空空': [], '空铁': [], '云上公交': [], '通程': [] });
        expect(r.lowestPrice).toBeNull();
    });
    it('returns lowest price with category', () => {
        const r = computeGlobalLowestPrice({
            '空空': [{ key: 'a', lowestPrice: 500 }],
            '空铁': [{ key: 'b', lowestPrice: 300 }],
            '云上公交': [], '通程': []
        });
        expect(r.lowestPrice).toBe(300);
        expect(r.lowestCategory).toBe('空铁');
    });
});

describe('generateB15Json', () => {
    it('returns null for non-空空', () => {
        expect(generateB15Json({ type: '空铁' }, { departDate: '2026-06-13' })).toBeNull();
    });
    it('returns null for null request', () => {
        expect(generateB15Json({ type: '空空' }, null)).toBeNull();
    });
    it('generates B15 params matching protocol', () => {
        const scheme = { type: '空空', seg1No: 'CZ6227', seg2No: 'CZ6364', seg2Date: '2026-05-12', transferPort: 'CKG', seg1DepPort: 'SYX', seg2ArrPort: 'CGQ' };
        const req = { departureCityCode: 'SYX', arrivalCityCode: 'CGQ', departDate: '2026-05-12', passenger: 1, plat: 852 };
        const result = generateB15Json(scheme, req);
        expect(result.transferPortCode).toBe('CKG');
        expect(result.firstNo).toBe('CZ6227');
        expect(result.secondNo).toBe('CZ6364');
        expect(result.secondDepartDate).toBe('2026-05-12');
        expect(result.tickets).toBe(0);
        expect(result.optionalFunctions).toEqual([2, 4]);
        expect(result.flow).toBe(0);
        expect(result.version).toBe(3);
        expect(result.productSystem).toBe(2);
        expect(result.downGrade).toBe(0);
        expect(result.TripType).toBe(1);
        expect(result.firstDepartDate).toBeUndefined();
    });
    it('uses scheme seg1DepPort/seg2ArrPort for airport codes, not originalRequest', () => {
        const scheme = { type: '空空', seg1No: 'CZ6227', seg2No: 'CZ6364', seg2Date: '2026-05-12', transferPort: 'CKG', seg1DepPort: 'SYX', seg2ArrPort: 'CGQ' };
        const req = { departureCityCode: 'SHA', arrivalCityCode: 'CGQ', departureAirportCode: 'PVG', arrivalAirportCode: 'CGQ-AIR', departDate: '2026-05-12', passenger: 1, plat: 174 };
        const result = generateB15Json(scheme, req);
        expect(result.departureAirportCode).toBe('SYX');
        expect(result.arrivalAirportCode).toBe('CGQ');
        expect(result.departureCityCode).toBe('SHA');
        expect(result.arrivalCityCode).toBe('CGQ');
    });
});

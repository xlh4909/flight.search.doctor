function normalizeDate(dateInput) {
    if (dateInput === null || dateInput === undefined) return '';
    if (typeof dateInput === 'number') {
        const s = String(dateInput);
        if (s.length === 8) return s.slice(0,4) + '-' + s.slice(4,6) + '-' + s.slice(6,8);
        return s;
    }
    const s = String(dateInput);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
    if (/^\d{8}$/.test(s)) return s.slice(0,4) + '-' + s.slice(4,6) + '-' + s.slice(6,8);
    if (s.includes(' ')) return s.split(' ')[0].substring(0, 10);
    return s.substring(0, 10);
}

function buildSchemeKey(seg1No, seg1Date, seg2No, seg2Date) {
    return (seg1No || '') + '_' + normalizeDate(seg1Date) + '_' + (seg2No || '') + '_' + normalizeDate(seg2Date);
}

function normalizeDateCompact(dateInput) {
    var d = normalizeDate(dateInput);
    return d.replace(/-/g, '');
}

function buildSchemeId(seg1No, seg1Date, seg2No, seg2Date) {
    return (seg1No || '') + '-' + (seg2No || '') + '-' + normalizeDateCompact(seg1Date) + '-' + normalizeDateCompact(seg2Date);
}

var CONNECT_PAIR_TYPE_LABELS = { 0: '未知', 1: '空空', 2: '空铁', 3: '铁空' };
function getConnectPairTypeLabel(type) {
    var num = typeof type === 'number' ? type : parseInt(type, 10);
    return CONNECT_PAIR_TYPE_LABELS[num] || CONNECT_PAIR_TYPE_LABELS[0];
}

function getTrafficTypeLabel(type) {
    if (type === 1) return '航班';
    if (type === 2) return '火车';
    if (type === 1000) return '城市交通';
    return type;
}

var SOURCE_TYPE_LABELS = {
    'T-O': '假联程', 'T-C': '官网真联程', 'T-P': '政策真联程', 'T-T': '通程',
    'T-Y': '云上公交', 'T-G': '拼接假联程'
};
function getSourceTypeLabel(code) { return SOURCE_TYPE_LABELS[code] || code; }

// ConnectProperty bit flags: 1=Oneway(假联程), 2=Official(官网真联程), 4=Policy(政策真联程),
// 8=Through(通程), 16=Cloud(云上公交), 32=FakeConnect(拼接假联程), 64=OpenJaw(缺口程)
var SOURCE_EXCHANGE_TYPE_MAP = [
    { bit: 1, code: 'T-O', label: '假联程' },
    { bit: 2, code: 'T-C', label: '官网真联程' },
    { bit: 4, code: 'T-P', label: '政策真联程' },
    { bit: 8, code: 'T-T', label: '通程' },
    { bit: 16, code: 'T-Y', label: '云上公交' },
    { bit: 32, code: 'T-G', label: '拼接假联程' },
    { bit: 64, code: 'OpenJaw', label: '缺口程' }
];

function decodeSourceExchangeTypes(value) {
    if (value === null || value === undefined) return [];
    // String array format: ["T-O","T-G","T-C","T-P","T-T"]
    if (Array.isArray(value)) {
        return value.map(function(code) {
            var label = SOURCE_TYPE_LABELS[code] || code;
            return { code: code, label: label };
        });
    }
    // Bit flags format: number
    if (value === 0) return [];
    var num = typeof value === 'number' ? value : parseInt(value, 10);
    if (isNaN(num) || num === 0) return [];
    var result = [];
    SOURCE_EXCHANGE_TYPE_MAP.forEach(function(item) {
        if (num & item.bit) {
            result.push({ code: item.code, label: item.label, bit: item.bit });
        }
    });
    return result;
}

function extractRouteServicesLabels(routeServices) {
    if (!routeServices || !Array.isArray(routeServices)) return [];
    var labels = [];
    routeServices.forEach(function(group) {
        if (group.groupTitle) labels.push(group.groupTitle);
        if (group.services && Array.isArray(group.services)) {
            group.services.forEach(function(s) {
                if (s.serviceName) labels.push(s.serviceName);
            });
        }
    });
    return labels;
}

function extractBook1Schemes(book1Data) {
    if (!book1Data || !book1Data.success) return { '空空': [], '空铁': [], '云上公交': [], '通程': [] };
    var data = book1Data.data || {};
    if (data.ErrorCode !== undefined && data.ErrorCode !== 0) return { '空空': [], '空铁': [], '云上公交': [], '通程': [] };
    var result = { '空空': [], '空铁': [], '云上公交': [], '通程': [] };

    (data.Trips || []).forEach(function(trip) {
        var tripPair = trip.TripPair || [];
        if (tripPair.length < 2) return;
        var seg1Flight = tripPair[0].Flight || {};
        var seg2Flight = tripPair[1].Flight || {};
        var seg1DepAp = tripPair[0].DepartureAirport || {};
        var seg1ArrAp = tripPair[0].ArrivalAirport || {};
        var seg2DepAp = tripPair[1].DepartureAirport || {};
        var seg2ArrAp = tripPair[1].ArrivalAirport || {};
        var seg1No = seg1Flight.FlightNo || '';
        var seg2No = seg2Flight.FlightNo || '';
        var seg1Date = normalizeDate(seg1Flight.DepartureTime || '');
        var seg2Date = normalizeDate(seg2Flight.DepartureTime || '');
        var schemeKey = buildSchemeKey(seg1No, seg1Flight.DepartureTime, seg2No, seg2Flight.DepartureTime);
        var schemeId = buildSchemeId(seg1No, seg1Flight.DepartureTime, seg2No, seg2Flight.DepartureTime);

        var lowestPrice = null;
        (trip.Products || []).forEach(function(p) {
            var price = (p.AdultPrice && p.AdultPrice.TicketPrice !== undefined) ? p.AdultPrice.TicketPrice : (p.AdultPrice && p.AdultPrice.PreciseTicketPrice);
            if (price !== undefined && price !== null) {
                if (lowestPrice === null || price < lowestPrice) lowestPrice = price;
            }
        });

        var flightPairType = (trip.TripProperty || {}).FlightPairType || trip.FlightPairType || trip.ConnectPairType || 0;
        var includeResource = (trip.TripProperty || {}).IncludeResource;
        var category = flightPairType === 3 ? '通程' : '空空';

        result[category].push({
            key: schemeKey, id: schemeId, category: category,
            type: flightPairType === 3 ? '通程' : getConnectPairTypeLabel(trip.ConnectPairType),
            connectPairType: trip.ConnectPairType || '',
            flightPairType: flightPairType,
            includeResource: includeResource,
            seg1No: seg1No, seg2No: seg2No, seg1Date: seg1Date, seg2Date: seg2Date,
            seg1DepPort: seg1DepAp.AirportCode || '',
            seg1ArrPort: seg1ArrAp.AirportCode || '',
            seg2DepPort: seg2DepAp.AirportCode || '',
            seg2ArrPort: seg2ArrAp.AirportCode || '',
            seg1DepTime: seg1Flight.DepartureTime || '', seg1ArrTime: seg1Flight.ArrivalTime || '',
            seg2DepTime: seg2Flight.DepartureTime || '', seg2ArrTime: seg2Flight.ArrivalTime || '',
            seg1Type: '航班', seg2Type: '航班',
            lowestPrice: lowestPrice, productCount: (trip.Products || []).length,
            routeId: trip.ConnectRouteIdentifier || '',
            transferPort: seg1ArrAp.AirportCode || '',
            routeServices: extractRouteServicesLabels(trip.RouteServices || trip.routeServices)
        });
    });

    (data.TripsPlusTrain || []).forEach(function(trip) {
        var ft = trip.FlightTrip || {};
        var tt = trip.TrainTrip || {};
        var flight = ft.Flight || {};
        var flightNo = flight.FlightNo || '';
        var trainNo = tt.TrainNo || '';
        var flightDate = normalizeDate(flight.DepartureTime || '');
        var trainDate = normalizeDate(tt.FromTime || '');
        var isTrainFlight = trip.ConnectPairType === 3;
        // ID order: 空铁=航班-火车-航班日期-火车日期, 铁空=火车-航班-火车日期-航班日期
        var schemeId = isTrainFlight
            ? buildSchemeId(trainNo, tt.FromTime, flightNo, flight.DepartureTime)
            : buildSchemeId(flightNo, flight.DepartureTime, trainNo, tt.FromTime);
        var schemeKey = isTrainFlight
            ? buildSchemeKey(trainNo, tt.FromTime, flightNo, flight.DepartureTime)
            : buildSchemeKey(flightNo, flight.DepartureTime, trainNo, tt.FromTime);

        var lowestPrice = null;
        (trip.Products || []).forEach(function(p) {
            var price = (p.AdultPrice && p.AdultPrice.TicketPrice !== undefined) ? p.AdultPrice.TicketPrice : (p.AdultPrice && p.AdultPrice.PreciseTicketPrice);
            if (price !== undefined && price !== null) {
                if (lowestPrice === null || price < lowestPrice) lowestPrice = price;
            }
        });

        var seg1DepAp = ft.DepartureAirport || {};
        var seg1ArrAp = ft.ArrivalAirport || {};

        result['空铁'].push({
            key: schemeKey, id: schemeId, category: '空铁',
            type: isTrainFlight ? '铁空' : '空铁',
            connectPairType: trip.ConnectPairType || '',
            flightPairType: 2,
            seg1No: flightNo, seg2No: trainNo, seg1Date: flightDate, seg2Date: trainDate,
            seg1DepPort: seg1DepAp.AirportCode || '',
            seg1ArrPort: seg1ArrAp.AirportCode || '',
            seg2DepPort: tt.DepPortCode || '', seg2ArrPort: tt.ArrPortCode || '',
            seg1DepTime: flight.DepartureTime || '', seg1ArrTime: flight.ArrivalTime || '',
            seg2DepTime: tt.FromTime || '', seg2ArrTime: tt.ToTime || '',
            seg1Type: '航班', seg2Type: '火车',
            lowestPrice: lowestPrice, productCount: (trip.Products || []).length,
            routeId: '', transferPort: '',
            routeServices: extractRouteServicesLabels(trip.RouteServices || trip.routeServices)
        });
    });

    (data.TransferTrips || []).forEach(function(trip) {
        var tripItems = trip.TripItems || [];
        if (tripItems.length < 2) return;
        var seg1 = tripItems[0] || {};
        var seg2 = tripItems[1] || {};
        var seg1No = seg1.FlightNo || seg1.No || '';
        var seg2No = seg2.FlightNo || seg2.No || '';
        var seg1Date = normalizeDate(seg1.DepartureTime || seg1.DepDate || '');
        var seg2Date = normalizeDate(seg2.DepartureTime || seg2.DepDate || '');
        var schemeKey = buildSchemeKey(seg1No, seg1.DepartureTime || seg1.DepDate, seg2No, seg2.DepartureTime || seg2.DepDate);
        var schemeId = buildSchemeId(seg1No, seg1.DepartureTime || seg1.DepDate, seg2No, seg2.DepartureTime || seg2.DepDate);

        var lowestPrice = null;
        (trip.Products || []).forEach(function(p) {
            var price = (p.AdultPrice && p.AdultPrice.TicketPrice !== undefined) ? p.AdultPrice.TicketPrice : (p.AdultPrice && p.AdultPrice.PreciseTicketPrice);
            if (price !== undefined && price !== null) {
                if (lowestPrice === null || price < lowestPrice) lowestPrice = price;
            }
        });

        result['云上公交'].push({
            key: schemeKey, id: schemeId, category: '云上公交',
            type: '云上公交',
            connectPairType: '', flightPairType: 0,
            seg1No: seg1No, seg2No: seg2No, seg1Date: seg1Date, seg2Date: seg2Date,
            seg1DepPort: seg1.DepartureAirportCode || (seg1.DepartureAirport && seg1.DepartureAirport.AirportCode) || seg1.DepPort || '',
            seg1ArrPort: seg1.ArrivalAirportCode || (seg1.ArrivalAirport && seg1.ArrivalAirport.AirportCode) || seg1.ArrPort || '',
            seg2DepPort: seg2.DepartureAirportCode || (seg2.DepartureAirport && seg2.DepartureAirport.AirportCode) || seg2.DepPort || '',
            seg2ArrPort: seg2.ArrivalAirportCode || (seg2.ArrivalAirport && seg2.ArrivalAirport.AirportCode) || seg2.ArrPort || '',
            seg1DepTime: seg1.DepartureTime || '', seg1ArrTime: seg1.ArrivalTime || '',
            seg2DepTime: seg2.DepartureTime || '', seg2ArrTime: seg2.ArrivalTime || '',
            seg1Type: '航班', seg2Type: '航班',
            lowestPrice: lowestPrice, productCount: (trip.Products || []).length,
            routeId: '', transferPort: '',
            routeServices: extractRouteServicesLabels(trip.RouteServices || trip.routeServices)
        });
    });

    return result;
}

function extractHuixingSchemes(hxData) {
    if (!hxData || !hxData.success) return { '空空': [], '空铁': [], '云上公交': [], '通程': [] };
    var data = hxData.data || {};
    if (data.success === false) return { '空空': [], '空铁': [], '云上公交': [], '通程': [] };
    var result = { '空空': [], '空铁': [], '云上公交': [], '通程': [] };

    function addHxLine(line, category) {
        var segments = (line.segments || []).filter(function(s) { return s.type !== 1000; });
        if (segments.length < 2) return;
        var seg1 = segments[0];
        var seg2 = segments[1];
        var seg1No = seg1.no || '';
        var seg2No = seg2.no || '';
        var seg1Date = normalizeDate(seg1.depDate || seg1.depDateTime || '');
        var seg2Date = normalizeDate(seg2.depDate || seg2.depDateTime || '');
        var schemeKey = buildSchemeKey(seg1No, seg1.depDate || seg1.depDateTime, seg2No, seg2.depDate || seg2.depDateTime);
        var schemeId = buildSchemeId(seg1No, seg1.depDate || seg1.depDateTime, seg2No, seg2.depDate || seg2.depDateTime);
        var rsLabels = extractRouteServicesLabels(line.routeServices);
        var cabinType = line.cabinType || '';

        // Parse PORT_DEDUCT subsidies from deductsList
        var portDeducts = [];
        (line.deductsList || []).forEach(function(d) {
            if (d.deductType === 'PORT_DEDUCT') {
                portDeducts.push(d);
            }
        });

        result[category].push({
            key: schemeKey, id: schemeId, category: category,
            sourceType: line.sourceType || '', routeSource: line.routeSource || '',
            cabinType: cabinType,
            seg1No: seg1No, seg2No: seg2No, seg1Date: seg1Date, seg2Date: seg2Date,
            seg1DepPort: seg1.depPort || '', seg1ArrPort: seg1.arrPort || '',
            seg2DepPort: seg2.depPort || '', seg2ArrPort: seg2.arrPort || '',
            seg1DepTime: seg1.depDateTime || '', seg1ArrTime: seg2.arrDateTime || '',
            seg2DepTime: seg2.depDateTime || '', seg2ArrTime: seg2.arrDateTime || '',
            seg1Type: getTrafficTypeLabel(seg1.type), seg2Type: getTrafficTypeLabel(seg2.type),
            isFlightPlusTrain: line.isFlightPlusTrain || false,
            transferPort: seg1.arrPort || '',
            lowestPrice: null,
            routeServices: rsLabels,
            portDeducts: portDeducts,
            _rawLine: line
        });
    }

    // lines: categorize by segment types
    (data.lines || []).forEach(function(line) {
        var segments = (line.segments || []).filter(function(s) { return s.type !== 1000; });
        if (segments.length < 2) return;
        var hasTrain = segments.some(function(s) { return s.type === 2; });
        addHxLine(line, hasTrain ? '空铁' : '空空');
    });

    // aviationRealLines: 通程
    (data.aviationRealLines || []).forEach(function(line) { addHxLine(line, '通程'); });

    // cloudBusLines: 云上公交
    (data.cloudBusLines || []).forEach(function(line) { addHxLine(line, '云上公交'); });

    // Merge duplicate keys with different cabinType
    for (var category in result) {
        var schemes = result[category];
        var merged = {};
        var seen = [];
        schemes.forEach(function(s) {
            if (!merged[s.key]) {
                merged[s.key] = {
                    key: s.key, id: s.id, category: s.category,
                    sourceType: s.sourceType, routeSource: s.routeSource,
                    cabinTypes: [s.cabinType],
                    allRouteServices: [{ cabinType: s.cabinType, services: s.routeServices }],
                    seg1No: s.seg1No, seg2No: s.seg2No, seg1Date: s.seg1Date, seg2Date: s.seg2Date,
                    seg1DepPort: s.seg1DepPort, seg1ArrPort: s.seg1ArrPort,
                    seg2DepPort: s.seg2DepPort, seg2ArrPort: s.seg2ArrPort,
                    seg1DepTime: s.seg1DepTime, seg1ArrTime: s.seg1ArrTime,
                    seg2DepTime: s.seg2DepTime, seg2ArrTime: s.seg2ArrTime,
                    seg1Type: s.seg1Type, seg2Type: s.seg2Type,
                    isFlightPlusTrain: s.isFlightPlusTrain, transferPort: s.transferPort,
                    lowestPrice: s.lowestPrice,
                    routeServices: s.routeServices, routeServicesDiff: [],
                    portDeducts: s.portDeducts || [],
                    _rawLines: [s._rawLine]
                };
                seen.push(merged[s.key]);
            } else {
                merged[s.key].cabinTypes.push(s.cabinType);
                merged[s.key].allRouteServices.push({ cabinType: s.cabinType, services: s.routeServices });
                if (s._rawLine) merged[s.key]._rawLines.push(s._rawLine);
            }
        });
        // Compute service diffs per cabinType
        seen.forEach(function(scheme) {
            if (scheme.allRouteServices.length <= 1) {
                scheme.routeServicesDiff = [];
            } else {
                var base = scheme.allRouteServices[0].services;
                var diffEntries = [];
                scheme.allRouteServices.forEach(function(entry) {
                    var baseSet = new Set(base.map(function(l) { return l.toLowerCase().trim(); }));
                    var entrySet = new Set(entry.services.map(function(l) { return l.toLowerCase().trim(); }));
                    var onlyInEntry = Array.from(entrySet).filter(function(l) { return !baseSet.has(l); });
                    var onlyInBase = Array.from(baseSet).filter(function(l) { return !entrySet.has(l); });
                    if (onlyInEntry.length > 0 || onlyInBase.length > 0) {
                        diffEntries.push({ cabinType: entry.cabinType, onlyInThis: onlyInEntry, missingFromThis: onlyInBase });
                    }
                });
                scheme.routeServicesDiff = diffEntries;
            }
            scheme.routeServices = scheme.allRouteServices[0].services;
            scheme.cabinType = scheme.cabinTypes.join('/');
        });
        result[category] = seen;
    }

    return result;
}

function compareRouteServices(b1Labels, hxLabels) {
    var b1Set = new Set((b1Labels || []).map(function(s) { return s.toLowerCase().trim(); }));
    var hxSet = new Set((hxLabels || []).map(function(s) { return s.toLowerCase().trim(); }));
    if (b1Set.size === 0 && hxSet.size === 0) return { match: true };
    var onlyInB1 = Array.from(b1Set).filter(function(s) { return !hxSet.has(s); });
    var onlyInHx = Array.from(hxSet).filter(function(s) { return !b1Set.has(s); });
    return { match: onlyInB1.length === 0 && onlyInHx.length === 0, onlyInB1: onlyInB1, onlyInHx: onlyInHx };
}

function computeGlobalLowestPrice(categorizedSchemes) {
    var lowestPrice = null;
    var lowestCategory = '';
    var lowestScheme = null;
    ['空空', '通程', '空铁', '云上公交'].forEach(function(category) {
        (categorizedSchemes[category] || []).forEach(function(s) {
            if (s.lowestPrice !== null && (lowestPrice === null || s.lowestPrice < lowestPrice)) {
                lowestPrice = s.lowestPrice;
                lowestCategory = category;
                lowestScheme = s;
            }
        });
    });
    return { lowestPrice: lowestPrice, lowestCategory: lowestCategory, lowestScheme: lowestScheme };
}

function generateB15Json(scheme, originalRequest) {
    if (!originalRequest || scheme.type !== '空空') return null;

    // Build B15 request with ONLY protocol-defined fields
    var req = {
        departureCityCode: originalRequest.departureCityCode || '',
        arrivalCityCode: originalRequest.arrivalCityCode || '',
        departureAirportCode: scheme.seg1DepPort || '',
        arrivalAirportCode: scheme.seg2ArrPort || '',
        departDate: originalRequest.departDate || '',
        passenger: originalRequest.passenger ?? 1,
        entrance: 91,
        plat: originalRequest.plat || 174,
        linkTrackerId: originalRequest.linkTrackerId || '',
        statisticsChannel: originalRequest.statisticsChannel || 0,
        user: originalRequest.user ? JSON.parse(JSON.stringify(originalRequest.user)) : { memberId: '', unionId: '', openId: '', buddhaTags: {} },
        TripType: 1,
        refId: originalRequest.refId || 0,
        transferPortCode: scheme.transferPort || '',
        firstNo: scheme.seg1No || '',
        secondNo: scheme.seg2No || '',
        secondDepartDate: scheme.seg2Date || '',
        includeResource: scheme.includeResource !== undefined && scheme.includeResource !== null ? scheme.includeResource : 47,
        isThrough: 0,
        isCivilAviationThrough: false,
        throughFlightNo: '',
        mailType: 0,
        tickets: 0,
        optionalFunctions: [2, 4],
        flow: 0,
        version: 3,
        productSystem: 2,
        downGrade: 0,
        ABTests: originalRequest.ABTests || [],
        lowestPrice: scheme.lowestPrice || 0
    };

    return req;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        normalizeDate: normalizeDate, buildSchemeKey: buildSchemeKey, buildSchemeId: buildSchemeId, getConnectPairTypeLabel: getConnectPairTypeLabel,
        getTrafficTypeLabel: getTrafficTypeLabel, getSourceTypeLabel: getSourceTypeLabel,
        extractBook1Schemes: extractBook1Schemes, extractHuixingSchemes: extractHuixingSchemes,
        generateB15Json: generateB15Json, extractRouteServicesLabels: extractRouteServicesLabels,
        compareRouteServices: compareRouteServices, computeGlobalLowestPrice: computeGlobalLowestPrice,
        CONNECT_PAIR_TYPE_LABELS: CONNECT_PAIR_TYPE_LABELS, SOURCE_TYPE_LABELS: SOURCE_TYPE_LABELS
    };
}

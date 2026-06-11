const axios = require('axios');
const { CITY_LABRADOR_URL } = require('./config');

let cityToAirportsMap = {};

async function loadCityMapping(httpClient = axios) {
    try {
        const response = await httpClient.post(CITY_LABRADOR_URL, {
            domainKey: 'doctor',
            channelCode: 'doctor',
            specialNeed: false,
            countyLevel: true,
            needExternalData: true
        }, {
            timeout: 10000,
            headers: { 'Content-Type': 'application/json' }
        });

        const data = response.data;
        if (data && data.success && Array.isArray(data.values)) {
            cityToAirportsMap = {};
            data.values.forEach(city => {
                if (!city.cityCode) return;
                const cityKey = city.cityCode.toUpperCase();
                const airports = new Set();
                if (city.mainAirportCode) {
                    airports.add(city.mainAirportCode.toUpperCase());
                }
                if (city.airportCode) {
                    city.airportCode.split(';').forEach(ap => {
                        const trimmed = ap.trim().toUpperCase();
                        if (trimmed) airports.add(trimmed);
                    });
                }
                if (airports.size > 0) {
                    cityToAirportsMap[cityKey] = Array.from(airports);
                }
            });
            console.log(`Loaded ${Object.keys(cityToAirportsMap).length} city→airports mappings`);
        } else {
            console.warn('City API returned unsuccessful response, using fallback (no mapping)');
        }
    } catch (err) {
        console.warn(`Failed to load city mapping: ${err.message}, using fallback (no mapping)`);
    }
}

function cityToAirports(cityCode) {
    if (!cityCode) return '';
    const upper = cityCode.toUpperCase();
    const airports = cityToAirportsMap[upper];
    if (airports && airports.length > 0) {
        return airports.join(',');
    }
    return upper;
}

function transformToHuixingRequest(book1Body) {
    const depDateStr = book1Body.departDate || '';
    const depDateInt = parseInt(depDateStr.replace(/-/g, ''), 10) || 0;

    const userTags = new Set();
    if (book1Body.user && book1Body.user.buddhaTags) {
        const bt = book1Body.user.buddhaTags;
        Object.values(bt).forEach(tagList => {
            if (Array.isArray(tagList)) {
                tagList.forEach(item => {
                    if (item.tag) userTags.add(item.tag);
                    if (item.properties && Array.isArray(item.properties)) {
                        item.properties.forEach(p => userTags.add(p));
                    }
                });
            }
        });
    }

    const isWechat = book1Body.plat === 852;
    const channel = isWechat ? 174 : (book1Body.plat || 174);

    const depCityCode = book1Body.departureCityCode || '';
    const arrCityCode = book1Body.arrivalCityCode || '';

    return {
        depCityCode: depCityCode,
        arrCityCode: arrCityCode,
        depPorts: cityToAirports(depCityCode),
        arrPorts: cityToAirports(arrCityCode),
        psgType: book1Body.passenger ?? 1,
        depDate: depDateInt,
        cabinClass: 1,
        channel: channel,
        traceId: book1Body.linkTrackerId || '',
        memberInfo: {
            riskType: '',
            userTags: Array.from(userTags),
            openId: (book1Body.user && book1Body.user.openId) || '',
            unionId: (book1Body.user && book1Body.user.unionId) || '',
            memberId: (book1Body.user && book1Body.user.memberId) || ''
        },
        directFlight: book1Body.directFlight ?? null,
        directLowestFlightNo: book1Body.directLowestFlightNo === null ? '' : (book1Body.directLowestFlightNo || ''),
        marketingTransitPoint: book1Body.transferPortCode ?? null,
        channelScene: null,
        refId: String(book1Body.refId || 0)
    };
}

function extractApmTraceId(settledResult) {
    if (settledResult.status === 'fulfilled') {
        const headers = settledResult.value.headers || {};
        return headers['apm-traceid'] || headers['apmtraceid'] || headers['ApmTraceId'] || headers['apmtraceId'] || '';
    }
    return '';
}

function formatResult(settledResult, label) {
    if (settledResult.status === 'fulfilled') {
        return { success: true, data: settledResult.value.data };
    } else {
        const error = settledResult.reason;
        let errorMessage = `${label} API 调用失败`;
        if (error.code === 'ECONNABORTED') {
            errorMessage = `${label} API 超时`;
        } else if (error.response) {
            errorMessage = `${label} API 返回错误: HTTP ${error.response.status}`;
        } else if (error.message) {
            errorMessage = `${label} API 错误: ${error.message}`;
        }
        return { success: false, error: errorMessage };
    }
}

module.exports = {
    loadCityMapping, cityToAirports, cityToAirportsMap,
    transformToHuixingRequest, extractApmTraceId, formatResult,
    _setCityToAirportsMap(map) { cityToAirportsMap = map; }
};

const ENV_CONFIGS = {
    prod: {
        label: '线上',
        book1: 'http://search.fly.17usoft.com/connectengine/connect/b1search',
        b15: 'http://search.fly.17usoft.com/connectengine/connect/b15search',
        huixing: 'http://flightadminapi.17usoft.com/tcFlyTransitTravelSearch/route/getTransitRoutesHX.ws',
        huixingV7: 'http://flightadminapi.17usoft.com/tcFlyTransitTravelSearch/route/getTransitRoutesV7.ws',
        realInterline: 'http://mbpconnect.fly.17usoft.com/connect'
    },
    qa: {
        label: 'QA',
        book1: 'http://search.qa.fly.17usoft.com/connectengine/connect/b1search',
        b15: 'http://search.qa.fly.17usoft.com/connectengine/connect/b15search',
        huixing: 'http://flightadminapi.qa.17usoft.com/tcFlyTransitTravelSearch/route/getTransitRoutesHX.ws',
        huixingV7: 'http://flightadminapi.qa.17usoft.com/tcFlyTransitTravelSearch/route/getTransitRoutesV7.ws',
        realInterline: 'http://mbpconnect.qa.fly.17usoft.com/connect'
    },
    uat: {
        label: 'UAT',
        book1: 'http://search.uat.fly.17usoft.com/connectengine/connect/b1search',
        b15: 'http://search.uat.fly.17usoft.com/connectengine/connect/b15search',
        huixing: 'http://flightadminapi.uat.17usoft.com/tcFlyTransitTravelSearch/route/getTransitRoutesHX.ws',
        huixingV7: 'http://flightadminapi.uat.17usoft.com/tcFlyTransitTravelSearch/route/getTransitRoutesV7.ws',
        realInterline: 'http://mbpconnect.uat.fly.17usoft.com/connect'
    },
    t: {
        label: 'T环境',
        book1: 'http://search.t.fly.17usoft.com/connectengine/connect/b1search',
        b15: 'http://search.t.fly.17usoft.com/connectengine/connect/b15search',
        huixing: 'http://flightadminapi.t.17usoft.com/tcFlyTransitTravelSearch/route/getTransitRoutesHX.ws',
        huixingV7: 'http://flightadminapi.t.17usoft.com/tcFlyTransitTravelSearch/route/getTransitRoutesV7.ws',
        realInterline: 'http://mbpconnect.t.fly.17usoft.com/connect'
    },
    t2: {
        label: 'T2环境',
        book1: 'http://search2.t.fly.17usoft.com/connectengine/connect/b1search',
        b15: 'http://search2.t.fly.17usoft.com/connectengine/connect/b15search',
        huixing: 'http://flightadminapi.t.17usoft.com/tcFlyTransitTravelSearch/route/getTransitRoutesV7.ws',
        huixingV7: 'http://flightadminapi.t.17usoft.com/tcFlyTransitTravelSearch/route/getTransitRoutesV7.ws',
        realInterline: 'http://mbpconnect.t.fly.17usoft.com/connect'
    },
    lane: {
        label: 'Lane环境',
        book1: 'http://search.lane.fly.17usoft.com/connectengine/connect/b1search',
        b15: 'http://search.lane.fly.17usoft.com/connectengine/connect/b15search',
        huixing: 'http://flightadminapi.17usoft.com/tcFlyTransitTravelSearch/route/getTransitRoutesHX.ws',
        huixingV7: 'http://flightadminapi.17usoft.com/tcFlyTransitTravelSearch/route/getTransitRoutesV7.ws',
        realInterline: 'http://mbpconnect.lane.fly.17usoft.com/connect'
    }
};

const DEFAULT_ENV = 'prod';

function getEnvConfig(env) {
    return ENV_CONFIGS[env] || ENV_CONFIGS[DEFAULT_ENV];
}

function getEnvFromRequest(req) {
    return req.query.env || req.headers['x-env'] || DEFAULT_ENV;
}

function getHuixingUrl(envConfig, hxApi) {
    return hxApi === 'v7' ? envConfig.huixingV7 : envConfig.huixing;
}

const API_TIMEOUT = 30000;

const SKYEYE_LOG_URL = 'http://skynetapi.dss.17usoft.com/log/real/list';
const SKYEYE_APP_ID = '3296870';
const SKYEYE_TOKEN = '8949f30b-1e90-4b36-bb87-fc9a1534f8b9';

const PROXY_LOG_APP_IDS = ['3303660', '3296870', '106711', '3295971', '102781'];
const PROXY_LOG_TOKENS = ['e987efa1-aacc-4809-a619-41528ed1781e', '8949f30b-1e90-4b36-bb87-fc9a1534f8b9', '97c08bf9-0133-4889-95d7-18d8922f53a7', 'a9c8dd1c-a77c-40c5-a7e9-b15685361024', '1c0e970a-beeb-4f8b-963d-d300acb4fed8'];

const CITY_LABRADOR_URL = process.env.CITY_LABRADOR_URL || 'http://servicegw.ly.com/gateway/flight.configcore/product/baseresource/findcities/?Labrador-Token=f1ab6520-9380-4013-9869-ec1aef830118&Labrador-Passthrough=true';

const GATEWAY_SITES = ['wechatcore', 'app', 'connectgateway', 'wechat'];
const GATEWAY_PLATS = ['852', '433', '434', '518', '10212'];

const GATEWAY_URLS = {
    prod: 'http://search.fly.17usoft.com',
    qa: 'http://search.qa.fly.17usoft.com',
    uat: 'http://search.uat.fly.17usoft.com',
    t: 'http://search.t.fly.17usoft.com',
    t2: 'http://search2.t.fly.17usoft.com',
    lane: 'http://search.lane.fly.17usoft.com',
    local_gateway: 'http://localhost:63974',
    local_engine: 'http://localhost:57350'
};

const INTERLINE_SEARCH_URLS = {
    prod: 'http://search.fly.17usoft.com',
    qa: 'http://search.qa.fly.17usoft.com',
    uat: 'http://search.uat.fly.17usoft.com',
    t: 'http://search.t.fly.17usoft.com',
    t2: 'http://search2.t.fly.17usoft.com',
    lane: 'http://search.lane.fly.17usoft.com'
};

const LOCAL_ENVS = ['custom', 'local_gateway', 'local_engine'];
const LOCAL_GATEWAY_DEFAULT = 'http://localhost:63974/';
const LOCAL_ENGINE_DEFAULT = 'http://localhost:57350';

const SNAPSHOT_SITES = ['wechatcore', 'app'];

const SNAPSHOT_URLS = {
    prod: 'http://search.fly.17usoft.com',
    qa: 'http://search.qa.fly.17usoft.com',
    uat: 'http://search.uat.fly.17usoft.com',
    t: 'http://search.t.fly.17usoft.com',
    t2: 'http://search2.t.fly.17usoft.com',
    lane: 'http://search.lane.fly.17usoft.com'
};

const FARE_RULE_URLS = {
    prod: 'http://phoenix.fly.17usoft.com',
    qa: 'http://phoenix.qa.fly.17usoft.com',
    uat: 'http://phoenix.uat.fly.17usoft.com',
    t: 'http://phoenix.t.fly.17usoft.com',
    t2: 'http://phoenix.t.fly.17usoft.com',
    lane: 'http://phoenix.lane.fly.17usoft.com'
};

function normalizeCustomDomain(domain) {
    if (!domain) return LOCAL_GATEWAY_DEFAULT.replace(/\/+$/, '');
    var d = domain.trim();
    if (!/^https?:\/\//i.test(d)) d = 'http://' + d;
    return d.replace(/\/+$/, '');
}

function getGatewayUrl(env, customDomain) {
    if (env === 'custom') {
        return normalizeCustomDomain(customDomain || LOCAL_GATEWAY_DEFAULT);
    }
    if (env === 'local_gateway') return LOCAL_GATEWAY_DEFAULT.replace(/\/+$/, '');
    if (env === 'local_engine') return LOCAL_ENGINE_DEFAULT.replace(/\/+$/, '');
    return GATEWAY_URLS[env] || GATEWAY_URLS[DEFAULT_ENV];
}

function getSnapshotUrl(env) {
    if (LOCAL_ENVS.includes(env)) return SNAPSHOT_URLS.qa;
    return SNAPSHOT_URLS[env] || SNAPSHOT_URLS[DEFAULT_ENV];
}

function getFareRuleUrl(env) {
    if (LOCAL_ENVS.includes(env)) return FARE_RULE_URLS.qa;
    return FARE_RULE_URLS[env] || FARE_RULE_URLS[DEFAULT_ENV];
}

function getInterlineSearchUrl(env, customDomain) {
    if (env === 'custom') {
        return normalizeCustomDomain(customDomain || LOCAL_GATEWAY_DEFAULT);
    }
    if (env === 'local_gateway') return LOCAL_GATEWAY_DEFAULT.replace(/\/+$/, '');
    if (env === 'local_engine') return LOCAL_ENGINE_DEFAULT.replace(/\/+$/, '');
    return INTERLINE_SEARCH_URLS[env] || INTERLINE_SEARCH_URLS[DEFAULT_ENV];
}

function getEnvConfigWithFallback(env) {
    if (LOCAL_ENVS.includes(env)) return ENV_CONFIGS.qa;
    return getEnvConfig(env);
}

module.exports = {
    ENV_CONFIGS, DEFAULT_ENV, API_TIMEOUT,
    SKYEYE_LOG_URL, SKYEYE_APP_ID, SKYEYE_TOKEN,
    PROXY_LOG_APP_IDS, PROXY_LOG_TOKENS,
    CITY_LABRADOR_URL,
    GATEWAY_SITES, GATEWAY_PLATS, GATEWAY_URLS,
    SNAPSHOT_SITES, SNAPSHOT_URLS, FARE_RULE_URLS,
    INTERLINE_SEARCH_URLS,
    LOCAL_ENVS, LOCAL_GATEWAY_DEFAULT, LOCAL_ENGINE_DEFAULT,
    getEnvConfig, getEnvFromRequest, getHuixingUrl,
    getGatewayUrl, getSnapshotUrl, getFareRuleUrl, getInterlineSearchUrl, getEnvConfigWithFallback,
    normalizeCustomDomain
};

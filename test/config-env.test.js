import { describe, it, expect } from 'vitest';

const {
    getGatewayUrl, getSnapshotUrl, getFareRuleUrl, getInterlineSearchUrl, getEnvConfigWithFallback,
    normalizeCustomDomain, LOCAL_ENVS, LOCAL_GATEWAY_DEFAULT, LOCAL_ENGINE_DEFAULT,
    ENV_CONFIGS, GATEWAY_URLS, SNAPSHOT_URLS, FARE_RULE_URLS, INTERLINE_SEARCH_URLS, DEFAULT_ENV
} = require('../config');

describe('normalizeCustomDomain', () => {
    it('should prepend http:// when missing', () => {
        expect(normalizeCustomDomain('myhost:1234')).toBe('http://myhost:1234');
    });

    it('should not double-prepend http://', () => {
        expect(normalizeCustomDomain('http://myhost:1234')).toBe('http://myhost:1234');
    });

    it('should not double-prepend https://', () => {
        expect(normalizeCustomDomain('https://myhost')).toBe('https://myhost');
    });

    it('should strip trailing slash', () => {
        expect(normalizeCustomDomain('http://myhost/')).toBe('http://myhost');
    });

    it('should strip multiple trailing slashes', () => {
        expect(normalizeCustomDomain('http://myhost///')).toBe('http://myhost');
    });

    it('should handle domain without http:// and with trailing slash', () => {
        expect(normalizeCustomDomain('myhost:9999/')).toBe('http://myhost:9999');
    });

    it('should return LOCAL_GATEWAY_DEFAULT without trailing slash for empty input', () => {
        expect(normalizeCustomDomain('')).toBe('http://localhost:63974');
    });

    it('should return LOCAL_GATEWAY_DEFAULT without trailing slash for undefined', () => {
        expect(normalizeCustomDomain(undefined)).toBe('http://localhost:63974');
    });

    it('should return LOCAL_GATEWAY_DEFAULT without trailing slash for null', () => {
        expect(normalizeCustomDomain(null)).toBe('http://localhost:63974');
    });

    it('should trim whitespace', () => {
        expect(normalizeCustomDomain('  myhost:1234  ')).toBe('http://myhost:1234');
    });
});

describe('getGatewayUrl', () => {
    it('should return prod URL for prod env', () => {
        expect(getGatewayUrl('prod')).toBe(GATEWAY_URLS.prod);
    });

    it('should return qa URL for qa env', () => {
        expect(getGatewayUrl('qa')).toBe(GATEWAY_URLS.qa);
    });

    it('should return uat URL for uat env', () => {
        expect(getGatewayUrl('uat')).toBe(GATEWAY_URLS.uat);
    });

    it('should return t URL for t env', () => {
        expect(getGatewayUrl('t')).toBe(GATEWAY_URLS.t);
    });

    it('should return local_gateway URL for local_gateway env', () => {
        expect(getGatewayUrl('local_gateway')).toBe('http://localhost:63974');
    });

    it('should return local_engine URL for local_engine env', () => {
        expect(getGatewayUrl('local_engine')).toBe('http://localhost:57350');
    });

    it('should return custom domain for custom env with domain', () => {
        expect(getGatewayUrl('custom', 'http://myhost:1234')).toBe('http://myhost:1234');
    });

    it('should auto-prepend http:// for custom env without protocol', () => {
        expect(getGatewayUrl('custom', 'myhost:1234')).toBe('http://myhost:1234');
    });

    it('should fall back to LOCAL_GATEWAY_DEFAULT for custom env without domain', () => {
        expect(getGatewayUrl('custom')).toBe('http://localhost:63974');
    });

    it('should fall back to prod for unknown env', () => {
        expect(getGatewayUrl('unknown')).toBe(GATEWAY_URLS.prod);
    });

    it('should strip trailing slash from custom domain', () => {
        expect(getGatewayUrl('custom', 'http://myhost:1234/')).toBe('http://myhost:1234');
    });
});

describe('getSnapshotUrl', () => {
    it('should return prod snapshot URL for prod env', () => {
        expect(getSnapshotUrl('prod')).toBe(SNAPSHOT_URLS.prod);
    });

    it('should return qa snapshot URL for qa env', () => {
        expect(getSnapshotUrl('qa')).toBe(SNAPSHOT_URLS.qa);
    });

    it('should fall back to QA for local_gateway env', () => {
        expect(getSnapshotUrl('local_gateway')).toBe(SNAPSHOT_URLS.qa);
    });

    it('should fall back to QA for local_engine env', () => {
        expect(getSnapshotUrl('local_engine')).toBe(SNAPSHOT_URLS.qa);
    });

    it('should fall back to QA for custom env', () => {
        expect(getSnapshotUrl('custom')).toBe(SNAPSHOT_URLS.qa);
    });

    it('should fall back to prod for unknown env', () => {
        expect(getSnapshotUrl('unknown')).toBe(SNAPSHOT_URLS.prod);
    });
});

describe('getFareRuleUrl', () => {
    it('should return prod fare rule URL for prod env', () => {
        expect(getFareRuleUrl('prod')).toBe(FARE_RULE_URLS.prod);
    });

    it('should return qa fare rule URL for qa env', () => {
        expect(getFareRuleUrl('qa')).toBe(FARE_RULE_URLS.qa);
    });

    it('should fall back to QA for local_gateway env', () => {
        expect(getFareRuleUrl('local_gateway')).toBe(FARE_RULE_URLS.qa);
    });

    it('should fall back to QA for local_engine env', () => {
        expect(getFareRuleUrl('local_engine')).toBe(FARE_RULE_URLS.qa);
    });

    it('should fall back to QA for custom env', () => {
        expect(getFareRuleUrl('custom')).toBe(FARE_RULE_URLS.qa);
    });

    it('should fall back to prod for unknown env', () => {
        expect(getFareRuleUrl('unknown')).toBe(FARE_RULE_URLS.prod);
    });
});

describe('getEnvConfigWithFallback', () => {
    it('should return prod config for prod env', () => {
        expect(getEnvConfigWithFallback('prod')).toBe(ENV_CONFIGS.prod);
    });

    it('should return qa config for qa env', () => {
        expect(getEnvConfigWithFallback('qa')).toBe(ENV_CONFIGS.qa);
    });

    it('should fall back to QA config for local_gateway env', () => {
        expect(getEnvConfigWithFallback('local_gateway')).toBe(ENV_CONFIGS.qa);
    });

    it('should fall back to QA config for local_engine env', () => {
        expect(getEnvConfigWithFallback('local_engine')).toBe(ENV_CONFIGS.qa);
    });

    it('should fall back to QA config for custom env', () => {
        expect(getEnvConfigWithFallback('custom')).toBe(ENV_CONFIGS.qa);
    });

    it('should fall back to default config for unknown env', () => {
        expect(getEnvConfigWithFallback('unknown')).toBe(ENV_CONFIGS[DEFAULT_ENV]);
    });
});

describe('getInterlineSearchUrl', () => {
    it('should return prod interline URL for prod env', () => {
        expect(getInterlineSearchUrl('prod')).toBe('http://search.fly.17usoft.com');
    });

    it('should return qa interline URL for qa env', () => {
        expect(getInterlineSearchUrl('qa')).toBe('http://search.qa.fly.17usoft.com');
    });

    it('should return uat interline URL for uat env', () => {
        expect(getInterlineSearchUrl('uat')).toBe('http://search.uat.fly.17usoft.com');
    });

    it('should return t interline URL for t env', () => {
        expect(getInterlineSearchUrl('t')).toBe('http://search.t.fly.17usoft.com');
    });

    it('should return t2 interline URL for t2 env', () => {
        expect(getInterlineSearchUrl('t2')).toBe('http://search2.t.fly.17usoft.com');
    });

    it('should return lane interline URL for lane env', () => {
        expect(getInterlineSearchUrl('lane')).toBe('http://search.lane.fly.17usoft.com');
    });

    it('should return local_gateway URL for local_gateway env', () => {
        expect(getInterlineSearchUrl('local_gateway')).toBe('http://localhost:63974');
    });

    it('should return local_engine URL for local_engine env', () => {
        expect(getInterlineSearchUrl('local_engine')).toBe('http://localhost:57350');
    });

    it('should return custom domain for custom env with domain', () => {
        expect(getInterlineSearchUrl('custom', 'http://myhost:1234')).toBe('http://myhost:1234');
    });

    it('should auto-prepend http:// for custom env without protocol', () => {
        expect(getInterlineSearchUrl('custom', 'myhost:9999')).toBe('http://myhost:9999');
    });

    it('should fall back to LOCAL_GATEWAY_DEFAULT for custom env without domain', () => {
        expect(getInterlineSearchUrl('custom')).toBe('http://localhost:63974');
    });

    it('should fall back to QA for custom env when empty string domain', () => {
        expect(getInterlineSearchUrl('custom', '')).toBe('http://localhost:63974');
    });

    it('should fall back to prod for unknown env', () => {
        expect(getInterlineSearchUrl('unknown')).toBe('http://search.fly.17usoft.com');
    });
});

describe('LOCAL_ENVS constant', () => {
    it('should contain custom, local_gateway, local_engine', () => {
        expect(LOCAL_ENVS).toEqual(['custom', 'local_gateway', 'local_engine']);
    });
});

describe('LOCAL_GATEWAY_DEFAULT / LOCAL_ENGINE_DEFAULT constants', () => {
    it('LOCAL_GATEWAY_DEFAULT should be http://localhost:63974/', () => {
        expect(LOCAL_GATEWAY_DEFAULT).toBe('http://localhost:63974/');
    });

    it('LOCAL_ENGINE_DEFAULT should be http://localhost:57350', () => {
        expect(LOCAL_ENGINE_DEFAULT).toBe('http://localhost:57350');
    });
});

const { ENV_CONFIGS, DEFAULT_ENV, LOCAL_GATEWAY_DEFAULT, LOCAL_ENGINE_DEFAULT } = require('../config');

module.exports = function(app) {
    app.get('/api/envs', (req, res) => {
        const envs = Object.keys(ENV_CONFIGS).map(function(key) {
            return { key: key, label: ENV_CONFIGS[key].label };
        });
        envs.push({ key: 'local_gateway', label: 'Local-Gateway' });
        envs.push({ key: 'local_engine', label: 'Local-Engine' });
        envs.push({ key: 'custom', label: '自定义' });
        res.json({ default: DEFAULT_ENV, envs: envs, localGatewayDefault: LOCAL_GATEWAY_DEFAULT, localEngineDefault: LOCAL_ENGINE_DEFAULT });
    });
};

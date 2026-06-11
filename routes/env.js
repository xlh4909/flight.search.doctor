const { ENV_CONFIGS, DEFAULT_ENV } = require('../config');

module.exports = function(app) {
    app.get('/api/envs', (req, res) => {
        const envs = Object.keys(ENV_CONFIGS).map(function(key) {
            return { key: key, label: ENV_CONFIGS[key].label };
        });
        res.json({ default: DEFAULT_ENV, envs: envs });
    });
};

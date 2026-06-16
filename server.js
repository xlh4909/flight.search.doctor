const express = require('express');
const axios = require('axios');
const path = require('path');

const { ENV_CONFIGS, DEFAULT_ENV } = require('./config');
const { loadCityMapping } = require('./utils');

function createApp(httpClient = axios) {
    const app = express();
    app.use(express.json({ limit: '10mb' }));
    app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
    app.use(express.static(path.join(__dirname, 'public')));

    require('./routes/env')(app);
    require('./routes/search')(app, httpClient);
    require('./routes/huixing')(app, httpClient);
    require('./routes/b15')(app, httpClient);
    require('./routes/skyeye')(app, httpClient);
    require('./routes/gateway')(app, httpClient);
    require('./routes/b15-standard')(app, httpClient);
    require('./routes/real-interline')(app, httpClient);
    require('./routes/interline')(app, httpClient);
    require('./routes/snapshot')(app, httpClient);
    require('./routes/fare-rule')(app, httpClient);
    return app;
}

const PORT = process.env.PORT || 3100;

if (require.main === module) {
    (async () => {
        await loadCityMapping();
        const app = createApp();
        app.listen(PORT, () => {
            console.log(`Doctor server running at http://localhost:${PORT}`);
            console.log(`Default env: ${DEFAULT_ENV} (${ENV_CONFIGS[DEFAULT_ENV].label})`);
            console.log(`Available envs: ${Object.keys(ENV_CONFIGS).join(', ')}`);
        });
    })();
}

module.exports = {
    createApp,
    transformToHuixingRequest: require('./utils').transformToHuixingRequest,
    formatResult: require('./utils').formatResult,
    extractApmTraceId: require('./utils').extractApmTraceId,
    loadCityMapping: require('./utils').loadCityMapping,
    cityToAirports: require('./utils').cityToAirports,
    cityToAirportsMap: require('./utils').cityToAirportsMap,
    getEnvConfig: require('./config').getEnvConfig,
    getEnvFromRequest: require('./config').getEnvFromRequest,
    ENV_CONFIGS: require('./config').ENV_CONFIGS,
    _setCityToAirportsMap: require('./utils')._setCityToAirportsMap
};

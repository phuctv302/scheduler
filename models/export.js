const { sequelize_service } = require('../services/sequelize').export();
const Job = require('./job');

sequelize_service.syncTables().then(() => console.log('All tables are sync'));

module.exports = {
	Job,
};

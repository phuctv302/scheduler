require('dotenv').config({ path: __dirname + '/../.env' });
const { Sequelize, DataTypes } = require('sequelize');

/**
 * @class
 * @extends Sequelize
 * @augments Sequelize
 * @property {Sequelize} sequelize
 */
class SequelizeService {
	//

	constructor() {
		if (SequelizeService.instance) {
			return SequelizeService.instance;
		}

		this.sequelize = new Sequelize(
			'scheduler',
			process.env.db_username,
			process.env.db_password,
			{
				host: process.env.db_host,
				port: process.env.db_port,
				dialect: process.env.db_dialect,
				logging: false,
			}
		);

		this.sequelize.options.logging = false;

		this.sequelize
			.authenticate()
			.then(() => {
				console.log('[*] DB Connection has been established successfully.');
			})
			.catch((error) => {
				console.error('Unable to connect to the database: ', error);
			});

		SequelizeService.instance = this;
	}

	/**
	 * @return {SequelizeService&Sequelize}
	 */
	static getInstance() {
		if (!SequelizeService.instance) {
			SequelizeService.instance = new SequelizeService();
		}

		return SequelizeService.instance;
	}

	/**
	 * @desc sync table from code to db
	 *
	 * @return {Promise<void>}
	 */
	async syncTables() {
		await this.sequelize.sync({ alter: true });
	}

	/**
	 * @desc export sequelize services
	 *
	 * @return {{
	 * 	sequelize: Sequelize,
	 * 	DataTypes: DataTypes
	 * 	sequelize_service: SequelizeService
	 * }}
	 */
	static export() {
		return {
			sequelize: SequelizeService.getInstance().sequelize,
			sequelize_service: SequelizeService.getInstance(),
			DataTypes,
		};
	}
}

module.exports = SequelizeService;

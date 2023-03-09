const redis = require('redis');
const _ = require('lodash');

const ArrayUtils = require('../utils/array');
const StringUtils = require('../utils/string');

class Redis {
	//

	constructor() {
		if (Redis.instance) {
			return Redis.instance;
		}

		this.client = redis.createClient({ url: `redis://localhost:6380` });
		this.client.on('error', (err) => console.log(`[!] Redis error ${err}`));
		this.client.connect().then(() => {
			console.log(` [*] Redis connect successfully!`);
		});

		Redis.instance = this;
	}

	/**
	 * @desc get singleton redis
	 * @return {Redis}
	 */
	static getInstance() {
		if (!Redis.instance) {
			Redis.instance = new Redis();
		}

		return Redis.instance;
	}

	//

	/**
	 * @desc set data to hash by key
	 *
	 * @param {String|Int} key
	 * @param {Array|Int|String} data
	 * @param {Int} expire - ms
	 */
	async setData(key, data, expire = 0, override = false) {
		try {
			console.log(
				` [x] Redis memory plus about ${StringUtils.getByteSize(
					JSON.stringify(data)
				)} (bytes)`
			);

			let pre_data = await this.getSchedulesFromKey(key);

			let options = {};
			if (expire) {
				options = {
					EX: expire,
				};
			}

			// hash is not existed yet or we want to override data
			if (!pre_data || override) {
				if (Array.isArray(data)) {
					return await this.client.set(
						String(key),
						JSON.stringify(data),
						options
					);
				}

				return await this.client.set(
					String(key),
					JSON.stringify([data]),
					options
				);
			}

			// hash is already exited -> append data
			let new_data = [];
			if (Array.isArray(data)) {
				new_data = ArrayUtils.mergeUniqueArray(pre_data, data);
				return await this.client.set(
					String(key),
					JSON.stringify(new_data),
					options
				);
			}

			new_data = ArrayUtils.uniquePush(pre_data, data);
			return await this.client.set(
				String(key),
				JSON.stringify(new_data),
				options
			);
		} catch (err) {
			console.log(` [!] Redis error setting data: `, err);
			console.log(err.name);
			console.log(JSON.stringify(err));
			throw err;
		}
	}

	/**
	 *
	 * @param {String|Int} key
	 * @return {Promise<Array>} job schedule ids
	 */
	async getSchedulesFromKey(key) {
		let schedules = await this.client.get(String(key));

		if (!schedules) {
			return [];
		}

		return JSON.parse(schedules);
	}

	/**
	 * @desc delete hash by key
	 * @param {String|Int} key
	 */
	async deleteHash(key) {
		return await this.client.del(String(key));
	}

	//

	/**
	 * @desc clear all data in redis
	 */
	async cleanUp() {
		return await this.client.flushAll();
	}

	//

	async removeScheduleFromHash(key, id) {
		key = String(key);

		const schedules = await this.getSchedulesFromKey(key);

		const new_arr = schedules.filter((el) => {
			return el.id != id;
		});

		await this.setData(key, new_arr, null, true);
	}

	//

	async getAllSchedules() {
		const keys = await this.client.keys('*');

		if (!keys || keys.length == 0) {
			return [];
		}

		let all_schedules = [];
		for (const key of keys) {
			const schedules = await this.getSchedulesFromKey(key);
			all_schedules = [...all_schedules, ...schedules];
		}

		return all_schedules;
	}

	//

	async getConfigSetting(param) {
		const config = await this.client.configGet(param);

		if (!_.isEmpty(config)) {
			return config[param];
		}

		return null;
	}

	async getInfo(section) {
		const info = await this.client.info(section);

		let fields = {};
		const info_lines = info.split('\r\n');
		for (const line of info_lines) {
			if (line[0] == '#') {
				continue;
			}

			const [key, value] = line.split(':');

			fields[key] = value;
		}

		return fields;
	}

	async getMemoryInfo(param) {
		const info = await this.getInfo('memory');

		if (info[param]) {
			return info[param];
		}

		return null;
	}
}

module.exports = Redis;

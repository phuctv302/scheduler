/**
 * @desc time helper, time unit will be converted into seconds and floor to minute
 */
class TimeUtils {
	//

	constructor(timestamp = null) {
		const now = this.floorMinute(Date.now());

		this.time = timestamp ? timestamp * 1000 : now * 1000;
	}

	//

	getShortTimeLog() {
		return new Date(this.time).toLocaleString('en-US', {
			timeZone: 'Asia/Ho_Chi_Minh',
			hour: 'numeric',
			minute: 'numeric',
		});
	}

	//

	getFullTimeLog() {
		return new Date(this.time).toLocaleString('en-US', {
			timeZone: 'Asia/Ho_Chi_Minh',
		});
	}

	/**
	 * @desc convert timestamp unit from ms to second
	 *
	 * @return {Int} seconds
	 */
	floorMinute(mls_time = this.time) {
		const minute = 60 * 1000;

		return (Math.floor(mls_time / minute) * minute) / 1000;
	}

	static now() {
		const minute = 60 * 1000;

		return (Math.floor(Date.now() / minute) * minute) / 1000;
	}

	/**
	 * @desc sync sleep and run cb
	 *
	 * @param {Int} seconds
	 * @param {fn} cb
	 */
	static sleep(seconds, cb) {
		const date = Date.now() / 1000;
		let currentDate = null;
		do {
			currentDate = Date.now() / 1000;
		} while (currentDate - date < seconds);

		if (cb) {
			cb();
		}
	}

	//

	/**
	 *
	 * @param {Int} timestamp (second)
	 */
	isToday() {
		const today = new Date().setHours(0, 0, 0, 0);
		const input_day = new Date(this.time).setHours(0, 0, 0, 0);

		return today === input_day;
	}

	/**
	 *
	 * @param {String} type - get minute value by day or hour
	 */
	getMinute() {
		let type = '';
		if (process.env.schedule_cron == '* * * * *') {
			type = 'day';
		}
		if (process.env.schedule_cron == '0 * * * *') {
			type = 'hour';
		}

		if (type == 'day') {
			const hour = new Date(this.time).getHours();
			const minute = new Date(this.time).getMinutes();

			return hour * 60 + minute;
		}

		type = 'hour';

		if (type == 'hour') {
			return new Date(this.time).getMinutes();
		}

		return -1;
	}
}

module.exports = TimeUtils;

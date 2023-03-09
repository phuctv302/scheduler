const cronParser = require('cron-parser');
const AppUtils = require('./utils');
const cronstrue = require('cronstrue');

const list_special_interval = require('../list.special.interval');
const AppError = require('../utils/app.error');
const TimeUtils = require('./time.utils');
class CronUtils {
	//

	/**
	 * @desc get previous and next time that scheduler process run
	 *
	 * @return {{
	 * 	next_schedule: Int,
	 * 	prev_schedule: Int
	 * }}
	 */
	static getScheduleTime() {
		const cron_exp = process.env.schedule_cron;

		const next_schedule =
			cronParser.parseExpression(cron_exp).next().getTime() / 1000;

		const prev_schedule =
			cronParser.parseExpression(cron_exp).prev().getTime() / 1000;

		return { next_schedule, prev_schedule };
	}

	//

	/**
	 *
	 * @param {Int} start_time
	 * @param {Int} end_time
	 * @param {String} cron_exp
	 * @return {Array} - list of next execution time
	 * @throws {Error}
	 */
	static getNextRuns(start_time, end_time, cron_exp, is_scheduling = false) {
		try {
			const { prev_schedule, next_schedule } = CronUtils.getScheduleTime();

			const cron_interval = cronParser.parseExpression(cron_exp, {
				utc: false,
				tz: 'Asia/BangKok',
			});
			let next_run = cron_interval.next().getTime();

			if (is_scheduling) {
				next_run = cron_interval.prev().getTime();
			}

			const next_runs = [];
			while (next_run / 1000 < next_schedule) {
				if (
					(next_run >= start_time * 1000 && next_run <= end_time * 1000) ||
					(next_run >= start_time * 1000 && !end_time)
				) {
					next_runs.push(next_run / 1000);
				}

				next_run = cron_interval.next().getTime();
			}

			return next_runs;
		} catch (err) {
			throw new AppError(err, 400);
		}
	}

	//

	/**
	 *
	 * @param {Object|String} options
	 * @return {String} crontab
	 */
	static getCrontab(options) {
		if (typeof options == 'string') {
			options = JSON.parse(options);
		}

		if (options.cron) {
			return options.cron;
		}

		let { repeat_interval } = options;

		if (!repeat_interval) {
			const { month, day_of_month, day_of_week, hour, minute } = options;

			return `${minute ?? '*'} ${hour ?? '*'} ${day_of_month ?? '*'} ${
				month ?? '*'
			} ${day_of_week ?? '*'}`;
		}

		// interval

		if (list_special_interval.includes(repeat_interval)) {
			if (repeat_interval == 'every minute') {
				return '* * * * *';
			}
		}

		const { value: interval_val, type: interval_type } =
			AppUtils.parseInterval(repeat_interval);

		if (interval_type == 'minute') {
			return `*/${interval_val} * * * *`;
		}

		if (interval_type == 'hour') {
			return `* */${interval_val} * * *`;
		}

		if (interval_type == 'day') {
			return `* * */${interval_val} * *`;
		}

		if (interval_type == 'month') {
			return `* * * */${interval_val} *`;
		}

		if (interval_type == 'year') {
			return `* * * * */${interval_val}`;
		}

		throw new AppError(
			'Invalid repeat options, please check documentation',
			400
		);
	}

	//

	/**
	 * @desc convert crontab to human readable repeat description
	 *
	 * @param {String} cron_exp - cron expression
	 * @returns {String} cron description
	 */
	static getRepeatStatement(cron_exp) {
		try {
			return cronstrue.toString(cron_exp, { use24HourTimeFormat: true });
		} catch (err) {
			throw new AppError(err, 400);
		}
	}
}

//

module.exports = CronUtils;

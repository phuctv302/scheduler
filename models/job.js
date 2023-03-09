const { sequelize, DataTypes } = require('../services/sequelize').export();
const Redis = require('../services/redis');
const CronUtils = require('../utils/cron.utils');
const TimeUtils = require('../utils/time.utils');

/**
 * @class Job
 */
const Job = sequelize.define(
	'Jobs',
	{
		id: {
			type: DataTypes.INTEGER,
			autoIncrement: true,
			primaryKey: true,
		},
		app: {
			type: DataTypes.STRING,
			allowNull: false,
			validate: {
				notEmpty: {
					msg: 'App name is required',
				},
			},
		},
		name: {
			type: DataTypes.STRING,
			allowNull: false,
			validate: {
				notEmpty: {
					msg: 'Job name is required',
				},
			},
		},
		description: {
			type: DataTypes.TEXT,
		},

		message: {
			type: DataTypes.TEXT,
			validate: {
				isJsonString(val) {
					try {
						const obj = JSON.parse(val);
						if (!obj || typeof obj != 'object') {
							throw new Error('Invalid JSON String format for message field');
						}
					} catch (err) {
						throw new Error('Invalid JSON String format for message field');
					}
				},
			},
		},

		time: {
			type: DataTypes.INTEGER,
		},
		end_time: {
			type: DataTypes.INTEGER,
		},

		is_repeat: {
			type: DataTypes.INTEGER,
		},
		repeat_options: {
			type: DataTypes.TEXT,
		},

		data: {
			type: DataTypes.TEXT,
		},
	},
	{
		timestamps: false,
	}
);

// hooks
/**
 * @param {Job} job
 */
Job.beforeCreate((job) => {
	// onetime job
	if (!job.time) {
		job.time = TimeUtils.now();
	}

	job.time = new TimeUtils(job.time).floorMinute();

	// periodic job
	if (job.is_repeat == 1) {
		if (job.end_time) {
			job.end_time = new TimeUtils(job.end_time).floorMinute();
		}

		if (!job.data) {
			job.data = {};
		}

		job.data.repeat_description = CronUtils.getRepeatStatement(
			CronUtils.getCrontab(job.repeat_options)
		);
	}

	// onetime job has no end_time
	if (job.is_repeat == 0) {
		job.end_time = null;
	}
});

/**
 * @desc fetch schedules in between 2 exec time of scheduler
 *
 * @param {Int} prev_schedule
 * @param {Int} next_schedule
 *
 * @return {Promise<Array>}
 * @memberof Job
 */
// TODO: return schedules instead of setting into redis
Job.prototype.getSchedules = async function (
	prev_schedule,
	next_schedule,
	is_scheduling = false
) {
	// onetime job
	if (this.is_repeat == 0) {
		const time = this.time;

		if (prev_schedule < time && time <= next_schedule) {
			// fetch into redis
			const schedule = {
				id: this.id,
				name: this.name,
				app: this.app,
				exec_time: time,
				status: 'pending',
			};

			return [
				{
					id: new TimeUtils(time).getMinute(),
					schedule,
				},
			];
		}
	}

	// periodic job
	if (this.is_repeat == 1) {
		const cron_exp = CronUtils.getCrontab(this.repeat_options);

		return CronUtils.getNextRuns(
			this.time,
			this.end_time,
			cron_exp,
			is_scheduling
		).map((next_run) => {
			const schedule = {
				id: this.id,
				name: this.name,
				app: this.app,
				exec_time: next_run,
				status: 'pending',
			};

			return {
				id: new TimeUtils(next_run).getMinute(),
				schedule,
			};
		});
	}
};

module.exports = Job;

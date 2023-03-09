const schedule = require('node-schedule');
const { Op } = require('sequelize');
const cronParser = require('cron-parser');

require('dotenv').config({ path: `./.env` });

const Redis = require('./redis');

const TimeUtils = require('../utils/time.utils');
const CronUtils = require('../utils/cron.utils');
const AppUtils = require('../utils/utils');
const StringUtils = require('../utils/string');
const ObjectUtils = require('../utils/object');

const db = require('../models/export');
const Job = db.Job;

/**
 * @desc scan Job table to schedule due job
 */
const run = async () => {
	try {
		const time_log = new TimeUtils().getShortTimeLog();

		console.log('***');
		console.log(`[${time_log}] Starting scheduling job`);

		const start_schedule_time = Date.now();

		// clean up redis
		const redis = Redis.getInstance();
		await redis.cleanUp();
		console.log(` [x] Redis is cleaned up`);

		// query all jobs
		const start_query_jobs = Date.now();
		const jobs = await Job.findAll({
			where: {
				[Op.or]: [
					{ end_time: null },
					{
						end_time: {
							[Op.gte]: TimeUtils.now(),
						},
					},
				],
			},
		});
		console.log(
			` [x] Querying jobs takes ${Date.now() - start_query_jobs} (ms)`
		);
		if (!jobs || jobs.length == 0) {
			console.log(` [!] No job in DB`);
		}
		const { next_schedule, prev_schedule } = CronUtils.getScheduleTime();

		// fetch job schedules
		const start_fetch_schedules = Date.now();
		let schedules = {};
		await Promise.all(
			jobs.map(async (job) => {
				const start_each_job = Date.now();
				const start_get_schedules = Date.now();
				const job_schedules = await job.getSchedules(
					prev_schedule,
					next_schedule,
					true
				);
				console.log(
					` [x] Getting each job's schedules takes ${
						Date.now() - start_get_schedules
					} (ms)`
				);

				const start_loop_schedules = Date.now();
				for (const job_schedule of job_schedules) {
					if (job_schedule.id) {
						if (!schedules[job_schedule.id]) {
							schedules[job_schedule.id] = [];
						}

						schedules[job_schedule.id].push(job_schedule.schedule);
					}
				}
				console.log(
					` [x] Looping each job's schedules takes ${
						Date.now() - start_loop_schedules
					} (ms)`
				);

				console.log(` [x] Each job takes ${Date.now() - start_each_job} (ms)`);
			})
		);
		console.log(
			` [x] Fetching schedules takes ${Date.now() - start_fetch_schedules} (ms)`
		);
		// for (const job of jobs) {
		// 	const start_each_job = Date.now();
		// 	const start_get_schedules = Date.now();
		// 	const job_schedules = job.getSchedules(
		// 		prev_schedule,
		// 		next_schedule,
		// 		true
		// 	);
		// 	console.log(
		// 		` [x] Getting each job's schedules takes ${
		// 			Date.now() - start_get_schedules
		// 		} (ms)`
		// 	);

		// 	const start_loop_schedules = Date.now();
		// 	for (const job_schedule of job_schedules) {
		// 		if (job_schedule.id) {
		// 			if (!schedules[job_schedule.id]) {
		// 				schedules[job_schedule.id] = [];
		// 			}

		// 			schedules[job_schedule.id].push(job_schedule.schedule);
		// 		}
		// 	}
		// 	console.log(
		// 		` [x] Looping each job's schedules takes ${
		// 			Date.now() - start_loop_schedules
		// 		} (ms)`
		// 	);

		// 	console.log(` [x] Each job takes ${Date.now() - start_each_job} (ms)`);
		// }

		// NOTE: Testing distribute scheduling to avoid being out of memory
		// predict data size
		let data_size = 0;
		Object.values(schedules).forEach((val) => {
			data_size += StringUtils.getByteSize(JSON.stringify(val));
		});
		console.warn(
			` [x] Scheduler will add about ${data_size} (bytes) = ${
				data_size / 1024 / 1024
			}(MB) into Redis`
		);

		// calculate the remaining memory
		const remaining_memory =
			(await redis.getConfigSetting('maxmemory')) * 1 -
			(await redis.getMemoryInfo('used_memory')) * 1;

		if (remaining_memory > data_size) {
			console.log(` [x] Scheduling all schedules`);
			await Promise.all(
				Object.keys(schedules).map(async (key) => {
					await redis.setData(key, schedules[key], null, true);
				})
			);
		} else {
			// NOTE: distribute data
			const split_num = Math.ceil(data_size / remaining_memory);
			console.log(
				` [x] Out of memory - Distributing scheduler ${split_num} times`
			);
			const trunk_schedule_cron = `*/${Math.ceil(60 / split_num)} * * * *`;

			schedule.scheduleJob(
				'trunk_schedule',
				trunk_schedule_cron,
				function cb() {
					return trunkScheduler(trunk_schedule_cron, schedules);
				}
			);
		}

		const end_schedule_time = Date.now();
		console.log(
			` [x] Scheduler took:${
				end_schedule_time - start_schedule_time
			}(ms) to schedule ${jobs.length} jobs`
		);
	} catch (err) {
		console.log(` [!] Error scheduling: ${err}`);
		throw err;
	}
};

const trunkScheduler = async (schedule_cron, schedules) => {
	console.log(
		` [*] Start trunk scheduling at ${new TimeUtils().getShortTimeLog()}`
	);

	const redis = Redis.getInstance();

	const { next_schedule, prev_schedule } = CronUtils.getScheduleTime();

	// distribute data

	const schedule_interval = cronParser.parseExpression(schedule_cron);
	let next_trunk_schedule = schedule_interval.next().getTime() / 1000;
	let prev_trunk_schedule = prev_schedule;

	let head_key = new TimeUtils(prev_trunk_schedule).getMinute();
	let tail_key = new TimeUtils(next_trunk_schedule).getMinute();
	while (next_trunk_schedule < next_schedule) {
		let trunk_schedules = ObjectUtils.filterByKey(schedules, function (key) {
			return key >= head_key && key < tail_key;
		});

		// set trunk schedules into redis
		console.log(` [x] Scheduling key: ${head_key} -> ${tail_key}`);
		await Promise.all(
			Object.keys(trunk_schedules).map(async (key) => {
				await redis.setData(key, trunk_schedules[key], null, true);
			})
		);

		// get next trunk
		prev_trunk_schedule = next_trunk_schedule;
		next_trunk_schedule = schedule_interval.next().getTime() / 1000;
		head_key = new TimeUtils(prev_trunk_schedule).getMinute();
		tail_key = new TimeUtils(next_trunk_schedule).getMinute();

		// last trunk is not the same ratio
		if (next_trunk_schedule > next_schedule) {
			next_trunk_schedule = next_schedule;
			tail_key = new TimeUtils(next_trunk_schedule).getMinute();

			// get trunk
			trunk_schedules = ObjectUtils.filterByKey(schedules, function (key) {
				return key >= head_key && key < tail_key;
			});

			// set trunk into redis
			console.log(
				` [x] Last trunk - scheduling key: ${head_key} -> ${tail_key}`
			);
			await Promise.all(
				Object.keys(trunk_schedules).map(async (key) => {
					await redis.setData(key, trunk_schedules[key], null, true);
				})
			);

			// cancel scheduling
			console.log(` [x] Finish distributed scheduler`);
			schedule.cancelJob('trunk_schedule');
		}
	}

	// cancel scheduling
	schedule.cancelJob('trunk_schedule');
};

// schedule by schedule cron
schedule.scheduleJob(process.env.schedule_cron, run);

// error handler
process.on('uncaughtException', (err) => {
	console.log(err.name, err.message);
	console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');

	process.exit(1);
});

process.on('unhandledRejection', (err) => {
	console.log(err.name, err.message);
	console.log('UNHANDLED REJECTION! 💥 Shutting down...');

	AppUtils.writeLogError(err);

	process.exit(1);
});

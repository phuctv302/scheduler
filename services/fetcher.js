const { Op } = require('sequelize');
const schedule = require('node-schedule');
require('dotenv').config({ path: __dirname + '/../.env' });

const queueUtils = require('../utils/queue.utils');
const TimeUtils = require('../utils/time.utils.js');
const AppUtils = require('../utils/utils');

const Redis = require('./redis');

const db = require('../models/export');
const Job = db.Job;

//

/**
 * @desc produce a job schedule into a queue (classified by job name)
 *
 * @param {Job} job
 * @param {Object} schedule - {id, exec_time} of job
 */
const dispatchJob = async (job, schedule) => {
	console.log(
		` [x] Dispatching job into queue: worker.${job.app}.${
			job.name
		} | Executed at: ${new TimeUtils(schedule.exec_time).getShortTimeLog()}`
	);

	await queueUtils.produce(job);
};

//

/**
 * @desc Fetch all the due job schedules and then dispatch them to the queue.
 *
 */
const run = async () => {
	try {
		const time_log = new TimeUtils().getShortTimeLog();
		console.log('***');
		console.log(`[${time_log}] Starting fetching job schedule (Redis)`);

		const start_fetch_time = Date.now();

		const redis = Redis.getInstance();

		const fetch_key = new TimeUtils().getMinute();
		let due_schedules = await redis.getSchedulesFromKey(fetch_key);

		// in case fetcher missed jobs run at key 0
		if (fetch_key == 1) {
			const missed_schedules = await redis.getSchedulesFromKey(0);
			due_schedules = [...missed_schedules, ...due_schedules];
		}

		if (!due_schedules || due_schedules.length == 0) {
			console.log(` [x] No due schedule`);
		}

		await Promise.all(
			due_schedules.map(async (due_schedule) => {
				const job = await Job.findOne({ where: { id: due_schedule.id } });

				if (!job) {
					console.log(
						` [x] Job not found with Job Schedule id: ${due_schedule.id}`
					);
				} else {
					await dispatchJob(job, due_schedule);
				}
			})
		);

		const end_fetch_time = Date.now();

		console.log(
			` [x] Fetcher took ${end_fetch_time - start_fetch_time} (ms) to fetch ${
				due_schedules.length
			} schedules into queue`
		);

		const dispatched_schedules = due_schedules.map((el) => {
			el.status = 'done';
			return el;
		});
		// await redis.deleteHash(fetch_key);
		const expire = (60 - fetch_key + 1) * 60;
		await redis.setData(fetch_key, dispatched_schedules, expire, true);
		console.log(` [x] Redis - key ${fetch_key} expire after ${expire} second`);
	} catch (err) {
		console.log(` [!] Error fetching: `, err);
		throw err;
	}
};

// run fetcher
schedule.scheduleJob(process.env.fetch_cron, run);

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

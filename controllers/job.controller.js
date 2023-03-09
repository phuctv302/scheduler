const CronUtils = require('../utils/cron.utils.js');
const TimeUtils = require('../utils/time.utils.js');
const catchAsync = require('../utils/catch.async');
const APIFeatures = require('../utils/api.features');

const Redis = require('../services/redis');

const AppError = require('../utils/app.error');

const db = require('../models/export');
const ArrayUtils = require('../utils/array.js');
const Job = db.Job;

exports.bulk = catchAsync(async (req, res, next) => {
	const { range } = req.params;

	const [from, to] = range.split('-');

	const redis = Redis.getInstance();

	let test_data = [];
	for (let i = 1; i <= 1000; i++) {
		test_data.push({
			id: i,
			name: `test.job.name.${i}`,
			app: `test.app`,
			status: 'pending',
			data: 'empty data',
		});
	}

	for (let i = from * 1; i <= to * 1; i++) {
		await redis.setData(i, test_data);
	}

	res.status(200).json({
		status: 'success',
	});
});

exports.insertMassiveJobs = catchAsync(async (req, res, next) => {
	const { amount } = req.params;

	for (let i = 1; i <= amount; i++) {
		await Job.create(req.body);
	}

	res.status(200).json({
		status: 'success',
	});
});

exports.getAllSchedules = catchAsync(async (req, res, next) => {
	const redis = Redis.getInstance();

	let schedules = await redis.getAllSchedules();

	const count = schedules.length;

	// paginate
	const page = req.query.page * 1 || 1;
	const limit = req.query.limit * 1 || 50;
	schedules = ArrayUtils.sortObject(schedules, 'exec_time asc', 'id desc');
	schedules = ArrayUtils.paginate(schedules, page, limit);

	// sort

	res.status(200).json({
		status: 'success',
		result: schedules.length,
		count,
		data: {
			schedules,
		},
	});
});

exports.getAllJobs = catchAsync(async (req, res, next) => {
	const apiFeatures = new APIFeatures({ where: {} }, req.query).paginate();

	const { count, rows: jobs } = await Job.findAndCountAll(apiFeatures.query);

	res.status(200).json({
		status: 'success',
		result: jobs.length,
		count,
		data: {
			jobs,
		},
	});
});

exports.getJob = catchAsync(async (req, res, next) => {
	const job = await Job.findOne({ where: { id: req.params.id } });

	if (!job) {
		return next(new AppError('No job found with that id', 404));
	}

	res.status(200).json({
		status: 'success',
		data: {
			job,
		},
	});
});

exports.createJob = catchAsync(async (req, res, next) => {
	console.log('body: ', req.body);
	const new_job = await Job.create(req.body);

	const time_log = new TimeUtils(new_job.time).getFullTimeLog();
	const { prev_schedule, next_schedule } = CronUtils.getScheduleTime();

	console.log(`[+] New job created | Time to start: ${time_log}`);

	const schedules = new_job.getSchedules(prev_schedule, next_schedule);

	const redis = Redis.getInstance();

	await Promise.all(
		schedules.map(async (schedule) => {
			await redis.setData(schedule.id, schedule.schedule);
		})
	);

	res.status(201).json({
		status: 'success',
		message: 'Job created',
		data: {
			job: new_job,
		},
	});
});

exports.deleteJob = catchAsync(async (req, res, next) => {
	const { id } = req.params;

	const job = await Job.findOne({ where: { id: id } });
	if (!job) {
		return next(new AppError('No job found with that id', 404));
	}

	const next_runs = CronUtils.getNextRuns(
		job.time,
		job.end_time,
		CronUtils.getCrontab(job)
	);

	// remove job
	await job.destroy();

	// remove all job schedules redis
	await Promise.all(
		next_runs.map(async (next_run) => {
			const key = new TimeUtils(next_run).getMinute();
			await Redis.getInstance().removeScheduleFromHash(key, id);
		})
	);

	console.log(` [x] Remove all pending schedules from job with id ${id}`);

	res.status(200).json({
		status: 'success',
		message: 'Job deleted',
		data: null,
	});
});

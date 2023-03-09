const express = require('express');

const JobController = require('../controllers/job.controller');

const router = express.Router();

// NOTE: TESTing
router.get('/schedules', JobController.getAllSchedules);
router.get('/insert-massive/:amount', JobController.insertMassiveJobs);

router.route('/').get(JobController.getAllJobs).post(JobController.createJob);

router.route('/:id').get(JobController.getJob).delete(JobController.deleteJob);

module.exports = router;

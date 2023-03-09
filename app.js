const express = require('express');
const morgan = require('morgan');
const compression = require('compression');

const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

const jobRouter = require('./routes/job.routes');

const globalErrorHandler = require('./controllers/error.controller');
const AppError = require('./utils/app.error');

const app = express();

if (process.env.NODE_ENV == 'development') {
	app.use(morgan('dev'));
}

// parse requests of content-type - application/json
app.use(express.json());
// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

// compression
app.use(compression());

// simple route
app.get('/', (req, res) => {
	res.json({ message: 'Welcome to scheduler.' });
});

app.use('/api/v1/jobs', jobRouter);

// error handler

app.all('*', (req, res, next) => {
	return next(
		new AppError(`Can't find ${req.originalUrl} on this server`, 404)
	);
});

app.use(globalErrorHandler);

module.exports = app;

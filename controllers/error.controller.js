const AppError = require('../utils/app.error');
const AppUtils = require('../utils/utils');

// Sequelize validator
const sequelizeValidatorError = (err) => {
	const messages = err.errors.map((e) => e.message);
	const err_message = messages.join('. ');

	const res_message = `Error input data: ${err_message}`;

	return new AppError(res_message, 400);
};

// SEND ERROR FOR DEV
const sendErrorDev = (err, req, res) => {
	if (err.is_operational) {
		return res.status(err.status_code).json({
			status: err.status,
			error: err,
			errorName: err.name,
			message: err.message,
			stack: err.stack,
		});
	}

	console.log(`[!] ERROR:`);
	console.log(err);
	console.log(err.stack);

	return res.status(500).json({
		status: 500,
		message: 'Something went wrong',
	});
};

module.exports = (err, req, res, next) => {
	err.status_code = err.status_code || 500;
	err.status = err.status || 'error';

	AppUtils.writeLogError(err);

	let error = { ...err };
	error.status_code = err.status_code;
	error.name = err.name;
	error.message = err.message;

	if (error.name == 'SequelizeValidationError') {
		error = sequelizeValidatorError(error);
	}

	// NOTE: Temporarily, send error for dev
	sendErrorDev(error, req, res);
};

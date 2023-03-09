const app = require('./app');
const schedule = require('node-schedule');
const AppUtils = require('./utils/utils');

process.on('uncaughtException', (err) => {
	console.log(err.name, err.message);
	console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');

	process.exit(1);
});

// set port, listen for requests
const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, '0.0.0.0', () => {
	console.log(`Server is running on port ${PORT}.`);
});

process.on('unhandledRejection', (err) => {
	console.log(err.name, err.message);
	console.log('UNHANDLED REJECTION! 💥 Shutting down...');

	AppUtils.writeLogError(err);

	// finish all request pending or being handled before close server
	server.close(() => {
		process.exit(1);
	});
});

process.on('SIGTERM', () => {
	console.log('👋 SIGTERM RECEIVED. Shutting down gracefully...');

	server.close(() => {
		console.log('💥 Process terminated!');
	});
});

// SYSTEM INTERRUPT
process.on('SIGINT', function () {
	schedule.gracefulShutdown().then(() => process.exit(0));
});

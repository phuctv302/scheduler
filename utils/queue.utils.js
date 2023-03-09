const amqp = require('amqplib');
const TimeUtils = require('./time.utils.js');

/**
 * Connect to RBMQ
 */
const initChannel = async () => {
	try {
		let amqp_host = process.env.AMQP_HOST || '127.0.0.1';
		let conn = await amqp.connect(`amqp://${amqp_host}:5672`);
		console.log(`[x] Connecting to RBMQ successfully`);
		return await conn.createChannel();
	} catch (err) {
		console.log(` [!] Error connecting to RBMQ: ${err}`);
		throw err;
	}
};

var channel = null;
initChannel()
	.then((c) => (channel = c))
	.catch((err) => {
		console.log(` [!] Error connecting to RBMQ: ${err}`);
		process.exit();
	});

/**
 * @desc consume msg from queue - NOTE: JUST TO TESTING WORKER
 *
 * @param {String} queue
 * @param {Function} cb
 */
exports.consume = async (queue, cb) => {
	try {
		const amqp_host = process.env.AMQP_HOST || '127.0.0.1';
		const conn = await amqp.connect(`amqp://${amqp_host}`);
		const channel = await conn.createChannel();
		const q = await channel.assertQueue(queue, { durable: true });

		channel.prefetch(1);

		console.log(`[*] Waiting for messages in ${q.queue}. To exit press CTRL+C`);

		// consume
		await channel.consume(q.queue, (msg) => {
			if (!msg) {
				return console.log(` [x] Empty message`);
			}

			console.log(`***`);
			console.log(
				`[${new TimeUtils().getShortTimeLog()}] Receive message: ${msg.content.toString()}`
			);

			cb(msg);

			channel.ack(msg);
		});
	} catch (err) {
		console.log(`[!] Error consuming: ${err}`);
		throw err;
	}
};

/**
 * @desc send message into queue
 *
 * @param {String} queue
 * @param {String} msg
 */
exports.produce = async (job) => {
	const queue = `worker.${job.app}.${job.name}`;
	try {
		channel.publish('', queue, Buffer.from(job.message));
		console.log(` [x] Sended: ${job.message}`);
	} catch (err) {
		console.log(` [!] Error publishing message: ${err}`);
		throw err;
	}
};

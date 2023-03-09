module.exports = {
	apps: [
		{
			name: `scheduler.server`,
			namespace: 'scheduler',
			script: `./server.js`,
			instances: 1,
		},
		{
			name: `job.fetcher`,
			script: `services/fetcher.js`,
			instances: 1,
			env: {
				NODE_ENV: '.dev',
			},
		},
		{
			name: `job.scheduler`,
			script: `services/scheduler.js`,
			instances: 1,
			env: {
				NODE_ENV: '.dev',
			},
		},
		// {
		// 	name: `server`,
		// 	script: `./server.js`,
		// 	instances: 1,
		// },
	],
};

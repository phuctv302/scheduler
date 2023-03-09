const path = require('path');
const fs = require('fs');
const list_special_interval = require('../list.special.interval');

class AppUtils {
	//

	static writeLogError = (log) => {
		const log_dir = `${path.dirname(__dirname)}/logs`;
		if (!fs.existsSync(log_dir)) {
			fs.mkdirSync(log_dir);
		}

		const log_file = `${log_dir}/logs.error`;

		let time_log = new Date().toLocaleString('en-US', {
			timeZone: 'Asia/Bangkok',
		});

		let content = `[${time_log}] ${log}\n\n`;

		// Write log to file
		fs.writeFileSync(
			log_file,
			content,
			{
				encoding: 'utf-8',
				flag: 'a',
			},
			(err) => {
				if (err) {
					console.log('Can not log!');
				}
			}
		);
	};

	//

	static parseInterval(intervalStr) {
		if (list_special_interval.includes(intervalStr)) {
			return intervalStr;
		}

		const [value, type] = intervalStr.split(' ');

		return {
			value: parseInt(value.trim()),
			type: type.trim(),
		};
	}
}

module.exports = AppUtils;

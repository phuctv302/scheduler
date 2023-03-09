const { Blob } = require('buffer');

class StringUtils {
	//

	/**
	 *
	 * @param {String} str
	 * @returns {Array}
	 */
	static getLines(str) {
		return str.split('\r\n');
	}

	//

	/**
	 * @desc get byte size of string
	 *
	 * @param {String} str
	 * @returns {Int}
	 */
	static getByteSize(str) {
		return new Blob([str]).size;
	}
}

module.exports = StringUtils;

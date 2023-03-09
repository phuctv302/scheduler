class ObjectUtils {
	//

	/**
	 *
	 * @param {Object} obj
	 * @param {Function} fn - function filter with @param key
	 */
	static filterByKey(obj, fn) {
		return Object.keys(obj)
			.filter((key) => fn(key))
			.reduce((cur, key) => {
				return Object.assign(cur, { [key]: obj[key] });
			}, {});
	}
}

module.exports = ObjectUtils;

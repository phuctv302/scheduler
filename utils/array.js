const _ = require('lodash');

class ArrayUtils {
	//

	static filterUniqueByKey(arr, key = 'id') {
		return [...new Map(arr.map((item) => [item[key], item])).values()];
	}

	//

	static mergeUniqueArray(arr1, arr2, key = 'id') {
		return ArrayUtils.filterUniqueByKey([...new Set([...arr1, ...arr2])], key);
	}

	//

	static uniquePush(arr, el, key = 'id') {
		if (arr.includes(el)) {
			return arr;
		}

		arr.push(el);

		return ArrayUtils.filterUniqueByKey(arr, key);
	}

	// FOR DISPLAYING
	/**
	 *
	 * @param {Array} arr
	 * @param {Int} page
	 * @param {Int} limit
	 */
	static paginate(arr, page, limit) {
		return arr.slice((page - 1) * limit, page * limit);
	}

	static sortObject(arr, ...order_by) {
		let properties = [];
		let orders = [];
		for (const el of order_by) {
			const [property, order] = el.split(' ');
			properties.push(property);
			orders.push(order.toLowerCase());
		}

		return _.orderBy(arr, properties, orders);
	}
}

module.exports = ArrayUtils;

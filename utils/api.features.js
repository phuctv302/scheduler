class APIFeatures {
	//

	constructor(query, query_string) {
		this.query = query;
		this.query_string = query_string;
	}

	//

	filter() {
		const query_obj = { ...this.query_string };
		const exclude_fields = ['sort', 'page', 'limit', 'fields'];
		exclude_fields.forEach((el) => delete query_obj[el]);

		this.query = { ...this.query, query_obj };

		return this;
	}

	//

	sort() {
		let sort_query = [];

		if (this.query_string.sort) {
			const sort_by = this.query_string.sort.split(',').join(' ');

			sort_by.map((el) => {
				const sort_type = 'ASC';
				if (el.includes('-')) {
					sort_type = 'DESC';
				}

				sort_query.push([el, sort_type]);
			});
		} else {
			sort_query = [
				['exec_time', 'ASC'],
				['id', 'DESC'],
			];
		}

		this.query = { ...this.query, order: sort_query };

		return this;
	}

	//

	paginate() {
		const page = this.query_string.page * 1 || 1;
		const limit = this.query_string.limit * 1 || 50;
		const offset = (page - 1) * limit;

		this.query = { ...this.query, offset, limit };

		return this;
	}
}

module.exports = APIFeatures;

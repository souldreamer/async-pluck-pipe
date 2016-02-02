module.exports = function(config) {
	config.set({
		browsers: ['Chrome'],
		frameworks: ['jasmine'],
		files: [
			'dist/**/*.js',
			'tests/compiled/**/*.js',
			'tests/compiled/lib/**/!*.js'
		],
		reporters: ['kjhtml']
	});
};

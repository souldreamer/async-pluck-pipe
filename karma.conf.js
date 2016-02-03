module.exports = function(config) {
	config.set({
		browsers: ['Chrome'],
		frameworks: ['jasmine', 'systemjs'],
		files: [
			'dist/**/*.js',
			'tests/compiled/**/*.spec.js'
		],
		reporters: ['kjhtml'],
		plugins: [
			'karma-systemjs',
			'karma-jasmine',
			'karma-chrome-launcher',
			'karma-jasmine-html-reporter'
		],

		systemjs: {
			// Path to your SystemJS configuration file
			configFile: './system.conf.js',

			// Patterns for files that you want Karma to make available, but not loaded until a module requests them. eg. Third-party libraries.
			serveFiles: [
				'compiled/lib/**/*.js'
			],

			// SystemJS configuration specifically for tests, added after your config file.
			// Good for adding test libraries and mock modules
			config: {
				paths: {
					'angular-mocks': 'node_modules/angular-mocks/angular-mocks.js'
				}
			}
		}
	});
};

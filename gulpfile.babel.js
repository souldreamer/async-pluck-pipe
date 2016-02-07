'use strict';

/**
 * Usage: node ./node_modules/gulp/bin/gulp.js ......
 */

/**
 * Class to hold some recurring values used further in the script
 */
class Settings {
	constructor() {
		this.appName = 'Udacity Event Planner';

		this.docsFolder = './docs';
		this.readmeFile = './README.md';

		this.sourceApp = './src';
		this.dist = './dist';

		this.tsOutputPath = `${this.dist}/js`;
		this.allTypeScript = `${this.sourceApp}/**/*.ts`;
		this.allTypings = [
			'./typings/**/*.d.ts'
		];
		this.typingsOutputPath = './typings/typescriptApp.d.ts';

		this.allAssets = [
			`${this.sourceApp}/**/*`,
			`!${this.allTypeScript}`
		];
		this.watchFiles = [
				'/index.html',
				'/**/*.js',
				'/**/*.css',
				'/**/*.png', '/**/*.jpg', '/**/*.jpeg', '/**/*.gif'
			].map(file => this.dist + file);

		this.indexHtml = `${this.sourceApp}/index.html`;
		this.indexHtmlOut = `${this.dist}/index.html`;
		this.libOutputPath = `${this.tsOutputPath}/lib`;
		this.jsLibs = [
			'./node_modules/es6-shim/es6-shim.js',
			'./node_modules/angular2/bundles/angular2-polyfills.js',
			'./node_modules/systemjs/dist/system.src.js',
			'./node_modules/rxjs/bundles/Rx.js',
			'./node_modules/angular2/bundles/angular2.dev.js',
			'./node_modules/angular2/bundles/router.dev.js',
			'./node_modules/angular2/bundles/http.dev.js'
		];

		this.testBase = './tests';
		this.testFiles = [
			`${this.testBase}/**/*.ts`
		];
		this.testFilesOut = `${this.testBase}/compiled`;
		this.testFilesOutGlob = `${this.testFilesOut}/**/*.js`;
		this.testMainPre = `${this.testBase}/unit-tests.pre.html`;
		this.testMain = `${this.testBase}/unit-tests.html`;
		this.testLibs = [
			'./node_modules/jasmine-core/lib/jasmine-core/jasmine.js',
			'./node_modules/jasmine-core/lib/jasmine-core/jasmine-html.js',
			'./node_modules/jasmine-core/lib/jasmine-core/boot.js',
			'./node_modules/es6-shim/es6-shim.js',
			'./node_modules/angular2/bundles/angular2-polyfills.js',
			'./node_modules/systemjs/dist/system.src.js',
			'./node_modules/rxjs/bundles/Rx.js',
			'./node_modules/angular2/bundles/angular2.dev.js',
			'./node_modules/angular2/bundles/router.dev.js',
			'./node_modules/angular2/bundles/http.dev.js',
			'./node_modules/angular2/bundles/testing.dev.js'
		];
		this.testLibsOutputPath = `${this.testFilesOut}/lib`;
		this.testLibsOutGlob = [`${this.testLibsOutputPath}/**/*.js`];
		this.testLibsStyles = [
			'./node_modules/jasmine-core/lib/jasmine-core/jasmine.css'
		];
		this.testLibsStylesOutputPath = `${this.testLibsOutputPath}/styles`;
		this.testLibsStylesOutGlob = `${this.testLibsStylesOutputPath}/**/*.*`;
	}
}
const settings = new Settings();

const process = require('process');
const gulp = require('gulp');
const debug = require('gulp-debug');
const inject = require('gulp-inject');
const tsc = require('gulp-typescript');
const tslint = require('gulp-tslint');
const sourcemaps = require('gulp-sourcemaps');
const del = require('del');
const tsProject = tsc.createProject('tsconfig.json', {typescript: require('typescript')});
const merge = require('merge2');
const browserSync = require('browser-sync').create(undefined, undefined);
const superstatic = require('superstatic');
const typedoc = require('gulp-typedoc');
const historyApiFallback = require('connect-history-api-fallback');
const preprocess = require('gulp-preprocess');
//const inlineNg2Template = require('gulp-inline-ng2-template');
const sortStream = require('sort-stream');
const print = require('gulp-print');
const order = require('gulp-order');
const rename = require('gulp-rename');
const karmaServer = require('karma').Server;

gulp.task('ts:lint', tsLint);
gulp.task('ts:compile', tsCompile);
gulp.task('ts:clean', tsClean);
gulp.task('watch', watch);
gulp.task('ts:doc', tsDoc);
gulp.task('copy:assets', gulp.series(copyLibs, copyIndex, copyAssets));
gulp.task('clean', clean);
gulp.task('build', gulp.parallel('copy:assets', /*'ts:lint',*/ 'ts:compile'));
gulp.task('build:clean', gulp.series('clean', 'build'));
gulp.task('serve', gulp.parallel('watch', gulp.series('build:clean', serve)));
gulp.task('default', gulp.series('serve'));

gulp.task('tests:compile', testsCompile);
gulp.task('tests:build:index', testsIndexBuild);
gulp.task('tests:copy:libs'. testsCopyLibs);
gulp.task('tests:clean', testsClean);
gulp.task('tests:watch', testsWatch);
gulp.task('tests:build', gulp.series(gulp.parallel(testsCopyLibs, 'tests:compile'), 'tests:build:index'));
gulp.task('tests:clean:build', gulp.series('tests:clean', 'tests:build'));
gulp.task('tests:run', gulp.parallel('tests:watch', gulp.series('tests:clean:build', testsRun)));
gulp.task('tests:karma', gulp.series('tests:build', testsKarma));

function tsLint() {
	return gulp
		.src(settings.allTypeScript)
		.pipe(tslint())
		.pipe(tslint.report('verbose'));
}
tsLint.description = 'Linting TypeScript sources';

function tsCompile() {
	return compileTypescript(
		[settings.allTypeScript, ...settings.allTypings],
		settings.tsOutputPath,
		settings.typingsOutputPath
	);
}
tsCompile.description = 'Compiling TypeScript sources';

function tsClean() {
	return del([
		`${settings.tsOutputPath}/**/*.js`,
		`${settings.tsOutputPath}/**/*.js.map`,
		`!${settings.tsOutputPath}/lib`
	]);
}
tsClean.description = 'Cleaning compiled sources';

function clean() {
	return del([settings.dist]);
}
clean.description = 'Cleaning entire dist';

function watch() {
	gulp.watch([settings.allTypeScript], gulp.series(/*'ts:lint',*/ 'ts:compile')).on('change', () => browserSync.reload());
	gulp.watch([settings.indexHtml], gulp.series('copy:assets')).on('change', () => browserSync.reload());
	gulp.watch([
		`${settings.sourceApp}/**/*.html`,
		`!${settings.indexHtml}`
	], gulp.series('copy:assets')).on('change', () => browserSync.reload());
	gulp.watch([`${settings.sourceApp}/**/*.css`], gulp.series('copy:assets')).on('change', () => browserSync.reload());
	gulp.watch([`${settings.sourceApp}/**/*.js`], gulp.series('copy:assets')).on('change', () => browserSync.reload()); //?
	return Promise.resolve();
}
watch.description = 'Watching TypeScript sources';

function serve() {
	browserSync.init({
		port: 3000,
		files: settings.watchFiles,
		injectChanges: true,
		logFileChanges: true,
		logLevel: 'info',
		logPrefix: 'event-planner',
		notify: true,
		reloadDelay: 0,
		ghostMode: {
			clicks: true,
			forms: true,
			scroll: true
		},
		tunnel: true,
		open: 'tunnel',
		server: {
			baseDir: [settings.dist],
			middleware: [historyApiFallback()]//superstatic({debug: false})
		},
		ui: {
			port: 3030
		}
	});
}
serve.description = 'Starting browserSync';

function tsDoc() {
	let tsDocSettings = {
		module: 'commonjs',
		target: 'es5',
		mode: 'file',
		experimentalDecorators: true,

		out: settings.docsFolder,

		name: settings.appName,
		readme: settings.readmeFile,
		theme: 'default',

		ignoreCompilerErrors: false,
		hideGenerator: true,
		verbose: true
	};

	return gulp
		.src([...settings.allTypings, settings.allTypeScript])
		.pipe(typedoc(tsDocSettings));
}
tsDoc.description = 'Generating TypeScript documentation';

function copyLibs() {
	return gulp
		.src(settings.jsLibs)
		.pipe(gulp.dest(settings.libOutputPath));
}
copyLibs.description = 'Copying libs to distribution folder';

function copyIndex() {
	return gulp
		.src(settings.indexHtml)
		.pipe(gulp.dest(settings.dist));
}
copyLibs.description = 'Copying index HTML file to distribution folder';

function getIndex(array, element) {
	for (let index = 0; index < array.length; index++) {
		if (array[index] === element) {
			return index;
		}
	}
	return -1;
}

function keepArrayOrderSort(array, ascending) {
	if (ascending === undefined) ascending = true;

	return function(fileA, fileB) {
		let a = fileA.history[0];
		let b = fileB.history[0];
		a = a.substr(a.lastIndexOf('/') + 1);
		b = b.substr(b.lastIndexOf('/') + 1);
		let order = getIndex(array, a) - getIndex(array, b);

		return (ascending ? 1 : -1) * order;
	}
}

// needs to run after copyLibs and copyIndex (in series)
function copyAssets() {
	let jsLibsFiles = settings.jsLibs.map(lib => lib.substr(lib.lastIndexOf('/') + 1));

	return merge([
		gulp
			.src(settings.indexHtmlOut)
			.pipe(inject(
				gulp
					.src(`${settings.libOutputPath}/*.js`, {read: false})
					.pipe(sortStream(keepArrayOrderSort(jsLibsFiles))),
				{
					relative: true,
					starttag: '<!-- inject:libs -->'
				}))
			.pipe(gulp.dest(settings.dist)),
		gulp
			.src([...settings.allAssets, `!${settings.indexHtml}`])
		.pipe(gulp.dest(settings.dist))
	]);
}
copyAssets.description = 'Copying assets to distribution folder';

function testsCompile() {
	return compileTypescript([...settings.testFiles, ...settings.allTypings], settings.testFilesOut);
}
testsCompile.description = 'Compiling test files';

function testsRun() {
	browserSync.init({
		port: 3050,
		files: [settings.testFilesOutGlob, settings.testMain, settings.watchFiles],
		injectChanges: true,
		logFileChanges: true,
		logLevel: 'info',
		logConnections: true,
		logPrefix: 'async-pipe-tests',
		reloadDelay: 0,
		server: {
			baseDir: ['.']
		},
		startPath: settings.testMain
	});
}
testsRun.description = 'Running tests';

function testsIndexBuild() {
	let libFileNames = settings.testLibs.map(lib => lib.substr(lib.lastIndexOf('/') + 1));

	return gulp
		.src(settings.testMainPre)
		.pipe(inject(
			gulp.src(settings.testLibsStylesOutGlob, {read: false}),
			{
				relative: true,
				starttag: '<!-- inject:libs:css -->',
				transform: (filepath) => `<link rel="stylesheet" href="tests/${filepath}">`
			}
		))
		.pipe(inject(
			gulp
				.src(`${settings.testLibsOutputPath}/*.js`, {read: false})
				.pipe(sortStream(keepArrayOrderSort(libFileNames))),
			{
				relative: true,
				starttag: '<!-- inject:libs -->',
				transform: (filepath) => `<script src="tests/${filepath}"></script>`
			}
		))
		.pipe(inject(
			gulp.src([
				settings.testFilesOutGlob,
				...(settings.testLibsOutGlob.map(lib => `!${lib}`))
			], {read: false}),
			{
				relative: true,
				starttag: '/* inject:js:imports */',
				endtag: '/* endinject */',
				transform: (filepath) => `System.import('tests/${filepath}');`
			}
		))
		.pipe(rename(settings.testMain))
		.pipe(gulp.dest('.'));
}
testsIndexBuild.description = 'Build unit-tests.html';

function testsCopyLibs() {
	return merge([
		gulp
			.src(settings.testLibs)
			.pipe(gulp.dest(settings.testLibsOutputPath)),
		gulp
			.src(settings.testLibsStyles)
			.pipe(gulp.dest(settings.testLibsStylesOutputPath))
	]);
}
testsCopyLibs.description = 'Copy libs used by tests';

function testsClean() {
	return del([settings.testFilesOut, settings.testMain]);
}
testsClean.description = 'Clean compiled test files';

function testsWatch() {
	gulp.watch([settings.testMainPre], gulp.series('tests:build:index')).on('change', () => browserSync.reload());
	gulp.watch([settings.testFiles], gulp.series('tests:build')).on('change', () => browserSync.reload());
	watch();
	return Promise.resolve();
}
testsWatch.description = 'Watch test files for changes';

function testsKarma() {
	return new Promise((resolve) => {
		new karmaServer({
			configFile: __dirname + '/karma.conf.js',
			singleRun: true
		}, resolve).start();
	});
}

//**************************** UTILITY FUNCTIONS ****************************

function compileTypescript(sources, jsOutput, dtsOutput) {
	let tsResult = gulp
		.src(sources)
		.pipe(sourcemaps.init())
		.pipe(tsc(tsProject));

	let resultArray = [];
	if (dtsOutput !== null && dtsOutput !== undefined) {
		resultArray.push(tsResult.dts.pipe(gulp.dest(dtsOutput)));
	}

	resultArray.push(tsResult.js
		.pipe(sourcemaps.write('.'))
		.pipe(gulp.dest(jsOutput)));

	return merge(resultArray);
}

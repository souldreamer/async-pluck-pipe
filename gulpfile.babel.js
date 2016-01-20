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
		this.libraryTypeScriptDefinitions = './typings/**/*.ts';

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
const tsProject = tsc.createProject('tsconfig.json');
const merge = require('merge2');
const browserSync = require('browser-sync');
const superstatic = require('superstatic');
const typedoc = require('gulp-typedoc');
const historyApiFallback = require('connect-history-api-fallback');
const preprocess = require('gulp-preprocess');
const inlineNg2Template = require('gulp-inline-ng2-template');
const sortStream = require('sort-stream');
const print = require('gulp-print');
const order = require('gulp-order');

gulp.task('ts:lint', tsLint);
gulp.task('ts:compile', tsCompile);
gulp.task('ts:clean', tsClean);
gulp.task('watch', watch);
gulp.task('ts:doc', tsDoc);
gulp.task('copy:assets', gulp.series(copyLibs, copyIndex, copyAssets));
gulp.task('clean', clean);
gulp.task('build', gulp.parallel('copy:assets', 'ts:lint', 'ts:compile'));
gulp.task('build:clean', gulp.series('clean', 'build'));
gulp.task('serve', gulp.parallel('watch', gulp.series('build:clean', serve)));
gulp.task('default', gulp.series('serve'));

function tsLint() {
	return gulp
		.src(settings.allTypeScript)
		.pipe(tslint())
		.pipe(tslint.report('verbose'));
}
tsLint.description = 'Linting TypeScript sources';

function tsCompile() {
	var tsResult = gulp
		.src([settings.allTypeScript, settings.libraryTypeScriptDefinitions])
		.pipe(sourcemaps.init())
		.pipe(tsc(tsProject));

	return merge([
		tsResult.dts.pipe(gulp.dest(settings.typingsOutputPath)),
		tsResult.js
			.pipe(sourcemaps.write('.'))
			.pipe(gulp.dest(settings.tsOutputPath))
	]);
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
	gulp.watch([settings.allTypeScript], gulp.series('ts:lint', 'ts:compile'));
	gulp.watch([settings.indexHtml], gulp.series('copy:assets'));
	gulp.watch([
		`${settings.sourceApp}/**/*.html`,
		`!${settings.indexHtml}`
	], gulp.series('copy:assets'));
	gulp.watch([`${settings.sourceApp}/**/*.css`], gulp.series('copy:assets'));
	gulp.watch([`${settings.sourceApp}/**/*.js`], gulp.series('copy:assets')); //?
}
watch.description = 'Watching TypeScript sources';

function serve() {
	browserSync({
		port: 3000,
//		files: settings.watchFiles,
//		injectChanges: true,
		logFileChanges: true,
		logLevel: 'info',
		logPrefix: 'event-planner',
		notify: true,
		reloadDelay: 0,
//		ghostMode: {
//			clicks: true,
//			forms: true,
//			scroll: true
//		},
//		tunnel: true,
//		open: 'tunnel',
		server: {
			baseDir: [settings.dist]//,
//			middleware: [historyApiFallback()]//superstatic({debug: false})
		}//,
//		ui: {
//			port: 3030
//		}
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

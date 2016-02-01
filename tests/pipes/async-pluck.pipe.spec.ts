// based on https://github.com/angular/angular/blob/master/modules/angular2/test/common/pipes/async_pipe_spec.ts
import {describe, it, expect, beforeEach, afterEach, inject, injectAsync} from 'angular2/testing';
import {browserDetection} from 'angular2/src/testing/utils';
import {isBlank} from 'angular2/src/facade/lang';
import {AsyncPluckPipe} from '../../src/app/pipes/async-pluck.pipe';
import {WrappedValue} from 'angular2/core';
import {
	EventEmitter,
	ObservableWrapper,
	PromiseWrapper,
	TimerWrapper,
	PromiseCompleter
} from 'angular2/src/facade/async';
import {DOM} from 'angular2/src/platform/dom/dom_adapter';
import {ChangeDetectorRef} from 'angular2/src/core/change_detection/change_detector_ref';
import {SpyObject} from 'angular2/src/testing/testing_internal';
import {setBaseTestProviders} from 'angular2/testing';
import {
	TEST_BROWSER_PLATFORM_PROVIDERS,
	TEST_BROWSER_APPLICATION_PROVIDERS
} from 'angular2/platform/testing/browser';

setBaseTestProviders(TEST_BROWSER_PLATFORM_PROVIDERS, TEST_BROWSER_APPLICATION_PROVIDERS);

export class SpyChangeDetectorRef extends SpyObject {
	constructor() {
		super(ChangeDetectorRef);
		this.spy('markForCheck');
	}
}

function injectAsyncCallback(injectors: any[], fn: any) {
	return injectAsync(injectors, (...params) => {
		return new Promise((resolve) => {
			fn(...[...params, resolve]);
		});
	});
}

export function main() {
	describe("AsyncPipe functionality maintained", () => {

		describe('Observable', () => {
			var emitter: EventEmitter<any>;
			var pipe: AsyncPluckPipe;
			var ref: SpyChangeDetectorRef;
			var message = {};

			beforeEach(() => {
				emitter = new EventEmitter();
				ref = new SpyChangeDetectorRef();
				pipe = new AsyncPluckPipe(<any>ref);
			});

			describe("transform", () => {
				it("should return null when subscribing to an observable",
					() => { expect(pipe.transform(emitter)).toBe(null); });

				it("should return the latest available value wrapped",
					injectAsyncCallback([], (done) => {
						pipe.transform(emitter);

						ObservableWrapper.callEmit(emitter, message);

						TimerWrapper.setTimeout(() => {
							expect(pipe.transform(emitter)).toEqual(new WrappedValue(message));
							done();
						}, 0);
					}));

				it("should return same value when nothing has changed since the last call",
					injectAsyncCallback([], (done) => {
						pipe.transform(emitter);
						ObservableWrapper.callEmit(emitter, message);

						TimerWrapper.setTimeout(() => {
							pipe.transform(emitter);
							expect(pipe.transform(emitter)).toBe(message);
							done();
						}, 0);
					}));

				it("should dispose of the existing subscription when subscribing to a new observable",
					injectAsyncCallback([], (done) => {
						pipe.transform(emitter);

						var newEmitter = new EventEmitter();
						expect(pipe.transform(newEmitter)).toBe(null);

						// this should not affect the pipe
						ObservableWrapper.callEmit(emitter, message);

						TimerWrapper.setTimeout(() => {
							expect(pipe.transform(newEmitter)).toBe(null);
							done();
						}, 0);
					}));

				it("should request a change detection check upon receiving a new value",
					injectAsyncCallback([], (done) => {
						pipe.transform(emitter);
						ObservableWrapper.callEmit(emitter, message);

						TimerWrapper.setTimeout(() => {
							expect(ref.spy('markForCheck')).toHaveBeenCalled();
							done();
						}, 0);
					}));
			});

			describe("ngOnDestroy", () => {
				it("should do nothing when no subscription",
					() => { expect(() => pipe.ngOnDestroy()).not.toThrow(); });

				it("should dispose of the existing subscription",
					injectAsyncCallback([], (done) => {
						pipe.transform(emitter);
						pipe.ngOnDestroy();

						ObservableWrapper.callEmit(emitter, message);

						TimerWrapper.setTimeout(() => {
							expect(pipe.transform(emitter)).toBe(null);
							done();
						}, 0);
				}));
			});
		});

		describe("Promise", () => {
			var message: Object = {};
			var pipe: AsyncPluckPipe;
			var completer: PromiseCompleter<any>;
			var ref: SpyChangeDetectorRef;
			// adds longer timers for passing tests in IE
			var timer = (!isBlank(DOM) && browserDetection.isIE) ? 50 : 0;

			beforeEach(() => {
				completer = PromiseWrapper.completer();
				ref = new SpyChangeDetectorRef();
				pipe = new AsyncPluckPipe(<any>ref);
			});

			describe("transform", () => {
				it("should return null when subscribing to a promise",
					() => { expect(pipe.transform(completer.promise)).toBe(null); });

				it("should return the latest available value", injectAsyncCallback([], (done) => {
					pipe.transform(completer.promise);

					completer.resolve(message);

					TimerWrapper.setTimeout(() => {
						expect(pipe.transform(completer.promise)).toEqual(new WrappedValue(message));
						done();
					}, timer);
				}));

				it("should return unwrapped value when nothing has changed since the last call",
					injectAsyncCallback([], (done) => {
						pipe.transform(completer.promise);
						completer.resolve(message);

						TimerWrapper.setTimeout(() => {
							pipe.transform(completer.promise);
							expect(pipe.transform(completer.promise)).toBe(message);
							done();
						}, timer);
					}));

				it("should dispose of the existing subscription when subscribing to a new promise",
					injectAsyncCallback([], (done) => {
						pipe.transform(completer.promise);

						var newCompleter = PromiseWrapper.completer();
						expect(pipe.transform(newCompleter.promise)).toBe(null);

						// this should not affect the pipe, so it should return WrappedValue
						completer.resolve(message);

						TimerWrapper.setTimeout(() => {
							expect(pipe.transform(newCompleter.promise)).toBe(null);
							done();
						}, timer);
					}));

				it("should request a change detection check upon receiving a new value",
					injectAsyncCallback([], (done) => {
						pipe.transform(completer.promise);
						completer.resolve(message);

						TimerWrapper.setTimeout(() => {
							expect(ref.spy('markForCheck')).toHaveBeenCalled();
							done();
						}, timer);
					}));

				describe("ngOnDestroy", () => {
					it("should do nothing when no source",
						() => { expect(() => pipe.ngOnDestroy()).not.toThrow(); });

					it("should dispose of the existing source", injectAsyncCallback([], (done) => {
						pipe.transform(completer.promise);
						expect(pipe.transform(completer.promise)).toBe(null);
						completer.resolve(message);

						TimerWrapper.setTimeout(() => {
							expect(pipe.transform(completer.promise)).toEqual(new WrappedValue(message));
							pipe.ngOnDestroy();
							expect(pipe.transform(completer.promise)).toBe(null);
							done();
						}, timer);
					}));
				});
			});
		});

		describe('null', () => {
			it('should return null when given null', () => {
				var pipe = new AsyncPluckPipe(null);
				expect(pipe.transform(null, [])).toEqual(null);
			});
		});

		describe('other types', () => {
			it('should throw when given an invalid object', () => {
				var pipe = new AsyncPluckPipe(null);
				expect(() => pipe.transform(<any>"some bogus object", [])).toThrowError();
			});
		});
	});
}
main();
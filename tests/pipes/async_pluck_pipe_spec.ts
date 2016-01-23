// based on https://github.com/angular/angular/blob/master/modules/angular2/test/common/pipes/async_pipe_spec.ts
///<reference path="../../typings/jasmine/jasmine.d.ts" />
import {
	ddescribe,
	describe,
	it,
	iit,
	xit,
	expect,
	beforeEach,
	afterEach,
	AsyncTestCompleter,
	inject,
	browserDetection
} from 'angular2/testing_internal';
import {isBlank} from 'angular2/src/facade/lang';
import {AsyncPluckPipe} from '../src/app/pipes/async-pluck.pipe';
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
import {SpyObject, proxy} from 'angular2/src/testing/testing_internal';

export class SpyChangeDetectorRef extends SpyObject {
	constructor() {
		super(ChangeDetectorRef);
		this.spy('markForCheck');
	}
}

export function main() {
	describe("AsyncPipe functionality maintained", () => {

		describe('Observable', () => {
			var emitter;
			var pipe;
			var ref: SpyChangeDetectorRef;
			var message = {};

			beforeEach(() => {
				emitter = new EventEmitter();
				ref = new SpyChangeDetectorRef();
				pipe = new AsyncPluckPipe(<ChangeDetectorRef>ref);
			});

			describe("transform", () => {
				it("should return null when subscribing to an observable",
					() => { expect(pipe.transform(emitter)).toBe(null); });

				it("should return the latest available value wrapped",
					inject([AsyncTestCompleter], (async: AsyncTestCompleter) => {
						pipe.transform(emitter);

						ObservableWrapper.callEmit(emitter, message);

						TimerWrapper.setTimeout(() => {
							expect(pipe.transform(emitter)).toEqual(new WrappedValue(message));
							async.done();
						}, 0)
					}));


				it("should return same value when nothing has changed since the last call",
					inject([AsyncTestCompleter], (async: AsyncTestCompleter) => {
						pipe.transform(emitter);
						ObservableWrapper.callEmit(emitter, message);

						TimerWrapper.setTimeout(() => {
							pipe.transform(emitter);
							expect(pipe.transform(emitter)).toBe(message);
							async.done();
						}, 0)
					}));

				it("should dispose of the existing subscription when subscribing to a new observable",
					inject([AsyncTestCompleter], (async: AsyncTestCompleter) => {
						pipe.transform(emitter);

						var newEmitter = new EventEmitter();
						expect(pipe.transform(newEmitter)).toBe(null);

						// this should not affect the pipe
						ObservableWrapper.callEmit(emitter, message);

						TimerWrapper.setTimeout(() => {
							expect(pipe.transform(newEmitter)).toBe(null);
							async.done();
						}, 0)
					}));

				it("should request a change detection check upon receiving a new value",
					inject([AsyncTestCompleter], (async: AsyncTestCompleter) => {
						pipe.transform(emitter);
						ObservableWrapper.callEmit(emitter, message);

						TimerWrapper.setTimeout(() => {
							expect(ref.spy('markForCheck')).toHaveBeenCalled();
							async.done();
						}, 0)
					}));
			});

			describe("ngOnDestroy", () => {
				it("should do nothing when no subscription",
					() => { expect(() => pipe.ngOnDestroy()).not.toThrow(); });

				it("should dispose of the existing subscription", inject([AsyncTestCompleter], (async: AsyncTestCompleter) => {
					pipe.transform(emitter);
					pipe.ngOnDestroy();

					ObservableWrapper.callEmit(emitter, message);

					TimerWrapper.setTimeout(() => {
						expect(pipe.transform(emitter)).toBe(null);
						async.done();
					}, 0)
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
				pipe = new AsyncPluckPipe(<ChangeDetectorRef>ref);
			});

			describe("transform", () => {
				it("should return null when subscribing to a promise",
					() => { expect(pipe.transform(completer.promise)).toBe(null); });

				it("should return the latest available value", inject([AsyncTestCompleter], (async: AsyncTestCompleter) => {
					pipe.transform(completer.promise);

					completer.resolve(message);

					TimerWrapper.setTimeout(() => {
						expect(pipe.transform(completer.promise)).toEqual(new WrappedValue(message));
						async.done();
					}, timer)
				}));

				it("should return unwrapped value when nothing has changed since the last call",
					inject([AsyncTestCompleter], (async: AsyncTestCompleter) => {
						pipe.transform(completer.promise);
						completer.resolve(message);

						TimerWrapper.setTimeout(() => {
							pipe.transform(completer.promise);
							expect(pipe.transform(completer.promise)).toBe(message);
							async.done();
						}, timer)
					}));

				it("should dispose of the existing subscription when subscribing to a new promise",
					inject([AsyncTestCompleter], (async: AsyncTestCompleter) => {
						pipe.transform(completer.promise);

						var newCompleter = PromiseWrapper.completer();
						expect(pipe.transform(newCompleter.promise)).toBe(null);

						// this should not affect the pipe, so it should return WrappedValue
						completer.resolve(message);

						TimerWrapper.setTimeout(() => {
							expect(pipe.transform(newCompleter.promise)).toBe(null);
							async.done();
						}, timer)
					}));

				it("should request a change detection check upon receiving a new value",
					inject([AsyncTestCompleter], (async: AsyncTestCompleter) => {
						pipe.transform(completer.promise);
						completer.resolve(message);

						TimerWrapper.setTimeout(() => {
							expect(ref.spy('markForCheck')).toHaveBeenCalled();
							async.done();
						}, timer)
					}));

				describe("ngOnDestroy", () => {
					it("should do nothing when no source",
						() => { expect(() => pipe.ngOnDestroy()).not.toThrow(); });

					it("should dispose of the existing source", inject([AsyncTestCompleter], (async: AsyncTestCompleter) => {
						pipe.transform(completer.promise);
						expect(pipe.transform(completer.promise)).toBe(null);
						completer.resolve(message);


						TimerWrapper.setTimeout(() => {
							expect(pipe.transform(completer.promise)).toEqual(new WrappedValue(message));
							pipe.ngOnDestroy();
							expect(pipe.transform(completer.promise)).toBe(null);
							async.done();
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

// based on https://github.com/angular/angular/blob/master/modules/angular2/test/common/pipes/async_pipe_spec.ts
import {describe, it, expect, beforeEach, afterEach, inject, injectAsync} from 'angular2/testing';
import {browserDetection} from 'angular2/src/testing/utils';
import {isBlank} from 'angular2/src/facade/lang';
import {WrappedValue} from 'angular2/core';
import {EventEmitter, ObservableWrapper, PromiseWrapper, TimerWrapper, PromiseCompleter} from 'angular2/src/facade/async';
import {DOM} from 'angular2/src/platform/dom/dom_adapter';
import {ChangeDetectorRef} from 'angular2/src/core/change_detection/change_detector_ref';
import {StringMapWrapper} from 'angular2/src/facade/collection';
import {setBaseTestProviders} from 'angular2/testing';
import {TEST_BROWSER_PLATFORM_PROVIDERS, TEST_BROWSER_APPLICATION_PROVIDERS} from 'angular2/platform/testing/browser';

// from: https://github.com/angular/angular/blob/f529236bfc7868c3c53438c1b20d821c12bb8d4a/modules/angular2/src/testing/testing_internal.ts
interface GuinessCompatibleSpy extends jasmine.Spy {
	/** By chaining the spy with and.returnValue, all calls to the function will return a specific
	 * value. */
	andReturn(val: any): void;
	/** By chaining the spy with and.callFake, all calls to the spy will delegate to the supplied
	 * function. */
	andCallFake(fn: Function): GuinessCompatibleSpy;
	/** removes all recorded calls */
	reset(): any;
}

class SpyObject {
	constructor(type: any = null) {
		if (type) {
			for (var prop in type.prototype) {
				var m: any = null;
				try {
					m = type.prototype[prop];
				} catch (e) {
					// As we are creating spys for abstract classes,
					// these classes might have getters that throw when they are accessed.
					// As we are only auto creating spys for methods, this
					// should not matter.
				}
				if (typeof m === 'function') {
					this.spy(prop);
				}
			}
		}
	}
	// Noop so that SpyObject has the same interface as in Dart
	noSuchMethod(args: any) {}

	spy(name: any) {
		if (!this[name]) {
			this[name] = this._createGuinnessCompatibleSpy(name);
		}
		return this[name];
	}

	prop(name: any, value: any) { this[name] = value; }

	static stub(object: any = null, config: any = null, overrides: any = null) {
		if (!(object instanceof SpyObject)) {
			overrides = config;
			config = object;
			object = new SpyObject();
		}

		var m = StringMapWrapper.merge(config, overrides);
		StringMapWrapper.forEach(m, (value: any, key: any) => { object.spy(key).andReturn(value); });
		return object;
	}

	/** @internal */
	_createGuinnessCompatibleSpy(name: any): GuinessCompatibleSpy {
		var newSpy: GuinessCompatibleSpy = <any>jasmine.createSpy(name);
		newSpy.andCallFake = <any>newSpy.and.callFake;
		newSpy.andReturn = <any>newSpy.and.returnValue;
		newSpy.reset = <any>newSpy.calls.reset;
		// revisit return null here (previously needed for rtts_assert).
		newSpy.and.returnValue(null);
		return newSpy;
	}
}


import {AsyncPluckPipe} from '../../src/app/pipes/async-pluck.pipe';

setBaseTestProviders(TEST_BROWSER_PLATFORM_PROVIDERS, TEST_BROWSER_APPLICATION_PROVIDERS);

export class SpyChangeDetectorRef extends SpyObject {
	constructor() {
		super(ChangeDetectorRef);
		this.spy('markForCheck');
	}
}

function injectAsyncCallback(injectors: any[], fn: any) {
	return injectAsync(injectors, (...params: any[]) => {
		return new Promise((resolve) => {
			fn(...[...params, resolve]);
		});
	});
}

export function main() {
	describe("Maintain AsyncPipe functionality, therefore", () => {

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
					injectAsyncCallback([], (done: any) => {
						pipe.transform(emitter);

						ObservableWrapper.callEmit(emitter, message);

						TimerWrapper.setTimeout(() => {
							expect(pipe.transform(emitter)).toEqual(new WrappedValue(message));
							done();
						}, 0);
					}));

				it("should return same value when nothing has changed since the last call",
					injectAsyncCallback([], (done: any) => {
						pipe.transform(emitter);
						ObservableWrapper.callEmit(emitter, message);

						TimerWrapper.setTimeout(() => {
							pipe.transform(emitter);
							expect(pipe.transform(emitter)).toBe(message);
							done();
						}, 0);
					}));

				it("should dispose of the existing subscription when subscribing to a new observable",
					injectAsyncCallback([], (done: any) => {
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
					injectAsyncCallback([], (done: any) => {
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
					injectAsyncCallback([], (done: any) => {
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

				it("should return the latest available value", injectAsyncCallback([], (done: any) => {
					pipe.transform(completer.promise);

					completer.resolve(message);

					TimerWrapper.setTimeout(() => {
						expect(pipe.transform(completer.promise)).toEqual(new WrappedValue(message));
						done();
					}, timer);
				}));

				it("should return unwrapped value when nothing has changed since the last call",
					injectAsyncCallback([], (done: any) => {
						pipe.transform(completer.promise);
						completer.resolve(message);

						TimerWrapper.setTimeout(() => {
							pipe.transform(completer.promise);
							expect(pipe.transform(completer.promise)).toBe(message);
							done();
						}, timer);
					}));

				it("should dispose of the existing subscription when subscribing to a new promise",
					injectAsyncCallback([], (done: any) => {
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
					injectAsyncCallback([], (done: any) => {
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

					it("should dispose of the existing source", injectAsyncCallback([], (done: any) => {
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

	describe('Pluck functionality', () => {
		var emitter: EventEmitter<any>;
		var pipe: AsyncPluckPipe;
		var ref: SpyChangeDetectorRef;
		var planetObject: any = {planet: 'earth'};
		var helloObject: any = {who: 'world', where: planetObject};
		var object: any = {hello: helloObject, goodbye: 'cruel fate'};
		var array: any[] = [planetObject, {hello: 'world'}, {goodbye: 'cruel world'}, {hello: 'life', goodbye: 'adieu'}];

		beforeEach(() => {
			emitter = new EventEmitter();
			ref = new SpyChangeDetectorRef();
			pipe = new AsyncPluckPipe(<any>ref);
		});

		describe('when run on an Object', () => {
			it('should pluck a direct scalar property of the object',
				injectAsyncCallback([], (done: any) => {
					pipe.transform(emitter);

					ObservableWrapper.callEmit(emitter, object);

					TimerWrapper.setTimeout(() => {
						expect(pipe.transform(emitter, ['goodbye']))
							.toEqual(new WrappedValue('cruel fate'));
						done();
					}, 0);
				}));

			it('should pluck a direct object property of the object',
				injectAsyncCallback([], (done: any) => {
					pipe.transform(emitter);

					ObservableWrapper.callEmit(emitter, object);

					TimerWrapper.setTimeout(() => {
						expect(pipe.transform(emitter, ['hello']))
							.toEqual(new WrappedValue(helloObject));
						done();
					}, 0);
				}));

			it('should pluck a scalar sub-property of a direct property of the object',
				injectAsyncCallback([], (done: any) => {
					pipe.transform(emitter);

					ObservableWrapper.callEmit(emitter, object);

					TimerWrapper.setTimeout(() => {
						expect(pipe.transform(emitter, ['hello', 'who']))
							.toEqual(new WrappedValue('world'));
						done();
					}, 0);
				}));

			it('should pluck an object sub-property of a direct property of the object',
				injectAsyncCallback([], (done: any) => {
					pipe.transform(emitter);

					ObservableWrapper.callEmit(emitter, object);

					TimerWrapper.setTimeout(() => {
						expect(pipe.transform(emitter, ['hello', 'where']))
							.toEqual(new WrappedValue(planetObject));
						done();
					}, 0);
				}));

			it('should pluck a scalar sub-property of an object sub-property of a direct property of the object',
				injectAsyncCallback([], (done: any) => {
					pipe.transform(emitter);

					ObservableWrapper.callEmit(emitter, object);

					TimerWrapper.setTimeout(() => {
						expect(pipe.transform(emitter, ['hello', 'where', 'planet']))
							.toEqual(new WrappedValue('earth'));
						done();
					}, 0);
				}));

			it('should return undefined if the property doesn\'t exist',
				injectAsyncCallback([], (done: any) => {
					pipe.transform(emitter);

					ObservableWrapper.callEmit(emitter, object);

					TimerWrapper.setTimeout(() => {
						expect(pipe.transform(emitter, ['n/a']))
							.toEqual(undefined);
						done();
					}, 0);
				}));

			it('should return undefined if trying to access a sub-property of a property that doesn\'t exist',
				injectAsyncCallback([], (done: any) => {
					pipe.transform(emitter);

					ObservableWrapper.callEmit(emitter, object);

					TimerWrapper.setTimeout(() => {
						expect(pipe.transform(emitter, ['n/a', 'sub-n/a']))
							.toEqual(undefined);
						done();
					}, 0);
				}));
		});

		describe('when run on an Array', () => {
			it('should pluck the element at an array index',
				injectAsyncCallback([], (done: any) => {
					pipe.transform(emitter);

					ObservableWrapper.callEmit(emitter, array);

					TimerWrapper.setTimeout(() => {
						expect(pipe.transform(emitter, [0]))
							.toEqual(new WrappedValue(planetObject));
						done();
					}, 0);
				}));

			it('should return an array when given a non-numeric property name, similar to _.pluck()',
				injectAsyncCallback([], (done: any) => {
					pipe.transform(emitter);

					ObservableWrapper.callEmit(emitter, array);

					TimerWrapper.setTimeout(() => {
						expect(pipe.transform(emitter, ['hello']))
							.toEqual(new WrappedValue([undefined, 'world', undefined, 'life']));
						done();
					}, 0);
				}));
		});

		describe('when run on a scalar value', () => {
			it('should return undefined when trying to access a direct property',
				injectAsyncCallback([], (done: any) => {
					pipe.transform(emitter);

					ObservableWrapper.callEmit(emitter, 1);

					TimerWrapper.setTimeout(() => {
						expect(pipe.transform(emitter, ['n/a']))
							.toEqual(undefined);
						done();
					}, 0);
				}));
		});
	});
}
main();
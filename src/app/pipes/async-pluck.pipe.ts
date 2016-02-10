import {
	Injectable,
	ChangeDetectorRef,
	OnDestroy,
	Pipe,
	PipeTransform,
	WrappedValue
} from 'angular2/core';
import {
	Promise,
	ObservableWrapper,
	Observable,
	EventEmitter
} from 'angular2/src/facade/async';
import {ChangeDetectionUtil} from 'angular2/src/core/change_detection/change_detection_util';
import {isPresent} from 'angular2/src/facade/lang';
import {AsyncPipe} from 'angular2/common';

@Pipe({name: 'asyncPluck', pure: false})
@Injectable()
export class AsyncPluckPipe
extends AsyncPipe
implements PipeTransform, OnDestroy {
	constructor(public ref: ChangeDetectorRef) {
		super(ref);
	}

	ngOnDestroy(): void {
		super.ngOnDestroy();
	}

	private _lastValue: any;

	private isInt(possibleNumber: any): boolean {
		return Number(possibleNumber) === possibleNumber && possibleNumber % 1 === 0;
	}

	transform(
		obj: Observable<any> | Promise<any> | EventEmitter<any>,
		args?: any[]
	): any {
		let originalValue: any = super.transform(obj, args);
		let value: any = ChangeDetectionUtil.unwrapValue(originalValue);
		if (isPresent(args)) {
			for (let arg of args) {
				if (isPresent(value)) {
					let isArray = Array.isArray(value);
					let isInt = this.isInt(arg);

					if (isArray && isInt || !isArray) {
						value = value[arg];
					} else {
						let arrValue: any[] = <any[]>value;
						let temp: any[] = [];
						for (let i = 0; i < arrValue.length; i++) {
							if (isPresent(arrValue[i])) {
								temp.push(arrValue[i][arg]);
							} else {
								temp.push(arrValue[i]);
							}
						}
						value = <any>temp;
					}
				}
			}
		}
		return this._lastValue === value || !(originalValue instanceof WrappedValue) ? value : WrappedValue.wrap(this._lastValue = value);
	}
}
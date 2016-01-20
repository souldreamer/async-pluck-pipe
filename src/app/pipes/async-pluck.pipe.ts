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

	transform(
		obj: Observable<any> | Promise<any> | EventEmitter<any>,
		args?: any[]
	): any {
		let asyncObj: any = super.transform(obj, args);
		if (asyncObj instanceof WrappedValue) {
			asyncObj = (<WrappedValue>asyncObj).wrapped;
		}
		let value: any = asyncObj;
		for(let arg of args) {
			if(isPresent(value)) value = value[arg];
		}
		return this._lastValue === value ? value : WrappedValue.wrap(this._lastValue = value);
	}
}
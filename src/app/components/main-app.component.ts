import {Component} from 'angular2/core';
import {Subject} from 'rxjs/Subject';
import {Observable} from 'rxjs/Observable';
import 'rxjs/add/observable/interval';
import 'rxjs/add/operator/map';
import {AsyncPluckPipe} from '../pipes/async-pluck.pipe';
import {AsyncPipe} from 'angular2/common';

@Component({
	selector: 'main-app',
	template: `<h1>Hello, world!</h1><h4>tester: {{tester | asyncPluck:'num':'val' }}</h4>`,
	pipes: [AsyncPluckPipe]
})
export class MainAppComponent {
	public tester: Subject<any> = new Subject<any>();
	constructor() {
		Observable.interval(2000).map(x => {return {num: {val: x}};}).subscribe(this.tester);
	}
}
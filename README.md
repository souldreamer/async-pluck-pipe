Angular2 asyncPluck Pipe
===
Extension to the basic `async` pipe that subscribes to a promise/observable
and shows the value once it's resolved/emitted, but additionally provides
the option to pluck a specific sub-property of the resulting object.

`{{ observable | asyncPluck:'name':'first'}}` is equivalent to writing
`{{ (observable | async)?.name?.first }}`.

This is mostly an exercise in dealing with the Angular2 source code
and in extending the base elements while keeping with the style of the sources
(which means using the internal Angular2 functions as much as possible to
both keep things DRY and to improve the chances that future versions of
Angular2 will still be compatible with the extended code).

---

## Todo:
- [ ] docs: improve/write documentation
- [ ] test: testing
- [ ] fix: `gulp ts:lint` errors out

## Installation
* run `npm install`
* run `npm run serve` (will compile, lint,
create `./dist/` folder, copy everything into
it, and start `browser-sync` & your browser)

*Attention*: don't run `gulp` directly, as I'm
using *`gulp` v4.0-alpha*. If you **really**
want to do it, either have `gulp#4.0` installed
globally or run `node node_modules/gulp/bin/gulp.js *command*`
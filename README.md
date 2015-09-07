# gerber plotter
[![npm](https://img.shields.io/npm/v/gerber-plotter.svg?style=flat-square)](https://www.npmjs.com/package/gerber-plotter)
[![Travis](https://img.shields.io/travis/mcous/gerber-plotter.svg?style=flat-square)](https://travis-ci.org/mcous/gerber-plotter)
[![Coveralls](https://img.shields.io/coveralls/mcous/gerber-plotter.svg?style=flat-square)](https://coveralls.io/github/mcous/gerber-plotter)
[![David](https://img.shields.io/david/mcous/gerber-plotter.svg?style=flat-square)](https://david-dm.org/mcous/gerber-plotter)
[![David](https://img.shields.io/david/dev/mcous/gerber-plotter.svg?style=flat-square)](https://david-dm.org/mcous/gerber-plotter#info=devDependencies)

**Work in progress.**

A printed circuit board Gerber and drill file plotter. Implemented as a Node transform stream that plotter command objects (for example, those output by [mcous/gerber-parser](https://github.com/mcous/gerber-parser)) and output PCB image objects.

## how to

This module is written in ES2016, and thus requires iojs/Node >= v3.0.0. To run in the browser, it should be transpiled to ES5 with a tool like [Babel](https://babeljs.io/) and bundled with a tool like [browserify](http://browserify.org/) or [webpack](http://webpack.github.io/).

Tested natively in iojs and with Babel and the Babel polyfill in the latest versions of Chrome, Safari, Firefox, and Internet Explorer.

`$ npm install gerber-plotter`

``` javascript
const fs = require('fs')
const gerberParser = require('gerber-parser')
const gerberPlotter = require('gerber-plotter')

const parser = gerberParser()
const plotter = gerberPlotter()

plotter.on('warning', function(w) {
  console.warn(`plotter warning at line ${w.line}: ${w.message}`)
})

fs.createReadStream('/path/to/gerber/file.gbr', {encoding: 'utf8'})
  .pipe(parser)
  .pipe(plotter)
  .on('data', function(obj) {
    console.log(obj)
  })
```

## api

See [API.md](./API.md)

## developing and contributing

The code is written in ES2015 to run in "modern" versions of Node. Tests are written in [Mocha](http://mochajs.org/) and run in Node, [PhantomJS](http://phantomjs.org/), and a variety of browsers with [Zuul](https://github.com/defunctzombie/zuul) and [Open Sauce](https://saucelabs.com/opensauce/). All PRs should be accompanied by unit tests, with ideally one feature / bugfix per PR. Code linting happens with [ESLint](http://eslint.org/) automatically post-test and pre-commit.

Code is deployed on tags via [TravisCI](https://travis-ci.org/) and code coverage is tracked with [Coveralls](https://coveralls.io/).

### build scripts

* `$ npm run lint` - lints code
* `$ npm run test` - runs Node unit tests
* `$ npm run test-watch` - runs unit tests and re-runs on changes
* `$ npm run browser-test` - runs tests in a local browser
* `$ npm run browser-test-phantom` - runs tests in PhantomJS
* `$ npm run browser-test-sauce` - runs tests in Sauce Labs on multiple browsers
  * Sauce Labs account required
* `$ npm run ci` - Script for CI server to run
  * Runs `npm test` and sends coverage report to Coveralls
  * If you want to run this locally, you'll need to set some environment variables

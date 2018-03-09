'use strict';

/**
 * Module dependencies
 */

/**
 * Expose Aggregator
 */

module.exports = Aggregator;

/**
 * Constants
 */
const ERROR = 'error';
const SKIP = 'skip';
const SUCCESS = 'success';

/**
 * Initializes an `Aggregator`
 *
 * Events:
 *
 *   - `start`  execution started
 *   - `end`  execution complete
 *   - `suite`  (suite) test suite execution started
 *   - `suite end`  (suite) all tests (and sub-suites) have finished
 *   - `test`  (test) test execution started
 *   - `test end`  (test) test completed
 *   - `hook`  (hook) hook execution started
 *   - `hook end`  (hook) hook complete
 *   - `pass`  (test) test passed
 *   - `fail`  (test, err) test failed
 *   - `pending`  (test) test pending
 *
 * @api public
 * @param {Runner} runner This is the runner for the tests which is used to
 *      collect the information about the tests from
 */
function Aggregator (runner) {
  var self = this;
  this._suites = {};
  this._tests = {};
  this._runner = runner;

  runner.on('start', function () {
    self._start = new Date();
  });
  runner.on('end', function () {
    self._end = new Date();
  });
  runner.on('suite', function (suite) {
    self._suites[suite.uid] = new Data(new Date());
  });
  runner.on('suite end', function (suite) {
    self._suites[suite.uid].setEndTime(new Date());
  });
  runner.on('test', function (test) {
    self._tests[test.uid] = new Data(new Date());
  });
  runner.on('test end', function (test) {
    self._tests[test.uid].setEndTime(new Date());
  });
  runner.on('hook', function (hook) {
    if (hook && hook.ctx && hook.ctx.currentTest && hook.ctx.currentTest.uid) {
      self._tests[hook.ctx.currentTest.uid].addHookStart(hook.uid);
    }
  });
  runner.on('hook end', function (hook) {
    if (hook && hook.ctx && hook.ctx.currentTest && hook.ctx.currentTest.uid) {
      self._tests[hook.ctx.currentTest.uid].addHookEnd(hook.uid);
    }
  });
  runner.on('pass', function (test) {
    self._tests[test.uid].setTerminalState(SUCCESS);
  });
  runner.on('fail', function (test) {
    if (self._tests[test.uid]) {
      self._tests[test.uid].setTerminalState(ERROR);
    }
  });
  runner.on('pending', function (test) {
    self._tests[test.uid].setTerminalState(SKIP);
  });
}

const _ = Aggregator.prototype;

_.getTestData = function (uid) {
  const data = this._tests[uid];
  if (!data) {
    throw new Error('uid is invalid for tests');
  }
  return data;
};

_.getSuiteData = function (uid) {
  const data = this._suites[uid];
  if (!data) {
    throw new Error('uid is invalid for suites');
  }
  return data;
};

_.getNumberOfErrors = function () {
  let total = 0;
  for (const data of this._tests) {
    total += data.getIsError();
  }
  return total;
};

_.getNumberOfSkips = function () {
  let total = 0;
  for (const data of this._tests) {
    total += data.getIsSkip();
  }
  return total;
};

_.getNumberOfSuccesses = function () {
  let total = 0;
  for (const data of this._tests) {
    total += data.getIsSuccess();
  }
  return total;
};

_.getTotalDuration = function () {
  if (this._end == null) {
    return null;
  }
  return this._end - this._start;
};

/**
 * Initializes a Data object, this is used as a means of storing data
 * @param       {Date} start The start date of the peice of information
 * @constructor
 */
function Data (start) {
  this.start = start;
  this.end = null;
  this.hooks = {};
  this.hookOrder = [];
  this.terminalState = null;
}

const __ = Data.prototype;

__.getDuration = function () {
  if (this.end == null) {
    return null;
  }
  return this.end - this.start;
};

__.getIsError = function () {
  return this.terminalState === ERROR;
};

__.getIsSkip = function () {
  return this.terminalState === SKIP;
};

__.getIsSuccess = function () {
  return this.terminalState === SUCCESS;
};

__.setTerminalState = function (state) {
  switch (state) {
    case ERROR:
    case SKIP:
    case SUCCESS:
      this.terminalState = state;
      break;
    default:
      throw new Error('state must be a valid terminalState');
  }
};

__.addHookStart = function (hookUID) {
  this.hooks[hookUID] = {
    start: new Date()
  };
  this.hookOrder.push(hookUID);
};

__.addHookEnd = function (hookUID) {
  this.hooks[hookUID].end = new Date();
};

__.setEndTime = function (end) {
  if (!(end instanceof Date)) {
    throw new Error('end must be an instanceof Date');
  }
  this.end = end;
};

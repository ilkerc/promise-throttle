(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
/* global window */

'use strict';
window.PromiseThrottle = require('./main');

},{"./main":2}],2:[function(require,module,exports){
/* exported PromiseThrottle */

'use strict';

/**
 * @constructor
 * @param {Object} options A set op options to pass to the throttle function
 *        @param {number} requestsPerSecond The amount of requests per second
 *                                          the library will limit to
 */
function PromiseThrottle(options) {
  this.requestsPerSecond = options.requestsPerSecond;
  this.promiseImplementation = options.promiseImplementation || Promise;
  this.lastStartTime = 0;
  this.queued = [];
}

/**
 * Adds a promise
 * @param {Function} promise A function returning the promise to be added
 * @param {Object} options A set of options.
 * @param {number} options.signal An AbortSignal object that can be used to abort the returned promise
 * @param {number} options.weight A "weight" of each operation resolving by array of promises
 * @return {Promise} A promise
 */
PromiseThrottle.prototype.add = function(promise, options) {
  var self = this;
  var opt = options || {};
  return new self.promiseImplementation(function(resolve, reject) {
    self.queued.push({
      resolve: resolve,
      reject: reject,
      promise: promise,
      weight: opt.weight || 1,
      signal: opt.signal
    });

    self.dequeue();
  });
};

/**
 * Adds all the promises passed as parameters
 * @param {Function} promises An array of functions that return a promise
 * @param {Object} options A set of options.
 * @param {number} options.signal An AbortSignal object that can be used to abort the returned promise
 * @param {number} options.weight A "weight" of each operation resolving by array of promises
 * @return {Promise} A promise that succeeds when all the promises passed as options do
 */
PromiseThrottle.prototype.addAll = function(promises, options) {
  var addedPromises = promises.map(function(promise) {
    return this.add(promise, options);
  }.bind(this));

  return Promise.all(addedPromises);
};

/**
 * Dequeues a promise
 * @return {void}
 */
PromiseThrottle.prototype.dequeue = function() {
  if (this.queued.length > 0) {
    var now = new Date(),
      weight = this.queued[0].weight,
      inc = (1000 / this.requestsPerSecond) * weight,
      elapsed = now - this.lastStartTime;

    if (elapsed >= inc) {
      this._execute();
    } else {
      // we have reached the limit, schedule a dequeue operation
      setTimeout(function() {
        this.dequeue();
      }.bind(this), inc - elapsed);
    }
  }
};

/**
 * Executes the promise
 * @private
 * @return {void}
 */
PromiseThrottle.prototype._execute = function() {
  this.lastStartTime = new Date();
  var candidate = this.queued.shift();
  var aborted = candidate.signal && candidate.signal.aborted;
  if (aborted) {
    candidate.reject(new DOMException('', 'AbortError'));
  } else {
    candidate.promise().then(function(r) {
      candidate.resolve(r);
    }).catch(function(r) {
      candidate.reject(r);
    });
  }
};

module.exports = PromiseThrottle;

},{}]},{},[1]);

/**
 *
 * Fastly API client for promise based control flow.
 *
 * @package fastly-promise
 * @author Reid Mayo <reidmayo@gmail.com>
 *
 */

'use strict';

//Dependencies
var requestP = require('request-promise');
var ramda = require('ramda');

/**
 *
 * Constructor
 *
 * @param {string} apiKey
 * @returns {FastlyPromise}
 * @constructor
 */
var FastlyPromise = function FastlyPromise(apiKey) {
  if(!(this instanceof FastlyPromise)) {
    if(!apiKey){
      throw new Error('Missing API key parameter.');
    }else {
      return new FastlyPromise(apiKey);
    }
  }

  this.apiKey = apiKey;
  this.endpoint = 'https://api.fastly.com';

}

/**
 *
 * Generic request method that all convenience request methods extend.
 *
 * Use this method if a convenience method does not already exist for your use case.
 *
 * @param {string} method - http method to use.
 * @param {string} url
 * @param {object} [options={}] - optional params
 *
 * The following options are available
 * {boolean} options.softPurge - Make purge requests to fastly "soft purges".
 * {object} options.headers - Arbitrary headers to be sent with request.
 * {object} options.form - POST body data encoded as application/x-www-form-urlencoded to be sent with request.
 * {object} options.requestPromiseOptions - Allows you to directly set or overwrite request-promise options for edge cases.
 *
 */
FastlyPromise.prototype.request = function request(method, url, options) {

  //Validate params
  if (!method || !url) {
    throw new Error('Missing required request parameters.');
  }

  //Point relative urls to fastly endpoint
  if(!/^((http|https):\/\/)/.test(url)) {
    url = this.endpoint + url;
  }

  //Set default options
  options = options || {};
  options.softPurge = (typeof options.softPurge == "undefined") ? false : options.softPurge;

  //Set headers
  var headers = {'Fastly-Key': this.apiKey};
  if (options.softPurge){ headers['Fastly-Soft-Purge'] = 1; }
  if (options.headers) { headers = ramda.merge(headers, options.headers); }

  //Strip API key header if request is not pointed to fastly endpoint
  if(url.substring(0, this.endpoint.length) !== this.endpoint) {
    delete headers['Fastly-Key'];
  }

  //Build request-promise options
  var requestPromiseOptions = {
    method: method,
    uri: url,
    headers: headers,
    resolveWithFullResponse: true
  };

  //Attach form payload if exists
  if (options.form) { requestPromiseOptions.form = options.form; }

  //Set/Overwrite requestPromiseOptions
  if (options.requestPromiseOptions) { requestPromiseOptions = ramda.merge(requestPromiseOptions, options.requestPromiseOptions); }

  //Fire request
  return requestP(requestPromiseOptions);

}

/**
 *
 * Purge a url.
 *
 * @param {string} url - Fully qualified url of resource you want to purge.
 * @param {boolean} [softPurge=false] - Soft purge instead of standard purge. Defaults to false.
 */
FastlyPromise.prototype.purge = function purge(url, softPurge) {

  //Purge request urls should be absolute
  if(!/^((http|https):\/\/)/.test(url)) {
    throw new Error('Standard purge requests should be absolute urls.');
  }

  softPurge = (typeof softPurge == 'undefined') ? false : softPurge;

  return this.request('PURGE', url, {softPurge: softPurge});

}

/**
 *
 * Hard purge all objects from a service.
 *
 * @param {string} serviceId - The fastly service id.
 */
FastlyPromise.prototype.purgeKey = function purgeKey(serviceId) {

  return this.request('POST', this.endpoint + '/service/' + serviceId + '/purge_all');

}

/**
 *
 * Purge a fastly surrogate key.
 *
 * @param {string} serviceId - The fastly service id.
 * @param {string} key - The surrogate key you wish to purge.
 * @param {boolean} [softPurge=false] - Soft purge instead of standard purge. Defaults to false.
 */
FastlyPromise.prototype.purgeKey = function purgeKey(serviceId, surrogateKey, softPurge) {

  softPurge = (typeof softPurge == 'undefined') ? false : softPurge;

  return this.request('POST', this.endpoint + '/service/' + serviceId + '/purge/' +  surrogateKey, {softPurge: softPurge});

}

module.exports = FastlyPromise;
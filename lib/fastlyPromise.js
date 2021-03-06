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
var Promise = require('bluebird');

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
 * @returns {object|array|string} response from fastly.
 * @throws Will throw error if missing required method or url params.
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

  //Fire request, process response.
  return requestP(requestPromiseOptions)
    .then(function(response){
      return (response.headers['content-type'] == 'application/json') ? JSON.parse(response.body) : response.body;
    });

}

/**
 *
 * Placeholder function used to stub unimplemented API endpoint convenience methods that should be implemented at a future date.
 *
 */
function unimplementedEndpoint() {

  throw new Error('Sorry, the convenience method for this API endpoint is not supported by this client yet. Please use FastlyPromise.request() directly to use this endpoint.');

}

/*
 |--------------------------------------------------------------------------
 | Purging
 |--------------------------------------------------------------------------
 |
 | Purging related methods.
 |
 | https://docs.fastly.com/api/purge
 |
 */

/**
 *
 * Purge a url.
 *
 * @param {string} url - Fully qualified url of resource you want to purge.
 * @param {boolean} [softPurge=false] - Soft purge instead of standard purge. Defaults to false.
 * @returns {object} - Fastly purge response.
 * @throws Will throw error if url param is not absolute.
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
 * @returns {object} - Fastly purge response.
 */
FastlyPromise.prototype.purgeAll = function purgeAll(serviceId) {

  return this.request('POST', this.endpoint + '/service/' + serviceId + '/purge_all');

}

/**
 *
 * Purge a fastly surrogate key.
 *
 * @param {string} serviceId - The fastly service id.
 * @param {string} key - The surrogate key you wish to purge.
 * @param {boolean} [softPurge=false] - Soft purge instead of standard purge. Defaults to false.
 * @returns {object} - Fastly purge response.
 */
FastlyPromise.prototype.purgeKey = function purgeKey(serviceId, surrogateKey, softPurge) {

  softPurge = (typeof softPurge == 'undefined') ? false : softPurge;

  return this.request('POST', this.endpoint + '/service/' + serviceId + '/purge/' +  surrogateKey, {softPurge: softPurge});

}

/*
 |--------------------------------------------------------------------------
 | Configuration > Version
 |--------------------------------------------------------------------------
 |
 | Config version related methods.
 |
 | https://docs.fastly.com/api/config#version
 |
 */

/**
 *
 * Get list of config versions for a service.
 *
 * @param {string} serviceId - The fastly service id.
 * @returns {array} - Array of config versions objects.
 */
FastlyPromise.prototype.getConfigVersions = function getConfigVersions(serviceId) {

  return this.request('GET', this.endpoint + '/service/' + serviceId + '/version');

}

/**
 *
 * Get config version for a service.
 *
 * @param {string} serviceId - The fastly service id.
 * @param {string} configVersionNumber
 * @returns {object} - Config version object.
 */
FastlyPromise.prototype.getConfigVersion = function getConfigVersion(serviceId, configVersionNumber) {

  return this.request('GET', this.endpoint + '/service/' + serviceId + '/version/' + configVersionNumber);

}

/**
 *
 * Get active config version for a service.
 *
 * @param serviceId
 * @returns {object} - Active config version object.
 */
FastlyPromise.prototype.getActiveConfigVersion = function getActiveConfigVersion(serviceId) {

  return this.getConfigVersions(serviceId)
    .then(function(configVersions){

      return configVersions.find(function(configVersion){
        return configVersion.active;
      });

    });

}

/**
 *
 * Validate the config for a particular service and version.
 *
 * @param {string} serviceId - The fastly service id.
 * @param {string} configVersionNumber
 * @returns {object} - Fastly validation response object
 */
FastlyPromise.prototype.validateConfigVersion = function validateConfigVersion(serviceId, configVersionNumber) {

  return this.request('GET', this.endpoint + '/service/' + serviceId + '/version/' + configVersionNumber + '/validate');

}

/**
 *
 * Create a config version for a particular service.
 *
 * @param {string} serviceId - The fastly service id.
 * @returns {object} - New config version object.
 */
FastlyPromise.prototype.createConfigVersion = function createConfigVersion(serviceId) {

  return this.request('POST', this.endpoint + '/service/' + serviceId + '/version');

}

/**
 *
 * Activate a config version.
 *
 * @param {string} serviceId - The fastly service id.
 * @param {string} configVersionNumber
 * @returns {object} - Config version object
 */
FastlyPromise.prototype.activateConfigVersion = function activateConfigVersion(serviceId, configVersionNumber) {

  return this.request('PUT', this.endpoint + '/service/' + serviceId + '/version/' + configVersionNumber + '/activate');

}

/**
 *
 * Deactivate a config version.
 *
 * @param {string} serviceId - The fastly service id.
 * @param {string} configVersionNumber
 * @returns {object} - Config version object
 */
FastlyPromise.prototype.deactivateConfigVersion = function deactivateConfigVersion(serviceId, configVersionNumber) {

  return this.request('PUT', this.endpoint + '/service/' + serviceId + '/version/' + configVersionNumber + '/deactivate');

}

/**
 *
 * Clone a service configuration by config version number. Config number defaults to the number of the "active" configuration.
 *
 * @param serviceId
 * @param [configVersionNumber] - Defaults to active config version.
 * @returns {object} - Config version object
 */
FastlyPromise.prototype.cloneConfigVersion = function cloneConfigVersion(serviceId, configVersionNumber) {
  var self = this;

  //Set default config version number to active version if not explicitly defined.
  var configVersionNumberPromise = configVersionNumber ? Promise.resolve(configVersionNumber) : self.getActiveConfigVersion(serviceId).then(function(version){ return version.number });

  return configVersionNumberPromise.then(function(configVersionNumber){
    return self.request('PUT', self.endpoint + '/service/' + serviceId + '/version/' + configVersionNumber + '/clone');
  });


}

/**
 *
 * Lock a config version.
 *
 * @param {string} serviceId - The fastly service id.
 * @param {string} configVersionNumber
 * @returns {object} - Config version object
 */
FastlyPromise.prototype.lockConfigVersion = function lockConfigVersion(serviceId, configVersionNumber) {

  return this.request('PUT', this.endpoint + '/service/' + serviceId + '/version/' + configVersionNumber + '/lock');

}

/*
 |--------------------------------------------------------------------------
 | Configuration > VCL
 |--------------------------------------------------------------------------
 |
 | Config VCL related methods.
 |
 | https://docs.fastly.com/api/config#vcl
 |
 */

/**
 *
 * Get boilerplate VCL with the service's TTL from the settings.
 *
 * @param serviceId
 * @param configVersionNumber
 * @returns {string} - utf8 encoded text/html VCL string.
 */
FastlyPromise.prototype.getBoilerplateVcl = function getBoilerplateVcl(serviceId, configVersionNumber) {

  return this.request('GET', this.endpoint + '/service/' + serviceId + '/version/' + configVersionNumber + '/boilerplate');

}

/**
 *
 * Get a list of service VCLs by config version.
 *
 * @param serviceId
 * @param configVersionNumber
 * @returns {array} - Array of VCL objects.
 */
FastlyPromise.prototype.getAllVcl = function getAllVcl(serviceId, configVersionNumber) {

  return this.request('GET', this.endpoint + '/service/' + serviceId + '/version/' + configVersionNumber + '/vcl');

}

/**
 *
 * Get a service VCL by config version and name.
 *
 * @param serviceId
 * @param configVersionNumber
 * @param vclName
 * @returns {object} - VCL object.
 */
FastlyPromise.prototype.getVcl = function getVcl(serviceId, configVersionNumber, vclName) {

  return this.request('GET', this.endpoint + '/service/' + serviceId + '/version/' + configVersionNumber + '/vcl/' + vclName);

}

/**
 *
 * Get the uploaded VCL for a particular service and version with HTML syntax highlighting Include line numbers by sending lineno=true as a request parameter
 *
 * TODO: Implement convenience getVclHtml() method for the following endpoint https://docs.fastly.com/api/config#vcl_438f27abcd1c9203c8315a54cbcfde1a
 */
FastlyPromise.prototype.getVclHtml = unimplementedEndpoint;

/**
 *
 * Download the specified VCL.
 *
 * NOTE: This endpoint appears to be for convenience to get VCL as a text/plain string instead of JSON as would be returned via FastlyPromise.getVcl().
 *
 * TODO: Implement convenience getVclText() method for the following endpoint https://docs.fastly.com/api/config#vcl_86deff673cc0dfdcb938a780dd328fcd
 */
FastlyPromise.prototype.getVclText = unimplementedEndpoint;

/**
 *
 * Display the generated VCL for a particular service and version.
 *
 * TODO: Implement convenience getGeneratedVcl() method for the following endpoint https://docs.fastly.com/api/config#vcl_ad9da3d303580a36d0c1be5e10728e81
 */
FastlyPromise.prototype.getGeneratedVcl = unimplementedEndpoint;

/**
 *
 * Display the generated VCL for a particular service and version HTML encoded.
 *
 * TODO: Implement convenience getGeneratedVclHtml() method for the following endpoint https://docs.fastly.com/api/config#vcl_d7c0ba46e90676f4bcdd804fb3d417a3
 */
FastlyPromise.prototype.getGeneratedVclHtml = unimplementedEndpoint;

/**
 *
 * Get the current "main" VCL for a service.
 *
 * @param {string} serviceId
 * @param {string} [configVersionNumber] - If no config version number is passed, defaults to active config version.
 * @returns {object} - VCL object.
 */
FastlyPromise.prototype.getMainVcl = function getMainVcl(serviceId, configVersionNumber) {
  var self = this;

  //Set default config version number to active version if not explicitly defined.
  var configVersionNumberPromise = configVersionNumber ? Promise.resolve(configVersionNumber) : self.getActiveConfigVersion(serviceId).then(function(version){ return version.number });

  return configVersionNumberPromise
    .then(function(configVersionNumber){
      return self.getAllVcl(serviceId, configVersionNumber);
    })
    .then(function(vclList){

      return vclList.find(function(vcl){
        return vcl.main;
      });

    });

}

/**
 *
 * Set the specified VCL as main
 *
 * @param {string} serviceId
 * @param {string} vclName
 * @param {string} [configVersionNumber] - If no config version number is passed, defaults to active config version.
 * @returns {object} - VCL object.
 */
FastlyPromise.prototype.setMainVcl = function setMainVcl(serviceId, vclName, configVersionNumber) {
  var self = this;

  //Set default config version number to active version if not explicitly defined.
  var configVersionNumberPromise = configVersionNumber ? Promise.resolve(configVersionNumber) : self.getActiveConfigVersion(serviceId).then(function(version){ return version.number });

  return configVersionNumberPromise
    .then(function(configVersionNumber){
      return self.request('PUT', self.endpoint + '/service/' + serviceId + '/version/' + configVersionNumber + '/vcl/' + vclName + '/main');
    });

}

/**
 *
 * Upload new VCL to a service.
 *
 * @param {string} serviceId
 * @param {string} configVersionNumber - Service config version number.
 * @param {string} vclName - Name of vcl file.
 * @param {string} vclContent - The VCL content to be uploaded.
 * @param {boolean} [setVclToMain=false] - Set the uploaded vcl to be the service's "main" vcl.
 * @returns {object} - VCL object.
 * @throws Will throw error if VCL with same name already exists.
 */
FastlyPromise.prototype.uploadNewVcl = function uploadNewVcl(serviceId, configVersionNumber, vclName, vclContent, setVclToMain) {
  var self = this;

  setVclToMain = setVclToMain || false;

  var validNamePromise = self.getVcl(serviceId, configVersionNumber, vclName)
    .then(function(response){

      return false; //Invalid if vcl with this name already exists

    })
    .catch(function(errorResponse){

      //If response code is 404 then new vcl name is valid.
      return (errorResponse.statusCode == 404) ? true : false;

    });

  return validNamePromise
    .then(function(validName){

      if (!validName){
        throw new Error('Error: ' + vclName + ' VCL file already exists.');
      }
      else{

        //Upload the VCL
        return self.request('POST', self.endpoint + '/service/' + serviceId + '/version/' + configVersionNumber + '/vcl', {
          form: {
            name: vclName,
            content: vclContent
          }
        });

      }

    })
    .then(function(vclResponse){

      //Set VCL to "main" if flagged.
      if (setVclToMain){
        return self.setMainVcl(serviceId, vclName, configVersionNumber);
      }
      else{
        return vclResponse;
      }

    });

}

/**
 *
 * Update existing VCL file.
 *
 * @param {string} serviceId
 * @param {string} configVersionNumber - Service config version number.
 * @param {string} vclName - Name of vcl file.
 * @param {string} vclContent - The new VCL content.
 * @param {boolean} [setVclToMain=false] - Set the updated vcl to be the service's "main" vcl.
 * @returns {object} - VCL object.
 */
FastlyPromise.prototype.updateVcl = function updateVcl(serviceId, configVersionNumber, vclName, vclContent, setVclToMain) {
  var self = this;

  setVclToMain = setVclToMain || false;

  //Upload the VCL
  return self.request('PUT', self.endpoint + '/service/' + serviceId + '/version/' + configVersionNumber + '/vcl/' + vclName, {
      form: {
        content: vclContent
      }
    })
    .then(function(vclResponse){

      //Set VCL to "main" if flagged.
      if (setVclToMain){
        return self.setMainVcl(serviceId, vclName, configVersionNumber);
      }
      else{
        return vclResponse;
      }

    });

}

/**
 *
 * Delete the specified VCL file.
 *
 * @param {string} serviceId
 * @param {string} vclName
 * @param {string} [configVersionNumber] - If no config version number is passed, defaults to active config version.
 * @returns {object} - Fastly VCL delete status object.
 */
FastlyPromise.prototype.deleteVcl = function deleteVcl(serviceId, vclName, configVersionNumber) {
  var self = this;

  //Set default config version number to active version if not explicitly defined.
  var configVersionNumberPromise = configVersionNumber ? Promise.resolve(configVersionNumber) : self.getActiveConfigVersion(serviceId).then(function(version){ return version.number });

  return configVersionNumberPromise
    .then(function(configVersionNumber){
      return self.request('DELETE', self.endpoint + '/service/' + serviceId + '/version/' + configVersionNumber + '/vcl/' + vclName);
    });

}

module.exports = FastlyPromise;
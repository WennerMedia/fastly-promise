
var should = require('should');
var FastlyPromise = require('../lib/fastlyPromise');

//NOTE: The tests require at least one valid service config version to work.
//Additionally, the fastly service id you are testing against and your fastly API key should be set as process.env.FASTLY_TEST_SERVICE_ID and process.env.FASTLY_API_KEY.
//If you want to set them at test runtime, the following command will work:
//FASTLY_TEST_SERVICE_ID='{service id here}' FASTLY_API_KEY='{api key here}' mocha --ui bdd --reporter spec --recursive

describe('FastlyPromise Configuration Methods', function() {

  if (!process.env.FASTLY_TEST_SERVICE_ID || !process.env.FASTLY_API_KEY){
    throw new Error('FASTLY_TEST_SERVICE_ID and FASTLY_API_KEY must be set as environmental variables. Try command: FASTLY_TEST_SERVICE_ID=\'{service id here}\' FASTLY_API_KEY=\'{api key here}\' mocha --ui bdd --reporter spec --recursive');
  }

  var fastly = null;
  var serviceId = process.env.FASTLY_TEST_SERVICE_ID;

  before(function(){

    fastly = new FastlyPromise(process.env.FASTLY_API_KEY);

  });

  describe('Versions', function() {

    var versionsConfigVersionNumber = null; //Gets set to active config version in before();
    var clonedVersionsConfigVersionNumber = null; //Gets set to cloned config version id in #cloneConfigVersion;
    
    before(function(){

      return fastly.getActiveConfigVersion(serviceId)
        .then(function(configVersion){
          versionsConfigVersionNumber = configVersion.number;
        })
        .catch(function(error){
          throw new Error('At least one valid config version, is required for testing at this time.');
        });

    });
    
    describe('#getConfigVersions', function() {

      it('should return a list of all config versions', function() {
        return fastly.getConfigVersions(serviceId)
          .then(function(configVersions){
            configVersions.should.be.Array();

            for (var i=0; i < configVersions.length; i++){
              var configVersion = configVersions[i];
              configVersion.service_id.should.equal(serviceId);
            }

          });
      });

    });

    describe('#getConfigVersion', function() {

      it('should return a config version object', function() {
        return fastly.getConfigVersion(serviceId, versionsConfigVersionNumber)
          .then(function(configVersion){
            configVersion.service_id.should.equal(serviceId);
            configVersion.number.should.equal(versionsConfigVersionNumber);
          });
      });

    });

    describe('#getActiveConfigVersion', function() {

      it('should return the active config version object', function() {
        return fastly.getActiveConfigVersion(serviceId)
          .then(function(configVersion){
            configVersion.service_id.should.equal(serviceId);
            configVersion.active.should.equal(true);
          });
      });

    });

    describe('#activateConfigVersion and #deactivateConfigVersion', function() {

      it('should deactivate the active config version successfully', function() {
        return fastly.getActiveConfigVersion(serviceId)
          .then(function(configVersion){

            return fastly.deactivateConfigVersion(serviceId, versionsConfigVersionNumber)
              .then(function(configVersion){
                configVersion.service_id.should.equal(serviceId);
                configVersion.number.should.equal(versionsConfigVersionNumber);
                configVersion.active.should.equal(false);
              });
          });
      });

      it('should activate the previously active config version successfully', function() {
        return fastly.activateConfigVersion(serviceId, versionsConfigVersionNumber)
          .then(function(configVersion){
            configVersion.service_id.should.equal(serviceId);
            configVersion.number.should.equal(versionsConfigVersionNumber);
            configVersion.active.should.equal(true);
          });
      });

    });

    describe('#cloneConfigVersion', function() {

      it('should clone the active config version successfully', function() {
        return fastly.cloneConfigVersion(serviceId)
          .then(function(clonedConfigVersion){
            clonedConfigVersion.service_id.should.equal(serviceId);
            clonedVersionsConfigVersionNumber = clonedConfigVersion.number;
          });
      });

    });

    describe('#validateConfigVersion', function() {

      it('should validate the cloned config version successfully', function() {
        return fastly.validateConfigVersion(serviceId, clonedVersionsConfigVersionNumber)
          .then(function(result){
            result.status.should.equal('ok');
            result.errors.should.be.empty();
          });
      });

    });

    describe('#lockConfigVersion', function() {

      it('should lock the cloned config version successfully', function() {
        return fastly.lockConfigVersion(serviceId, clonedVersionsConfigVersionNumber)
          .then(function(configVersion){
            configVersion.service_id.should.equal(serviceId);
            configVersion.number.should.equal(clonedVersionsConfigVersionNumber);
            configVersion.locked.should.equal(true);
          });
      });

    });

    describe('#createConfigVersion', function() {

      it('should create a new empty config version', function() {
        return fastly.createConfigVersion(serviceId)
          .then(function(configVersion){
            configVersion.service_id.should.equal(serviceId);
          });
      });

    });

  });

  describe('VCL', function() {

    var vclConfigVersionNumber = null;

    before(function(){

      return fastly.cloneConfigVersion(serviceId)
        .then(function(clonedConfigVersion){
          vclConfigVersionNumber = clonedConfigVersion.number;
        });

    });

    describe('#getBoilerplateVcl and #uploadNewVcl and #updateVcl', function() {

      var boilerplateVcl = null;

      it('should return the boilerplate VCL associated with a config version', function() {
        return fastly.getBoilerplateVcl(serviceId, vclConfigVersionNumber)
          .then(function(vcl){
            vcl.should.be.String();
            boilerplateVcl = vcl;
          });
      });


      it('should upload new test VCL to a config version.', function() {
        return fastly.uploadNewVcl(serviceId, vclConfigVersionNumber, 'test-boilerplate-vcl-' + vclConfigVersionNumber, boilerplateVcl, false)
          .then(function(newVcl){
            newVcl.name.should.equal('test-boilerplate-vcl-' + vclConfigVersionNumber);
            newVcl.version.should.equal(vclConfigVersionNumber);
            newVcl.service_id.should.equal(serviceId);
          });
      });

      it('should update existing test VCL file and set to main.', function() {

        boilerplateVcl = boilerplateVcl + '\n# This is a comment added to update the VCL file.';

        return fastly.updateVcl(serviceId, vclConfigVersionNumber, 'test-boilerplate-vcl-' + vclConfigVersionNumber, boilerplateVcl, true) //serviceId, configVersionNumber, vclName, vclContent, setVclToMain
          .then(function(newVcl){
            newVcl.name.should.equal('test-boilerplate-vcl-' + vclConfigVersionNumber);
            newVcl.version.should.equal(vclConfigVersionNumber);
            newVcl.service_id.should.equal(serviceId);
            newVcl.content.should.match(/# This is a comment added to update the VCL file./m);
            newVcl.main.should.equal(true);
          });
      });

    });

    describe('#getAllVcl', function() {

      it('should return a list of all VCL files associated with a config version', function() {
        return fastly.getAllVcl(serviceId, vclConfigVersionNumber)
          .then(function(vclList){
            vclList.should.be.Array();
          });
      });

    });

    describe('#getVcl', function() {

      it('should return a VCL object', function() {
        return fastly.getAllVcl(serviceId, vclConfigVersionNumber)
          .then(function(vclList){
            vclList.should.be.Array();
            var vcl = vclList.pop();

            return fastly.getVcl(serviceId, vclConfigVersionNumber, vcl.name)
              .then(function(vclResult){
                vclResult.service_id.should.equal(serviceId);
                vclResult.name.should.equal(vcl.name);
                vclResult.version.should.equal(vclConfigVersionNumber);
              });

          });
      });

    });

    describe('#getMainVcl', function() {

      it('should return the main VCL object', function() {
        return fastly.getMainVcl(serviceId, vclConfigVersionNumber)
          .then(function(vcl){
            vcl.main.should.equal(true);
          });

      });

    });

    describe('#setMainVcl', function() {

      it('should set the main VCL object', function() {
        return fastly.getMainVcl(serviceId, vclConfigVersionNumber)
          .then(function(vcl){
            vcl.main.should.equal(true);

            return fastly.setMainVcl(serviceId, vcl.name, vclConfigVersionNumber);
          })
          .then(function(result){
            result.main.should.equal(true);
          });

      });

    });

    describe('#deleteVcl', function() {

      it('should delete the test VCL file.', function() {
        return fastly.deleteVcl(serviceId, 'test-boilerplate-vcl-' + vclConfigVersionNumber, vclConfigVersionNumber)
          .then(function(result){
            result.status.should.equal('ok');
          });
      });

    });

  });

});
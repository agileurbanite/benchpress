var di = require('di');
var testing = require('../node_modules/di/dist/cjs/testing');
var AutoRunner = require('../lib/AutoRunner');
var Globals = require('../lib/Globals');
var Logger = require('../lib/Logger');
var MockGlobals = require('./MockGlobals');
var RunState = require('../lib/RunState');
var Rx = require('rx');
var Utils = require('../lib/Utils');

describe('AutoRunner', function() {
  var globals, autoRunner, logger, utils;
  beforeEach(function() {
    testing.use(MockGlobals).as(Globals);
    testing.inject(AutoRunner, Globals, Logger, RunState, Utils, function(a,g,l,rs,u){
      globals = g;
      autoRunner = a;
      logger = l;
      runState = rs;
      utils = u;
    });
  });

  describe('.bootstrap', function() {
    it('should call runState.setDefault with query params', function() {
      spyOn(runState, 'setDefault');
      globals._window.location.search = '?numSamples=50&iterations=100';
      autoRunner.bootstrap();
      expect(runState.setDefault).toHaveBeenCalledWith({
        numSamples: '50',
        iterations: '100'
      });
    });


    it('should set autoClose on runState if __bpAutoClose__ is true in search params', function() {
      expect(runState.headless).toBeUndefined();
      globals._window.location.search = '?__bpAutoClose__=true';
      autoRunner.bootstrap();
      expect(runState.headless).toBe(true);
    });
  });


  describe('.ready()', function() {
    it('should call runBenchmark with the current value of runState', function() {
      spyOn(autoRunner, 'runBenchmark');
      globals._window.setTimeout = function (fn) {
        fn();
      }
      autoRunner.ready();
      expect(autoRunner.runBenchmark.calls[0].args[0].iterations).toBe(20);
      expect(autoRunner.runBenchmark.calls[0].args[0].numSamples).toBe(15);
    });
  });


  describe('.runBenchmark()', function() {
    var subscribeSpy;

    beforeEach(function(){
      subscribeSpy = jasmine.createSpy('subscribe');
      spyOn(autoRunner, 'runAllTests').andReturn({
        subscribe: subscribeSpy
      });
    });

    it('should call runAllTests()', function() {
      autoRunner.runBenchmark(this._runState);
      expect(autoRunner.runAllTests).toHaveBeenCalled();
    });


    it('should subscribe to the observable', function() {
      autoRunner.runBenchmark(this._runState);
      expect(subscribeSpy).toHaveBeenCalled();
    });


    it('should log reports to Logger when subscription sends updates', function() {
      spyOn(logger, 'write');
      autoRunner.runBenchmark(this._runState);

      //Send subscription message
      subscribeSpy.calls[0].args[0]('new report');
      expect(logger.write).toHaveBeenCalledWith('new report');
    });
  });


  describe('.runAllTests()', function() {
    it('should return an observable', function() {
      expect(typeof autoRunner.runAllTests().subscribe).toBe('function');
    });


    it('should call onComplete on the subject when iterations reaches 0', function() {
      var onCompleteSpy = jasmine.createSpy('onComplete');
      var disposeSpy = jasmine.createSpy('dispose');
      autoRunner.subject = {onComplete: onCompleteSpy, dispose: disposeSpy};
      autoRunner.runAllTests(0);
      expect(onCompleteSpy).toHaveBeenCalled();
      expect(disposeSpy).toHaveBeenCalled();
      expect(autoRunner.subject).toBeUndefined();
    });
  });
});

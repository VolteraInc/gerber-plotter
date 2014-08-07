(function() {
  var Plotter, builder, gerberToSvg;

  builder = require('xml');

  Plotter = require('./plotter');

  gerberToSvg = function(gerber) {
    var p, xmlObject;
    p = new Plotter(gerber);
    xmlObject = p.plot();
    return builder(xmlObject);
  };

  module.exports = gerberToSvg;

}).call(this);

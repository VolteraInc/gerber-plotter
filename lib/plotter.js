// gerber plotter
'use strict'

var Transform = require('readable-stream').Transform
var inherits = require('inherits')
var has = require('lodash.has')
var mapValues = require('lodash.mapvalues')
var clone = require('lodash.clone')

var PathGraph = require('./path-graph')
var warning = require('./_warning')
var padShape = require('./_pad-shape')
var operate = require('./_operate')
var boundingBox = require('./_box')

var isFormatKey = function(key) {
  return (
    key === 'units' ||
    key === 'backupUnits' ||
    key === 'nota' ||
    key === 'backupNota')
}

var Plotter = function(
  units,
  backupUnits,
  nota,
  backupNota,
  optimizePaths,
  plotAsOutline) {

  Transform.call(this, {
    readableObjectMode: true,
    writableObjectMode: true
  })

  this.format = {
    units: units,
    backupUnits: backupUnits || 'in',
    nota: nota,
    backupNota: backupNota || 'A'
  }

  this._formatLock = {
    units: (units != null),
    backupUnits: (backupUnits != null),
    nota:  (nota != null),
    backupNota:  (backupNota != null)
  }

  // plotting options
  this._plotAsOutline = plotAsOutline
  this._optimizePaths = optimizePaths || plotAsOutline

  this._line = 0
  this._done = false
  this._tool = null
  this._outTool = null
  this._tools = {}
  this._macros = {}
  this._pos = [0, 0]
  this._box = boundingBox.new()
  this._mode = null
  this._arc = null
  this._region = false
  this._path = new PathGraph(this._optimizePaths)
  this._epsilon = null
  this._lastOp = null
  this._stepRep = []
}

inherits(Plotter, Transform)

Plotter.prototype._finishPath = function() {
  if (this._path.length) {
    var path = this._path.traverse()
    this._path = new PathGraph(this._optimizePaths)

    // check for outline tool
    var tool = this._tool
    if (this._plotAsOutline) {
      this._outTool = this._outTool || tool
      tool = this._outTool
    }

    if (!this._region && (tool.trace.length === 1)) {
      this.push({type: 'stroke', width: tool.trace[0], path: path})
    }
    else {
      this.push({type: 'fill', path: path})
    }
  }
}

Plotter.prototype._warn = function(message) {
  this.emit('warning', warning(message, this._line))
}

Plotter.prototype._checkFormat = function() {
  if (!this.format.units) {
    this.format.units = this.format.backupUnits
    this._warn('units not set; using backup units: ' + this.format.units)
  }

  if(!this.format.nota) {
    this.format.nota = this.format.backupNota
    this._warn('notation not set; using backup notation: ' + this.format.nota)
  }
}

Plotter.prototype._updateBox = function(box) {
  var stepRepLen = this._stepRep.length
  if (!stepRepLen) {
    this._box = boundingBox.add(this._box, box)
  }
  else {
    var repeatBox = boundingBox.repeat(box, this._stepRep[stepRepLen - 1])
    this._box = boundingBox.add(this._box, repeatBox)
  }
}

Plotter.prototype._transform = function(chunk, encoding, done) {
  var type = chunk.type
  this._line = chunk.line

  if (this._done) {
    this._warn('ignoring extra command recieved after done command')

    return done()
  }

  // check for an operation
  if (type === 'op') {
    this._checkFormat()

    var op = chunk.op
    var coord = chunk.coord

    if (this.nota === 'I') {
      var _this = this

      coord = mapValues(coord, function(value, key) {
        if (key === 'x') {
          return (_this._pos[0] + value)
        }
        if (key === 'y') {
          return (_this._pos[1] + value)
        }

        return value
      })
    }

    if (op === 'last') {
      this._warn('modal operation commands are deprecated')
      op = this._lastOp
    }

    if (op === 'int') {
      if (this._mode == null) {
        this._warn('no interpolation mode specified; assuming linear')
        this._mode = 'i'
      }

      if (
        (this._arc == null) &&
        (this._mode.slice(-2) === 'cw') &&
        !coord.a) {

        this._warn('quadrant mode unspecified; assuming single quadrant')
        this._arc = 's'
      }
    }

    var result = operate(
      op,
      coord,
      this._pos,
      this._tool,
      this._mode,
      this._arc,
      (this._region || this._plotAsOutline),
      this._path,
      this._epsilon,
      this)

    this._lastOp = op
    this._pos = result.pos
    this._updateBox(result.box)
  }

  else if (type === 'set') {
    var prop = chunk.prop
    var value = chunk.value

    // if region change, finish the path
    if (prop === 'region') {
      this._finishPath()
      this._region = value
    }

    // else we might need to set the format
    else if (isFormatKey(prop) && !this._formatLock[prop]) {
      this.format[prop] = value
      if (prop === 'units' || prop === 'nota') {
        this._formatLock[prop] = true
      }
    }

    // else if we're dealing with a tool change, finish the path and change
    else if (prop === 'tool') {
      if (this._region) {
        this._warn('cannot change tool while region mode is on')
      }
      else if (!has(this._tools, value)) {
        this._warn('tool ' + value + ' is not defined')
      }
      else {
        this._finishPath()
        this._tool = this._tools[value]
      }
    }

    // else set interpolation or arc mode
    else {
      this['_' + prop] = value
    }
  }

  // else tool commands
  else if (type === 'tool') {
    var code = chunk.code
    var toolDef = chunk.tool

    if (this._tools[code]) {
      this._warn('tool ' + code + ' is already defined; ignoring new definition')

      return done()
    }

    var shapeAndBox = padShape(toolDef, this._macros)
    var tool = {
      code: code,
      trace: [],
      pad: shapeAndBox.shape,
      flashed: false,
      box: shapeAndBox.box
    }

    if (toolDef.shape === 'circle' || toolDef.shape === 'rect') {
      if (toolDef.hole.length === 0) {
        tool.trace = toolDef.params
      }
    }

    this._finishPath()
    this._tools[code] = tool
    this._tool = tool
  }

  // else macro command
  else if (type === 'macro') {
    this._macros[chunk.name] = chunk.blocks
  }

  // else layer command
  else if (type === 'level') {
    var level = chunk.level
    var levelValue = chunk.value

    this._finishPath()

    if (level === 'polarity') {
      this.push({
        type: 'polarity',
        polarity: (levelValue === 'C') ? 'clear' : 'dark',
        box: clone(this._box)
      })
    }
    else {
      // calculate new offsets
      var offsets = []
      for (var x = 0; x < levelValue.x; x++) {
        for (var y = 0; y < levelValue.y; y++) {
          offsets.push([x * levelValue.i, y * levelValue.j])
        }
      }
      this._stepRep = offsets

      this.push({type: 'repeat', offsets: clone(this._stepRep), box: clone(this._box)})
    }
  }

  // else done command
  else if (type === 'done') {
    this._done = true
  }

  return done()
}

Plotter.prototype._flush = function(done) {
  this._finishPath()

  this.push({type: 'size', box: this._box, units: this.format.units})
  done()
}

module.exports = Plotter

// test suite for plotter
'use strict'

var chai = require('chai')
var chaiStats = require('chai-stats')

chai.use(chaiStats)
var expect = chai.expect

var plotter = require('../lib/gerber-plotter')

describe('gerber plotter', function() {
  var p
  beforeEach(function() {
    p = plotter()
  })

  describe('factory and options', function() {
    it('should allow user to set units', function() {
      p = plotter({units: 'mm'})
      expect(p.format.units).to.equal('mm')
      p = plotter({units: 'in'})
      expect(p.format.units).to.equal('in')

      expect(function() {p = plotter({units: 'foo'})}).to.throw(/units/)
    })

    it('should allow user to set backupUnits', function() {
      p = plotter({backupUnits: 'mm'})
      expect(p.format.backupUnits).to.equal('mm')
      p = plotter({units: 'in'})
      expect(p.format.units).to.equal('in')

      expect(function() {
        p = plotter({backupUnits: 'foo'})
      }).to.throw(/backup units/)
    })

    it('should allow user to set notation', function() {
      p = plotter({nota: 'A'})
      expect(p.format.nota).to.equal('A')
      p = plotter({nota: 'I'})
      expect(p.format.nota).to.equal('I')

      expect(function() {p = plotter({nota: 'foo'})}).to.throw(/notation/)
    })

    it('should allow user to set backup notation', function() {
      p = plotter({backupNota: 'A'})
      expect(p.format.backupNota).to.equal('A')
      p = plotter({backupNota: 'I'})
      expect(p.format.backupNota).to.equal('I')

      expect(function() {
        p = plotter({backupNota: 'foo'})
      }).to.throw(/backup notation/)
    })

    it('should default backup units and notation to inches and abs', function() {
      expect(p.format.backupUnits).to.equal('in')
      expect(p.format.backupNota).to.equal('A')
    })

    it('should throw if a options key is invalid', function() {
      expect(function() {p = plotter({foo: 'bar'})}).to.throw(/invalid/)
    })
  })

  describe('handling set commands', function() {
    describe('format', function() {
      it('should set units', function() {
        p.write({cmd: 'set', key: 'units', val: 'mm'})
        expect(p.format.units).to.equal('mm')

        p = plotter()
        p.write({cmd: 'set', key: 'units', val: 'in'})
        expect(p.format.units).to.equal('in')
      })

      it('should not redefine units', function() {
        p = plotter({units: 'in'})
        p.write({cmd: 'set', key: 'units', val: 'mm'})
        expect(p.format.units).to.equal('in')
      })

      it('should set the notation', function() {
        p.write({cmd: 'set', key: 'nota', val: 'A'})
        expect(p.format.nota).to.equal('A')

        p = plotter()
        p.write({cmd: 'set', key: 'nota', val: 'I'})
        expect(p.format.nota).to.equal('I')
      })

      it('should not redefine notation', function() {
        p = plotter({nota: 'A'})
        p.write({cmd: 'set', key: 'nota', val: 'I'})
        expect(p.format.nota).to.equal('A')
      })

      it('should set the backup units', function() {
        p.write({cmd: 'set', key: 'backupUnits', val: 'mm'})
        expect(p.format.backupUnits).to.equal('mm')
        p.write({cmd: 'set', key: 'backupUnits', val: 'in'})
        expect(p.format.backupUnits).to.equal('in')
      })

      it('should not redefine the backupUnits set by user', function() {
        p = plotter({backupUnits: 'in'})
        p.write({cmd: 'set', key: 'backupUnits', val: 'mm'})
        expect(p.format.backupUnits).to.equal('in')
      })

      it('should not redefine the backupNotation set by user', function() {
        p = plotter({backupNota: 'A'})
        p.write({cmd: 'set', key: 'backupNota', val: 'I'})
        expect(p.format.backupNota).to.equal('A')
      })
    })

    describe('plotter state', function() {
      it('should change the tool', function() {
        var tool = {}
        p._tools['10'] = tool

        p.write({cmd: 'set', key: 'tool', val: '10'})
        expect(p._tool).to.equal(tool)
      })

      it('should warn if the tool doesnt exist', function(done) {
        p.once('warning', function(w) {
          expect(w.line).to.equal(10)
          expect(w.message).to.match(/tool 10/)
          expect(p._tool).to.be.null
          done()
        })

        p.write({cmd: 'set', line: 10, key: 'tool', val: '10'})
      })

      it('should set the region mode', function() {
        p.write({cmd: 'set', line: 10, key: 'region', val: true})
        expect(p._region).to.be.true
        p.write({cmd: 'set', line: 10, key: 'region', val: false})
        expect(p._region).to.be.false
      })

      it ('should warn and ignore tool changes if region mode is on', function(done) {
        p.once('warning', function(w) {
          expect(w.line).to.equal(11)
          expect(w.message).to.match(/region/)
          expect(p._tool).to.be.null
          done()
        })

        p._tools['10'] = {}
        p.write({cmd: 'set', line: 10, key: 'region', val: true})
        p.write({cmd: 'set', line: 11, key: 'tool', val: '10'})
      })

      it('should set the interpolation mode', function() {
        p.write({cmd: 'set', key: 'mode', val: 'i'})
        expect(p._mode).to.equal('i')
        p.write({cmd: 'set', key: 'mode', val: 'cw'})
        expect(p._mode).to.equal('cw')
        p.write({cmd: 'set', key: 'mode', val: 'ccw'})
        expect(p._mode).to.equal('ccw')
      })

      it('should set the arc quadrant mode', function() {
        p.write({cmd: 'set', key: 'quad', val: 's'})
        expect(p._quad).to.equal('s')
        p.write({cmd: 'set', key: 'quad', val: 'm'})
        expect(p._quad).to.equal('m')
      })
    })
  })

  describe('handling done command', function() {
    it('should set the done flag', function() {
      p.write({cmd: 'done'})
      expect(p._done).to.be.true
    })

    it('should warn if other commands come in after a done', function(done) {
      p.once('warning', function(w) {
        expect(w.message).to.match(/done/)
        done()
      })

      p.write({cmd: 'done'})
      p.write({cmd: 'set', key: 'mode', val: 'i'})
    })
  })

  describe('handling new tool commands', function() {
    it('should set current tool to newly defined tool', function() {
      var circle = {shape: 'circle', val: [4], hole: []}
      p.write({cmd: 'tool', key: '10', val: circle})
      expect(p._tools['10']).to.equal(p._tool)
      p.write({cmd: 'tool', key: '15', val: circle})
      expect(p._tools['15']).to.equal(p._tool)
    })

    it('should set trace width for circle and rectangle tools', function() {
      var circle = {shape: 'circle', val: [4], hole: []}
      var rect = {shape: 'rect', val: [2, 3], hole: []}

      p.write({cmd: 'tool', key: '10', val: circle})
      expect(p._tool.trace).to.eql([4])

      p.write({cmd: 'tool', key: '11', val: rect})
      expect(p._tool.trace).to.eql([2, 3])
    })

    it('should warn and ignore if the tool has already been set', function(done) {
      var circle = {shape: 'circle', val: [4], hole: []}
      var rect = {shape: 'rect', val: [2, 3], hole: []}

      p.once('warning', function(w) {
        expect(w.message).to.match(/already defined/)
        expect(w.line).to.equal(9)
        expect(p._tool.trace).to.eql([4])
        done()
      })

      p.write({cmd: 'tool', key: '10', val: circle, line: 8})
      p.write({cmd: 'tool', key: '10', val: rect, line: 9})
    })

    it('should not set trace for untraceable tools', function() {
      var circle = {shape: 'circle', val: [4], hole: [1, 1]}
      var rect = {shape: 'rect', val: [2, 3], hole: [1]}
      var obround = {shape: 'obround', val: [2, 3], hole: []}
      var poly = {shape: 'poly', val: [2, 3, 4], hole: []}
      var macro = {shape: 'SOME_MACRO', val: [], hole: []}
      p.write({cmd: 'tool', key: '10', val: circle})
      expect(p._tool.trace).to.eql([])
      p.write({cmd: 'tool', key: '11', val: rect})
      expect(p._tool.trace).to.eql([])
      p.write({cmd: 'tool', key: '12', val: obround})
      expect(p._tool.trace).to.eql([])
      p.write({cmd: 'tool', key: '13', val: poly})
      expect(p._tool.trace).to.eql([])
      p.write({cmd: 'tool', key: '14', val: macro})
      expect(p._tool.trace).to.eql([])
    })

    describe('standard tool pad shapes', function() {
      it('should create pad shapes for standard circles', function() {
        var circle0 = {shape: 'circle', val: [1], hole: []}
        var circle1 = {shape: 'circle', val: [2], hole: [1]}
        var circle2 = {shape: 'circle', val: [3], hole: [1, 1]}

        p.write({cmd: 'tool', key: '10', val: circle0})
        expect(p._tool.pad).to.eql([{type: 'circle', cx: 0, cy: 0, r: 0.5}])

        p.write({cmd: 'tool', key: '11', val: circle1})
        expect(p._tool.pad).to.eql([
          {type: 'circle', cx: 0, cy: 0, r: 1},
          {type: 'layer', polarity: 'clear'},
          {type: 'circle', cx: 0, cy: 0, r: 0.5}
        ])

        p.write({cmd: 'tool', key: '12', val: circle2})
        expect(p._tool.pad).to.eql([
          {type: 'circle', cx: 0, cy: 0, r: 1.5},
          {type: 'layer', polarity: 'clear'},
          {type: 'rect', cx: 0, cy: 0, r: 0, width: 1, height: 1}
        ])
      })

      it('should create pad shapes for standard rectangles', function() {
        var rect0 = {shape: 'rect', val: [1, 2], hole: []}
        var rect1 = {shape: 'rect', val: [3, 4], hole: [1]}
        var rect2 = {shape: 'rect', val: [5, 6], hole: [1, 1]}

        p.write({cmd: 'tool', key: '10', val: rect0})
        expect(p._tool.pad).to.eql([
          {type: 'rect', cx: 0, cy: 0, r: 0, width: 1, height: 2}
        ])

        p.write({cmd: 'tool', key: '11', val: rect1})
        expect(p._tool.pad).to.eql([
          {type: 'rect', cx: 0, cy: 0, r: 0, width: 3, height: 4},
          {type: 'layer', polarity: 'clear'},
          {type: 'circle', cx: 0, cy: 0, r: 0.5}
        ])

        p.write({cmd: 'tool', key: '12', val: rect2})
        expect(p._tool.pad).to.eql([
          {type: 'rect', cx: 0, cy: 0, r: 0, width: 5, height: 6},
          {type: 'layer', polarity: 'clear'},
          {type: 'rect', cx: 0, cy: 0, r: 0, width: 1, height: 1}
        ])
      })

      it('should create pad shapes for standard obrounds', function() {
        var obround0 = {shape: 'obround', val: [1, 2], hole: []}
        var obround1 = {shape: 'obround', val: [4, 3], hole: [1]}
        var obround2 = {shape: 'obround', val: [5, 6], hole: [1, 1]}

        p.write({cmd: 'tool', key: '10', val: obround0})
        expect(p._tool.pad).to.eql([
          {type: 'rect', cx: 0, cy: 0, r: 0.5, width: 1, height: 2}
        ])

        p.write({cmd: 'tool', key: '11', val: obround1})
        expect(p._tool.pad).to.eql([
          {type: 'rect', cx: 0, cy: 0, r: 1.5, width: 4, height: 3},
          {type: 'layer', polarity: 'clear'},
          {type: 'circle', cx: 0, cy: 0, r: 0.5}
        ])

        p.write({cmd: 'tool', key: '12', val: obround2})
        expect(p._tool.pad).to.eql([
          {type: 'rect', cx: 0, cy: 0, r: 2.5, width: 5, height: 6},
          {type: 'layer', polarity: 'clear'},
          {type: 'rect', cx: 0, cy: 0, r: 0, width: 1, height: 1}
        ])
      })

      it('should create pad shapes for standard polygons', function() {
        var poly0 = {shape: 'poly', val: [2, 3, 0], hole: []}
        var poly1 = {shape: 'poly', val: [2, 6, 45], hole: [1]}
        var poly2 = {shape: 'poly', val: [2, 12, 140], hole: [1, 1]}

        p.write({cmd: 'tool', key: '10', val: poly0})
        expect(p._tool.pad).to.eql([
          {type: 'poly', points: [
            [1, 0],
            [Math.cos(120 * Math.PI / 180), Math.sin(120 * Math.PI / 180)],
            [Math.cos(240 * Math.PI / 180), Math.sin(240 * Math.PI / 180)]
          ]}
        ])

        p.write({cmd: 'tool', key: '11', val: poly1})
        var poly = p._tool.pad[0]
        expect(p._tool.pad).to.have.length(3)
        expect(poly).to.have.all.keys(['type', 'points'])
        expect(poly.type).to.equal('poly')
        expect(poly.points).to.almost.eql([
          [Math.cos(45 * Math.PI / 180), Math.sin(45 * Math.PI / 180)],
          [Math.cos(105 * Math.PI / 180), Math.sin(105 * Math.PI / 180)],
          [Math.cos(165 * Math.PI / 180), Math.sin(165 * Math.PI / 180)],
          [Math.cos(225 * Math.PI / 180), Math.sin(225 * Math.PI / 180)],
          [Math.cos(285 * Math.PI / 180), Math.sin(285 * Math.PI / 180)],
          [Math.cos(345 * Math.PI / 180), Math.sin(345 * Math.PI / 180)]
        ], 10)
        expect(p._tool.pad.slice(1)).to.eql([
          {type: 'layer', polarity: 'clear'},
          {type: 'circle', cx: 0, cy: 0, r: 0.5}
        ])

        p.write({cmd: 'tool', key: '12', val: poly2})
        poly = p._tool.pad[0]
        expect(p._tool.pad).to.have.length(3)
        expect(poly).to.have.all.keys(['type', 'points'])
        expect(poly.type).to.equal('poly')
        expect(poly.points).to.almost.eql([
          [Math.cos(140 * Math.PI / 180), Math.sin(140 * Math.PI / 180)],
          [Math.cos(170 * Math.PI / 180), Math.sin(170 * Math.PI / 180)],
          [Math.cos(200 * Math.PI / 180), Math.sin(200 * Math.PI / 180)],
          [Math.cos(230 * Math.PI / 180), Math.sin(230 * Math.PI / 180)],
          [Math.cos(260 * Math.PI / 180), Math.sin(260 * Math.PI / 180)],
          [Math.cos(290 * Math.PI / 180), Math.sin(290 * Math.PI / 180)],
          [Math.cos(320 * Math.PI / 180), Math.sin(320 * Math.PI / 180)],
          [Math.cos(350 * Math.PI / 180), Math.sin(350 * Math.PI / 180)],
          [Math.cos(380 * Math.PI / 180), Math.sin(380 * Math.PI / 180)],
          [Math.cos(410 * Math.PI / 180), Math.sin(410 * Math.PI / 180)],
          [Math.cos(440 * Math.PI / 180), Math.sin(440 * Math.PI / 180)],
          [Math.cos(470 * Math.PI / 180), Math.sin(470 * Math.PI / 180)]
        ], 10)
        expect(p._tool.pad.slice(1)).to.eql([
          {type: 'layer', polarity: 'clear'},
          {type: 'rect', cx: 0, cy: 0, r: 0, width: 1, height: 1}
        ])
      })
    })

    describe('standard tool bounding boxes', function() {
      it('should calculate a bounding box for a circle', function() {
        var circle0 = {shape: 'circle', val: [1], hole: []}
        var circle1 = {shape: 'circle', val: [7], hole: [1]}
        var circle2 = {shape: 'circle', val: [4], hole: [1, 1]}

        p.write({cmd: 'tool', key: '10', val: circle0})
        expect(p._tool.box).to.eql([-0.5, -0.5, 0.5, 0.5])
        p.write({cmd: 'tool', key: '11', val: circle1})
        expect(p._tool.box).to.eql([-3.5, -3.5, 3.5, 3.5])
        p.write({cmd: 'tool', key: '12', val: circle2})
        expect(p._tool.box).to.eql([-2, -2, 2, 2])
      })

      it('should calculate a bounding box for a rects and obrounds', function() {
        var rect0 = {shape: 'rect', val: [1, 2], hole: []}
        var rect1 = {shape: 'rect', val: [7, 4], hole: [1]}
        var obround0 = {shape: 'obround', val: [9, 8], hole: [1, 1]}
        var obround1 = {shape: 'obround', val: [4, 1], hole: []}

        p.write({cmd: 'tool', key: '10', val: rect0})
        expect(p._tool.box).to.eql([-0.5, -1, 0.5, 1])
        p.write({cmd: 'tool', key: '11', val: rect1})
        expect(p._tool.box).to.eql([-3.5, -2, 3.5, 2])
        p.write({cmd: 'tool', key: '12', val: obround0})
        expect(p._tool.box).to.eql([-4.5, -4, 4.5, 4])
        p.write({cmd: 'tool', key: '13', val: obround1})
        expect(p._tool.box).to.eql([-2, -0.5, 2, 0.5])
      })

      it('should calculate a bounding box for a standard polygon', function() {
        var poly0 = {shape: 'poly', val: [5, 4, 0], hole: []}
        var poly1 = {shape: 'poly', val: [6, 8, 0], hole: [1]}
        var poly2 = {shape: 'poly', val: [4 * Math.sqrt(2), 4, 45], hole: [1, 1]}

        p.write({cmd: 'tool', key: '10', val: poly0})
        expect(p._tool.box).to.eql([-2.5, -2.5, 2.5, 2.5])
        p.write({cmd: 'tool', key: '11', val: poly1})
        expect(p._tool.box).to.eql([-3, -3, 3, 3])
        p.write({cmd: 'tool', key: '12', val: poly2})
        expect(p._tool.box).to.almost.eql([-2, -2, 2, 2], 10)
      })
    })

    describe('macro tools', function() {
      describe('primitives without rotation', function() {
        it('should ignore comment primitives', function() {
          var macro = {cmd: 'macro', key: 'EMPTY', val: [{type: 'comment'}]}
          var tool = {cmd: 'tool', key: '10', val: {shape: 'EMPTY', val: [], hole: []}}

          p.write(macro)
          p.write(tool)
          expect(p._tool.pad).to.eql([])
          expect(p._tool.box).to.eql([Infinity, Infinity, -Infinity, -Infinity])
        })

        it('should be able to handle shape and box for circle primitives', function() {
          var blocks = [{type: 'circle', exp: 1, dia: 4, cx: 3, cy: 4, rot: 0}]
          var macro = {cmd: 'macro', key: 'CIRC', val: blocks}
          var tool = {cmd: 'tool', key: '10', val: {shape: 'CIRC', val: [], hole: []}}

          p.write(macro)
          p.write(tool)
          expect(p._tool.pad).to.eql([{type: 'circle', cx: 3, cy: 4, r: 2}])
          expect(p._tool.box).to.eql([1, 2, 5, 6])
        })

        it('should be able to handle shape and box for vect primitives', function() {
          var blocks = [
            {type: 'vect', exp: 1, width: 2, x1: 0, y1: 0, x2: 5, y2: 0, rot: 0},
            {type: 'vect', exp: 1, width: 1, x1: 0, y1: 0, x2: 0, y2: 5, rot: 0}
          ]
          var macro = {cmd: 'macro', key: 'VECT', val: blocks}
          var tool = {cmd: 'tool', key: '10', val: {shape: 'VECT', val: [], hole: []}}

          p.write(macro)
          p.write(tool)

          expect(p._tool.pad).to.eql([
            {type: 'poly', points: [[0, -1], [5, -1], [5, 1], [0, 1]]},
            {type: 'poly', points: [[0.5, 0], [0.5, 5], [-0.5, 5], [-0.5, 0]]}
          ])

          expect(p._tool.box).to.eql([-0.5, -1, 5, 5])
        })

        it('should be able to handle rectangle primitives', function() {
          var blocks = [
            {type: 'rect', exp: 1, width: 4, height: 2, cx: 3, cy: 4, rot: 0}
          ]
          var macro = {cmd: 'macro', key: 'RECT', val: blocks}
          var tool = {cmd: 'tool', key: '10', val: {shape: 'RECT', val: [], hole: []}}

          p.write(macro)
          p.write(tool)
          expect(p._tool.pad).to.eql([
            {type: 'rect', cx: 3, cy: 4, width: 4, height: 2, r: 0}
          ])
          expect(p._tool.box).to.eql([1, 3, 5, 5])
        })
      })

      describe('rotated primitives', function() {
        it('should handle rotated circles', function() {
          var blocks = [{type: 'circle', exp: 1, dia: 4, cx: 0, cy: 4, rot: 90}]
          var macro = {cmd: 'macro', key: 'RCIRC', val: blocks}
          var tool = {cmd: 'tool', key: '10', val: {shape: 'RCIRC', val: [], hole: []}}

          p.write(macro)
          p.write(tool)
          expect(p._tool.pad).to.eql([{type: 'circle', cx: -4, cy: 0, r: 2}])
          expect(p._tool.box).to.eql([-6, -2, -2, 2])
        })

        it('should handle rotated vects', function() {
          var blocks = [
            {type: 'vect', exp: 1, width: 1, x1: 1, y1: 1, x2: 5, y2: 5, rot: 45}
          ]
          var macro = {cmd: 'macro', key: 'RVECT', val: blocks}
          var tool = {cmd: 'tool', key: '10', val: {shape: 'RVECT', val: [], hole: []}}

          p.write(macro)
          p.write(tool)

          expect(p._tool.pad).to.eql([
            {
              type: 'poly',
              points: [
                [0.5, 1.41421356],
                [0.5, 7.07106781],
                [-0.5, 7.07106781],
                [-0.5, 1.41421356]
              ]
            }
          ])
          expect(p._tool.box).to.eql([-0.5, 1.41421356, 0.5, 7.07106781])
        })

        it('should handle rotated rects', function() {
          var blocks = [
            {type: 'rect', exp: 1, width: 4, height: 2, cx: 3, cy: 4, rot: -30}
          ]
          var macro = {cmd: 'macro', key: 'RRECT', val: blocks}
          var tool = {cmd: 'tool', key: '10', val: {shape: 'RRECT', val: [], hole: []}}

          p.write(macro)
          p.write(tool)

          expect(p._tool.pad).to.eql([
            {
              type: 'poly',
              points: [
                [2.36602540, 2.09807622],
                [5.83012702, 0.09807622],
                [6.83012702, 1.83012702],
                [3.36602540, 3.83012702]
              ]
            }
          ])
          expect(p._tool.box).to.eql([2.36602540, 0.09807622, 6.83012702, 3.83012702])
        })
      })
    })
  })

  // describe('flashing pads', function() {
  //   it('should emit a tool shape if pad has never been flashed', function(done) {
  //     p.once('data', function(data) {
  //
  //       done()
  //     })
  //   })
  // })
})

//   describe 'new layer commands', ->
//
//     it 'should finish any in progress layer', ->
//       p.current = ['stuff']
//       p.write {new: {sr: {x: 2, y: 3, i: 7, j: 2}}}
//       expect(p.current).to.be.empty
//       p.current = ['more', 'stuff']
//       p.write {new: {layer: 'C'}}
//       expect(p.current).to.be.empty
//
//     it 'should set step repeat params', ->
//       expect(p.stepRepeat).to.eql {x: 1, y: 1, i: 0, j: 0}
//       p.write {new: {sr: {x: 2, y: 3, i: 7, j: 2}}}
//       expect(p.stepRepeat).to.eql {x: 2, y: 3, i: 7, j: 2}
//       p.write {new: {sr: {x: 1, y: 1}}}
//       expect(p.stepRepeat).to.eql {x: 1, y: 1}
//
//     it 'should set polarity param', ->
//       p.write {new: {layer: 'C'}}
//       expect(p.polarity).to.eql 'C'
//       p.write {new: {layer: 'D'}}
//       expect(p.polarity).to.eql 'D'
//
//     it 'should throw if it gets an bad new command', ->
//       expect(-> p.write {new: {foo: 'bar'}}).to.throw /unknown new command/
//
//   describe 'defining new tools', ->
//
//     describe 'tool macros', ->
//       beforeEach ->
//         p.write {
//           macro: {M: [{shape: 'circle', exp: '1', dia: '$1', cx: '0', cy: '0'}]}
//           line: 6
//         }
//
//       it 'should add the macro to the macros list', ->
//         expect(p.macros.M).to.exist
//
//       it 'should run macro tools to add them the tools object', ->
//         p.write {tool: {D10: {macro: 'M', mods: [2]}}}
//         expect(p.tools.D10.pad[0].circle).to.contain {r: 1 * factor}
//
//       it 'should pass along warnings from the Macro', (done) ->
//         p.macros.M.run = ->
//           @emit 'warning', new Warning 'foo bar'
//           {pad: [], padId: 'foo', trace: false, bbox: [1, 2, 3, 4]}
//
//         p.once 'warning', (w) ->
//           expect(w).to.be.an.instanceOf Warning
//           expect(w.message).to.match /macro M.*line 5.*foo bar/
//           done()
//
//         p.write {tool: {D10: {macro: 'M', mods: [2]}}, line: 5}
//
//   describe 'operating', ->
//     beforeEach ->
//       p.units = 'in'
//       p.notation = 'A'
//       p.mode = 'i'
//       p.epsilon = 0.1
//       p.write {tool: {D11: {width: 2, height: 1}}}
//       p.write {tool: {D10: {dia: 2}}}
//
//     describe 'making sure format is set', ->
//       it 'should warn and use the backup units if units were not set', (done) ->
//         p.units = null
//         p.backupUnits = 'in'
//
//         p.once 'warning', (w) ->
//           expect(w).to.be.an.instanceOf Warning
//           expect(w.message).to.match /line 43.*units.*deprecated/
//           expect(p.units).to.eql 'in'
//           done()
//
//         p.write {op: {do: 'int', x: 1, y: 1}, line: 43}
//
//       it 'should assume inches if units and backup units are not set', (done) ->
//         p.units = null
//
//         p.once 'warning', (w) ->
//           expect(w).to.be.an.instanceOf Warning
//           expect(w.message).to.match /line 42.*no units set.*in/
//           expect(p.units).to.eql 'in'
//           done()
//
//         p.write {op: {do: 'int', x: 1, y: 1}, line: 42}
//
//       it 'should warn and assume absolute notation throw if not set', (done) ->
//         p.notation = null
//
//         p.once 'warning', (w) ->
//           expect(w).to.be.an.instanceOf Warning
//           expect(w.message).to.match /line 20.*notation.*absolute/
//           expect(p.notation).to.eql 'A'
//           done()
//
//         p.write {op: {do: 'int', x: 1, y: 1}, line: 20}
//
//     it 'should move the plotter position with absolute notation', ->
//       p.write {op: {do: 'int', x: 1, y: 2}}
//       expect(p.x).to.eql 1
//       expect(p.y).to.eql 2
//       p.write {op: {do: 'move', x: 3, y: 4}}
//       expect(p.x).to.eql 3
//       expect(p.y).to.eql 4
//       p.write {op: {do: 'flash', x: 5, y: 6}}
//       expect(p.x).to.eql 5
//       expect(p.y).to.eql 6
//       p.write {op: {do: 'move', y: 7}}
//       expect(p.x).to.eql 5
//       expect(p.y).to.eql 7
//       p.write {op: {do: 'move', x: 8}}
//       expect(p.x).to.eql 8
//       expect(p.y).to.eql 7
//
//     it 'should move the plotter with incremental notation', ->
//       p.notation = 'I'
//       p.write {op: {do: 'int', x: 1, y: 2}}
//       expect(p.x).to.eql 1
//       expect(p.y).to.eql 2
//       p.write {op: {do: 'move', x: 3, y: 4}}
//       expect(p.x).to.eql 4
//       expect(p.y).to.eql 6
//       p.write {op: {do: 'flash', x: 5, y: 6}}
//       expect(p.x).to.eql 9
//       expect(p.y).to.eql 12
//       p.write {op: {do: 'flash', y: 7}}
//       expect(p.x).to.eql 9
//       expect(p.y).to.eql 19
//       p.write {op: {do: 'flash', x: 8}}
//       expect(p.x).to.eql 17
//       expect(p.y).to.eql 19
//
//     describe 'flashing pads', ->
//       it 'should add a pad with a flash', ->
//         p.write {set: {currentTool: 'D10'}}
//         p.write {op: {do: 'flash', x: 2, y: 2}}
//         expect(p.defs[0].circle).to.contain {r: 1}
//         expect(p.current[0].use).to.contain {x: 2, y: 2}
//
//       it 'should only add a pad to defs once', ->
//         p.write {set: {currentTool: 'D10'}}
//         p.write {op: {do: 'flash', x: 2, y: 2}}
//         p.write {op: {do: 'flash', x: 2, y: 2}}
//         expect(p.defs).to.have.length 1
//
//       it 'should add pads to the layer bbox', ->
//         p.write {set: {currentTool: 'D11'}}
//         p.write {op: {do: 'flash', x: 2, y: 2}}
//         expect(p.layerBbox).to.eql {xMin: 1, yMin: 1.5, xMax: 3, yMax: 2.5}
//         p.write {set: {currentTool: 'D10'}}
//         p.write {op: {do: 'flash', x: 2, y: 2}}
//         expect(p.layerBbox).to.eql {xMin: 1, yMin: 1, xMax: 3, yMax: 3}
//         p.write {op: {do: 'flash', x: -2, y: -2}}
//         expect(p.layerBbox).to.eql {xMin: -3, yMin: -3, xMax: 3, yMax: 3}
//         p.write {op: {do: 'flash', x: 3, y: 3}}
//         expect(p.layerBbox).to.eql {xMin: -3, yMin: -3, xMax: 4, yMax: 4}
//
//       it 'should emit an error if in region mode', (done) ->
//         p.once 'error', (e) ->
//           expect(e.message).to.match /line 8 .*cannot flash.*region mode/
//           done()
//
//         p.region = true
//         p.write {op: {do: 'flash', x: 2, y: 2}, line: 8}
//
//     describe 'paths', ->
//       it 'should start a new path with an interpolate', ->
//         p.write {op: {do: 'int', x: 5, y: 5}}
//         expect(p.path[0..2]).to.eql ['M', 0, 0]
//
//       it 'should error for unstrokable tool outside region mode', (done) ->
//         p.once 'error', (e) ->
//           expect(e.message).to.match /line 50 .*D13.*strokable tool/
//           done()
//
//         p.write {tool: {D13: {dia: 5, vertices: 5}}}
//         p.write {op: {do: 'int'}, line: 50}
//
//       it 'should warn and assume linear interpolation if unspecified', (done) ->
//         p.once 'warning', (w) ->
//           expect(w).to.be.an.instanceOf Warning
//           expect(w.message).to.match /line 42 .*interpolation.*linear/
//           expect(p.mode).to.eql 'i'
//           done()
//
//         p.mode = null
//         p.write {op: {do: 'int', x: 5, y: 5}, line: 42}
//
//       describe 'adding to a linear path', ->
//         it 'should add a lineto with an int', ->
//           p.write {op: {do: 'int', x: 5, y: 5}}
//           p.write {op: {do: 'int', x: 10, y: 10}}
//           expect(p.path).to.eql ['M', 0, 0, 'L', 5, 5, 'L', 10, 10]
//           expect(p.layerBbox).to.eql {xMin: -1, yMin: -1, xMax: 11, yMax: 11}
//
//         it 'should add a moveto with a move if there is a path', ->
//           p.write {op: {do: 'move', x: 20, y: 20}}
//           p.write {op: {do: 'move', x: 0, y: 0}}
//           expect(p.path).to.be.empty
//
//           p.write {op: {do: 'int', x: 10, y: 10}}
//           p.write {op: {do: 'move', x: 20, y: 20}}
//           expect(p.path).to.eql ['M', 0, 0, 'L', 10, 10, 'M', 20, 20]
//           expect(p.layerBbox).to.eql {xMin: -1, yMin: -1, xMax: 11, yMax: 11}
//
//         it 'should be able to pick up again after a move', ->
//           p.write {op: {do: 'int', x: 10, y: 10}}
//           p.write {op: {do: 'move', x: 20, y: 20}}
//           p.write {op: {do: 'int', x: 15, y: 15}}
//           expect p.path
//             .to.eql ['M', 0, 0, 'L', 10, 10, 'M', 20, 20, 'L', 15, 15]
//           expect(p.layerBbox).to.eql {xMin: -1, yMin: -1, xMax: 21, yMax: 21}
//
//       describe 'finishing the path', ->
//         beforeEach -> p.path = ['M', 0, 0, 'L', 5, 5]
//
//         it 'should create a path object in the current layer', ->
//           p.finishPath()
//           expect(p.path).to.be.empty
//           expect(p.current[0].path.d).to.eql ['M', 0, 0, 'L', 5, 5]
//
//         it 'should not create a path object if the path is empty', ->
//           p.path = []
//           p.finishPath()
//           expect(p.current).to.be.empty
//
//         it 'should have trace properties if not in region mode', ->
//           p.finishPath()
//           path = p.current[0].path
//           expect(path.fill).to.eql 'none'
//           expect(path['stroke-width']).to.eql 2
//
//         it 'should end the path on a flash', ->
//           p.write {op: {do: 'flash', x: 2, y: 2}}
//           expect(p.path).to.be.empty
//
//         it 'should end the path on a tool change', ->
//           p.write {set: {currentTool: 'D10'}}
//           expect(p.path).to.be.empty
//
//         it 'should end the path on a region change', ->
//           p.write {set: {region: true}}
//           expect(p.path).to.be.empty
//
//         it 'should end the path on a polarity change', ->
//           p.write {new: {layer: 'C'}}
//           expect(p.path).to.be.empty
//
//         it 'should end the path on a step repeat', ->
//           p.write {new: {sr: {x: 2, y: 2, i: 1, j: 2}}}
//           expect(p.path).to.be.empty
//
//       describe 'stroking a rectangular tool', ->
//         beforeEach -> p.write {set: {currentTool: 'D11'}}
//
//         # these are fun because they just drag the rectange without rotation
//         # let's test each of the quadrants
//         # width of tool is 2, height is 1
//         it 'should handle a first quadrant move', ->
//           p.write {op: {do: 'int', x: 5, y: 5}}
//           expect(p.path).to.eql [
//             'M', 0, 0
//             'M', -1, -0.5, 1, -0.5, 6, 4.5, 6, 5.5, 4, 5.5, -1, 0.5, 'Z'
//          ]
//
//         it 'should handle a second quadrant move', ->
//           p.write {op: {do: 'int', x: -5, y: 5}}
//           expect(p.path).to.eql [
//             'M', 0, 0
//             'M', -1, -0.5, 1, -0.5, 1, 0.5, -4, 5.5, -6, 5.5, -6, 4.5, 'Z'
//          ]
//
//         it 'should handle a third quadrant move', ->
//           p.write {op: {do: 'int', x: -5, y: -5}}
//           expect(p.path).to.eql [
//             'M', 0, 0
//             'M', 1, -0.5, 1, 0.5, -1, 0.5, -6, -4.5, -6, -5.5, -4, -5.5, 'Z'
//          ]
//
//         it 'should handle a fourth quadrant move', ->
//           p.write {op: {do: 'int', x: 5, y: -5}}
//           expect(p.path).to.eql [
//             'M', 0, 0
//             'M', -1, -0.5, 4, -5.5, 6, -5.5, 6, -4.5, 1, 0.5, -1, 0.5, 'Z'
//          ]
//
//         it 'should handle a move along the positive x-axis', ->
//           p.write {op: {do: 'int', x: 5, y: 0}}
//           expect(p.path).to.eql [
//             'M', 0, 0
//             'M', -1, -0.5, 1, -0.5, 6, -0.5, 6, 0.5, 4, 0.5, -1, 0.5, 'Z'
//          ]
//
//         it 'should handle a move along the negative x-axis', ->
//           p.write {op: {do: 'int', x: -5, y: 0}}
//           expect(p.path).to.eql [
//             'M', 0, 0
//             'M', -1, -0.5, 1, -0.5, 1, 0.5, -4, 0.5, -6, 0.5, -6, -0.5, 'Z'
//          ]
//
//         it 'should handle a move along the positive y-axis', ->
//           p.write {op: {do: 'int', x: 0, y: 5}}
//           expect(p.path).to.eql [
//             'M', 0, 0
//             'M', -1, -0.5, 1, -0.5, 1, 0.5, 1, 5.5, -1, 5.5, -1, 4.5, 'Z'
//          ]
//
//         it 'should handle a move along the negative y-axis', ->
//           p.write {op: {do: 'int', x: 0, y: -5}}
//           expect(p.path).to.eql [
//             'M', 0, 0
//             'M', -1, -0.5, -1, -5.5, 1, -5.5, 1, -4.5, 1, 0.5, -1, 0.5, 'Z'
//          ]
//
//         it "should not have a stroke-width (it's filled instead)", ->
//           p.write {op: {do: 'int', x: 5, y: 5}}
//           p.finishPath()
//           expect(p.current[0]).to.have.key 'path'
//           expect(p.current[0].path).to.not.have.key 'stroke-width'
//
//         it 'should throw an error if the theta calculation messes up', ->
//           p.x = undefined
//           p.y = undefined
//           expect(-> p.write {op: {do: 'int', x: 5, y: 5}})
//             .to.throw /rectangular stroke angle calculation/
//
//         it 'should do a normal stroke if region mode is on', ->
//           p.region = true
//           p.write {op: {do: 'int', x: 5, y: 5}}
//           expect(p.path).to.eql ['M', 0, 0, 'L', 5, 5]
//
//       describe 'adding an arc to the path', ->
//         it 'should emit an error if the tool is not circular', (done) ->
//           p.once 'error', (e) ->
//             expect(e.message).to.match /line 34 .*arc with non-circular/
//             done()
//
//           p.write {set: {currentTool: 'D11', mode: 'cw', quad: 's'}}
//           p.write {op: {do: 'int', x: 1, y: 1, i: 1}, line: 34}
//
//         it 'should not error if non-circular tool in region mode', (done) ->
//           p.once 'error', ->
//             throw new Error 'should not have emitted an error'
//
//           p.write {set:
//             {currentTool: 'D11', mode: 'cw', region: true, quad: 's'}
//           }
//           p.write {op: {do: 'int', x: 1, y: 1, i: 1}}
//
//           setTimeout done, 10
//
//         it 'should error if quadrant mode has not been specified', (done) ->
//           p.once 'error', (e) ->
//             expect(e.message).to.match /line 23 .*quadrant mode/
//             done()
//
//           p.write {set: {mode: 'cw'}}
//           p.write {op: {do: 'int', x: 1, y: 1, i: 1}, line: 23}
//
//         describe 'single quadrant arc mode', ->
//           beforeEach -> p.write {set: {quad: 's'}}
//
//           it 'should add a CW arc with a set to cw', ->
//             p.write {set: {mode: 'cw'}}
//             p.write {op: {do: 'int', x: 1, y: 1, i: 1}}
//             expect(p.path[-8..]).to.eql ['A', 1, 1, 0, 0, 0, 1, 1]
//
//           it 'should add a CCW arc with a G03', ->
//             p.write {set: {mode: 'ccw'}}
//             p.write {op: {do: 'int', x: 1, y: 1, j: 1}}
//             expect(p.path[-8..]).to.eql ['A', 1, 1, 0, 0, 1, 1, 1]
//
//           it 'should close the path on a zero length arc', ->
//             p.write {set: {mode: 'ccw'}}
//             p.write {op: {do: 'int', x: 0, y: 0, j: 1}}
//             expect(p.path[-9..]).to.eql ['A', 1, 1, 0, 0, 1, 0, 0, 'Z']
//
//           it 'should warn for impossible arcs', (done) ->
//             p.once 'warning', (w) ->
//               expect(w).to.be.an.instanceOf Warning
//               expect(w.message).to.match /line 36 .*impossible arc/
//               setTimeout ->
//                 expect(p.path).to.not.contain 'A'
//                 done()
//               , 10
//
//             p.write {set: {mode: 'ccw'}}
//             p.write {op: {do: 'int', x: 1, y: 1, i: 1}, line: 36}
//
//         describe 'multi quadrant arc mode', ->
//           beforeEach -> p.write {set: {quad: 'm'}}
//
//           it 'should add a CW arc with a G02', ->
//             p.write {set: {mode: 'cw'}}
//             p.write {op: {do: 'int', x: 1, y: 1, j: 1}}
//             expect(p.path[-8..]).to.eql ['A', 1, 1, 0, 1, 0, 1, 1]
//
//           it 'should add a CCW arc with a G03', ->
//             p.write {set: {mode: 'ccw'}}
//             p.write {op: {do: 'int', x: 1, y: 1, i: 1}}
//             expect(p.path[-8..]).to.eql ['A', 1, 1, 0, 1, 1, 1, 1]
//
//           it 'should add 2 paths for full circle if start is end', ->
//             p.write {set: {mode: 'cw'}}
//             p.write {op: {do: 'int', i: 1}}
//             expect(p.path[-16..]).to.eql [
//               'A', 1, 1, 0, 0, 0, 2, 0, 'A', 1, 1, 0, 0, 0, 0, 0
//            ]
//
//           it 'should warn for impossible arc and add nothing to path', (done) ->
//             p.once 'warning', (w) ->
//               expect(w).to.be.an.instanceOf Warning
//               expect(w.message).to.match /line 20 .*impossible arc/
//               setTimeout ->
//                 expect(p.path).to.not.contain 'A'
//                 done()
//               , 10
//
//             p.write {set: {mode: 'cw'}}
//             p.write {op: {do: 'int', x: 1, y: 1, j: -1}, line: 20}
//
//         # tool is a dia 2 circle for these tests
//         describe 'adjusting the layer bbox', ->
//           it 'sweeping past 180 deg determines min X', ->
//             p.write {op: {do: 'move', x: -0.7071, y: -0.7071}}
//             p.write {set: {mode: 'cw', quad: 's'}}
//             p.write {
//               op: {do: 'int', x: -0.7071, y: 0.7071, i: 0.7071, j: 0.7071}
//             }
//             result = -2 - p.layerBbox.xMin
//             expect(result).to.be.closeTo 0, 0.00001
//
//           it 'sweeping past 270 deg determines min Y', ->
//             p.write {op: {do: 'move', x: 0.7071, y: -0.7071}}
//             p.write {set: {mode: 'cw', quad: 's'}}
//             p.write {
//               op: {do: 'int', x: -0.7071, y: -0.7071, i: 0.7071, j: 0.7071}
//             }
//             result = -2 - p.layerBbox.yMin
//             expect(result).to.be.closeTo 0, 0.00001
//
//           it 'sweeping past 90 deg determines max Y', ->
//             p.write {op: {do: 'move', x: -0.7071, y: 0.7071}}
//             p.write {set: {mode: 'cw', quad: 's'}}
//             p.write {
//               op: {do: 'int', x: 0.7071, y: 0.7071, i: 0.7071, j: 0.7071}
//             }
//             result = 2 - p.layerBbox.yMax
//             expect(result).to.be.closeTo 0, 0.00001
//
//           it 'sweeping past 0 deg determines max X', ->
//             p.write {op: {do: 'move', x: 0.7071, y: 0.7071}}
//             p.write {set: {mode: 'cw', quad: 's'}}
//             p.write {
//               op: {do: 'int', x: 0.7071, y: -0.7071, i: 0.7071, j: 0.7071}
//             }
//             result = 2 - p.layerBbox.xMax
//             expect(result).to.be.closeTo 0, 0.00001
//
//           it 'if its just hanging out, use the end points', ->
//             p.write {op: {do: 'move', x: 0.5, y: 0.866}}
//             p.write {set: {mode: 'cw', quad: 's'}}
//             p.write {
//               op: {do: 'int', x: 0.866, y: 0.5, i: 0.5, j: 0.866}
//             }
//             expect(p.layerBbox.xMin).to.equal -0.5
//             expect(p.layerBbox.yMin).to.equal -0.5
//             expect(p.layerBbox.xMax).to.equal 1.8660
//             expect(p.layerBbox.yMax).to.equal 1.8660
//
//       describe 'region mode on', ->
//         it 'should allow any tool to create a region', (done) ->
//           p.once 'error', ->
//             throw new Error 'should not have emitted an error'
//
//           p.write {tool: {D13: {dia: 5, vertices: 5}}}
//           p.write {set: {region: true}}
//           p.write {op: {do: 'int', x: 5, y: 5}}
//
//           setTimeout done, 10
//
//         it 'should not take tool into account when calculating bbox', ->
//           p.write {set: {region: true}}
//           p.write {op: {do: 'int', x: 5, y: 5}}
//           expect(p.layerBbox).to.eql {xMin: 0, yMin: 0, xMax: 5, yMax: 5}
//
//         it 'should not take tool into account when calculating arc bbox', ->
//           p.write {set: {region: true}}
//           p.write {op: {do: 'move', x: 0.5, y: 0.866}}
//           p.write {set: {mode: 'cw', quad: 's'}}
//           p.write {
//             op: {do: 'int', x: 0.866, y: 0.5, i: 0.5, j: 0.866}
//           }
//           expect(p.layerBbox.xMin).to.equal 0.5
//           expect(p.layerBbox.yMin).to.equal 0.5
//           expect(p.layerBbox.xMax).to.equal 0.8660
//           expect(p.layerBbox.yMax).to.equal 0.8660
//
//         it 'should finish current path with Z and add to the current layer', ->
//           p.write {set: {region: true}}
//           p.write {op: {do: 'int', x: 5, y: 5}}
//           p.write {op: {do: 'int', x: 0, y: 5}}
//           p.write {op: {do: 'int', x: 0, y: 0}}
//           p.finishPath()
//           path = p.current[0].path
//           expect(path.d).to.eql [
//             'M', 0, 0, 'L', 5, 5, 'L', 0, 5, 'L', 0, 0, 'Z'
//           ]
//           expect(path.fill).to.not.eql 'none'
//
//     describe 'modal operation codes', ->
//       it 'should throw a warning if operation codes are used modally', (done) ->
//         p.once 'warning', (w) ->
//           expect(w).to.be.an.instanceOf Warning
//           expect(w.message).to.match /modal operation/
//           done()
//
//         p.write {op: {do: 'int', x: 1, y: 1}}
//         p.write {op: {do: 'last', x: 2, y: 2}}
//
//       it 'should continue a stroke if last operation was a stroke', ->
//         p.write {op: {do: 'int', x: 1, y: 1}}
//         p.write {op: {do: 'last', x: 2, y: 2}}
//         expect(p.path).to.eql ['M', 0, 0, 'L', 1, 1, 'L', 2, 2]
//
//       it 'should move if last operation was a move', ->
//         p.write {op: {do: 'move', x: 1, y: 1}}
//         p.write {op: {do: 'last', x: 2, y: 2}}
//         expect(p.x).to.equal 2
//         expect(p.y).to.equal 2
//
//       it 'should flash if last operation was a flash', ->
//         p.write {op: {do: 'flash', x: 1, y: 1}}
//         p.write {op: {do: 'last', x: 2, y: 2}}
//         expect(p.current).to.have.length 2
//         expect(p.current[0].use).to.contain {x: 1, y: 1}
//         expect(p.current[1].use).to.contain {x: 2, y: 2}
//
//   describe 'finish layer method', ->
//     beforeEach -> p.current = ['item0', 'item1', 'item2']
//
//     it 'should add current items to the group if only one dark layer', ->
//       p.finishLayer()
//       expect(p.group).to.eql {g: {_: ['item0', 'item1', 'item2']}}
//       expect(p.current).to.be.empty
//
//     it 'should finish an in-progress path', ->
//       p.write {set: {region: true}}
//       p.path = ['M', 0, 0, 'L', 1, 1]
//       p.finishLayer()
//       expect(p.path).to.be.empty
//
//     it 'should not do anything unless there are items in current', ->
//       p.current = []
//       p.finishLayer()
//       expect(p.group.g._).to.be.empty
//       expect(p.defs).to.be.empty
//
//     describe 'multiple layers', ->
//       it 'if clear layer, should mask the group with them', ->
//         p.polarity = 'C'
//         p.bbox = {xMin: 0, yMin: 0, xMax: 2, yMax: 2}
//         p.finishLayer()
//         mask = p.defs[0].mask
//         expect(mask.color).to.eql '#000'
//         expect(mask._).to.eql [
//           {rect: {x: 0, y: 0, width: 2, height: 2, fill: '#fff'}}
//           'item0'
//           'item1'
//           'item2'
//         ]
//         id = p.defs[0].mask.id
//         expect(p.group).to.eql {g: {mask: "url(##{id})", _: []}}
//         expect(p.current).to.be.empty
//
//       it 'if dark layer after clear layer, it should wrap the group', ->
//         p.group = {g: {mask: 'url(#mask-id)', _: ['gItem1', 'gItem2']}}
//         p.finishLayer()
//         expect(p.group).to.eql {
//           g: {
//             _: [
//               {g: {mask: 'url(#mask-id)', _: ['gItem1', 'gItem2']}}
//               'item0'
//               'item1'
//               'item2'
//             ]
//           }
//         }
//
//     describe 'step repeat', ->
//       beforeEach ->
//         p.layerBbox = {xMin: 0, yMin: 0, xMax: 2, yMax: 2}
//         p.stepRepeat = {x: 2, y: 2, i: 3, j: 3}
//
//       describe 'with a dark layer', ->
//         it 'should wrap current in a group, copy it, add it to @group', ->
//           p.finishLayer()
//           id = p.group.g._[0].g.id
//           expect(p.group.g._).to.deep.contain.members [
//             {g: {id: id, _: ['item0', 'item1', 'item2']}}
//             {use: {y: 3, 'xlink:href': "##{id}"}}
//             {use: {x: 3, 'xlink:href': "##{id}"}}
//             {use: {x:3, y: 3, 'xlink:href': "##{id}"}}
//           ]
//           expect(p.current).to.be.empty
//
//         it 'leave existing (pre-stepRepeat) items alone', ->
//           p.group.g._ = ['existing1', 'existing2']
//           p.finishLayer()
//           expect(p.group.g._).to.have.length 6
//           id = p.group.g._[2].g.id
//           expect(p.group.g._).to.deep.contain.members [
//             'existing1'
//             'existing2'
//             {g: {id: id, _: ['item0', 'item1', 'item2']}}
//             {use: {y: 3, 'xlink:href': "##{id}"}}
//             {use: {x: 3, 'xlink:href': "##{id}"}}
//             {use: {x:3, y: 3, 'xlink:href': "##{id}"}}
//           ]
//           expect(p.current).to.be.empty
//
//       describe 'with a clear layer', ->
//         it 'should wrap the current items and repeat them in the mask', ->
//           p.polarity = 'C'
//           p.finishLayer()
//           maskId = p.defs[0].mask.id
//           groupId = p.defs[0].mask._[1].g.id
//           expect(p.defs[0].mask._).to.deep.contain.members [
//             {rect: {x: 0, y: 0, width: 5, height: 5, fill: '#fff'}}
//             {g: {id: groupId, _: ['item0', 'item1', 'item2']}}
//             {use: {y: 3, 'xlink:href': "##{groupId}"}}
//             {use: {x: 3, 'xlink:href': "##{groupId}"}}
//             {use: {x:3, y: 3, 'xlink:href': "##{groupId}"}}
//           ]
//           expect(p.group.g.mask).to.eql "url(##{maskId})"
//           expect(p.current).to.be.empty
//
//       describe 'overlapping clear layers', ->
//         beforeEach ->
//           p.layerBbox = {xMin: 0, yMin: 0, xMax: 4, yMax: 4}
//           p.finishLayer()
//           p.current = ['item3', 'item4']
//           p.layerBbox = {xMin: 0, yMin: 0, xMax: 6, yMax: 6}
//           p.polarity = 'C'
//           p.finishLayer()
//
//         it 'should push the ids of sr layers to the overlap array', ->
//           expect(p.srOverCurrent[0].D).to.match /gerber-sr/
//           expect(p.srOverCurrent[0]).to.not.have.key 'C'
//           expect(p.srOverCurrent[1].C).to.match /gerber-sr/
//           expect(p.srOverCurrent[1]).to.not.have.key 'D'
//
//         it 'should push dark layers to the group normally', ->
//           expect(p.group.g._[0]).to.have.key 'g'
//           expect(p.group.g._[1]).to.have.key 'use'
//           expect(p.group.g._[2]).to.have.key 'use'
//           expect(p.group.g._[3]).to.have.key 'use'
//
//         it 'should set the clear overlap flag and not mask immediately', ->
//           expect(p.srOverClear).to.be.true
//
//         it 'should create the mask when the sr changes', ->
//           id = []
//           for layer in p.srOverCurrent
//             id.push "##{val}" for key, val of layer
//           p.write {new: {sr: {x: 1, y: 1}}}
//           expect(p.srOverCurrent.length).to.equal 0
//           expect(p.srOverClear).to.be.false
//           expect(p.defs[0].g._).to.eql ['item3', 'item4']
//           expect(p.defs[1].mask.color).to.eql '#000'
//           maskId = p.defs[1].mask.id
//           expect(p.group.g.mask).to.eql "url(##{maskId})"
//           expect(p.defs[1].mask._).to.eql [
//             {rect: {fill: '#fff', x: 0, y: 0, width: 9, height: 9}}
//             {use: {fill: '#fff', 'xlink:href': id[0]}}
//             {use: {'xlink:href': id[1]}}
//             {use: {y: 3, fill: '#fff', 'xlink:href': id[0]}}
//             {use: {y: 3, 'xlink:href': id[1]}}
//             {use: {x: 3, fill: '#fff', 'xlink:href': id[0]}}
//             {use: {x: 3, 'xlink:href': id[1]}}
//             {use: {x: 3, y: 3, fill: '#fff', 'xlink:href': id[0]}}
//             {use: {x: 3, y: 3, 'xlink:href': id[1]}}
//          ]
//
//         it 'should also finish the SR at the end of file', ->
//           p.finish()
//           expect(p.srOverCurrent.length).to.equal 0
//           expect(p.srOverClear).to.be.false
//
//   describe 'end of stream', ->
//     it 'should emit an svg xml object when its stream ends', (done) ->
//       p.once 'readable', ->
//         svg = p.read().svg
//         expect(svg.xmlns).to.eql 'http://www.w3.org/2000/svg'
//         expect(svg.version).to.eql '1.1'
//         expect(svg['xmlns:xlink']).to.eql 'http://www.w3.org/1999/xlink'
//         expect(svg.width).to.eql '0.01in'
//         expect(svg.height).to.eql '0.005in'
//         expect(svg.viewBox).to.eql [0, 0, 10, 5]
//         expect(svg['stroke-linecap']).to.eql 'round'
//         expect(svg['stroke-linejoin']).to.eql 'round'
//         expect(svg['stroke-width']).to.eql 0
//         expect(svg.stroke).to.eql '#000'
//
//         defs = svg._[0].defs
//         g = svg._[1].g
//
//         expect(defs._[0].circle.r).to.eql 1
//         expect(g._[0].path.d).to.eql ['M', 1, 1, 'L', 9, 4]
//         expect(g.fill).to.eql 'currentColor'
//         expect(g.stroke).to.eql 'currentColor'
//         expect(g.transform).to.eql 'translate(0,5) scale(1,-1)'
//
//         done()
//
//       p.write {set: {units: 'in', notation: 'A', mode: 'i'}}
//       p.write {tool: {D10: {dia: 2}}}
//       p.write {op: {do: 'move', x: 1, y: 1}}
//       p.write {op: {do: 'int', x: 9, y: 4}}
//       p.write {op: {do: 'flash', x: 1, y: 4}}
//       p.end()
//
//     it 'should push out an empty image if no items', (done) ->
//       p.once 'readable', ->
//         svg = p.read().svg
//         expect(svg.width).to.eql '0in'
//         expect(svg.height).to.eql '0in'
//         expect(svg.viewBox).to.eql [0, 0, 0, 0]
//
//         expect(svg._).to.be.empty
//
//         done()
//
//       p.write {set: {units: 'in', notation: 'A', mode: 'i'}}
//       p.write {tool: {D10: {dia: 2}}}
//       p.write {op: {do: 'move', x: 1, y: 1}}
//       p.end()

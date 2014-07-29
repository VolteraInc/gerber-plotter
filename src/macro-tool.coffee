# aperture macro class
# parses an aperture macro and then returns the pad when the tool is defined

# uses the pad shapes functions
shapes = require './pad-shapes'
# calculator parsing for macro arithmetic
calc = require './macro-calc'

# aperture macro list
macros = {}

# macro id number (incremented for unique ids)
id = 0

# macro primitive functions
# tool is the tool number
# pad is the existing pad
# params is an array of functions
circle = (params) ->
  # parameters to pass into standard circle function
  cir = {}
  # first parameter is exposure
  # if exposure is off, we're masking, and we'll need to take on a fill
  mask = params[0] is '0'
  # second parameter is diameter
  cir.dia = functionOrValue params[1]
  # third and fourth are x and y of center
  cir.cx = functionOrValue params[2]
  cir.cy = functionOrValue params[3]
  # tack the circle on
  result += standard(t, cir).pad
  # finish mask if applicable
  if maskId
    pad = pad[0...-2] + 'fill="#000" /></mask>'
  # return
  pad

# macro primitives
primitives = {
  1: circle
  # 2: line
  # 20: line
  # 21: lowerLeftRect
  # 22: rectangle
  # 4: outline
  # 5: polygon
  # 6: moire
  # 7: thermal
}

class MacroTool
  # constructor takes in macro blocks
  constructor: (blocks) ->
    # macro modifiers
    @modifiers = {}
    # block 0 is going to be AMmacroname
    @name = blocks[0][2..]
    # save the rest of the blocks
    @blocks = blocks[1..]
    # array of shape objects
    @shapes = []
    # array of mask objects
    @masks = []
    # bounding box [xMin, yMin, xMax, yMax] of macro
    @bbox = [ null, null, null, null ]


  # run the macro and return the pad
  run: (tool, modifiers = []) ->
    @modifiers["$#{i+1}"] = m for m, i in modifiers
    pad = ''

  # run a block and return the modified pad string
  runBlock: (block) ->
    # check the first character of the block
    switch block[0]
      # if we got ourselves a modifier, we should set it
      when '$'
        mod = block.match(/^\$\d+(?=\=)/)?[0]
        val = block[1+mod.length..]
        @modifiers[mod] = @getNumber val
      # or it's a primitive
      when '1', '2', '20', '21', '22', '4', '5', '6', '7'
        args = block.split ','
        args[i] = getNumber a for a,i in args
      else
        # throw an error because I don't know what's going on
        # unless it's a comment; in that case carry on
        unless block[0] is '0'
          throw new SyntaxError "'#{block}' unrecognized tool macro block"

  primitive: (args) ->
    mask = false
    rotation = false
    shape = null
    switch args[0]
      # circle primitive
      when 1
        shape = shapes.circle { dia: args[2], cx: args[3], cy: args[4] }
        if args[1] is 0 then mask = true else @addBbox shape.bbox
      # vector line primitive
      when 2, 20
        shape = shapes.vector {
          width: args[2]
          x1: args[3]
          y1: args[4]
          x2: args[5]
          y2: args[6]
        }
        if args[1] is 0 then mask = true else @addBbox shape.bbox, args[7]
      when 21
        shape = shapes.rect {
          cx: args[4], cy: args[5], width: args[2], height: args[3]
        }
        if args[1] is 0 then mask = true else @addBbox shape.bbox, args[6]
      when 22
        shape = shapes.lowerLeftRect {
          x: args[4], y: args[5], width: args[2], height: args[3]
        }
        if args[1] is 0 then mask = true else @addBbox shape.bbox, args[6]
      when 4
        points = []
        points.push [ args[i], args[i+1] ] for i in [ 3..3+2*args[2] ] by 2
        shape = shapes.outline { points: points }
        if args[1] is 0 then mask = true
        else @addBbox shape.bbox, args[args.length-1]
      when 5
        # rotation only allowed if center is on the origin
        if args[6] isnt 0 and (args[3] isnt 0 or args[4] isnt 0)
          throw new RangeError 'polygon center must be 0,0 if rotated in macro'
        shape = shapes.polygon {
          cx: args[3]
          cy: args[4]
          dia: args[5]
          verticies: args[2]
          degrees: args[6]
        }
        if args[1] is 0 then mask = true else @addBbox shape.bbox
      when 6
        # rotation only allowed if center is on the origin
        if args[9] isnt 0 and (args[1] isnt 0 or args[2] isnt 0)
          throw new RangeError 'moiré center must be 0,0 if rotated in macro'
        shape = shapes.moire {
          cx: args[1]
          cy: args[2]
          outerDia: args[3]
          ringThx: args[4]
          ringGap: args[5]
          maxRings: args[6]
          crossThx: args[7]
          crossLength: args[8]
        }
        @addBbox shape.bbox, args[9]
      when 7
        # rotation only allowed if center is on the origin
        if args[9] isnt 0 and (args[1] isnt 0 or args[2] isnt 0)
          throw new RangeError 'thermal center must be 0,0 if rotated in macro'
        shape = shapes.thermal {
          cx: args[1]
          cy: args[2]
          outerDia: args[3]
          innerDia: args[4]
          gap: args[5]
        }
        @addBbox shape.bbox, args[6]

    unless Array.isArray shape.shape then @shapes.push shape.shape
    else
      for s in shape.shape
        if s.mask? then @masks.push s else @shapes.push s

  addBbox: (bbox, rotation=0) ->
    unless rotation
      if @bbox[0] is null or bbox[0] < @bbox[0] then @bbox[0] = bbox[0]
      if @bbox[1] is null or bbox[1] < @bbox[1] then @bbox[1] = bbox[1]
      if @bbox[2] is null or bbox[2] > @bbox[2] then @bbox[2] = bbox[2]
      if @bbox[3] is null or bbox[3] > @bbox[3] then @bbox[3] = bbox[3]

  getNumber: (s) ->
    # normal number all by itself
    if s.match /^[+-]?[\d.]+$/ then parseFloat s
    # modifier all by its lonesome
    else if s.match /^\$\d+$/ then parseFloat @modifiers[s]
    # else we got us some maths
    else @evaluate calc.parse s

  evaluate: (op) ->
    switch op.type
      when 'n' then @getNumber op.val
      when '+' then @evaluate(op.left) + @evaluate(op.right)
      when '-' then @evaluate(op.left) - @evaluate(op.right)
      when 'x' then @evaluate(op.left) * @evaluate(op.right)
      when '/' then @evaluate(op.left) / @evaluate(op.right)

module.exports = MacroTool

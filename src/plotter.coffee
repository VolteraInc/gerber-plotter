# svg plotter class

# use the gerber parser class to parse the file
Parser = require './gerber-parser'
# unique id generator
unique = require './unique-id'
# aperture macro class
Macro = require './macro-tool'
# standard tool functions
tool = require './standard-tool'

# parse a aperture definition command and return the object
parseAD = (block) ->
  # first get the code
  code = (block.match /^ADD\d+/)?[0]?[2..]
  # throw an error early if code is bad
  unless code? and parseInt(code[1..], 10) > 9
    throw new SyntaxError "#{code} is an invalid tool code (must be >= 10)"
  # get the tool
  ad = null
  am = false
  switch block[2+code.length...4+code.length]
    when 'C,'
      mods = block[4+code.length..].split 'X'
      params = { dia: parseFloat mods[0] }
      if mods.length > 2 then params.hole = {
        width: parseFloat mods[2]
        height: parseFloat mods[1]
      }
      else if mods.length > 1 then params.hole = { dia: parseFloat mods[1] }
      ad = tool code, params
    when 'R,'
      mods = block[4+code.length..].split 'X'
      params = { width: parseFloat(mods[0]), height: parseFloat(mods[1]) }
      if mods.length > 3 then params.hole = {
        width: parseFloat mods[3]
        height: parseFloat mods[2]
      }
      else if mods.length > 2 then params.hole = { dia: parseFloat mods[2] }
      ad = tool code, params
    when 'O,'
      mods = block[4+code.length..].split 'X'
      params = { width: parseFloat(mods[0]), height: parseFloat(mods[1]) }
      if mods.length > 3 then params.hole = {
        width: parseFloat mods[3]
        height: parseFloat mods[2]
      }
      else if mods.length > 2 then params.hole = { dia: parseFloat mods[2] }
      params.obround = true
      ad = tool code, params
    when 'P,'
      mods = block[4+code.length..].split 'X'
      params = {
        dia: parseFloat(mods[0])
        verticies: parseFloat(mods[1])
      }
      if mods[2]? then params.degrees = parseFloat mods[2]
      if mods.length > 4 then params.hole = {
        width: parseFloat mods[4]
        height: parseFloat mods[3]
      }
      else if mods.length > 3 then params.hole = { dia: parseFloat mods[3] }
      ad = tool code, params
    else
      def = block[2+code.length..]
      name = (def.match /[a-zA-Z_$][a-zA-Z_$.]{0,126}(?=,)/)?[0]
      unless name then throw new SyntaxError 'invalid definition with macro'
      mods = (def[name.length+1..]).split 'X'
      am = { name: name, mods: mods }
  # return the tool and the tool code
  { macro: am, tool: ad, code: code }

class Plotter
  constructor: (file = '') ->
    # create a parser object
    @parser = new Parser file
    # tools
    @macros = {}
    @tools = {}
    # array for pad and mask definitions
    @defs = []
    # array for svg identification and layers
    @gerberId = "gerber-#{unique()}"
    @currentLayer = { level: 0, polarity: 'D' }
    @layers = [ { g: [ _attr: { id: "#{@gerberId}-layer-0" } ] } ]
    # are we done with the file yet? no
    @done = false

  plot: () ->
    until @done
      current = @parser.nextCommand()
      # if it's a parameter command
      if current[0] is '%' then @parameter current else @operation current[0]

  parameter: (blocks) ->
    done = false
    if blocks[0] is '%' and blocks[blocks.length-1] isnt '%'
      throw new SyntaxError '@parameter should only be called with paramters'
    blocks = blocks[1..]
    index = 0
    until done
      switch blocks[index][0...2]
        when 'FS'
          throw new Error 'format spec unimplimented'
        when 'MO'
          throw new Error 'unit mode unimplimented'
        when 'AD'
          ad = parseAD blocks[index]
          if @tools[ad.code]? then throw new SyntaxError 'duplicate tool code'
          if ad.macro
            ad.tool = @macros[ad.macro.name].run ad.code, ad.macro.mods
          @tools[ad.code] = {
            stroke: ad.tool.trace
            flash: { use: { _attr: { 'xlink:href': '#'+ad.tool.padId } } }
          }
          @defs.push obj for obj in ad.tool.pad
        when 'AM'
          m = new Macro blocks[...-1]
          @macros[m.name] = m
          done = true
        when 'SR'
          throw new Error 'step repeat unimplimented'
        when 'LP'
          throw new Error 'level polarity unimplimented'

      if blocks[++index] is '%' then done = true

  operation: (block) ->


module.exports = Plotter

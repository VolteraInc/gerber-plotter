# shape functions for standard apertures and aperture macros
# returns an array of shape objects and the bounding box of the shape

# unique id because thermals need a mask
unique = require './unique-id'

circle = (p) ->
  unless p.dia? then throw new SyntaxError 'circle function requires diameter'
  unless p.cx? then throw new SyntaxError 'circle function requires x center'
  unless p.cy? then throw new SyntaxError 'circle function requires y center'

  r = p.dia/2
  {
    shape: {
      circle: {
        _attr: { cx: "#{p.cx}", cy: "#{p.cy}", r: "#{r}" }
      }
    }
    bbox: [ p.cx - r, p.cy - r, p.cx + r, p.cy + r ]
  }

rect = (p) ->
  unless p.width? then throw new SyntaxError 'rectangle requires width'
  unless p.height? then throw new SyntaxError 'rectangle requires height'
  unless p.cx? then throw new SyntaxError 'rectangle function requires x center'
  unless p.cy? then throw new SyntaxError 'rectangle function requires y center'

  x = p.cx - p.width/2
  y = p.cy - p.height/2
  rectangle = {
    shape: {
      rect: {
        _attr: {
          x:      "#{x}"
          y:      "#{y}"
          width:  "#{p.width}"
          height: "#{p.height}"
        }
      }
    }
    bbox: [ x, y, x + p.width, y + p.height ]
  }

  if p.obround
    radius = 0.5 * Math.min p.width, p.height
    rectangle.shape.rect._attr.rx = "#{radius}"
    rectangle.shape.rect._attr.ry = "#{radius}"
  # return pad object
  rectangle

# regular polygon
polygon = (p) ->
  unless p.dia? then throw new SyntaxError 'polygon requires diameter'
  unless p.verticies? then throw new SyntaxError 'polygon requires verticies'
  unless p.cx? then throw new SyntaxError 'polygon function requires x center'
  unless p.cy? then throw new SyntaxError 'polygon function requires y center'

  start = if p.degrees? then p.degrees * Math.PI/180 else 0
  step = 2*Math.PI / p.verticies
  r = p.dia / 2
  points = ''
  xMin = null
  yMin = null
  xMax = null
  yMax = null
  # loop over the verticies and add them to the points string
  for i in [0...p.verticies]
    theta = start + i*step
    rx = r*Math.cos theta
    ry = r*Math.sin theta
    # take care of floating point errors
    if Math.abs(rx) < 0.000000001 then rx = 0
    if Math.abs(ry) < 0.000000001 then ry = 0
    x = p.cx + rx
    y = p.cy + ry
    if x < xMin or xMin is null then xMin = x
    if x > xMax or xMax is null then xMax = x
    if y < yMin or yMin is null then yMin = y
    if y > yMax or yMax is null then yMax = y
    points += " #{x},#{y}"
  # return polygon object
  {
    shape: { polygon: { _attr: { points: points[1..] } } }
    bbox: [ xMin, yMin, xMax, yMax ]
  }

vector = (p) ->
  unless p.x1? then throw new SyntaxError 'vector function requires start x'
  unless p.y1? then throw new SyntaxError 'vector function requires start y'
  unless p.x2? then throw new SyntaxError 'vector function requires end x'
  unless p.y2? then throw new SyntaxError 'vector function requires end y'
  unless p.width? then throw new SyntaxError 'vector function requires width'

  # get angle of the line for the bounding box
  theta = Math.abs Math.atan (p.y2 - p.y1)/(p.x2 - p.x1)
  xDelta = p.width / 2 * Math.sin theta
  yDelta = p.width / 2 * Math.cos theta
  # fix some edge cases
  if xDelta < 0.0000001 then xDelta = 0
  if yDelta < 0.0000001 then yDelta = 0
  # return the object
  {
    shape: {
      line: {
        _attr: {
          x1: "#{p.x1}"
          x2: "#{p.x2}"
          y1: "#{p.y1}"
          y2: "#{p.y2}"
          'stroke-width': "#{p.width}"
        }
      }
    }
    bbox: [
      (Math.min p.x1, p.x2) - xDelta
      (Math.min p.y1, p.y2) - yDelta
      (Math.max p.x1, p.x2) + xDelta
      (Math.max p.y1, p.y2) + yDelta
    ]
  }

lowerLeftRect = (p) ->
  unless p.width? then throw new SyntaxError 'lower left rect requires width'
  unless p.height? then throw new SyntaxError 'lower left rect requires height'
  unless p.x? then throw new SyntaxError 'lower left rectangle requires x'
  unless p.y? then throw new SyntaxError 'lower left rectangle requires y'

  # return shape and bbox
  {
    shape: {
      rect: {
        _attr: {
          x: "#{p.x}"
          y: "#{p.y}"
          width: "#{p.width}"
          height: "#{p.height}"
        }
      }
    }
    bbox: [ p.x, p.y, p.x + p.width, p.y + p.height ]
  }

outline = (p) ->
  unless Array.isArray(p.points) and p.points.length > 1
    throw new SyntaxError 'outline function requires points array'

  xMin = null
  yMin = null
  xMax = null
  yMax = null
  pointString = ''
  for point in p.points
    unless (Array.isArray(point) and point.length is 2)
      throw new SyntaxError 'outline function requires points array'
    x = point[0]
    y = point[1]
    if x < xMin or xMin is null then xMin = x
    if x > xMax or xMax is null then xMax = x
    if y < yMin or yMin is null then yMin = y
    if y > yMax or yMax is null then yMax = y
    pointString += " #{x},#{y}"
  # check the last point matches the first
  xLast = p.points[p.points.length - 1][0]
  yLast = p.points[p.points.length - 1][1]
  unless xLast is p.points[0][0] and yLast is p.points[0][1]
    throw new RangeError 'last point must match first point of outline'

  # return the object
  {
    shape: { polygon: { _attr: { points: pointString[1..] } } }
    bbox: [ xMin, yMin, xMax, yMax ]
  }

moire = (p) ->
  unless p.cx? then throw new SyntaxError 'moiré requires x center'
  unless p.cy? then throw new SyntaxError 'moiré requires y center'
  unless p.outerDia? then throw new SyntaxError 'moiré requires outer diameter'
  unless p.ringThx? then throw new SyntaxError 'moiré requires ring thickness'
  unless p.ringGap? then throw new SyntaxError 'moiré requires ring gap'
  unless p.maxRings? then throw new SyntaxError 'moiré requires max rings'
  unless p.crossLength?
    throw new SyntaxError 'moiré requires crosshair length'
  unless p.crossThx?
    throw new SyntaxError 'moiré requires crosshair thickness'

  # add crosshair to shape
  shape = [
    {
      line: {
        _attr: {
          x1: "#{p.cx - p.crossLength/2}"
          y1: '0'
          x2: "#{p.cx + p.crossLength/2}"
          y2: '0'
          'stroke-width': "#{p.crossThx}"
        }
      }
    }
    {
      line: {
        _attr: {
          x1: '0'
          y1: "#{p.cy - p.crossLength/2}"
          x2: '0'
          y2: "#{p.cy + p.crossLength/2}"
          'stroke-width': "#{p.crossThx}"
        }
      }
    }
  ]

  # add rings to shape
  r = (p.outerDia - p.ringThx)/2
  rings = 0
  while r >= p.ringThx and rings <= p.maxRings
    shape.push {
      circle: {
        _attr: {
          cx: "#{p.cx}"
          cy: "#{p.cy}"
          r: "#{r}"
          fill: 'none'
          'stroke-width': "#{p.ringThx}"
        }
      }
    }
    rings++
    r -= p.ringThx + p.ringGap

  # if there's still some room left, a disc goes in the center
  if r > 0 and rings <= p.maxRings then shape.push {
    circle: {
      _attr: {
        cx: "#{p.cx}"
        cy: "#{p.cy}"
        r: "#{r}"
        'stroke-width': 0
      }
    }
  }

  {
    shape: shape
    bbox: [
      Math.min (p.cx - p.crossLength/2), (p.cx - p.outerDia/2)
      Math.min (p.cy - p.crossLength/2), (p.cy - p.outerDia/2)
      Math.max (p.cx + p.crossLength/2), (p.cx + p.outerDia/2)
      Math.max (p.cy + p.crossLength/2), (p.cy + p.outerDia/2)
    ]
  }

thermal = (p) ->
  unless p.cx? then throw new SyntaxError 'thermal requires x center'
  unless p.cy? then throw new SyntaxError 'thermal requires y center'
  unless p.outerDia?
    throw new SyntaxError 'thermal requires outer diameter'
  unless p.innerDia?
    throw new SyntaxError 'thermal requires inner diameter'
  unless p.gap? then throw new SyntaxError 'thermal requires gap'

  maskId = "thermal-mask-#{unique()}"
  thx = (p.outerDia - p.innerDia) / 2
  outerR = p.outerDia / 2
  r = outerR - thx / 2
  xMin = p.cx - outerR
  xMax = p.cx + outerR
  yMin = p.cy - outerR
  yMax = p.cy + outerR
  halfGap = p.gap/2
  {
    shape: [
      {
        mask: [
          {
            _attr: { id: maskId }
          }
          {
            circle: {
              _attr: {
                cx: "#{p.cx}"
                cy: "#{p.cy}"
                r: "#{outerR}"
                fill: '#fff'
              }
            }
          }
          {
            rect: {
              _attr: {
                x: "#{xMin}"
                y: "#{-halfGap}"
                width: "#{p.outerDia}"
                height: "#{p.gap}"
                fill: "#000"
              }
            }
          }
          {
            rect: {
              _attr: {
                x: "#{-halfGap}"
                y: "#{yMin}"
                width: "#{p.gap}"
                height: "#{p.outerDia}"
                fill: "#000"
              }
            }
          }
        ]
      }
      {
        circle: {
          _attr: {
            cx: "#{p.cx}"
            cy: "#{p.cy}"
            r: "#{r}"
            fill: 'none'
            'stroke-width': "#{thx}"
            mask: "url(##{maskId})"
          }
        }
      }
    ]
    bbox: [ xMin, yMin, xMax, yMax]
  }

# export
module.exports = {
  circle: circle
  rect: rect
  polygon: polygon
  vector: vector
  lowerLeftRect: lowerLeftRect
  outline: outline
  moire: moire
  thermal: thermal
}

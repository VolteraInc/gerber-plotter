(function() {
  var circle, lowerLeftRect, moire, outline, polygon, rect, thermal, unique, vector;

  unique = require('./unique-id');

  circle = function(p) {
    var r;
    if (p.dia == null) {
      throw new SyntaxError('circle function requires diameter');
    }
    if (p.cx == null) {
      throw new SyntaxError('circle function requires x center');
    }
    if (p.cy == null) {
      throw new SyntaxError('circle function requires y center');
    }
    r = p.dia / 2;
    return {
      shape: {
        circle: {
          cx: p.cx,
          cy: p.cy,
          r: r,
          'stroke-width': 0,
          fill: 'currentColor'
        }
      },
      bbox: [p.cx - r, p.cy - r, p.cx + r, p.cy + r]
    };
  };

  rect = function(p) {
    var radius, rectangle, x, y;
    if (p.width == null) {
      throw new SyntaxError('rectangle requires width');
    }
    if (p.height == null) {
      throw new SyntaxError('rectangle requires height');
    }
    if (p.cx == null) {
      throw new SyntaxError('rectangle function requires x center');
    }
    if (p.cy == null) {
      throw new SyntaxError('rectangle function requires y center');
    }
    x = p.cx - p.width / 2;
    y = p.cy - p.height / 2;
    rectangle = {
      shape: {
        rect: {
          x: x,
          y: y,
          width: p.width,
          height: p.height,
          'stroke-width': 0,
          fill: 'currentColor'
        }
      },
      bbox: [x, y, x + p.width, y + p.height]
    };
    if (p.obround) {
      radius = 0.5 * Math.min(p.width, p.height);
      rectangle.shape.rect.rx = radius;
      rectangle.shape.rect.ry = radius;
    }
    return rectangle;
  };

  polygon = function(p) {
    var i, points, r, rx, ry, start, step, theta, x, xMax, xMin, y, yMax, yMin, _i, _ref;
    if (p.dia == null) {
      throw new SyntaxError('polygon requires diameter');
    }
    if (p.verticies == null) {
      throw new SyntaxError('polygon requires verticies');
    }
    if (p.cx == null) {
      throw new SyntaxError('polygon function requires x center');
    }
    if (p.cy == null) {
      throw new SyntaxError('polygon function requires y center');
    }
    start = p.degrees != null ? p.degrees * Math.PI / 180 : 0;
    step = 2 * Math.PI / p.verticies;
    r = p.dia / 2;
    points = '';
    xMin = null;
    yMin = null;
    xMax = null;
    yMax = null;
    for (i = _i = 0, _ref = p.verticies; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
      theta = start + i * step;
      rx = r * Math.cos(theta);
      ry = r * Math.sin(theta);
      if (Math.abs(rx) < 0.000000001) {
        rx = 0;
      }
      if (Math.abs(ry) < 0.000000001) {
        ry = 0;
      }
      x = p.cx + rx;
      y = p.cy + ry;
      if (x < xMin || xMin === null) {
        xMin = x;
      }
      if (x > xMax || xMax === null) {
        xMax = x;
      }
      if (y < yMin || yMin === null) {
        yMin = y;
      }
      if (y > yMax || yMax === null) {
        yMax = y;
      }
      points += " " + x + "," + y;
    }
    return {
      shape: {
        polygon: {
          points: points.slice(1),
          'stroke-width': 0,
          fill: 'currentColor'
        }
      },
      bbox: [xMin, yMin, xMax, yMax]
    };
  };

  vector = function(p) {
    var theta, xDelta, yDelta;
    if (p.x1 == null) {
      throw new SyntaxError('vector function requires start x');
    }
    if (p.y1 == null) {
      throw new SyntaxError('vector function requires start y');
    }
    if (p.x2 == null) {
      throw new SyntaxError('vector function requires end x');
    }
    if (p.y2 == null) {
      throw new SyntaxError('vector function requires end y');
    }
    if (p.width == null) {
      throw new SyntaxError('vector function requires width');
    }
    theta = Math.abs(Math.atan((p.y2 - p.y1) / (p.x2 - p.x1)));
    xDelta = p.width / 2 * Math.sin(theta);
    yDelta = p.width / 2 * Math.cos(theta);
    if (xDelta < 0.0000001) {
      xDelta = 0;
    }
    if (yDelta < 0.0000001) {
      yDelta = 0;
    }
    return {
      shape: {
        line: {
          x1: p.x1,
          x2: p.x2,
          y1: p.y1,
          y2: p.y2,
          'stroke-width': p.width,
          stroke: 'currentColor'
        }
      },
      bbox: [(Math.min(p.x1, p.x2)) - xDelta, (Math.min(p.y1, p.y2)) - yDelta, (Math.max(p.x1, p.x2)) + xDelta, (Math.max(p.y1, p.y2)) + yDelta]
    };
  };

  lowerLeftRect = function(p) {
    if (p.width == null) {
      throw new SyntaxError('lower left rect requires width');
    }
    if (p.height == null) {
      throw new SyntaxError('lower left rect requires height');
    }
    if (p.x == null) {
      throw new SyntaxError('lower left rectangle requires x');
    }
    if (p.y == null) {
      throw new SyntaxError('lower left rectangle requires y');
    }
    return {
      shape: {
        rect: {
          x: p.x,
          y: p.y,
          width: p.width,
          height: p.height,
          'stroke-width': 0,
          fill: 'currentColor'
        }
      },
      bbox: [p.x, p.y, p.x + p.width, p.y + p.height]
    };
  };

  outline = function(p) {
    var point, pointString, x, xLast, xMax, xMin, y, yLast, yMax, yMin, _i, _len, _ref;
    if (!(Array.isArray(p.points) && p.points.length > 1)) {
      throw new SyntaxError('outline function requires points array');
    }
    xMin = null;
    yMin = null;
    xMax = null;
    yMax = null;
    pointString = '';
    _ref = p.points;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      point = _ref[_i];
      if (!(Array.isArray(point) && point.length === 2)) {
        throw new SyntaxError('outline function requires points array');
      }
      x = point[0];
      y = point[1];
      if (x < xMin || xMin === null) {
        xMin = x;
      }
      if (x > xMax || xMax === null) {
        xMax = x;
      }
      if (y < yMin || yMin === null) {
        yMin = y;
      }
      if (y > yMax || yMax === null) {
        yMax = y;
      }
      pointString += " " + x + "," + y;
    }
    xLast = p.points[p.points.length - 1][0];
    yLast = p.points[p.points.length - 1][1];
    if (!(xLast === p.points[0][0] && yLast === p.points[0][1])) {
      throw new RangeError('last point must match first point of outline');
    }
    return {
      shape: {
        polygon: {
          points: pointString.slice(1),
          'stroke-width': 0,
          fill: 'currentColor'
        }
      },
      bbox: [xMin, yMin, xMax, yMax]
    };
  };

  moire = function(p) {
    var r, rings, shape;
    if (p.cx == null) {
      throw new SyntaxError('moiré requires x center');
    }
    if (p.cy == null) {
      throw new SyntaxError('moiré requires y center');
    }
    if (p.outerDia == null) {
      throw new SyntaxError('moiré requires outer diameter');
    }
    if (p.ringThx == null) {
      throw new SyntaxError('moiré requires ring thickness');
    }
    if (p.ringGap == null) {
      throw new SyntaxError('moiré requires ring gap');
    }
    if (p.maxRings == null) {
      throw new SyntaxError('moiré requires max rings');
    }
    if (p.crossLength == null) {
      throw new SyntaxError('moiré requires crosshair length');
    }
    if (p.crossThx == null) {
      throw new SyntaxError('moiré requires crosshair thickness');
    }
    shape = [
      {
        line: {
          x1: p.cx - p.crossLength / 2,
          y1: 0,
          x2: p.cx + p.crossLength / 2,
          y2: 0,
          'stroke-width': p.crossThx,
          stroke: 'currentColor'
        }
      }, {
        line: {
          x1: 0,
          y1: p.cy - p.crossLength / 2,
          x2: 0,
          y2: p.cy + p.crossLength / 2,
          'stroke-width': p.crossThx,
          stroke: 'currentColor'
        }
      }
    ];
    r = (p.outerDia - p.ringThx) / 2;
    rings = 0;
    while (r >= p.ringThx && rings < p.maxRings) {
      shape.push({
        circle: {
          cx: p.cx,
          cy: p.cy,
          r: r,
          fill: 'none',
          'stroke-width': p.ringThx,
          stroke: 'currentColor'
        }
      });
      rings++;
      r -= p.ringThx + p.ringGap;
    }
    r += 0.5 * p.ringThx;
    if (r > 0 && rings < p.maxRings) {
      shape.push({
        circle: {
          cx: p.cx,
          cy: p.cy,
          r: r,
          'stroke-width': 0,
          fill: 'currentColor'
        }
      });
    }
    return {
      shape: shape,
      bbox: [Math.min(p.cx - p.crossLength / 2, p.cx - p.outerDia / 2), Math.min(p.cy - p.crossLength / 2, p.cy - p.outerDia / 2), Math.max(p.cx + p.crossLength / 2, p.cx + p.outerDia / 2), Math.max(p.cy + p.crossLength / 2, p.cy + p.outerDia / 2)]
    };
  };

  thermal = function(p) {
    var halfGap, maskId, outerR, r, thx, xMax, xMin, yMax, yMin;
    if (p.cx == null) {
      throw new SyntaxError('thermal requires x center');
    }
    if (p.cy == null) {
      throw new SyntaxError('thermal requires y center');
    }
    if (p.outerDia == null) {
      throw new SyntaxError('thermal requires outer diameter');
    }
    if (p.innerDia == null) {
      throw new SyntaxError('thermal requires inner diameter');
    }
    if (p.gap == null) {
      throw new SyntaxError('thermal requires gap');
    }
    maskId = "thermal-mask-" + (unique());
    thx = (p.outerDia - p.innerDia) / 2;
    outerR = p.outerDia / 2;
    r = outerR - thx / 2;
    xMin = p.cx - outerR;
    xMax = p.cx + outerR;
    yMin = p.cy - outerR;
    yMax = p.cy + outerR;
    halfGap = p.gap / 2;
    return {
      shape: [
        {
          mask: {
            id: maskId,
            _: [
              {
                circle: {
                  cx: p.cx,
                  cy: p.cy,
                  r: outerR,
                  'stroke-width': 0,
                  fill: '#fff'
                }
              }, {
                rect: {
                  x: xMin,
                  y: -halfGap,
                  width: p.outerDia,
                  height: p.gap,
                  'stroke-width': 0,
                  fill: '#000'
                }
              }, {
                rect: {
                  x: -halfGap,
                  y: yMin,
                  width: p.gap,
                  height: p.outerDia,
                  'stroke-width': 0,
                  fill: '#000'
                }
              }
            ]
          }
        }, {
          circle: {
            cx: p.cx,
            cy: p.cy,
            r: r,
            fill: 'none',
            'stroke-width': thx,
            stroke: 'currentColor',
            mask: "url(#" + maskId + ")"
          }
        }
      ],
      bbox: [xMin, yMin, xMax, yMax]
    };
  };

  module.exports = {
    circle: circle,
    rect: rect,
    polygon: polygon,
    vector: vector,
    lowerLeftRect: lowerLeftRect,
    outline: outline,
    moire: moire,
    thermal: thermal
  };

}).call(this);

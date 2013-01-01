/*
Copyright 2012 Alex Greenland

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
 */ 
var AGPOLARVIEW = function() {
	'use strict';
	var _render = false;
    var _stage;
	var _sats = [];
	var _satLabels = [];
	var _mousePos = {
		x : 0,
		y : 0,
		el : 0,
		az : 0,
		show : false
	};
	var _width;
	var _height;
	var _degperpixel;
	var _margin = 40;
	var _stepx;
	var _stepy;
	var _cx;
	var _cy;
	var _radius;
	var _sixtySize;
	var _thirtySize;
	var _twoPi = 2 * Math.PI;
	var _halfMargin;
	var _de2ra = 0.0174532925;
	var _satImage = new Image();
	var _moonImage = new Image();
    var _showPlanets = false;
    var _images = [];
    
    function resize(width, height) {
        if (typeof width === 'undefined' || typeof height === 'undefined') {
            var parent = jQuery('#polar');
            width = parent.width();
            height = parent.height();
        }

        if (width !== 0 && height !== 0) {
            _stage.setSize(width, height);
            drawBackground();
        }          
    }
	
    /**
     * Listen for an event telling us a new set of data is available
     */
    jQuery(document).bind('agsattrack.updatesatdata', function(event) {
        if (_render) {
            drawPolarView();
        }
    });
	
		
	/**
	 * Listen for an event telling us a new set of elements were loaded
	 */
	jQuery(document).bind('agsattrack.tlesloaded', function(event, group) {
		_sats = [];
		_satLabels = [];
		_satLayer.clear();
	});

    jQuery(document).bind('agsattrack.showplanets',
            function(e, state) {
                if (AGSETTINGS.getHaveWebGL() && _render) {
                    _showPlanets = state;
                    drawPlanets();
                }
            });
                
	jQuery('#polarcanvas').mousemove(
			function(e) {
				return;
				_mousePos = getMousePos(polarCanvas, e);

				var rel = _radius
						- Math.sqrt((_mousePos.x - _cx) * (_mousePos.x - _cx)
								+ (_mousePos.y - _cy) * (_mousePos.y - _cy));
				_mousePos.el = 90.0 * rel / _radius;
				if (_mousePos.x >= _cx) {
					/* 1. and 2. quadrant */
					_mousePos.az = Math.atan2(_mousePos.x - _cx, _cy
							- _mousePos.y)
							/ _de2ra;
				} else {
					/* 3 and 4. quadrant */
					_mousePos.az = 360
							+ Math.atan2(_mousePos.x - _cx, _cy - _mousePos.y)
							/ _de2ra;
				}

				if (_mousePos.az < 0 || _mousePos.el < 0) {
					_mousePos.show = false;
				} else {
					_mousePos.show = true;
				}
			});

	function getMousePos(canvas, evt) {
		var rect = canvas.getBoundingClientRect();
		return {
			x : evt.clientX - rect.left,
			y : evt.clientY - rect.top
		};
	}

	function convertMousePos() {
		var rel = _radius
				- Math.sqrt((_mousePos.x - _cx) * (_mousePos.x - _cx)
						+ (_mousePos.y - _cy) * (_mousePos.y - _cy));
		_mousePos.el = 90.0 * rel / _radius;
		if (_mousePos.x >= _cx) {
			/* 1. and 2. quadrant */
			_mousePos.az = Math.atan2(_mousePos.x - _cx, _cy - _mousePos.y)
					/ _de2ra;
		} else {
			/* 3 and 4. quadrant */
			_mousePos.az = 360
					+ Math.atan2(_mousePos.x - _cx, _cy - _mousePos.y) / _de2ra;
		}

		if (_mousePos.az < 0 || _mousePos.el < 0) {
			_mousePos.show = false;
		} else {
			_mousePos.show = true;
		}
	}

	function convertAzEltoXY(az, el) {

		if (el < 0) {
			return {
				x : 0,
				y : 0
			};
		}

		/* convert angles to radians */
		var az = _de2ra * az;
		var el = _de2ra * el;

		/* radius @ el */
		var rel = _radius - (2 * _radius * el) / Math.PI;

		var x = (_cx + rel * Math.sin(az));
		var y = (_cy - rel * Math.cos(az));

		return {
			x : x,
			y : y
		};
	}

	function setDimensions() {
		// _height = polarCanvas.height;
		// _width = polarCanvas.width;

		_height = _stage.getHeight();
		_width = _stage.getWidth();

		var size;

		if (_height > _width) {
			size = _width;
		} else {
			size = _height;
		}
		size = size - (_margin * 2);
		_cx = (0.5 + (_width / 2)) | 0;
		_cy = (0.5 + (_height / 2)) | 0;
		_radius = (0.5 + (size / 2)) | 0;
		_sixtySize = (0.5 + (_radius * 0.6667)) | 0;
		_thirtySize = (0.5 + (_radius * 0.3333)) | 0;
		_halfMargin = (0.5 + (_margin / 2)) | 0;
	}

	_stage = new Kinetic.Stage({
		container : 'polar',
		width : 1000,
		height : 600
	});

	var layer = new Kinetic.Layer();
	_stage.add(layer);

	var _objectLayer = new Kinetic.Layer();
	_stage.add(_objectLayer);

	var _satLayer = new Kinetic.Layer();
	_stage.add(_satLayer);

	var _planetLayer = new Kinetic.Layer();
	_stage.add(_planetLayer);
	
	_stage.on('mousemove', function() {
		_mousePos = _stage.getMousePosition();
		convertMousePos();
	});

	function drawBackground() {
		var _circle;
		var _line;
		var _text;

		setDimensions();
		layer.removeChildren();
		layer.clear();
		layer.draw();
		_circle = new Kinetic.Circle({
			x : _cx,
			y : _cy,
			radius : _radius,
			stroke : 'black',
			strokeWidth : 1
		});

		_circle.on('mouseout', function() {
			_mousePos.show = false;
		});
		layer.add(_circle);

		_circle = new Kinetic.Circle({
			x : _cx,
			y : _cy,
			radius : _sixtySize,
			stroke : 'black',
			strokeWidth : 1
		});
		layer.add(_circle);

		_circle = new Kinetic.Circle({
			x : _cx,
			y : _cy,
			radius : _thirtySize,
			stroke : 'black',
			strokeWidth : 1
		});
		layer.add(_circle);

		_circle = new Kinetic.Circle({
			x : _cx,
			y : _cy,
			radius : 1,
			stroke : 'black',
			strokeWidth : 1
		});
		layer.add(_circle);

		_line = new Kinetic.Line({
			points : [ _cx - _radius - _halfMargin, _cy,
					_cx + _radius + _halfMargin, _cy ],
			stroke : 'black',
			strokeWidth : 1
		});
		layer.add(_line);

		_line = new Kinetic.Line({
			points : [ _cx, _cy - _radius - _halfMargin, _cx,
					_cy + _radius + _halfMargin ],
			stroke : 'black',
			strokeWidth : 1
		});
		layer.add(_line);

		_text = new Kinetic.Text({
			x : _cx - 9,
			y : 2,
			text : 'N',
			fontSize : 15,
			fontFamily : 'Verdana',
			textFill : 'green'
		});
		layer.add(_text);

		_text = new Kinetic.Text({
			x : _cx + _radius + _halfMargin,
			y : _radius + _halfMargin + 15,
			text : 'E',
			fontSize : 15,
			fontFamily : 'Verdana',
			textFill : 'green'
		});
		layer.add(_text);

		_text = new Kinetic.Text({
			x : _cx - _radius - _margin,
			y : _radius + _halfMargin + 15,
			text : 'W',
			fontSize : 15,
			fontFamily : 'Verdana',
			textFill : 'green'
		});
		layer.add(_text);

		_text = new Kinetic.Text({
			x : _cx - 8,
			y : _height - _halfMargin + 5,
			text : 'S',
			fontSize : 15,
			fontFamily : 'Verdana',
			textFill : 'green'
		});
		layer.add(_text);

		_text = new Kinetic.Text({
			x : 0,
			y : 5,
			text : 'Mouse Position',
			fontSize : 15,
			fontFamily : 'Verdana',
			textFill : 'black'
		});
		layer.add(_text);
		_text = new Kinetic.Text({
			x : 0,
			y : 30,
			text : 'Azimuth:',
			fontSize : 12,
			fontFamily : 'Verdana',
			textFill : 'black'
		});
		layer.add(_text);
		_text = new Kinetic.Text({
			x : 0,
			y : 50,
			text : 'Elevation:',
			fontSize : 12,
			fontFamily : 'Verdana',
			textFill : 'black'
		});
		layer.add(_text);

		layer.draw();

	}

	var _mousePosTextAz = new Kinetic.Text({
		x : 100,
		y : 30,
		text : 'N/A',
		fontSize : 12,
		fontFamily : 'Verdana',
		textFill : 'green'
	});
	_objectLayer.add(_mousePosTextAz);

	var _mousePosTextEl = new Kinetic.Text({
		x : 100,
		y : 50,
		text : 'N/A',
		fontSize : 12,
		fontFamily : 'Verdana',
		textFill : 'green'
	});
	_objectLayer.add(_mousePosTextEl);

	var _naflag = false;
    
    
    function drawMousePos() {
        if (_mousePos.show) {
            _mousePosTextAz.setText(_mousePos.az.toFixed(0));
            _mousePosTextEl.setText(_mousePos.el.toFixed(0));
            _naflag = false;
            _objectLayer.draw();
        } else {
            if (_naflag === false) {
                _mousePosTextAz.setText('N/A');
                _mousePosTextEl.setText('N/A');
                _naflag = true;
                _objectLayer.draw();
            }
        }        
    }
    
	function drawPolarView() {

		setDimensions();
        
        drawPlanets();
        
		var satellites = AGSatTrack.getSatellites();
		jQuery.each(satellites, function(index, satellite) {
			if (satellite.isDisplaying()) {
				var data = satellite.getData();

				var az = data.azimuth;
				var el = data.elevation;

				if (el > AGSETTINGS.getAosEl()) {

					/*
					 * if (selected !== null && index == selected.index) {
					 * polarContext.beginPath(); polarContext.strokeStyle =
					 * '#00FF00'; var move = false; var orbit =
					 * satellite.getOrbitData(); var lastX; var lastY; for ( var
					 * i = 0; i < orbit.length; i++) {
					 * 
					 * if (orbit[i].el > AGSETTINGS.getAosEl()) var pos =
					 * convertAzEltoXY(orbit[i].az, orbit[i].el);
					 * 
					 * if (i == 0) { polarContext.moveTo(pos.x, pos.y); } else {
					 * polarContext.lineTo(pos.x, pos.y); }
					 * 
					 *  } } polarContext.stroke();
					 */

					var pos = convertAzEltoXY(az, el);
					var _style = 'normal';

					if (satellite.getSelected()) {
						_style = 'bold';
					}

					var satLabel = satellite.getName() + ' (az: '
							+ data.azimuth.toFixed(0) + ' , el: '
							+ data.elevation.toFixed(0) + ')';

					if (typeof _sats[index] !== 'undefined') {
						_satLabels[index].setPosition(parseInt(pos.x - 8),
								parseInt(pos.y - 20));
						_satLabels[index].setFontStyle(_style);
					} else {
						_satLabels[index] = new Kinetic.Text({
							x : pos.x - 8,
							y : pos.y - 20,
							text : satLabel,
							fontSize : 10,
							fontFamily : 'Verdana',
							fontStyle : _style,
							textFill : 'green'
						});
						_satLayer.add(_satLabels[index]);
					}

					if (typeof _sats[index] !== 'undefined') {
						_sats[index].setPosition(parseInt(pos.x - 8),
								parseInt(pos.y - 8));
					} else {
						_sats[index] = new Kinetic.Image({
							x : pos.x - 8,
							y : pos.y - 8,
							image : _satImage,
							width : 16,
							height : 16,
							id : satellite.getName()
						});
						_sats[index].on('mouseup', function(e) {
							var selected = e.shape.getId();
							jQuery(document).trigger('agsattrack.satclicked', {
								index : selected
							});
						});
						_satLayer.add(_sats[index]);
					}

				}

			}

		});
		_satLayer.draw();
	}

    function drawPlanets() {
        var image;
        
        setDimensions();
        _planetLayer.removeChildren();    
        if (_showPlanets) {        
            var _planets = AGSatTrack.getPlanets();
            jQuery.each(_planets, function(index, planet) {
                if (planet.alt > 0) {
                    var pos = convertAzEltoXY(planet.az, planet.alt);            
                    if (planet.name.toLowerCase() === 'moon') {
                        image = AGIMAGES.getImage(planet.name.toLowerCase()+planet.phase,'generic');                        
                    } else {
                        image = AGIMAGES.getImage(planet.name.toLowerCase(),'generic');
                    }

                    _planetLayer.add(new Kinetic.Image({
                        x : pos.x - 8,
                        y : pos.y - 8,
                        image : image,
                        width : 32,
                        height : 32,
                        id : -1
                    }));
                    
                    _planetLayer.add(new Kinetic.Text({
                        x : pos.x,
                        y : pos.y - 20,
                        text : planet.name,
                        fontSize : 10,
                        fontFamily : 'Verdana',
                        textFill : 'black'
                    }));                  
                }
            });
        }
        _planetLayer.draw();        
    }
    
	function animate() {
		if (_render) {
			drawMousePos();
		}
		requestAnimFrame(animate);
	}

    drawBackground();    
	animate();

	return {
		startRender : function() {
			_render = true;
            resize();
			_satLayer.clear();
		},

		stopRender : function() {
			_render = false;
		},

        resizeView : function(width, height) {
            resize(width, height);     
        },
                
		init : function() {

		}
	}
}
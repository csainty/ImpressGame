/**
 * impress.js
 *
 * impress.js is a presentation tool based on the power of CSS3 transforms and transitions
 * in modern browsers and inspired by the idea behind prezi.com.
 *
 * MIT Licensed.
 *
 * Copyright 2011 Bartek Szopka (@bartaz)
 */

(function ( document, window ) {
    'use strict';

    // HELPER FUNCTIONS
    
    var pfx = (function () {

        var style = document.createElement('dummy').style,
            prefixes = 'Webkit Moz O ms Khtml'.split(' '),
            memory = {};
            
        return function ( prop ) {
            if ( typeof memory[ prop ] === "undefined" ) {

                var ucProp  = prop.charAt(0).toUpperCase() + prop.substr(1),
                    props   = (prop + ' ' + prefixes.join(ucProp + ' ') + ucProp).split(' ');

                memory[ prop ] = null;
                for ( var i in props ) {
                    if ( style[ props[i] ] !== undefined ) {
                        memory[ prop ] = props[i];
                        break;
                    }
                }

            }

            return memory[ prop ];
        }

    })();

    var arrayify = function ( a ) {
        return [].slice.call( a );
    };
    
    var css = function ( el, props ) {
        var key, pkey;
        for ( key in props ) {
            if ( props.hasOwnProperty(key) ) {
                pkey = pfx(key);
                if ( pkey != null ) {
                    el.style[pkey] = props[key];
                }
            }
        }
        return el;
    }
    
    var byId = function ( id ) {
        return document.getElementById(id);
    }
    
    var $ = function ( selector, context ) {
        context = context || document;
        return context.querySelector(selector);
    };
    
    var $$ = function ( selector, context ) {
        context = context || document;
        return arrayify( context.querySelectorAll(selector) );
    };
    
    var translate = function ( t ) {
        return " translate3d(" + t.x + "px," + t.y + "px," + t.z + "px) ";
    };
    
    var rotate = function ( r, revert ) {
        var rX = " rotateX(" + r.x + "deg) ",
            rY = " rotateY(" + r.y + "deg) ",
            rZ = " rotateZ(" + r.z + "deg) ";
        
        return revert ? rZ+rY+rX : rX+rY+rZ;
    };
    
    var scale = function ( s ) {
        return " scale(" + s + ") ";
    }
    
    var parseLoc = function( loc ) {
    	if (!loc) { return false; }
    	var bits = loc.split(',');
    	return [
    		parseFloat(bits.length >= 1 ? bits[0] : '0', 10),
    		parseFloat(bits.length >= 2 ? bits[1] : '0', 10),
    		parseFloat(bits.length >= 3 ? bits[2] : '0', 10)
    	];
    };

    // CHECK SUPPORT
    
    var ua = navigator.userAgent.toLowerCase();
    var impressSupported = ( pfx("perspective") != null ) &&
                           ( ua.search(/(iphone)|(ipod)|(ipad)|(android)/) == -1 );
    
    // DOM ELEMENTS
    
    var impress = byId("impress");
    
    if (!impressSupported) {
        impress.className = "impress-not-supported";
        return;
    } else {
        impress.className = "";
    }
    
    var canvas = document.createElement("div");
    canvas.className = "canvas";
    
    arrayify( impress.childNodes ).forEach(function ( el ) {
        canvas.appendChild( el );
    });
    impress.appendChild(canvas);
    
    var steps = $$(".scene", impress);
    var artefacts = $$(".artefact", impress);
    
    // SETUP
    // set initial values and defaults
    
    document.documentElement.style.height = "100%";
    
    css(document.body, {
        height: "100%",
        overflow: "hidden"
    });

    var props = {
        position: "absolute",
        transformOrigin: "top left",
        transition: "all 0s ease-in-out",
        transformStyle: "preserve-3d"
    }
    
    css(impress, props);
    css(impress, {
        top: "50%",
        left: "50%",
        perspective: "1000px"
    });
    css(canvas, props);
    
    var current = {
        translate: { x: 0, y: 0, z: 0 },
        rotate:    { x: 0, y: 0, z: 0 },
        scale:     1
    };

    steps.forEach(function ( el, idx ) {
        var data = el.dataset,
            loc = parseLoc(data.loc),
            step = {
                translate: {
                    x: loc[0] * 1000 || 0,
                    y: loc[2] * -1000 || 0,
                    z: loc[1] * -1000 || 0
                },
                rotate: {
                    x: data.rotateX || 0,
                    y: data.rotateY || 0,
                    z: data.rotateZ || data.rotate || 0
                },
                scale: data.scale || 1,
                loc: loc || [0, 0],
                exit: parseLoc(data.exit),
                auto:  parseLoc(data.auto)
            };
        
        el.stepData = step;
        
        if ( !el.id ) {
            el.id = "step-" + (idx + 1);
        }
        
        css(el, {
            position: "absolute",
            transform: "translate(-50%,-50%)" +
                       translate(step.translate) +
                       rotate(step.rotate) +
                       scale(step.scale),
            transformStyle: "preserve-3d"
        });
    });

    artefacts.forEach(function ( el, idx ) {
        var data = el.dataset,
        	loc = parseLoc(data.loc),
            artefact = {
                translate: {
                    x: loc[0] * 1000 || 0,
                    y: loc[2] * -1000 || 0,
                    z: loc[1] * -1000 || 0
                },
                rotate: {
                    x: data.rotateX || 0,
                    y: data.rotateY || 0,
                    z: data.rotateZ || data.rotate || 0
                },
                scale: data.scale || 1,
                scene: data.scene || ''
            };
        
        el.artefactData = artefact;
        
        if ( !el.id ) {
            el.id = "artefact-" + (idx + 1);
        }
        
        css(el, {
            position: "absolute",
            transform: "translate(-50%,-50%)" +
                       translate(artefact.translate) +
                       rotate(artefact.rotate) +
                       scale(artefact.scale),
            transformStyle: "preserve-3d"
        });
        el.classList.remove("active");
    });

    // making given step active

    var active = null;
    var hashTimeout = null;
    
    var select = function ( el ) {
        if ( !el || !el.stepData || el == active) {
            // selected element is not defined as step or is already active
            return false;
        }
        
        // Sometimes it's possible to trigger focus on first link with some keyboard action.
        // Browser in such a case tries to scroll the page to make this element visible
        // (even that body overflow is set to hidden) and it breaks our careful positioning.
        //
        // So, as a lousy (and lazy) workaround we will make the page scroll back to the top
        // whenever slide is selected
        //
        // If you are reading this and know any better way to handle it, I'll be glad to hear about it!
        window.scrollTo(0, 0);
        
        var step = el.stepData;
        
        if ( active ) {
            active.classList.remove("active");
        }
        el.classList.add("active");
        
        impress.className = "step-" + el.id;
        
        // `#/step-id` is used instead of `#step-id` to prevent default browser
        // scrolling to element in hash
        //
        // and it has to be set after animation finishes, because in chrome it
        // causes transtion being laggy
        window.clearTimeout( hashTimeout );
        hashTimeout = window.setTimeout(function () {
            window.location.hash = "#/" + el.id;
        }, 1000);
        
        var target = {
            rotate: {
                x: -parseInt(step.rotate.x, 10),
                y: -parseInt(step.rotate.y, 10),
                z: -parseInt(step.rotate.z, 10)
            },
            translate: {
                x: -step.translate.x,
                y: -step.translate.y,
                z: -step.translate.z
            },
            scale: 1 / parseFloat(step.scale)
        };
        
        // check if the transition is zooming in or not
        var zoomin = target.scale >= current.scale;
        
        // if presentation starts (nothing is active yet)
        // don't animate (set duration to 0)
        var duration = (active) ? "1s" : "0";
        
        css(impress, {
            // to keep the perspective look similar for different scales
            // we need to 'scale' the perspective, too
            perspective: step.scale * 1000 + "px",
            transform: scale(target.scale),
            transitionDuration: duration,
            transitionDelay: (zoomin ? "500ms" : "0ms")
        });
        
        css(canvas, {
            transform: rotate(target.rotate, true) + translate(target.translate),
            transitionDuration: duration,
            transitionDelay: (zoomin ? "0ms" : "500ms")
        });

        artefacts.forEach(function ( a, i ) {
        	if (a.artefactData && a.artefactData.scene === el.id) {
       			a.classList.add("active");
       			setTimeout(function() {
       				a.classList.remove("active");	
       			}, 700);
        	} else {
       			a.classList.remove("active");
        	}
        });
        
        current = target;
        active = el;
        
        if (active.stepData.auto) {
        	setTimeout(function() {
        		goLoc(active.stepData.auto);
        	}, 1000);
        }

        return el;
    };
    
    var goLoc = function (loc) {
    	var index;

    	if (active.stepData.exit) {
    		// override the exit with a specific path
    		loc= active.stepData.exit;
    	}

    	steps.forEach(function ( el, i ) {
    		if (el.stepData && el.stepData.loc[0] === loc[0] && el.stepData.loc[1] === loc[1] && el.stepData.loc[2] === loc[2]) {
    			index= i;
    			return false;
    		}
    	});
    	if (index != undefined) {
    		return select(steps[index]);
    	}
    };
    
	var goLeft = function () {
		var loc = active.stepData.loc.slice(0);
		loc[0] -= 1;
		goLoc(loc);
	};

	var goRight = function () {
		var loc = active.stepData.loc.slice(0);
		loc[0] += 1;
		goLoc(loc);
	};

	var goUp = function () {
		var loc = active.stepData.loc.slice(0);
		loc[1] += 1;
		goLoc(loc);
	};
	
	var goDown = function () {
		var loc = active.stepData.loc.slice(0);
		loc[1] -= 1;
		goLoc(loc);
	};

	var goPageUp = function () {
		var loc = active.stepData.loc.slice(0);
		loc[2] += 1;
		goLoc(loc);
	};
	
	var goPageDown = function () {
		var loc = active.stepData.loc.slice(0);
		loc[2] -= 1;
		goLoc(loc);
	};
    // EVENTS
    
    document.addEventListener("keydown", function ( event ) {
        if ( ( event.keyCode >= 33 && event.keyCode <= 34 ) || (event.keyCode >= 37 && event.keyCode <= 40) ) {
            switch( event.keyCode ) {
                case 37:   // left
                		goLeft();
                		break;
                case 38:   // up
                        goUp();
                        break;
                case 39:   // right
                		goRight();
                		break;
                case 40:   // down
                        goDown();
                        break;
                case 33:  // page up
                		goPageUp();
                		break;
               	case 34: // page down
               			goPageDown();
               			break;
            }
            
            event.preventDefault();
        }
    }, false);

    document.addEventListener("click", function ( event ) {
        // event delegation with "bubbling"
        // check if event target (or any of its parents is a link or a step)
        var target = event.target;
        while ( (target.tagName != "A") &&
                (!target.stepData) &&
                (target != document.body) ) {
            target = target.parentNode;
        }
        
        if ( target.tagName == "A" ) {
            var href = target.getAttribute("href");
            
            // if it's a link to presentation step, target this step
            if ( href && href[0] == '#' ) {
                target = byId( href.slice(1) );
            }
        }
        
        if ( select(target) ) {
            event.preventDefault();
        }
    }, false);
    
    var getElementFromUrl = function () {
        // get id from url # by removing `#` or `#/` from the beginning,
        // so both "fallback" `#slide-id` and "enhanced" `#/slide-id` will work
        return byId( window.location.hash.replace(/^#\/?/,"") );
    }
    
    window.addEventListener("hashchange", function () {
        select( getElementFromUrl() );
    }, false);
    
    // START 
    // by selecting step defined in url or first step of the presentation
    select(steps[0]);

})(document, window);


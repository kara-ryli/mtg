(function(){
  var loadedOrComplete = /loaded|complete/;
  // Dollar for great justice
  window.$ = function(id) {
    return (typeof id === 'string') ? document.getElementById(id) : id;
  };
  
  // Node#contains for Firefox
  if (window.Node && Node.prototype && !Node.prototype.contains) {
    Node.prototype.contains = function (arg) {
      return !!(this.compareDocumentPosition(arg) & 16);
    };
  }
  
  // My namespace
  window.RC = window.RC || {
    namespace: function(section) {
      var current = window.RC;
      section.split('.').forEach(function(item, index, array) {
        if (typeof current[item] == 'undefined') { 
          current[item] = {};
        }
        current = current[item];
      });
    }
  };
  
  // Events
  RC.events = {
    Event : {
      BLUR:   'blur',
      CLICK:  'click',
      DOUBLE_CLICK: 'dblclick',
      ERROR:  'error',
      FOCUS:  'focus',
      LOAD:   'load',
      READY_STATE_CHANGE: 'readystatechange',
      RESIZE: 'resize',
      BEFORE_UNLOAD: 'beforeunload',
      UNLOAD: 'unload'
    },
    DOMEvent : {
      LOADED: 'DOMContentLoaded',
      MOUSE_WHEEL: 'DOMMouseScroll'
    },
    FormEvent: {
      SUBMIT: 'submit',
      RESET:  'reset'
    },
    MouseEvent: {
        DOWN: 'mousedown',
        UP:   'mouseup',
        OVER: 'mouseover',
        OUT:  'mouseout',
        MOVE: 'mousemove'
    },
    TouchEvent : {
      START: 'touchstart',
      MOVE: 'touchmove',
      END: 'touchend',
      CANCEL: 'touchcancel'
    },
    GestureEvent : {
      START: 'gesturestart',
      CHANGE: 'gesturechange',
      END: 'gestureend',
      CANCEL: 'gesturecancel'
      }
  };
  
  // Allows scripts to be executed ASAP
  document.onReadyOrNow = function(f) {
    if (loadedOrComplete.test(this.readyState)) {
      return f();
    }
    document.addEventListener(RC.events.DOMEvent.LOADED, f, false);
  };
  
  if (navigator.standalone === false) {
    document.body.className += ' in-safari-chrome';
    window.scrollTo(0, 44);
  }
})();

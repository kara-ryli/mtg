/**
 * Clock
 *
 * Requires an element (el) with the following structure:
 *
 *    el .minutes
 *    el .hours
 *
 * While the two arms do not need to be immediate descendants
 * neither may be a descendant of the other.
 *
 */
var Clock = (function(){
  var ROTATE, MINUTES, HOURS, C;
  
  ROTATE  = /rotate\((\d+)deg\)/;
  MINUTES = '.minutes';
  HOURS   = '.hours';

  function getUpdater ( _instance ) { return function() { _instance.update(); }; }
  function getUnloader ( _instance ) {
    if ( this.interval ) { clearInterval( this.interval ); }
    this.face = this.big_hand = this.little_hand = null;
  }
  
  function set_new_rotation (el, value) {
    var s = el.style.webkitTransform;
    
    el.style.webkitTransform = 'rotate(' +
                               ( // gotta do this to make sure it doesn't swing around 
                                 // at the hour mark.
                                 (s ? Math.floor(s.match(ROTATE)[1] % 360) * 360 : 0) +
                                 value
                               ) +
                               'deg)';
  }
  C = function() { this.initialize.apply( this, arguments ); }
  C.prototype = {
    initialize: function( _id ) {
      try {
        var updater;
        this.face        = document.getElementById( _id );
        this.big_hand    = this.face.querySelector( MINUTES );
        this.little_hand = this.face.querySelector( HOURS );
        updater          = getUpdater(this)
        this.interval    = setInterval( updater, 20000 );
        window.addEventListener(Event.BEFORE_UNLOAD, getUnloader(this), false );
        // solves weird issue where view will not update immediately after instantiation.
        setTimeout( updater, 500 );
      }
      catch(e) {
        this.kill();
      }
    },
    kill: function () {
      if ( this.interval ) {
        clearInterval( this.interval );
        this.interval = 0;
      }
      this.face.style.display = 'none';
    },
    update: function () {
      var d, m, h;
      d = new Date();
      m = d.getMinutes();
      h = d.getHours();
      if (h > 12) { h -= 12; }
      set_new_rotation(this.big_hand, m * 6);
      set_new_rotation(this.little_hand, h * 30);
    }
  }
  return C;
})();
(function(){
  var liWidth, TouchEvent = RC.events.TouchEvent, DB,
      MouseEvent = RC.events.MouseEvent, SCHEMA, CURRENT_SCHEMA,
	    DEFAULT_SCORE = 20, player, opponent, playerScore, opponentScore,
	    stateLoaded = false, domReady = false;
	    
  SCHEMA = [
	  "DROP TABLE IF EXISTS schema;",
		"CREATE TABLE schema(value TEXT NOT NULL);",
	  "DROP TABLE IF EXISTS scores;",
		"CREATE TABLE scores(player INTEGER NOT NULL, opponent INTEGER NOT NULL);",
	  "DROP TABLE IF EXISTS games;",
		"CREATE TABLE games(result VARCHAR NOT NULL, created_at INTEGER);"
	];
	CURRENT_SCHEMA = SCHEMA.join('');
    	
  /**
   * Animation: Mouse Version
   *
   * When the mouse comes down, remember the original position. Set an
   * interval to begin the animation. Also begin listening for move
   * events.
   * 
   * Every time a move event fires, calculate the goal end position
   * based on the current screenX distance from the original screenX.
   * if the goal position currently does not exist, create it.
   *
   * Every time the animation ticks, 
   * and move the UI in that direction closer to the goal position
   * based on my easing function.
   *
   * When the mouse comes up, stop listening for move events.
   *
   * When the UI reaches its goal state, clear the interval.
   */
  function createMouseScoreTracker (el) {
    el.addEventListener(MouseEvent.DOWN, onMouseTrackerDown, false);
  }
  
  function onMouseTrackerDown (evt) {
    this.addEventListener(MouseEvent.MOVE, onMouseTrackerMove, false);
    this.addEventListener(MouseEvent.UP, onMouseTrackerUp, false);
    this.addEventListener(MouseEvent.OUT, onMouseTrackerUp, false);
    if (this.uiInterval) {
      clearInterval(this.uiInterval);
    }
    this.uiInterval = setInterval(getMouseTrackerAnimator(this, evt.screenX, new Date().getTime()), 33);
    evt.preventDefault();
  }
  function onMouseTrackerMove (evt) {
    this.x2 = evt.screenX;
    this.t2 = new Date().getTime();
  }
  function onMouseTrackerUp (evt) {
    if (evt.type === MouseEvent.OUT && this.contains(evt.relatedTarget)) { return; }
    this.removeEventListener(MouseEvent.MOVE, onMouseTrackerMove, false);
    this.removeEventListener(MouseEvent.UP, onMouseTrackerUp, false);
    this.removeEventListener(MouseEvent.OUT, onMouseTrackerUp, false);
  }
  function getMouseTrackerAnimator (el, x, t) {
    var dT, F = -6, MU = 0.1, goal, goalL, scoreEl = el.score, l, visibleLi, value, max;
    
    // console.log('x: ' + x);
    
    visibleLi = getVisibleLiIndex(scoreEl);
    value     = parseInt(scoreEl.getElementsByTagName('LI')[visibleLi].innerHTML);
    max       = scoreEl.getElementsByTagName('LI').length - 1;
    goal      = value;
    goalL     = parseFloat(scoreEl.style.left);
    
    return function() {
      var dx, dt, l = parseFloat(scoreEl.style.left);
      // If we have a new currentX, set the velocity and goal
      if (el.x2 !== null) {
        dx = el.x2 - x;
        dt = el.t2 - t;
        if (Math.abs(dx) < 20) { return }
        goal = Math.ceil(dx / dt * F + value);
        if (goal < 0) { goal = 0}
        else if (goal > max - 3) {
          scoreEl.style.width = (goal + 3) * liWidth + 'px';
          scoreEl.innerHTML += addLIs(max + 1, goal + 3);
          max = goal + 3;
        }
        goalL = getOffsetForIndex(goal);
        el.x2 = el.t2 = null;
      }
      if (Math.abs(goalL - l) < 1) {
        scoreEl.style.left = goalL + 'px';
        clearInterval(el.uiInterval);
        scoreEl = el = el.uiInterval = null;
      }
      else {
        scoreEl.style.left = l + ((goalL - l) * MU) + 'px';
      }
    };
  }

  /**
   * Shared ScoreTracker functions
   */
  function getOffsetForIndex (index) {
    return (index - 0.5) * liWidth * -1;
  }
  function getVisibleLiIndex (el) {
    return Math.round((parseFloat(el.style.left) / (liWidth * -1)) + 0.5);
  }

  /**
   * Animation: Touch Version
   *
   * When the touch starts, remember the original position. Set an
   * interval to begin the animation. Also begin listeneing for move
   * events.
   * 
   * Every time a move event fires, calculate the goal end position
   * based on the current screenX distance from the original screenX.
   * if the goal position currently does not exist, create it. Move
   * the UI to the goal state and let CSS transitions handle animation.
   *
   * When the touch ends, stop listening for move events.
   */
  function createTouchScoreTracker (el) {
    el.addEventListener(TouchEvent.START, onTouchTrackerStart, false);
    el.addEventListener(TouchEvent.MOVE, onTouchTrackerMove, false);
    el.addEventListener(TouchEvent.END, onTouchTrackerEnd, false);
    el.addEventListener(TouchEvent.CANCEL, onTouchTrackerEnd, false);
    el.maxLeft = liWidth / 2;
  }
  function onTouchTrackerStart (evt) {
    this.l1    = parseInt( this.score.style.left );
    this.x1    = evt.changedTouches.item(0).screenX;
    this.max   = this.score.getElementsByTagName('LI').length;
    this.score.style.webkitTransition = 'left 0s ease-out 0s';
    evt.preventDefault();
  }
  function onTouchTrackerMove (evt) {
    var scoreWidth, newLeft, minLeft;

    scoreWidth = ( this.max - 1 ) * liWidth;
    newLeft    = this.l1 + ( evt.changedTouches.item(0).screenX - this.x1 );
    
    if ( Math.abs( newLeft ) > scoreWidth - ( 2 * liWidth ) ) {
      this.score.style.width = scoreWidth + liWidth + 'px';
      this.score.innerHTML += addLIs( this.max, this.max + 1);
      this.max += 1;
    }
    this.score.style.left = newLeft + 'px';
  }
  function onTouchTrackerEnd (evt) {
    var goal = Math.abs( Math.round( parseInt( this.score.style.left ) / liWidth - 0.5 ) );

    if ( goal < 0 ) { goal = 0; }
    this.score.style.webkitTransition = 'left 500ms ease-out 0s';
    this.score.style.left = ( ( -1 * goal + 0.5 ) * liWidth ) + 'px';
    onScoreChange( this.id, goal );
  }
  
  /**
   * Loading state, handles four possible states:
	 *
	 *   * openDatabase not available
	 *   * openDatabase throws an error
	 *   * schema is invalid
	 *   * schema is valid
	 */
	function loadState () {
		try {
	    if (!window.openDatabase) {
				return onStateLoaded();
			}
			DB = openDatabase(
				'state',            // short name
				'1.0',              // version
				'Magic Game State', // display name 
				65536               // max size in bytes
			);
			// validate the schema and load data. Set the state loaded
			// regardless of success.
			DB.transaction(validateSchema, onInitDBError, onStateLoaded);
		} catch(e) {
			return onStateLoaded();
		}
	}

  // If a DB init error occurs, then don't try and save to it later
  function onInitDBError (error) {
    DB = false;
    onStateLoaded();
  }

  // try to select the value from the schema table. If that errors out, 
  // create all of the tables.
  function validateSchema(t) {
	  t.executeSql('SELECT * FROM schema', [], onSchemaData, createTables);
	}
	
	// Check the schema data to be sure it's correct
	function onSchemaData(t, results) {
	  var stored_schema, rows;
	  rows = results.rows;
	  // If the schema table is empty, something is wrong, reload!
	  if (rows.length === 0) {
      return createTables(t); 
	  }
	  
	  stored_schema = rows.item(0)['value'];
    
    // If the schema is different, kill everything
    if (stored_schema !== CURRENT_SCHEMA) {
      return createTables(t);
    }
    // Otherwise, load the current state
    else {
      t.executeSql("SELECT player, opponent FROM scores;", [], onScores);
      // t.executeSql("SELECT result FROM games ORDER BY created_at ASC;", [], onGames);
    }
  }
  
  // Generate the tables and insert the new SQL versions
	function createTables (transaction, current_schema) {
	  SCHEMA.forEach(function(sql) { transaction.executeSql(sql, []); });
    transaction.executeSql('INSERT INTO schema (value) VALUES (?)', [ CURRENT_SCHEMA ]);
	}
	
	// Handles getting scores from the DB
	function onScores (transaction, results) {
	  var row, rows;
	  rows          = results.rows;
	  if (rows.length === 0) {
	    transaction.executeSql('INSERT INTO scores (player, opponent) VALUES (?, ?)', [DEFAULT_SCORE, DEFAULT_SCORE]);
	    return;
	  }
	  row           = rows.item(0);
	  playerScore   = row['player'];
	  opponentScore = row['opponent'];
	}
	
	// Handles a list of games becoming available
	function onGames (transaction, results) {
	  var i, l, row, rows;
	  rows   = results.rows;
	  for (i = 0, l = rows.length; i < l; i++) {
	    row  = rows.item(i);
	    previousGames.push(row['result']);
	  }
	}
	
	// Executes SQL with no callbacks
	function DB_query (sql, values, onSuccess, onFailure) {
	  if (DB) {
  	  DB.transaction(function(t) { t.executeSql(sql, values, onSuccess, onFailure); });
	  }
	}

	function onScoreChange (id, score) {
	  if (id === 'player') {
	    playerScore            = score;
	  }
	  else if (id === 'opponent') {
	    opponentScore          = score;
	  }
	  	  
	  // markAsWin.style.display  = (opponentScore > 0)? 'none' : null;
		// markAsLoss.style.display = (playerScore > 0 )? 'none' : null;

		DB_query('UPDATE scores SET player=?, opponent=? WHERE 1;', [playerScore, opponentScore]);
	}

  /**
   * Initialization section
   */
  function setDefaults () {
    playerScore = opponentScore = DEFAULT_SCORE;
  }
  
  function onStateLoaded () {
		stateLoaded = true;
		initialize();
	}
  function onDomReady () {
    player   = $('player');
    player.score = player.getElementsByTagName('OL')[0];
    liWidth  = player.getElementsByTagName('LI')[0].offsetWidth;
    opponent = $('opponent');
    opponent.score = opponent.getElementsByTagName('OL')[0];
    domReady = true;
    initialize();
  }
  
  function addLIs (from, to) {
    var r = '';
    for (i = from; i < to; i++) {
      r += '<li>' + i + '</li>';
    }
    return r;
  }
  
  function populate (ref, score) {
    var lis;

    lis = ref.score.getElementsByTagName('LI').length;
    if (score > lis - 1) {
      ref.score.innerHTML += addLIs(
        (lis === 0 ? 0 : parseInt(ref.score.getElementsByTagName('LI')[lis - 1]) + 1),
        score + 4
      );
    }
    ref.score.style.left = getOffsetForIndex(score) + 'px';
    ref.score.style.width = ref.score.getElementsByTagName('LI').length * liWidth + 'px';
  }
  
  function initialize () {
    var tracker;
    
    if (! (domReady && stateLoaded)) { return }

    player.score.innerHTML = '';
    opponent.score.innerHTML = '';

	// If we don't have DOM Touch, fake it
    tracker = (typeof webkitConvertPointFromNodeToPage === 'undefined') ? createMouseScoreTracker : createTouchScoreTracker;

    tracker(opponent);
    tracker(player);
    onScoreChange();
    populate(player, playerScore);
	  populate(opponent, opponentScore);
  }
  
  function cleanup (evt) {
    player.score = opponent.score = null;
  }
  
  setDefaults();
  loadState();
  document.onReadyOrNow(onDomReady);
  window.addEventListener(Event.UNLOAD, cleanup, false);
  
  new Clock('clock');
})();

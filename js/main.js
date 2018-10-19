;(function(window) {

  'use strict';

  // helper functions
  // from https://davidwalsh.name/vendor-prefix
  const prefix = (function () {
    const styles = window.getComputedStyle(document.documentElement, ''),
      pre = (Array.prototype.slice.call(styles).join('').match(/-(moz|webkit|ms)-/) || (styles.OLink === '' && ['', 'o']))[1],
      dom = ('WebKit|Moz|MS|O').match(new RegExp('(' + pre + ')', 'i'))[1];
    
    return {
      dom: dom,
      lowercase: pre,
      css: '-' + pre + '-',
      js: pre[0].toUpperCase() + pre.substr(1)
    };
  })();
  
  // consts & stuff
  let support = {transitions : Modernizr.csstransitions},
    transEndEventNames = {'WebkitTransition': 'webkitTransitionEnd', 'MozTransition': 'transitionend', 'OTransition': 'oTransitionEnd', 'msTransition': 'MSTransitionEnd', 'transition': 'transitionend'},
    transEndEventName = transEndEventNames[Modernizr.prefixed('transition')],
    onEndTransition = function(el, callback, propTest) {
      const onEndCallbackFn = function( ev ) {
        if( support.transitions ) {
          if( ev.target != this || propTest && ev.propertyName !== propTest && ev.propertyName !== prefix.css + propTest ) return;
          this.removeEventListener( transEndEventName, onEndCallbackFn );
        }
        if( callback && typeof callback === 'function' ) { callback.call(this); }
      };
      if( support.transitions ) {
        el.addEventListener( transEndEventName, onEndCallbackFn );
      }
      else {
        onEndCallbackFn();
      }
    },
    // the mall element
    mall = document.querySelector('.mall'),

    ground = document.querySelector('.ground'),
    // mall´s levels wrapper
    mallLevelsEl = mall.querySelector('.levels'),
    // mall´s levels
    mallLevels = [].slice.call(mallLevelsEl.querySelectorAll('.level')),
    // total levels
    mallLevelsTotal = mallLevels.length,
    // surroundings elems
    mallSurroundings = [].slice.call(mall.querySelectorAll('.surroundings')),
    // selected level position
    selectedLevel,
    // navigation element wrapper
    mallNav = document.querySelector('.mallnav'),
    // store building svg
    storeBuilding = document.querySelector('.store'),
    // levels navigation up/down ctrls
    levelUpCtrl = document.querySelector('.mallnav__button--up'),
    levelDownCtrl = document.querySelector('.mallnav__button--down'),
    // pins
    pins = [].slice.call(mallLevelsEl.querySelectorAll('.pin')),
    // content element
    contentEl = document.querySelector('.mallContent'),
    // content close ctrl
    contentCloseCtrl = contentEl.querySelector('button.content__button'),
    // check if a content item is opened
    isOpenContentArea,
    // check if currently animating/navigating
    isNavigating,
    // check if all levels are shown or if one level is shown (expanded)
    isExpanded,
    // spaces list element
    spacesListEl = document.getElementById('spaces-list'),
    // spaces list ul
    spacesEl = spacesListEl.querySelector('ul.list'),
    // all the spaces listed
    spaces = [].slice.call(spacesEl.querySelectorAll('.list__item > a.list__link')),

    floorNav = document.querySelector('.floorNav'),

    floors = document.querySelectorAll('.floorNav > .floor'),
    // reference to the current shows space (name set in the data-name attr of both the listed spaces and the pins on the map)
    spaceref,
    // listjs initiliazation (all mall´s spaces)
    spacesList = new List('spaces-list', { valueNames: ['list__link', { data: ['level'] }, { data: ['category'] } ]} ),

    // smaller screens:
    // main container
    containerEl = document.querySelector('.malmContainer');

  function init() {
    initEvents();
  }

  /**
   * Initialize/Bind events fn.
   */
  function initEvents() {
    // click on a Mall´s level
    mallLevels.forEach(function(level, pos) {
      level.addEventListener('click', function() {
        // shows this level
        showLevel(pos+1);
      });
    });

    storeBuilding.addEventListener('click', function() {
      // shows all levels
      storeBuilding.classList.add('open');
    });

    ground.addEventListener('click', function() {
      // shows all levels
      showAllLevels();
    });

    // navigating through the levels
    levelUpCtrl.addEventListener('click', function() { navigate('Down'); });
    levelDownCtrl.addEventListener('click', function() { navigate('Up'); });

    // hovering a pin / clicking a pin
    pins.forEach(function(pin) {
      const contentItem = contentEl.querySelector('.content__item[data-space="' + pin.getAttribute('data-space') + '"]');

      pin.addEventListener('mouseenter', function() {
        if( !isOpenContentArea ) {
          contentItem.classList.add('content__item--hover');
        }
      });
      pin.addEventListener('mouseleave', function() {
        if( !isOpenContentArea ) {
          contentItem.classList.remove('content__item--hover');
        }
      });
      pin.addEventListener('click', function(ev) {
        ev.preventDefault();
        // open content for this pin
        openContent(pin.getAttribute('data-space'));
        // remove hover class (showing the title)
        contentItem.classList.remove('content__item--hover');
      });
    });

    // closing the content area
    contentCloseCtrl.addEventListener('click', function() {
      closeContentArea();
    });

    // clicking on a listed space: open level - shows space
    spaces.forEach(function(space) {
      const spaceItem = space.parentNode,
        level = spaceItem.getAttribute('data-level'),
        spacerefval = spaceItem.getAttribute('data-space');

      space.addEventListener('click', function(ev) {
        ev.preventDefault();
        storeBuilding.classList.add('open');
        // open level
        showLevel(level);
        // open content for this space
        openContent(spacerefval);
      });
    });


    floors.forEach(function(floor) {
      const level = floor.getAttribute('select-level');

      floor.addEventListener('click', function(ev) {
        ev.preventDefault();
        storeBuilding.classList.add('open');
        // open level
        showLevel(level);
      });
    });

  }

  /**
   * Opens a level. The current level moves to the center while the other ones move away.
   */
  function showLevel(level) {
    if( isExpanded ) {
      return false;
    }

    floorNav.classList.add('mallnav--hidden');
    
    // update selected level val
    selectedLevel = level;

    // control navigation controls state
    setNavigationState();

    mallLevelsEl.classList.add('levels--selected-' + selectedLevel);
    
    // the level element
    const levelElement = mallLevels[selectedLevel - 1];
    levelElement.classList.add('level--current');

    onEndTransition(levelElement, function() {
      mallLevelsEl.classList.add('levels--open');

      // show level pins
      showPins();

      isExpanded = true;
    }, 'transform');
    
    // hide surroundings element
    hideSurroundings();
    
    // show mall nav ctrls
    showMallNav();

    // filter the spaces for this level
    showLevelSpaces();
  }

  /**
   * Shows all Mall´s levels
   */
  function showAllLevels() {
    if( isNavigating || !isExpanded ) {
      return false;
    }
    isExpanded = false;

    floorNav.classList.remove('mallnav--hidden');

    const lvlCurrent = mallLevels[selectedLevel - 1];
    lvlCurrent.classList.remove('level--current');
    mallLevelsEl.classList.remove('levels--selected-' + selectedLevel);
    mallLevelsEl.classList.remove('levels--open');

    // hide level pins
    removePins();

    // shows surrounding element
    showSurroundings();
    
    // hide mall nav ctrls
    hideMallNav();

    // show back the complete list of spaces
    spacesList.filter();

    // close content area if it is open
    if( isOpenContentArea ) {
      closeContentArea();
    }
  }

  /**
   * Shows all spaces for current level
   */
  function showLevelSpaces() {
    spacesList.filter(function(item) { 
      return item.values().level === selectedLevel.toString(); 
    });
  }

  /**
   * Shows the level´s pins
   */
  function showPins(levelEl) {
    levelEl = levelEl || mallLevels[selectedLevel - 1];
    const levelPins = levelEl.querySelector('.level__pins');
    levelPins.classList.add('level__pins--active');
  }

  /**
   * Removes the level´s pins
   */
  function removePins(levelEl) {
    levelEl = levelEl || mallLevels[selectedLevel - 1];
    const levelElem = levelEl.querySelector('.level__pins');
    levelElem.classList.remove('level__pins--active');
  }

  /**
   * Show the navigation ctrls
   */
  function showMallNav() {
    mallNav.classList.remove('mallnav--hidden');
  }

  /**
   * Hide the navigation ctrls
   */
  function hideMallNav() {
    mallNav.classList.add('mallnav--hidden');
  }

  /**
   * Show the surroundings level
   */
  function showSurroundings() {
    mallSurroundings.forEach(function(el) {
      el.classList.remove('mallnav--hidden');
    });
  }

  /**
   * Hide the surroundings level
   */
  function hideSurroundings() {
    mallSurroundings.forEach(function(el) {
      el.classList.add('surroundings--hidden');
    });
  }

  /**
   * Navigate through the mall´s levels
   */
  function navigate(direction) {
    if( isNavigating ) {
      return false;
    }
    isNavigating = true;

    const prevSelectedLevel = selectedLevel;

    // current level
    const currentLevel = mallLevels[prevSelectedLevel-1];

    if( direction === 'Up' && prevSelectedLevel > 1 ) {
      --selectedLevel;
    }
    else if( direction === 'Down' && prevSelectedLevel < mallLevelsTotal ) {
      ++selectedLevel;
    }
    else if( direction === 'Up' && prevSelectedLevel === undefined ) {
      showLevel(1);
      isNavigating = false;
      return false;
    }
    else if( direction === 'Down' && prevSelectedLevel === undefined ) {
      showLevel(2);
      isNavigating = false;
      return false;
    }
    else {
      isNavigating = false; 
      return false;
    }

    // control navigation controls state (enabled/disabled)
    setNavigationState();
    // transition direction class
    currentLevel.classList.add('level--moveOut' + direction);
    // next level element
    const nextLevel = mallLevels[selectedLevel-1]
    // ..becomes the current one
    nextLevel.classList.add('level--current');

    // when the transition ends..
    onEndTransition(currentLevel, function() {
      currentLevel.classList.remove('level--moveOut' + direction);
      // solves rendering bug for the SVG opacity-fill property
      setTimeout(function() {currentLevel.classList.remove('level--current');}, 0);

      mallLevelsEl.classList.remove('levels--selected-' + prevSelectedLevel);
      mallLevelsEl.classList.add('levels--selected-' + selectedLevel);

      // show the current level´s pins
      showPins();

      isNavigating = false;
    });

    // filter the spaces for this level
    showLevelSpaces();

    // hide the previous level´s pins
    removePins(currentLevel);

    if( isOpenContentArea ) {
      closeContentArea();
    }
  }

  /**
   * Control navigation ctrls state. Add disable class to the respective ctrl when the current level is either the first or the last.
   */
  function setNavigationState() {
    if( selectedLevel == 1 ) {
      levelDownCtrl.classList.add('boxbutton--disabled');
    }
    else {
      levelDownCtrl.classList.remove('boxbutton--disabled');
    }

    if( selectedLevel == mallLevelsTotal ) {
      levelUpCtrl.classList.add('boxbutton--disabled');
    }
    else {
      levelUpCtrl.classList.remove('boxbutton--disabled');
    }
  }

  /**
   * Opens/Reveals a content item.
   */
  function openContent(spacerefval) {
    // if one already shown:
    if( isOpenContentArea ) {
      hideSpace();
      spaceref = spacerefval;
      showSpace();
    }
    else {
      spaceref = spacerefval;
      openContentArea();
    }
    
    // remove class active (if any) from current list item
    const activeItem = spacesEl.querySelector('li.list__item--active');
    if( activeItem ) {
      activeItem.classList.remove('list__item--active');
    }
    // list item gets class active (if the list item is currently shown in the list)
    const listItem = spacesEl.querySelector('li[data-space="' + spacerefval + '"]')
    if( listItem ) {
      listItem.classList.add('list__item--active');
    }

    // remove class selected (if any) from current space
    const activeSpaceArea = mallLevels[selectedLevel - 1].querySelector('svg > .map__space--selected');
    if( activeSpaceArea ) {
      activeSpaceArea.classList.remove('map__space--selected');
    }
    // svg area gets selected
    const mapselection = mallLevels[selectedLevel - 1].querySelector('svg > .map__space[data-space="' + spaceref + '"]');
    if ( mapselection ) {
      mapselection.classList.add('map__space--selected');
    }
  }

  /**
   * Opens the content area.
   */
  function openContentArea() {
    isOpenContentArea = true;
    // shows space
    showSpace(true);
    // show close ctrl
    contentCloseCtrl.classList.remove('content__button--hidden');
    // resize mall area
    mall.classList.add('mall--content-open');
  }

  /**
   * Shows a space.
   */
  function showSpace(sliding) {
    // the content item
    const contentItem = contentEl.querySelector('.content__item[data-space="' + spaceref + '"]');
    // show content
    contentItem.classList.add('content__item--current');
    if( sliding ) {
      onEndTransition(contentItem, function() {
        contentEl.classList.add('content--open');
      });
    }
    // map pin gets selected
    const mallElem = mallLevelsEl.querySelector('.pin[data-space="' + spaceref + '"]');
    mallElem.classList.add('pin--active');
  }

  /**
   * Closes the content area.
   */
  function closeContentArea() {
    contentEl.classList.remove('content--open');
    // close current space
    hideSpace();
    // hide close ctrl
    contentCloseCtrl.classList.add('content__button--hidden');
    // resize mall area
    mall.classList.remove('mall--content-open');

    // enable mall nav ctrls
    if( isExpanded ) {
      setNavigationState();
    }
    isOpenContentArea = false;
  }

  /**
   * Hides a space.
   */
  function hideSpace() {
    // the content item
    const contentItem = contentEl.querySelector('.content__item[data-space="' + spaceref + '"]');
    // hide content
    contentItem.classList.remove('content__item--current');
    // map pin gets unselected
    const mallItem = mallLevelsEl.querySelector('.pin[data-space="' + spaceref + '"]');
    mallItem.classList.remove('pin--active');
    // remove class active (if any) from current list item
    const activeItem = spacesEl.querySelector('li.list__item--active');
    if( activeItem ) {
      activeItem.classList.remove('list__item--active');
    }
    // remove class selected (if any) from current space
    const activeSpaceArea = mallLevels[selectedLevel - 1].querySelector('svg > .map__space--selected');
    if( activeSpaceArea ) {
      activeSpaceArea.classList.remove('map__space--selected');
    }
  }
  
  init();

})(window);

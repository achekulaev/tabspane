/**
 * Provides items multiselect functionality
 * Usage
  $('#parentItem').multiselect({
    itemsSelector: '.child-items-which-will-be-selectable',
    cancelSelectors: ['#header'], // if dragging starts here selection will not happen
    onSelected: function(event, elements) { //callback
      //console.log(elements);
    }
  });
 */
$.widget('tabspane.multiselect', {
  /* const */
  // States sequence: IS_NOT_DRAGGING, IS_DRAGGING (but not long enough to start selection), IS_SELECTING
  IS_NOT_DRAGGING: 0,
  IS_DRAGGING: 1,
  IS_SELECTING: 2,
  /* vars */
  options: {
    itemsSelector: null,
    cancelSelectors: [] //set of selectors where dragging will not start
  },
  state: this.IS_NOT_DRAGGING,
  startCoords: { clientX: 0, clientY: 0 }, // starting point coordinated
  rectangleId: '__multiselect__rectangle', // id of canvas element
  rectangleCSS: { position: 'absolute', zIndex: 2, top: 0, left: 0, cursor: 'crosshair' },
  rectangle: $('<canvas/>').attr({ id: this.rectangleId}),
  scrollTop: 0, // window.scrollTop
  scrollLeft: 0, // window.scrollLeft
  offset: { top: 0, left: 0 }, //canvas offset
  items: [], // list of items matched by itemsSelector
  itemsCoords: [], // coordinates of each item
  itemsHighlighted: [], // list of items highlighted by current selection

  _create: function() {
    var widget = this;

    this.element.disableSelection();
    this.offset = this.element.offset();
    this.rectangle
      .hide()
      .css(this.rectangleCSS)
      .css({ top: this.offset.top, left: this.offset.left }) // account element position
      .appendTo(this.element);

    this.element
      .mousedown(function(event) {
        if (event.which != 1) {
          return; // react to left button only
        }
        //console.log('Multiselect: target', event.target);
        // stop event if item of cancelSelectors was clicked
        var cancelEvent = $(event.target).is(function() {
          for (var i = 0; i < widget.options.cancelSelectors.length; i++) {
            if ($(this).is(widget.options.cancelSelectors[i])) {
              return true;
            }
          }
          return false;
        });

        if (!cancelEvent) {
          widget._dragInit(event);
        } else {
          //console.log('Multiselect: cancelling the event');
        }
      })
      .mouseup(function(event) {
        widget._dragEnd(event);
      });
  },

  refresh: function() {
    this.items = $(this.options.itemsSelector);
    var widget = this;

    this.itemsCoords = [];
    $(this.items).each(function(index, item) {
      var offset = $(item).offset();
      widget.itemsCoords.push({
        id: item.id,
        x1: offset.left,
        y1: offset.top,
        x2: offset.left + $(item).width(),
        y2: offset.top + $(item).height()
      });
    });
    this.refreshCanvas();
  },

  refreshCanvas: function() {
    var context = this.rectangle.get(0).getContext('2d');
    context.canvas.width = this.element.width();
    context.canvas.height = this.element.height();
    this.offset = this.element.offset();
    this.rectangle.css({ top: this.offset.top, left: this.offset.left }); //if element moved since last time
  },

  _setState: function(state) {
    this.state = state;
  },

  _dragInit: function(event) {
    window.getSelection().removeAllRanges(); // avoid any selected text being dragged
    this.unHighlightAll();
    this._setState(this.IS_DRAGGING);
    this.refresh();
    this.startCoords = { clientX: event.clientX, clientY: event.clientY };
    this.scrollTop = $(window).scrollTop();
    this.scrollLeft = $(window).scrollLeft();
    this.element.bind('mousemove', { widget: this }, this._dragMove);
    //console.log('Multiselect: drag init');
  },

  _dragMove: function(event) {
    var widget = event.data.widget;
    var size = {
      width: event.clientX - widget.startCoords.clientX,
      height: event.clientY - widget.startCoords.clientY
    };

    if (widget.state != widget.IS_SELECTING && (Math.abs(size.width) > 5) && (Math.abs(size.height) > 5)) {
      widget._rectangleInit(size);
    }
    // make selection work faster
    if (size.width % 2 || size.height % 2) {
      widget._rectangleDraw(widget.startCoords, size);
    }
  },

  _dragEnd: function(event) {
    if (this.state > this.IS_NOT_DRAGGING) {
      this.element.unbind('mousemove');
      this._rectangleDestroy();
      this._trigger("onSelected", null, { elements: this.itemsHighlighted });
      //console.log('Multiselect: drag end');
    } else {
      //
    }
    this.element.css({ cursor: 'auto' });
    this._setState(this.IS_NOT_DRAGGING);
  },

  _rectangleInit: function(size) {
    this._setState(this.IS_SELECTING);
    this.rectangle.show();
    this._rectangleDraw(this.startCoords, size);

//    //console.log('Multiselect: selection starting');
  },

  _rectangleDraw: function(coords, size) {
    var rect = this._rectangleCoords(
      coords.clientX + this.scrollLeft,
      coords.clientY + this.scrollTop,
      size.width,
      size.height
    );

    var canvas = this.rectangle.get(0);
    var context = canvas.getContext('2d');
    canvas.width = canvas.width;
    context.beginPath();
    context.rect(
      coords.clientX + this.scrollLeft - this.offset.left,
      coords.clientY + this.scrollTop - this.offset.top,
      size.width,
      size.height
    );
    context.lineWidth = 1;
    context.strokeStyle = 'red';
    context.stroke();
    this.highlightAll(rect)
  },

  /**
   * Get proper rectangle coordinates assuming that width/height may be negative (drawn left/up)
   * @param x1
   * @param y1
   * @param width
   * @param height
   * @returns {{}}
   * @private
   */
  _rectangleCoords: function(x1, y1, width, height) {
    var rect = {};
    rect.x1 = width < 0 ? x1 + width : x1;
    rect.y1 = height < 0 ? y1 + height : y1;
    rect.x2 = rect.x1 + Math.abs(width);
    rect.y2 = rect.y1 + Math.abs(height);
    return rect;
  },

  _rectangleIntersect: function(r1, r2) {
    return !(r2.x1 > r1.x2 ||
      r2.x2 < r1.x1 ||
      r2.y1 > r1.y2 ||
      r2.y2 < r1.y1);
  },

  _rectangleDestroy: function() {
    this.rectangle.hide();
  },

  highlightAll: function(rect) {
    var widget = this;
    this.unHighlightAll();

    this.itemsCoords.forEach(function(item) {
      if (widget._rectangleIntersect(rect, item)) {
        var i = $('#' + item.id);
        widget.itemsHighlighted.push(i);
        widget.highlight(i);
      }
    });
  },

  highlight: function(item) {
    item.addClass('tabHighlighted');
  },

  unHighlightAll: function() {
    console.log('unhighlight');
    var i;
    while (i = this.itemsHighlighted.shift()) {
      this.unHighlight(i);
    }
  },

  unHighlight: function(item) {
    item.removeClass('tabHighlighted');
  }
});

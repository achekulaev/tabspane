$.widget('tabsPane.tabFilter', {

  options: {
    placeholder: 'Search for title or url',
    filter: '',
    timeout: null,
    shortcut: ''
  },

  clearButton: $('<img src="img/clear.png" />').appendTo('body'),
  elementSize: {},

  _create: function() {
    this.element.attr('placeholder', this.options.placeholder);
    var widget = this;
    this.element.on('keyup', function(event) {
      //clear widget if Esc was pressed
      if (event.keyCode == 27) {
        this.value = '';
      }
      widget._setOption('filter', this.value);
    });
    this.element.focus().select();
    //add shortcut
    if (typeof shortcut != 'undefined' && typeof shortcut.add == 'function') {
      shortcut.add(this.options.shortcut, function(){
        widget.element.focus().select();
      });
    }
    //clear button
    var offset = this.element.offset();
    this.clearButton
      .css({ position: 'absolute', display: 'none', cursor: 'pointer' })
      .offset({
        top: offset.top + ( Math.ceil((this.element.height() - 16)/2) ), /* button height of 16px hardcoded. change if required */
        left: offset.left + this.element.width()
      })
      .on('click', function() { widget._clear(); });

    //handle resize
    this.elementSize.height = this.element.height();
    this.elementSize.width = this.element.width();
    $(window).resize(function() {
      //using window.resize is not universal but should be enough for this plugin
      var
        element = widget.element,
        oldSize = widget.elementSize,
        newSize = { height: element.height(), width: element.width() };
      if (newSize != oldSize) {
        var offset = element.offset();
        widget.clearButton
          .offset({
            top: offset.top + ( Math.ceil((newSize.height - 16)/2) ), /* button height of 16px hardcoded. change if required */
            left: offset.left + newSize.width
          });
        widget.elementSize = newSize;
      }
    });
  },

  _setOption: function(key, value) {
    switch (key) {
      case 'filter':
        if (value != this.options.filter) {
          this.options[ key ] = value;
          this.element.val(value);
          this._update();
        }
        this._toggleClearButton(value == '');
        break;
      default:
        this.options[ key ] = value;
        break;
    }
  },

  _update: function() {
    this._trigger("onChanged", null, {filter: this.options.filter});
  },

  _clear: function() {
    this._setOption('filter', '');
    this.element.focus();
  },
  _toggleClearButton: function(hide) {
    this.clearButton.css({display: hide === true ? 'none' : 'block'});
  }
});

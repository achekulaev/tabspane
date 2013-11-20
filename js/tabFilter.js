$.widget('tabsPane.tabFilter', {

  options: {
    placeholder: 'Search for title or url',
    filter: '',
    timeout: null,
    shortcut: ''
  },

  wrapper: $('<div></div>').css({ position: 'relative', display: 'inline-block' }).addClass('searchWrapper'),
  clearButton: $('<img src="img/clear.png" />').css({ position: 'absolute', right: '1%', top: '15%' }),

  _create: function() {

    this.element
      .wrap(this.wrapper)
      .before(this.clearButton);
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
      .css({ display: 'none', cursor: 'pointer' })
      .on('click', function() { widget._clear(); });
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

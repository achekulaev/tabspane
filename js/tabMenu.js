/**
 *
 * @type {{_menu: (*|jQuery|HTMLElement), show: Function, hide: Function, init: Function}}
 */
Menu = {
  _menu : $('#tabMenu'),

  show: function(mouseEvent, element) {
    this._menu = $('#tabMenu').detach();
    this._menu.appendTo(element);
    this._menu
      .css({
        left: mouseEvent.clientX + window.scrollX + 'px',
        top: mouseEvent.clientY + window.scrollY + 'px'
      })
      .show();
  },

  hide: function() {
    this._menu.hide().css({ left: 0, top: 0 });
  },

  init: function() {
    //prevent context menu
    document.oncontextmenu = function(event) {
      return false;
    };
    var menu = this;
    shortcut.add('Escape', function() {
      menu.hide();
    });
  }

};
Menu.init();

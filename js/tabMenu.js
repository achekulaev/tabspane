/**
 *
 * @type {{_menu: (*|jQuery|HTMLElement), show: Function, hide: Function, init: Function}}
 */
Menu = {
  _menu : $('#tabMenu'),

  init: function() {
    //prevent context menu
    document.oncontextmenu = function(event) {
      return false;
    };
    var menu = this;
    //prevent parent (tab) of firing his own onclick event and always hide menu when clicked
    this._menu.click(function(e) {
      menu.hide();
      e.stopPropagation();
    });
    shortcut.add('Escape', function() {
      menu.hide();
    });
  },

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

  /**
   *
   * @param items Array of item objects {label, callback, color, icon}
   */
  append: function(items) {
    var menu = this._menu;
    items.forEach(function(item, index) {
      $('<menuitem />')
        .attr({ label: item.label, id: 'menuitem'+index })
        .appendTo(menu)
        .click(item.callback ? item.callback : function() {});
    });
  },

  fill: function(items) {
    if (items.length) {
      this.empty();
    }

    this.append(items);
  },

  empty: function() {
    this._menu.empty();
  }
};
Menu.init();

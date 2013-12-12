var body = $('body'),
    tabsPane = $('#tabsPane'),
    historyPane = $('#historyPane');

//onload actions
$(function(){
  Foreground.initLayout();
  Foreground.initSearchField();
  Foreground.initHistoryPane();
  Foreground.initShortcuts();

  //Tab context Menu
  Menu.fill([
    { label: 'Red', callback: function() { alert(1); } },
    { label: 'Dazdingo' },
    { label: 'Blue' }
  ]);

// Messages handling
  chrome.extension.onMessage.addListener(function(request, sender, response) {
    //TODO: check sender here
    Foreground.processMessage(request);
  });

  chrome.windows.getCurrent({}, function(currentWindow) {
    Foreground.currentWindow = currentWindow.id;
    Foreground.initSortable();

    // Request initial tabs data from background page
    Foreground.sendMessage({'command': 'tabList', currentWindow: currentWindow.id}, function(paneData) {
      Foreground.initTabs(paneData.tabs);
    });
  });

});

/*** End runtime ***/

/**
 * Collection to encapsulate loading extension parts
 */
Foreground = {
  /* const */
  ALL_WINDOWS: -15,
  /* vars */
  currentWindow: null,
  /**
   * Init style related properties
   */
  initLayout: function() {
    $(window).resize(function() {
      Foreground._setLayoutWidth();
    });
    // Mac OS style
    if (navigator.platform == 'MacIntel') {
      body.addClass('osx');
    }
    // Width to look fancy
    this._setLayoutWidth();
  },

  /**
   * Adjust panes width according to window width
   */
  _setLayoutWidth: function() {
    //prevent layout "jumping" when scrollBar appears/disappears
    body.css({width: $(window).width()});

    var tabOuterWidth = 350, //see tabspane.css .tabOuter width
      width = parseInt($('body').css('width')),
      columns = Math.floor(width / tabOuterWidth),
      css = {
        'width': (tabOuterWidth * (columns > 0 ? columns : 1)) + 'px'
      };
    tabsPane.css(css);
    historyPane.css(css);
  },

  initSearchField: function() {
    $('#tabsSearch').tabFilter({
      filter: '',
      shortcut: 'Tab',
      onChanged: function(event, data) {
        Tabs.unHighlightAll();
        tabsPane.sortable(data.filter == '' ? 'enable' : 'disable');
        Tabs.filter(data.filter);
      }
    });
  },

  initHistoryPane: function() {
    historyPane = $('#historyPane').historyPane({
      //TODO move "hide history when search is not active" to options
      onFilter: function(event, data) {
        $('#historyPane').parent().css({
          display: data.filter == "" ? 'none' : 'block'
        });
      }
    });
  },

  initShortcuts: function() {
    shortcut.add('Enter', function () {
      Tabs.activateHighlighted();
    });
  },

  /**
   * Initialize Sortable UI for tabs list
   */
  initSortable: function() {
    //enable sortable list
    tabsPane.sortable({
      tolerance:'pointer',
//      delay: 20,
//      distance: 5,
//      distance: 5,
      scroll: false,
      start: function (event, ui) {
        //on drag start
      },
      stop: function (event, ui) {
        //on drag stop
        //move real tabs according to THE NEW WORLD ORDER >:->
        var tabId = ui.item.find('.tabThumb')[0].id.replace('tabThumb','');
        Foreground.sendMessage({command: 'move', tabId: tabId, index: ui.item.index()}, null);
      }
    }).disableSelection();
  },

  /**
   * Render all tab thumbnails form tabs array
   * @param tabs
   */
  initTabs: function(tabs) {
    Tabs.clear();
    Tabs.append(tabs);
    $(tabsPane).fadeIn("fast");
  },

  /*** Message functions ***/

  /**
   * Process a message from background page or another extension
   * @param request
   */
  processMessage: function(request) {
    if (request.windowId == this.currentWindow || request.windowId == this.ALL_WINDOWS) {
      Tabs.processMessage(request);
    }
  },
  /**
   * Sends a message
   * @param message
   * @param callback
   */
  sendMessage: function(message, callback) {
    message.windowId = this.currentWindow;
    chrome.runtime.sendMessage(null, message, callback ? callback : function(){} ); //for external messages params look like (extId, message, callback)
  },

  isExtensionURL: function(url) {
    return chrome.extension.getURL('tabspane.html') == url;
  }
};

Tabs = {
  highlighted: {},

  processMessage: function(request) {
    switch (request.command) {
      case 'log':
        console.log(request.data);
        break;
      case 'logT':
        console.table(request.data);
        break;
      // refresh the pane
      case 'refresh':
        chrome.runtime.sendMessage(null, {'command': 'tabList'}, function (paneData) {
          refreshPane(paneData.tabs);
        });
        break;
      // create a tab
      // syntax {tab: Tab Object}
      case 'tabCreate':
        Tabs.append(request.tab);
        break;
      // update a tab
      // syntax {command:tabUpdate, changeInfo: changeInfo Object, tab: Tab Object}
      case 'tabUpdate':
        if (Tabs.exists(request.tab.id)) {
          Tabs.update(request.changeInfo, request.tab);
        } else {
          Tabs.append(request.tab);
        }
        break;
      case 'tabCaptureUpdate':
        Tabs.update(request.changeInfo, request.tab);
        break;
      // remove tab(s)
      // syntax {command:tabRemove, tabIdArray:[ array of tab ids ]}
      case 'tabRemove':
        Tabs.remove($(request.tabIdArray));
        break;
      case 'highlight':
        Tabs.highlight(request.tab.id);
        break;
      default:
        break;
    }

    return false;
  },

  append: function(tabArray) {
    // tabArray is supposed to be ordered by tab index in the window (!)
    $(tabArray).each(function(index, tab) {
      if (tabsPane.find('.tabOuter').length) {
        //TODO: if several tabs inserted then shift nth-child number on number of tabs already inserted this time
        var target = tabsPane.find('.tabOuter:nth-child({0})'.format(tab.index > 0 ? tab.index : 1));
        if (tab.index == 0) {
          //user ends up here when new window opened from dragged out tab
          Tabs.render(tab).insertBefore(target);
        } else {
          Tabs.render(tab).insertAfter(target);
        }
      } else {
        Tabs.render(tab).appendTo(tabsPane);
      }
    });
    tabsPane.sortable('refresh');
  },

  update: function(changeInfo, tab) {
    var tabThumb = $('#tabThumb' + tab.id);
    if (tabThumb != null) {
      $.each(changeInfo, function(key, value){
        switch (key) {
          case 'status':
            if (changeInfo.status == 'complete') {
              //TODO: cleanup later
              if ($(tabThumb).find('.tabDescription').html() != 'Tabs Pane')
                $(tabThumb).find('.tabDescription').html('{0} ({1})'.format(tab.title, tab.url));
            }
            break;
          case 'url':
            $(tabThumb).find('.tabDescription').html('{0} ({1})'.format(tab.title, tab.url));
            break;
          case 'favIconUrl':
            $(tabThumb).find('.tabIcon').attr('src', 'chrome://favicon/size/16@1x/' + tab.url);
            //TODO make some sort of function in Tabs to alter Tab info
            break;
          case 'capture':
            if (!Foreground.isExtensionURL(tab.url)) {
              $(tabThumb).find('.tabCapture').css({
                'background': 'url('+ changeInfo.capture +')',
                'background-size': 'cover'
              });
            }
            break;
          case 'indexFwd':
            var fwdTarget = tabsPane.find('.tabOuter:nth-child({0})'.format(changeInfo.indexFwd + 1));
            tabThumb.parent(null).insertAfter(fwdTarget);
            tabsPane.sortable('refresh');
            break;
          case 'indexBkwd':
            var bkwdTarget = tabsPane.find('.tabOuter:nth-child({0})'.format(changeInfo.indexBkwd > 0 ? changeInfo.indexBkwd : 1));
            if (changeInfo.indexBkwd > 0) {
              tabThumb.parent(null).insertAfter(bkwdTarget);
            } else {
              tabThumb.parent(null).insertBefore(bkwdTarget);
            }
            tabsPane.sortable('refresh');
            break;
          default:
            break;
        }
      });
    } else {
      console.log('Something went wrong: tab.id is null during update')
    }
  },

  remove: function(tabIdArray) {
    $(tabIdArray).each(function(index, tabId){
      Tabs.unHighlight(tabId);
      $('#tabThumb' + tabId).parent(null).remove();
    });
  },

  exists: function(tabId) {
    return $('#tabThumb' + tabId).length;
  },

  close: function(tabIdArray) {
    $(tabIdArray).each(function(index, tabId){
      chrome.tabs.remove(tabId, function() {
        Tabs.remove([tabId]);
      });
    });
  },

  clear: function() {
    tabsPane.html('');
  },

  /**
   * Renders single tab representation
   */
  render: function(tab) {
    var skeleton = $(
      '<div class="tabOuter">' + // I have to append this div, otherwise jQuery doesn't see .tabThumb until it's appended
        '<div class="tabThumb">' +
          '<div class="tabCapture"><div class="tabCloseButton"></div></div>' +
          '<div class="tabFooter">' +
            '<img class="tabIcon" />' +
            '<div class="tabDescription"></div>' +
          '</div>' +
        '</div>' +
      '</div>');

    //icon & title
    var smallIcon = tab.favIconUrl ? "chrome://favicon/size/16@1x/" + tab.url : chrome.extension.getURL('img/tab.png');
    var largeIcon = tab.favIconUrl ? "chrome://favicon/size/16@2x/" + tab.url : chrome.extension.getURL('img/tab.png');

    var favIconUrl = smallIcon;

    var captureImage;
    //set tabsPane icon & capture
    if (Foreground.isExtensionURL(tab.url)) {
      skeleton.find('.tabIcon').attr('src', chrome.extension.getURL('icons/icon16.png'));
      skeleton.find('.tabDescription').html('Tabs Pane');
      captureImage = chrome.extension.getURL('img/capture.png');
    } else {
    //set all other tabs icons and captures
      skeleton.find('.tabIcon').attr('src', favIconUrl);
      skeleton.find('.tabDescription').html('{0} ({1})'.format(tab.title, tab.url));
      captureImage = chrome.extension.getBackgroundPage().tabCaptures[tab.id];
    }

    //capture

    var tabCapture = skeleton.find('.tabCapture');
    if (captureImage != null) {
      tabCapture
        .css({
          'background': 'url({0})'.format(captureImage),
          'background-size': 'cover'
        });
    } else {
      // default tab capture image
      tabCapture.css({
        'background-image': 'url("{0}"), radial-gradient(#ddd, #fff 93%, #fff 18%)'.format(largeIcon),
        'background-repeat': 'no-repeat, repeat',
        'background-position': 'center center',
        'background-size': '32px 32px, cover'
      });
    }

    //holder
    skeleton.find('.tabThumb')
      .attr('id', 'tabThumb' + tab.id);
    skeleton.find('.tabCapture')
      .click(function() {
        Tabs.activate(tab.id);
        Tabs.unHighlightAll();
      })
      .mousedown(function(event) {
        if (event.which == 3) {
          Menu.show(event, this);
        }
      })
      .mouseleave(function() {
        Menu.hide();
      });
    skeleton.find('.tabCloseButton')
      .click(function(event) {
        Tabs.close([tab.id]);
        event.stopPropagation();
      });

    return skeleton;
  },

  /**
   * Activates a tab. Used in onclick events
   * @param tabId
   */
  activate: function(tabId) {
    if (tabId != null) {
      chrome.tabs.update(parseInt(tabId), {'active':true});
    }
  },
  activateHighlighted: function() {
    for (var i in this.highlighted) {
      Tabs.activate(i);
      $('#tabsSearch').tabfilter({filter: ''});
      return;
    }
  },
  /**
   * Highlight a tab
   * @param tabId
   * @param noScroll bool
   */
  highlight: function(tabId, noScroll) {
    this.unHighlightAll();
    var tab = $('#tabThumb' + tabId),
        offset = tab.offset();
    if (tab != []) {
      this.highlighted[tabId] = '#tabThumb' + tabId;
      if (noScroll !== true) window.scrollTo(offset.left, offset.top - 10);
      tab.addClass('tabHighlighted');
    }
  },
  unHighlight: function(tabId) {
    if (this.highlighted[tabId]) {
      $(this.highlighted[tabId]).removeClass('tabHighlighted');
      delete this.highlighted[tabId];
    }
  },
  unHighlightAll: function() {
    var list = this.highlighted;
    for (var i in list) {
      if (list.hasOwnProperty(i)) {
        $(list[i]).removeClass('tabHighlighted');
        delete this.highlighted[i];
      }
    }
  },
  /**
   * filters tab by a search string
   * @param search
   */
  filter: function(search) {
    var firstHighlighted = false, visibleCount = 0;

    $('.tabOuter').each(function(index, item) {
      if (search != '') {
        if ($(this).find('.tabDescription').text().toLowerCase().match(search) == null) {
          $(this).css({display:'none'});
        } else {
          if (!firstHighlighted) {
            // highlight first tab found so it could be activated by hitting Enter
            var
              tabId = $(this).find('.tabThumb')[0].id.replace('tabThumb', ''),
              noScroll = true;
            Tabs.highlight(tabId, noScroll);
            firstHighlighted = true;
          }
          $(this).css({display:'inline-block'});
          visibleCount++;
        }
      } else {
        //empty search. all tabs
        $(this).css({ display: 'inline-block' });
        firstHighlighted = true;
      }

    });

    if (!firstHighlighted) {
      tabsPane.css({ display: 'none' });
    } else {
      tabsPane.css({ display: 'block' });
    }

    $('.tabOuter').promise().done(function() {
      //Show history pane only when there is 1 or 0 rows of tab results
      if (visibleCount <= 6) {
        historyPane.historyPane({'filter': search});
      } else {
        historyPane.historyPane({'filter': ''});
      }
    });
  }
};

Groups = {
  db: null,
  data: {
    tabs: [
      // {id, tabId, windowId, groupId, url, title, index}
    ],
    groups: [],
    _groups: [
      { id: null, title: 'All Tabs' }
    ]
  },

  init: function() {
    this.db = SpahQL.db(this.data);
  },

  create: function(title) {
    //
  },

  setGroup: function(tabs, groupId) {
    tabs.forEach(function (tab) {

    })
  }
};
Groups.init();


$.widget('tabspane.multiselect', {
  /* const */
  IS_NOT_DRAGGING: 0,
  IS_DRAGGING: 1,
  IS_SELECTING: 2,
  /* vars */
  options: {
    itemsSelector: null,
    cancelSelectors: [] //set of selectors where dragging will not start
  },
  state: this.IS_NOT_DRAGGING,
  coords: { clientX: 0, clientY: 0 },
  rectangleId: '__multiselect__rectangle',
  rectangleCSS: { position: 'absolute', zIndex: 2, border: '1px solid red' },
  rectangle: $('<div/>').attr({ id: this.rectangleId}),
  items: [],

  _create: function() {
    var widget = this;

    this.element.disableSelection();
    this.rectangle.css(this.rectangleCSS).appendTo(this.element);

    this.element
      .mousedown(function(event) {
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
          widget.log('cancelling the event')
        }
      })
      .mouseup(function(event) {
        widget._dragEnd(event);
      });
  },

  refresh: function() {
    this.items = $(this.itemsSelector);
  },

  log: function(messages) {
    for (var i = 0; i < arguments.length; i++) {
      if (typeof arguments[i] == 'string') {
        console.log('Multiselect: ' + arguments[i]);
      } else {
        console.log('Multiselect: ');
        console.log(arguments[i]);
      }
    }
  },

  _setState: function(state) {
    this.state = state;
  },

  _dragInit: function(event) {
    this._setState(this.IS_DRAGGING);
    this.element.css({ cursor: 'crosshair' });
    this.coords = { clientX: event.clientX, clientY: event.clientY };
    this.element.bind('mousemove', { widget: this }, this._dragMove);
    this.log('drag init');
  },

  _dragMove: function(event) {
    var widget = event.data.widget;
    var size = {
      width: event.clientX - widget.coords.clientX,
      height: event.clientY - widget.coords.clientY
    };
    if (widget.state != widget.IS_SELECTING && (Math.abs(size.width) > 5) && (Math.abs(size.height) > 5)) {
      widget._rectangleInit(size);
    }
    // make selection work faster
    if (size.width % 2 || size.height % 2) {
      widget._rectangleDraw(size);
    }
  },

  _dragEnd: function(event) {
    if (this.state > this.IS_NOT_DRAGGING) {
      this.element.unbind('mousemove');
      this._rectangleDestroy();
      this._trigger("onSelected", null, { elements: "blah" });
      this.log('drag end');
    } else {
      //
    }
    this.element.css({ cursor: 'auto' });
    this._setState(this.IS_NOT_DRAGGING);
  },
  _rectangleInit: function(size) {
    this._setState(this.IS_SELECTING);
    this.rectangle
      .css({
        left: this.coords.clientX + 'px',
        top: this.coords.clientY + 'px'
      })
      .show();
    this._rectangleDraw(size);

    this.log('selection starting');
  },
  _rectangleDraw: function(size) {
    var css = {
      width: Math.abs(size.width) + 'px',
      height: Math.abs(size.height) + 'px'
    };

    if (size.width < 0) {
      css.left = this.coords.clientX + size.width;
    }
    if (size.height < 0) {
      css.top = this.coords.clientY + size.height;
    }

    this.rectangle.css(css);
  },
  _rectangleDestroy: function() {
    this.rectangle.hide();
  }
});

$('.appleOddRow').multiselect({
  itemsSelector: '.tabThumb',
  cancelSelectors: ['div.tabCapture'],
  onSelected: function(event, elements) {
    console.log(elements);
  }
});

/*** Helper functions ***/

/**
 * sprintf-like functionality
 * replaces {0}, {1}... in a string with arguments passed to a function
 */
if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) {
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
        ;
    });
  };
}

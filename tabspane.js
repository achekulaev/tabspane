var body = $('body'),
    tabsPane = $('#tabsPane'),
    historyPane = $('#historyPane');
if (navigator.platform == 'MacIntel') {
  body.addClass('osx');
}

//prevent "jumping" because of scrollBar appear/disappear
body.css({width: body.width()});

//onload actions
$(function(){
  //Search field
  $('#tabsSearch').tabFilter({
    filter: '',
    shortcut: 'Tab',
    onChanged: function(event, data) {
      Tabs.unHighlightAll();
      tabsPane.sortable(data.filter == '' ? 'enable' : 'disable');
      Tabs.filter(data.filter);
    }
  });
  shortcut.add('Enter', function () {
    Tabs.activateHighlighted();
  });

  //History pane
  historyPane = $('#historyPane').historyPane({
    //TODO move "hide history when search is not active" to options
    onFilter: function(event, data) {
      $('#historyPane').parent().css({
        display: data.filter == "" ? 'none' : 'block'
      });
    }
  });

  //Tab context Menu
  Menu.fill([
    {label: 'Red', callback: function() { alert(1);} },
    {label: 'Dazdingo'},
    {label: 'Blue'}
  ]);
});

// Messages handling
chrome.extension.onMessage.addListener(function(request, sender, response) {
  if (!request.hasOwnProperty('command')) {
    return false;
  }
  switch (request.command) {
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
      return false;
  }
  return null;
});

//Initial pane load
chrome.runtime.sendMessage(null, {'command': 'tabList'}, function (paneData) {
  //enable sortable list
  tabsPane.sortable({
    tolerance:'pointer',
    delay: 50,
    distance: 5,
    scroll: false,
//    create: function (event, ui) {
//      console.log('sorting now');
//    },
    start: function (event, ui) {
      $('.tabCloseButton').css({visibility:'hidden'});
    },
    stop: function (event, ui) {
      $('.tabCloseButton').css({visibility:'visible'});
      var tabId = ui.item.find('.tabThumb')[0].id.replace('tabThumb','');
      tabCloseButton(tabId);

      chrome.tabs.move(parseInt(tabId), {'windowId':null, 'index': ui.item.index() });
    }
  }).disableSelection();

  Tabs.clear();
  Tabs.append(paneData.tabs);
  $(tabsPane).fadeIn("fast");

});

//Layout handling
adjustLayout();
$(window).resize(function(){ adjustLayout() });

/*** End runtime ***/

/**
 * Adjust tabspane width according to window width
 */
function adjustLayout() {
  body.css({width: $(window).width()});
  var tabOuterWidth = 350, //see tabspane.css .tabOuter width
      width = parseInt($('body').css('width')),
      columns = Math.floor(width / tabOuterWidth),
      css = {
        'width': (tabOuterWidth * (columns > 0 ? columns : 1)) + 'px'
      };
  tabsPane.css(css);
  historyPane.css(css);
}

Tabs = {
  highlighted: {},

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
            $(tabThumb).find('.tabIcon').attr('src', 'chrome://favicon/size/16@1x/' + changeInfo.favIconUrl);
            //TODO make some sort of function in Tabs to alter Tab info
            break;
          case 'capture':
            $(tabThumb).find('.tabCapture').css({
              'background': 'url('+ changeInfo.capture +')',
              'background-size': 'cover'
            });
            break;
          case 'indexFwd':
            var target = tabsPane.find('.tabOuter:nth-child({0})'.format(changeInfo.indexFwd + 1));
            tabThumb.parent(null).insertAfter(target);
            tabsPane.sortable('refresh');
            break;
          case 'indexBkwd':
            var target = tabsPane.find('.tabOuter:nth-child({0})'.format(changeInfo.indexBkwd > 0 ? changeInfo.indexBkwd : 1));
            if (changeInfo.indexBkwd > 0) {
              tabThumb.parent(null).insertAfter(target);
            } else {
              tabThumb.parent(null).insertBefore(target);
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

    //set tabsPane icon
    if (tab.url.match(/^chrome-extension:\/\/.*tabspane\.html$/)) {
      skeleton.find('.tabIcon').attr('src', chrome.extension.getURL('icons/icon16.png'));
      skeleton.find('.tabDescription').html('Tabs Pane');
    } else {
      skeleton.find('.tabIcon').attr('src', favIconUrl);
      skeleton.find('.tabDescription').html('{0} ({1})'.format(tab.title, tab.url));
    }


    //capture
    var captureImage = chrome.extension.getBackgroundPage().tabCaptures[tab.id];
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
      if (noScroll !== true) window.scrollTo(offset.left, offset.top);
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
    var firstHighlighted = false, maxOffset = tabsPane.offset().top;

    $('.tabOuter').each(function(index, item) {
      var top = $(this).offset().top;
      // save max top offset of a tab to see if we need to show history pane
      maxOffset = top > maxOffset ? top : maxOffset;
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
        }
      } else {
        //empty search. all tabs
        $(this).css({display:'inline-block'});
      }

    });
    $('.tabOuter').promise().done(function() {
      //Show history pane only when there is 1 or 0 rows of tab results
      if (maxOffset <= tabsPane.offset().top) {
        historyPane.historyPane({'filter': search});
      } else {
        historyPane.historyPane({'filter': ''});
      }
    });
  }
};

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

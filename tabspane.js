var body = $('body');
var tabsPane = $('#tabsPane');
var tabsSearch = $('#tabsSearch');
var vars = { sortable: {} };
if (navigator.platform == 'MacIntel') {
  body.addClass('osx');
}

//Search field events
body.ready(function(){
  var searchTimeout;
  $(tabsSearch).focus();
  $(tabsSearch).on('keyup', function(event) {
    clearTimeout(searchTimeout);
    //clear textbox on Esc being pressed
    if (event.keyCode == 27) {
      this.value = '';
    }
    // enable or disable sorting
    tabsPane.sortable(this.value == '' ? 'enable' : 'disable');
    var search = this.value;
    searchTimeout = setTimeout(function() {
      Tabs.filter(search);
    } ,200);
  });
  shortcut.add("Tab", function() {
    $(tabsSearch).focus();
  });
});

//Initial pane load
chrome.runtime.sendMessage(null, {'command': 'tabList'}, function (paneData) {
  Tabs.clear();
  Tabs.append(paneData.tabs);
  $(tabsPane).fadeIn("fast");

  //enable sortable list
  tabsPane.sortable({
    appendTo:document.body,
    tolerance:'pointer',
    delay: 50,
    distance: 5
  }).disableSelection();
  tabsPane.sortable({
    create: function (event, ui) {
      console.log('sorting now');
    },
    start: function (event, ui) {
      $('.tabCloseButton').css({visibility:'hidden'});
    },
    stop: function (event, ui) {
      $('.tabCloseButton').css({visibility:'visible'});
      var tabId = ui.item.find('.tabThumb')[0].id.replace('tabThumb','');
      tabCloseButton(tabId);

      chrome.tabs.move(parseInt(tabId), {'windowId':null, 'index': ui.item.index() });
    }
  });
});

// Messages handling
chrome.extension.onMessage.addListener(function(request, sender, response) {
  if (!request.hasOwnProperty('command')) {
    return false;
  }
  switch (request.command) {
    // refresh the whole pane
    case 'refresh':
      chrome.runtime.sendMessage(null, {'command': 'tabList'}, function (paneData) {
        refreshPane(paneData.tabs);
      });
      break;
    // create or update a tab
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
    default:
      return false;
  }
  return null;
});

//Layout handling
adjustLayout();
$(window).resize(function(){ adjustLayout() });

/*** End runtime ***/

/**
 * Adjust tabspane width according to window width
 */
function adjustLayout() {
  var tabOuterWidth = 350; //see tabspane.css .tabOuter width
  var width = parseInt($('body').css('width'));
  var columns = Math.floor(width / tabOuterWidth);
  tabsPane.css({
    'width': (tabOuterWidth * (columns > 0 ? columns : 1)) + 'px'
  });
}

Tabs = {

  append: function(tabArray) {
    // tabArray supposed to be ordered by tab index in the window (!)
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
  },

  update: function(changeInfo, tab) {
    var tabThumb = $('#tabThumb' + tab.id);
    if (tabThumb != null) {
      $.each(changeInfo, function(key, value){
        switch (key) {
          case 'status':
            if (changeInfo.status == 'complete') {
              $(tabThumb).find('.tabDescription').html('{0} ({1})'.format(tab.title, tab.url));
            }
            break;
          case 'url':
            $(tabThumb).find('.tabDescription').html('{0} ({1})'.format(tab.title, tab.url));
            break;
          case 'favIconUrl':
            $(tabThumb).find('.tabIcon').attr('src', changeInfo.favIconUrl);
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
            break;
          case 'indexBkwd':
            var target = tabsPane.find('.tabOuter:nth-child({0})'.format(changeInfo.indexBkwd > 0 ? changeInfo.indexBkwd : 1));
            if (changeInfo.indexBkwd > 0) {
              tabThumb.parent(null).insertAfter(target);
            } else {
              tabThumb.parent(null).insertBefore(target);
            }

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
      $('#tabThumb' + tabId).parent(null).remove();
    });
  },

  exists: function(tabId) {
    return $('#tabThumb' + tabId).length;
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
          '<div class="tabCapture" />' +
          '<div class="tabFooter">' +
            '<img class="tabIcon" />' +
            '<div class="tabDescription"></div>' +
          '</div>' +
        '</div>' +
      '</div>');

    //icon & title
    var favIconUrl = tab.favIconUrl ? tab.favIconUrl : chrome.extension.getURL('img/tab.png');
    skeleton.find('.tabIcon').attr('src', favIconUrl);
    skeleton.find('.tabDescription').html('{0} ({1})'.format(tab.title, tab.url));

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
        'background-image': 'url({0}), radial-gradient(#ddd, #fff 93%, #fff 18%)'.format(favIconUrl),
        'background-repeat': 'no-repeat, repeat',
        'background-position': 'center center',
        'background-size': '32px 32px, cover'
      });
    }

    //holder
    skeleton.find('.tabThumb')
      .attr('id', 'tabThumb' + tab.id)
      .click(function() {
        Tabs.activate(tab.id);
      })
      .mouseenter(function() { tabCloseButton(tab.id); })
      .mouseleave(function() { tabCloseButton(null); });

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
  /**
   * filters tab by a search string
   * @param search
   */
  filter: function(search) {
    var matches;

    $('.tabOuter').each(function(index, item) {
      if (search != '') {
        if ($(this).find('.tabDescription').text().toLowerCase().match(search) == null) {
          $(this).css({display:'none'});
        } else {
          $(this).css({display:'inline-block'});
        }
      } else {
        //empty search. all tabs
        $(this).css({display:'inline-block'});
      }

    });
  }
};

/**
 * Tab close button. Single instance
 */
(function(window) {
  var button =
    $('<img class="tabCloseButton" src="img/close.png"/>')
      .css({
        'display':'none'
      })
      .appendTo('body')
      .click(function(event){ tabCloseButtonAction(); })
      .mouseenter(function(){ clearTimeout(hideTimeout); })
      .mouseleave(function(){ tabCloseButton(null); }),

  targetId = null,
  hideTimeout = null,

  tabCloseButton = function(tabId) {
    //provide NULL to hide the button
    if (tabId != null) {
      targetId = tabId;
      var tabThumb = $('#tabThumb' + tabId);
      if (tabThumb) {
        clearTimeout(hideTimeout);
        var offset = $(tabThumb).find('.tabCapture').offset();
        $(button)
          .css({
            'display':'block',
            top: (offset.top - 12) + 'px',
            left: (offset.left - 12) + 'px'
          });
      }
    } else {
      hideTimeout = setTimeout(function () { $(button).css({'display':'none'}); }, 50);
    }
  };

  function tabCloseButtonAction() {
    chrome.tabs.remove(targetId, function() {
      $(button).css({'display':'none'});
    });
  }

  window.tabCloseButton = tabCloseButton;
})(window);


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

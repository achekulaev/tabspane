var tabsPane = jQuery('#tabsPane');
if (navigator.platform == 'MacIntel') {
  tabsPane.addClass('osx');
}

//Initial pane load
chrome.runtime.sendMessage(null, {'command': 'tabList'}, function (paneData) {
  refreshPane(paneData.tabs);
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
    // syntax {command:tabAppend, changeInfo: changeInfo Object, tab: Tab Object}
    case 'tabUpdate':
      if (Tabs.exists(request.tab.id)) {
        Tabs.update(request.changeInfo, request.tab);
      } else {
        Tabs.append($(request.tab));
      }
      break;
    // remove tab(s)
    // syntax {command:tabRemove, tabIdArray:[ array of tab ids ]}
    case 'tabRemove':
      Tabs.remove($(request.tabIdArray));
      break;
    default:
      return false;
  }
});

//Layout handling
adjustLayout();
$(window).resize(function(){ adjustLayout() });

/*** End runtime ***/

/**
 *
 * @param tabs
 */
function adjustLayout() {
  var tabOuterWidth = 350; //see tabspane.css .tabOuter width
  var width = parseInt($('body').css('width'));
  var columns = Math.floor(width / tabOuterWidth);
  $('#tabsPane').css({
    'width': (tabOuterWidth * (columns > 0 ? columns : 1))+'px'
  });
}

Tabs = {

  append: function(tabArray) {
    $(tabArray).each(function(index, item) {
      renderTab(item).appendTo(tabsPane);
    });
  },

  update: function(changeInfo, tab) {
    var tabThumb = $('#tabThumb' + tab.id);
    if (tabThumb != null) {
      $.each(changeInfo, function(key, value){
        switch (key) {
          case 'status':
            break;
          case 'url':
            $('.tabDescription', tabThumb).html(tab.title + ' (' + tab.url + ')')
            break;
          case 'favIconUrl':
            break;
          case 'capture':
            $(tabThumb).find('.tabCapture').css({
              'background': 'url('+ changeInfo.capture +')',
              'background-size': 'cover'
            });
            break;
          default:
            break;
        }
      });
    }
  },

  remove: function(tabIdArray) {
    $(tabIdArray).each(function(index, item){
      $('#tabThumb' + item).parent(null).remove();
    });
  },

  exists: function(tabId) {
    return $('#tabThumb' + tabId) != null;
  }

}

/**
 * Refreshes the whole pane
 * @param tabs
 */
function refreshPane(tabs) {
	tabsPane.html('');
	for (var i in tabs) {
    renderTab(tabs[i]).appendTo(tabsPane);
	}
}

/**
 * Renders single tab representation
 */
function renderTab(tab) {
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
  skeleton.find('.tabDescription').html(tab.title + ' (' + tab.url + ')');

  //capture
  var captureImage = chrome.extension.getBackgroundPage().tabCaptures[tab.id];
  var tabCapture = skeleton.find('.tabCapture');
  if (captureImage != null) {
    tabCapture
      .css({
        'background': 'url(' + captureImage + ')',
        'background-size': 'cover'
      });
  } else {
    // default tab capture image
    tabCapture.css({
      'background-image': 'url(' + favIconUrl + '), radial-gradient(#ddd, #fff 93%, #fff 18%)',
      'background-repeat': 'no-repeat, repeat',
      'background-position': 'center center',
      'background-size': '32px 32px, cover'
    });
  }

  //holder
  skeleton.find('.tabThumb')
    .attr('id', 'tabThumb' + tab.id)
    .click(function() {
      activateTab(tab.id);
    })
    .mouseenter(function() { tabCloseButton(tab.id); })
    .mouseleave(function() { tabCloseButton(null); });

	return skeleton;
}

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

/**
 * Activates a tab. Used on click events
 * @param tabId
 */
function activateTab(tabId) {
  if (tabId != null) {
    chrome.tabs.update(parseInt(tabId), {'active':true});
  }
}

//  "commands": {
//    "_execute_browser_action": {
//      "suggested_key": {
//        "default": "Ctrl+Shift+E",
//        "mac": "Command+Shift+E"
//      }
//    }
//  },
//
//chrome.commands.onCommand.addListener(function(command){
//  switch (command) {
//    case "activate":
//      chrome.tabs.query({
//        currentWindow: true,
//        url: chrome.extension.getURL('') + '*'
//      }, function (tabs) {
//        if (tabs.length) {
//          //
//        } else {
//          chrome.tabs.create({'url': chrome.extension.getURL('tabspane.html')});
//        }
//      });
//      break;
//    default:
//      return false;
//  }
//});




// I wanted to search for tab name or url but it's not time to write that functionality
// but as I needed it right now(!) I wrote this quick hack. Search for tab with Cmd+F
// then hit Esc - text remains selected. Press enter to activate that tab
//--------- Temporary decision BEGIN.
(function(window){
  var tabHighlighted = null; //the div.tabThumb which has text selected
  var escapeState = false;

  // Timer to watch selection. (Cmd+F , type text, hit Esc)
  var selectionWatch = setInterval(function(){
    var selection = window.getSelection().focusNode;
    // only change something when selection is present and it's a new selection
    if (selection != null && tabHighlighted != $(selection).parents('.tabThumb')) {
      $(tabHighlighted).removeClass('tabHighlighted');
      tabHighlighted = $(selection).parents('.tabThumb');
      tabHighlighted.addClass('tabHighlighted');
    } else {
      // nothing selected or some text outside tabsPane selected
      $(tabHighlighted).removeClass('tabHighlighted');
      tabHighlighted = null;
    }
  },200);

  $(document).keypress(function(event) {
    if (tabHighlighted && event.which == 13) {
      var tabId = tabHighlighted[0].id.replace(/tabThumb/, '');
      if (tabId) {
        activateTab(tabId);
        clearSelection();
      }
    }
  });

  //Clear selection on second escape press only
  //other key reset escapeState
  $(document).keyup(function(event){
    if (tabHighlighted && event.keyCode == 27) {
      if (escapeState) {
        clearSelection();
      }
      escapeState = !escapeState;
    }
    if (event.keyCode != 27) {
      escapeState = false;
    }
  });

  function clearSelection() {
    window.getSelection().removeAllRanges();
    $('.tabDescription').each(function() {
      //return line scrolling back after page find was performed
      this.scrollLeft = 0;
    });
  }
})(window);
//---------- Temporary decision END


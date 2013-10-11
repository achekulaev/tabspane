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
    case 'refresh': //refresh the whole pane
      chrome.runtime.sendMessage(null, {'command': 'tabList'}, function (paneData) {
        refreshPane(paneData.tabs);
      });
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
  var tabOuterWidth = 350; //see tabspane.css/.tabOuter width
  var width = parseInt($('body').css('width'));
  var columns = Math.floor(width / tabOuterWidth);
  $('#tabsPane').css({
    'width': (tabOuterWidth * (columns > 0 ? columns : 1))+'px'
  });
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
    tabCapture.css('background', 'radial-gradient(#ddd, #fff 93%, #fff 18%)');
  }

  //icon & title
  skeleton.find('.tabIcon').attr('src', tab.favIconUrl ? tab.favIconUrl : chrome.extension.getURL('img/tab.png'));
  skeleton.find('.tabDescription').html(tab.title + ' (' + tab.url + ')');

  //holder
  skeleton.find('.tabThumb')
    .attr('id', 'tabThumb' + tab.id)
    .click(function() {
      activateTab(tab.id);
    });

	return skeleton;
}

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
var tabThumbHighlighted = null; //the div.tabThumb which has text selected
var escapeState = false;

// Timer to watch selection. (Cmd+F , type text, hit Esc)
var selectionWatch = setInterval(function(){
  var selection = window.getSelection().focusNode;
  if (selection != null && tabThumbHighlighted != $(selection).parents('.tabThumb')) {
    $(tabThumbHighlighted).removeClass('tabHighlighted');
    tabThumbHighlighted = $(selection).parents('.tabThumb');
    tabThumbHighlighted.addClass('tabHighlighted');
  } else {
    $(tabThumbHighlighted).removeClass('tabHighlighted');
    tabThumbHighlighted = null;
  }
},200);

$(document).keypress(function(event) {
  if (event.which == 13 && tabThumbHighlighted) {
    var tabId = tabThumbHighlighted[0].id.replace(/tabThumb/, '');
    if (tabId) {
      activateTab(tabId);
    }
  }
});

//Clear selection on second escape press only
//other key reset escapeState
$(document).keyup(function(event){
  if (event.keyCode == 27 && tabThumbHighlighted) {
    if (escapeState) {
      window.getSelection().removeAllRanges();
      $('.tabDescription').each(function() {
        //return line back after page find was performed
        this.scrollLeft = 0;
      });
    }
    escapeState = !escapeState;
  }
  if (event.keyCode != 27) {
    escapeState = false;
  }
});
//---------- Temporary decision END


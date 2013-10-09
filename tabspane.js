var tabsPane = jQuery('#tabsPane');

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
  //capture
  var tabCapture, captureImage = chrome.extension.getBackgroundPage().tabCaptures[tab.id];
  if (captureImage != null) {
    tabCapture = jQuery('<img/>', {
      src: captureImage,
      class: 'tabCapture'
    });
  }
  //icon
	var tabIcon = jQuery('<img/>', {
		src: tab.favIconUrl ? tab.favIconUrl : chrome.extension.getURL('img/tab.png'),
		class: 'tabIcon'
	});
  //title
  var tabDescription = jQuery('<div/>', {
    class: 'tabDescription'
  }).html('<b>' + tab.title + '</b> (' + tab.url + ')');

  //holder element
	var tabThumb = jQuery('<div/>', {
		id:   'tabThumb' + tab.id,
		class:'tabThumb'
	});

  //Compile whole markup
  if (tabCapture != null) {
    tabCapture.appendTo(tabThumb);
  }
	tabIcon.appendTo(tabThumb);
	tabDescription.appendTo(tabThumb);

  //Assign click
  $(tabThumb).click(function() {
    activateTab(tab.id);
  });
	return tabThumb;
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

// I wanted to search for tab name or url but it's not time to write that functionality
// but as I needed it right now(!) I wrote this quick hack. Search for tab with Cmd+F
// then hit Esc - text remains selected. Press enter to activate that tab
//--------- Temporary decision BEGIN.
var tabThumbHighlighted = null; //the div.tabThumb which has text selected

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
})
//---------- Temporary decision END


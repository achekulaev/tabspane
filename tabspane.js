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
  var tabTitle = jQuery('<a/>', {
    class: 'tabTitle',
    text:  tab.title,
    on: {
      click: function (event) {
        activateTab(tab.id);
      }
    }
  });

  //Compile whole markup
	var tabThumb = jQuery('<div/>', {
		id:   'tabThumb' + tab.id,
		class:'tabThumb'
	});
  if (tabCapture != null) {
    tabCapture.appendTo(tabThumb);
  }
	tabIcon.appendTo(tabThumb);
	tabTitle.appendTo(tabThumb);
	return tabThumb;
}

/**
 * Activates a tab. Used on click events
 * @param tabID
 */
function activateTab(tabID) {
  if (tabID != null) {
    chrome.tabs.update(tabID, {'active':true});
  }
}
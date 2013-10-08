var tabsPane = jQuery('#tabsPane');
chrome.runtime.sendMessage(null, {'command': 'tabsList'}, function (tabsList) {
//    populateTabs(chrome.extension.getBackgroundPage().currentWindowTabs);
  populateTabs(tabsList);
});


function populateTabs(tabs) {
	tabsPane.html('');
	// var html = '';
	for (var i in tabs) {
		renderTabThumb(tabs[i], tabsPane);
		// html += tabs[i].title + '<br/>';
	}
}

function renderTabThumb(tab, DOMElement) {
	// chrome.tabs.captureVisibleTab(tab.windowId, {"format":"png"}, function(imgData) {
	// 	getTabThumb(tab, imgData).appendTo(tabsPane);
	// });
	getTabThumb(tab, null).appendTo(DOMElement);
}

function getTabThumb(tab, screenshot) {
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

  //whole markup
	var tabThumb = jQuery('<div/>', {
		id:   'tabThumb' + tab.id,
		class:'tabThumb'
	});
	tabIcon.appendTo(tabThumb);
	tabTitle.appendTo(tabThumb);
	return tabThumb;
}

function activateTab(tabID) {
  if (tabID != null) {
    chrome.tabs.update(tabID, {'active':true});
  }
}
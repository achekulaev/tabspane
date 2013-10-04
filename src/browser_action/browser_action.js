var tabsPane = jQuery('#tabsPane');
populateTabs(chrome.extension.getBackgroundPage().currentWindowTabs);

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
	var tabIcon = jQuery('<img/>', {
		src: tab.favIconUrl,
		class: 'tabIcon'
	});
	var tabTitle = jQuery('<div/>', {
		class: 'tabTitle',
		text:  tab.title
	});
	var tabThumb = jQuery('<div/>', {
		id:   'tabThumb' + tab.id,
		class:'tabThumb'
	});
	tabIcon.appendTo(tabThumb);
	tabTitle.appendTo(tabThumb);
	return tabThumb;
}
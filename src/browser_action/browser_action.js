var currentWindowTabs = [];
var tabsPane = jQuery('#mainPopup');

chrome.tabs.query({
	currentWindow: true
}, function(tabs){
	currentWindowTabs = tabs;
	populateTabs(tabs);
});

function populateTabs(tabs) {
	tabsPane.html('');
	// var html = '';
	for (var i in tabs) {
		renderTabThumb(tabs[i]);
		// html += tabs[i].title + '<br/>';
	}
}

function renderTabThumb(tab) {
	// chrome.tabs.captureVisibleTab(tab.windowId, {"format":"png"}, function(imgData) {
	// 	getTabThumb(tab, imgData).appendTo(tabsPane);
	// });
	getTabThumb(tab, null).appendTo(tabsPane);
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
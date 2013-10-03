var currentWindowTabs = [];

chrome.tabs.query({
	currentWindow: true
}, function(tabs){
	currentWindowTabs = tabs;
	populateTabs(tabs);
});

function populateTabs(tabs) {
	var html = '';
	for (var i in tabs) {
		html += tabs[i].title + '<br/>';
	}
	jQuery('#mainPopup').html(html);
}


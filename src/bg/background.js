// if you checked "fancy-settings" in extensionizr.com, uncomment this lines

// var settings = new Store("settings", {
//     "sample_setting": "This is how you use Store.js to remember values"
// });


var currentWindowTabs = [];
var tabCaptures = [];

//example of using a message handler from the inject scripts
chrome.extension.onMessage.addListener(
  function (request, sender, sendResponse) {
    if (!request.hasOwnProperty('command')) {
      return false;
    }
    switch (request.command) {
      case 'tabList':
        // Async query for tabs
        chrome.tabs.query({
          currentWindow: true
        }, function (tabs) {
          currentWindowTabs = tabs;
          sendResponse({'tabs':currentWindowTabs, 'tabCaptures':tabCaptures});
        });
        break;

      default:
        return false;
    }

    // Return true to notify that response will be asynchronous
    return true;
  });

chrome.browserAction.onClicked.addListener(function (tab) {
  chrome.tabs.create({'url': chrome.extension.getURL('tabspane.html')}, function (tab) {
    // Tab opened.
    // var paneTab = chrome.extension.getViews({'type':'tab'});
  });
});

chrome.tabs.onActivated.addListener(function(activeInfo) {
  console.log('Capturing tab ' + activeInfo.tabId);
  chrome.tabs.captureVisibleTab(activeInfo.windowId, {'format':'jpeg', 'quality': 80}, function(dataUrl){
    tabCaptures[activeInfo.tabId] = dataUrl;
    chrome.runtime.sendMessage(null, {'command': 'refresh'});
  });
});
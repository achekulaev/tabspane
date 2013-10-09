// if you checked "fancy-settings" in extensionizr.com, uncomment this lines

// var settings = new Store("settings", {
//     "sample_setting": "This is how you use Store.js to remember values"
// });


var currentWindowTabs = [];
var tabCaptures = [];

//Message handling
chrome.extension.onMessage.addListener(
  function (request, sender, sendResponse) {
    if (!request.hasOwnProperty('command')) {
      return false;
    }
    switch (request.command) {
      case 'tabList':
        // Async query for tabs
        chrome.tabs.query({
          currentWindow: true,
          active: false
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
  });
});

chrome.tabs.onActivated.addListener(function(activeInfo) {
  console.log('Capturing tab ' + activeInfo.tabId);
  chrome.tabs.captureVisibleTab(activeInfo.windowId, {'format':'jpeg', 'quality': 80}, function(dataUrl){
    tabCaptures[activeInfo.tabId] = dataUrl;
    chrome.runtime.sendMessage(null, {'command': 'refresh'});
  });
});
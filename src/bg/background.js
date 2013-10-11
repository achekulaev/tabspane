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
  }
);

//React on extension icon click
chrome.browserAction.onClicked.addListener(function (tab) {
  chrome.tabs.query({
    currentWindow: true,
    url: chrome.extension.getURL('') + '*'
  }, function (tabs) {
    if (tabs.length) {
      console.log(tabs);
      chrome.tabs.update(parseInt(tabs[0].id), {'active':true});
    } else {
      chrome.tabs.create({'url': chrome.extension.getURL('tabspane.html')});
    }
  });
});

//Generate screenshot (capture) on tab activation event
chrome.tabs.onActivated.addListener(function(activeInfo) {
  chrome.tabs.captureVisibleTab(activeInfo.windowId, {'format':'jpeg', 'quality': 80}, function(dataUrl){
    tabCaptures[activeInfo.tabId] = dataUrl;
    chrome.runtime.sendMessage(null, {'command': 'refresh'});
  });
});

//Remove screenshot data on tab close
chrome.tabs.onRemoved.addListener(function(tabId, removeInfo){
  if (tabCaptures[tabId] != null) {
    tabCaptures[tabId] = null;
  }
  chrome.runtime.sendMessage(null, {'command': 'refresh'});
});
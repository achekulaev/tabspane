// if you checked "fancy-settings" in extensionizr.com, uncomment this lines

// var settings = new Store("settings", {
//     "sample_setting": "This is how you use Store.js to remember values"
// });

var captureFormat = {'format':'jpeg', 'quality': 80};

var currentWindowTabs = [];
var tabCaptures = [];
var activeTab = null;

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
  // Search for self. Don't create second instance
  chrome.tabs.query({
    currentWindow: true,
    url: chrome.extension.getURL('') + '*'
  }, function (tabs) {
    tabs.length
      ? chrome.tabs.update(parseInt(tabs[0].id), {'active':true})
      : chrome.tabs.create({'url': chrome.extension.getURL('tabspane.html')});
  });
});

//Generate screenshot (capture) on tab activation event
chrome.tabs.onActivated.addListener(function(activeInfo) {
  chrome.tabs.captureVisibleTab(activeInfo.windowId, captureFormat, function(dataUrl){
    activeTab = activeInfo.tabId;
    tabCaptures[activeInfo.tabId] = dataUrl;
    chrome.runtime.sendMessage(null, {
      'command': 'tabUpdate',
      'changeInfo': {'capture' : tabCaptures[activeInfo.tabId]},
      'tab': { 'id': activeInfo.tabId } // fake tab object with id only
    });
  });
});

//Remove screenshot data on tab close
chrome.tabs.onRemoved.addListener(function(tabId, removeInfo){
  if (tabCaptures[tabId] != null) {
    tabCaptures[tabId] = null;
  }
  chrome.runtime.sendMessage(null, {'command': 'tabRemove', 'tabIdArray': [tabId]});
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status == 'complete') {
    //refresh capture if current tab finished loading
    if (tab.id == activeTab) {
      chrome.tabs.captureVisibleTab(tab.windowId, captureFormat, function(dataUrl){
        tabCaptures[activeInfo.tabId] = dataUrl;
      });
    }
    chrome.runtime.sendMessage(null, {'command': 'tabUpdate', 'changeInfo': changeInfo, 'tab': tab});
  }
});

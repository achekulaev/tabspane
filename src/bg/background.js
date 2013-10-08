// if you checked "fancy-settings" in extensionizr.com, uncomment this lines

// var settings = new Store("settings", {
//     "sample_setting": "This is how you use Store.js to remember values"
// });


var currentWindowTabs = [];

//example of using a message handler from the inject scripts
chrome.extension.onMessage.addListener(
  function (request, sender, sendResponse) {
    // Async query for tabs
    chrome.tabs.query({
      currentWindow: true
    }, function (tabs) {
      currentWindowTabs = tabs;
      sendResponse(currentWindowTabs);
    });

    // Return true to notify that response will be asynchronous
    return true;
  });

chrome.browserAction.onClicked.addListener(function (tab) {
  chrome.tabs.create({'url': chrome.extension.getURL('tabspane.html')}, function (tab) {
    // Tab opened.
    // var paneTab = chrome.extension.getViews({'type':'tab'});
  });
});



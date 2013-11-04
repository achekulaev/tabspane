// if you checked "fancy-settings" in extensionizr.com, uncomment this lines

// var settings = new Store("settings", {
//     "sample_setting": "This is how you use Store.js to remember values"
// });

var captureFormat = {'format':'jpeg', 'quality': 80};

var currentWindowTabs = [];
var tabCaptures = [];
var activeTab = null;

/**
 * Message handling
 */
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
  }
);

/**
 * React on extension icon click
 */
chrome.browserAction.onClicked.addListener(function (tab) {
  // Search for self. Don't create second instance
  chrome.tabs.query({
    currentWindow: true,
    url: chrome.extension.getURL('') + '*'
  }, function (tabs) {
    if (tabs.length) {
      chrome.runtime.sendMessage(null, {command: 'highlight', tab: {id: activeTab}});
      chrome.tabs.update(parseInt(tabs[0].id), {'active': true});
    } else {
      chrome.tabs.create({'url': chrome.extension.getURL('tabspane.html')});
    }
  });
});

/**
 * On Tab activated event generate screenshot (capture)
 */
chrome.tabs.onActivated.addListener(function(activeInfo) {
  activeTab = activeInfo.tabId;
  takeScreenshot(activeInfo.tabId);
});

/**
 * On Tab close event remove screenshot (capture)
 */
chrome.tabs.onRemoved.addListener(function(tabId, removeInfo){
  if (tabCaptures[tabId] != null) {
    tabCaptures[tabId] = null;
  }
  chrome.runtime.sendMessage(null, {'command': 'tabRemove', 'tabIdArray': [tabId]});
});

/**
 * On tab created append a tab
 */

chrome.tabs.onCreated.addListener(function(tab) {
  chrome.runtime.sendMessage(null, {'command': 'tabUpdate', 'changeInfo': {}, 'tab': tab});
});

/**
 * On tab reloaded
 */
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  chrome.runtime.sendMessage(null, {'command': 'tabUpdate', 'changeInfo': changeInfo, 'tab': tab});

  if (changeInfo.status == 'complete' && tab.url != 'chrome://newtab/' && tab.id == activeTab) {
    //refresh capture if current tab finished loading
    takeScreenshot(tabId);
  }
});

/**
 * When page is pre-loaded by Chrome in background process
 * while user types an address in chrome's address bar
 * then on return key pressed Chrome fires onReplaced event rather than onUpdated
 */
chrome.tabs.onReplaced.addListener(function(addedTabId, removedTabId) {
  //remove old tab
  chrome.runtime.sendMessage(null, {'command': 'tabRemove', 'tabIdArray': [removedTabId]});
  //add new tab
  chrome.tabs.get(addedTabId, function(tab) {
    chrome.runtime.sendMessage(null, {'command': 'tabUpdate', 'tab': tab});
    takeScreenshot(tab.id);
  });
});

/**
 * Handle tab moving within a window
 */
chrome.tabs.onMoved.addListener(function(tabId, moveInfo){
  chrome.runtime.sendMessage(null, {
    command: 'tabUpdate',
    'changeInfo': moveInfo.toIndex > moveInfo.fromIndex ? {'indexFwd': moveInfo.toIndex} : {'indexBkwd': moveInfo.toIndex},
    'tab': {'id': tabId} // faux tab object with id only
  });
});

/**
 * Tab detached from current window
 */
chrome.tabs.onDetached.addListener(function(tabId, detachInfo) {
  if (tabCaptures[tabId] != null) {
    tabCaptures[tabId] = null;
  }
  chrome.runtime.sendMessage(null, {'command': 'tabRemove', 'tabIdArray': [tabId]});
});

/**
 * Tab attached to current window
 */
chrome.tabs.onAttached.addListener(function(tabId, attachInfo) {
  chrome.windows.get(attachInfo.newWindowId, {}, function(attachedToWindow) {
    chrome.windows.getCurrent({'populate':true}, function(currentWindow) {
      if (attachedToWindow.id == currentWindow.id) {
        var newTab = currentWindow.tabs[attachInfo.newPosition];
        chrome.runtime.sendMessage(null, {'command': 'tabUpdate', 'tab': newTab});
      }
    });
  });
});

/*** Omnibox ***/

chrome.omnibox.onInputStarted.addListener(
  function (){
    chrome.tabs.query({
      "currentWindow": true
    }, function(tabs){
      currentWindowTabs = tabs;
    });
  }
);

chrome.omnibox.onInputChanged.addListener(
  function (text, suggest){
    var tabsSuggest = [];
    $.each(chrome.extension.getBackgroundPage().currentWindowTabs,
      function (index, tab) {
        if (tab.title.match(text) || tab.url.match(text)) {
          tabsSuggest.push({content: tab.id+"", description: tab.title});
        }
      });
    suggest(tabsSuggest);
  }
);

chrome.omnibox.onInputEntered.addListener(
  function (text){
    chrome.tabs.update(parseInt(text), {'active':true});
  }
);

/*** Helper functions ***/

/**
 * Takes screenshot of currently visible tab, resizes and send a message to tabspane.js
 */
function takeScreenshot(tabId) {
  chrome.tabs.captureVisibleTab(null, captureFormat, function(dataUrl) {
//    resizeImage(dataUrl, 280, 210, function(resize) {
//      tabCaptures[tabId] = resize;
//      chrome.runtime.sendMessage(null, {
//        'command': 'tabCaptureUpdate',
//        'changeInfo': {'capture' : resize},
//        'tab': { 'id': tabId } // faux tab object with id only
//      });
//    });

      tabCaptures[tabId] = dataUrl;
      chrome.runtime.sendMessage(null, {
        'command': 'tabCaptureUpdate',
        'changeInfo': {'capture' : dataUrl},
        'tab': { 'id': tabId } // faux tab object with id only
      });

  });
}

/**
 * Resizes image
 * @param src
 * @param width
 * @param height
 * @param callback
 * @returns {boolean}
 */
function resizeImage(src, width, height, callback) {
  if (width == null || height == null || callback == null) {
    return false;
  }
  var img = new Image();

  img.onload = function() {
    var canvas = document.createElement('canvas');

    var ratio = this.width / this.height;
    if (this.height < this.width) {
      //browser horizontal
      canvas.height = height;
      canvas.width = height * ratio;
    } else {
      //browser vertical
      canvas.width = width;
      canvas.height = width / ratio;
    }

    canvas.width *= 2;
    canvas.height *= 2;
    //TODO: crop invisible (due to different thumbnail and browser window ratios) part of image
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);

    callback(canvas.toDataURL("image/png", 0.8));
  };

  img.src = src;
}
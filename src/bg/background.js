// if you checked "fancy-settings" in extensionizr.com, uncomment this lines

// var settings = new Store("settings", {
//     "sample_setting": "This is how you use Store.js to remember values"
// });

var currentWindowTabs = [];
var tabCaptures = [];
var activeTab = null;


Background = {
  /* const */
  ALL_WINDOWS: -15,
  CAPTURE_FORMAT: {'format':'jpeg', 'quality': 80},
  /* vars */
  currentWindow: null,

  /**
   * Sends log messages to foreground page to ease debugging
   */
  log: function(data) {
    this.sendMessage({ command: 'log', data: data });
  },
  /**
   * Sends log messages to foreground page to ease debugging
   */
  logT: function(data) {
    this.sendMessage({ command: 'logT', data: data });
  },

  sendMessage: function(message, callback) {
    if (!message.windowId) {
      message.windowId = this.currentWindow;
    }

    chrome.runtime.sendMessage(null, message, callback ? callback : function(){});
  },

  isExtensionURL: function(url) {
    return chrome.extension.getURL('tabspane.html') == url;
  },

  detach: function(tabIds) {
    chrome.windows.create({ url: 'about:blank' }, function(win) {
      tabIds.forEach(function(value) {
        chrome.tabs.move(parseInt(value), { windowId: win.id, index: -1 });
      });
      //close first empty tab in a new window
      chrome.tabs.query(
        { windowId: win.id },
        function(tabs) {
          chrome.tabs.remove(tabs[0].id);
        }
      );
    });
  }
};

chrome.windows.getCurrent({}, function(currentWindow) {
  Background.currentWindow = currentWindow.id;
});

/**
 * Message handling
 */
chrome.extension.onMessage.addListener(
  function (request, sender, sendResponse) {
    switch (request.command) {
      case 'tabList':
        // query tabs
        chrome.tabs.query({
          windowId: request.windowId ? request.windowId : chrome.windows.WINDOW_ID_CURRENT
        }, function (tabs) {
          currentWindowTabs = tabs; //TODO: save tabs PER window
          sendResponse({ 'tabs': currentWindowTabs, 'tabCaptures': tabCaptures });
          //note: tabCaptures is empty on page load now but it will be loaded from storage in future
        });
        break;
      case 'move':
        chrome.tabs.move(parseInt(request.tabId), { windowId: request.windowId, index: parseInt(request.index) });
        break;
      case 'detach':
        Background.detach(request.tabIds);
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
      Background.sendMessage({ command: 'highlight', tab: {id: activeTab}, windowId: tabs[0].windowId });
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
  //TODO possibly redo here in future to avoid get call per each tab
  chrome.tabs.get(activeTab, function(tab) {
    if (!Background.isExtensionURL(tab.url)) {
      takeScreenshot(activeInfo.tabId, activeInfo.windowId);
    }
  });
});

/**
 * On Tab close event remove screenshot (capture).
 */
chrome.tabs.onRemoved.addListener(function(tabId, removeInfo){
  if (tabCaptures[tabId] != null) {
    tabCaptures[tabId] = null;
  }
  Background.sendMessage({ command: 'tabRemove', 'tabIdArray': [tabId], windowId: removeInfo.windowId });
});

/**
 * On tab created append a tab
 */
chrome.tabs.onCreated.addListener(function(tab) {
  Background.sendMessage({ command: 'tabUpdate', changeInfo: {}, tab: tab, windowId: tab.windowId });
});

/**
 * On tab reloaded
 */
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  Background.sendMessage({ command: 'tabUpdate', changeInfo: changeInfo, tab: tab, windowId: tab.windowId});

  if (changeInfo.status == 'complete' && tab.url != 'chrome://newtab/' && tab.id == activeTab) {
    //refresh capture if current tab finished loading
    if (!Background.isExtensionURL(tab.url)) {
      takeScreenshot(tabId, tab.windowId);
    }
  }
});

/**
 * When page is pre-loaded by Chrome in background process
 * while user types an address in chrome's address bar
 * then on return key pressed Chrome fires onReplaced event rather than onUpdated
 */
chrome.tabs.onReplaced.addListener(function(addedTabId, removedTabId) {
  //remove old tab
  Background.sendMessage({command: 'tabRemove', tabIdArray: [removedTabId], windowId: Background.ALL_WINDOWS});
  //add new tab
  chrome.tabs.get(addedTabId, function(tab) {
    Background.sendMessage({ command: 'tabUpdate', tab: tab, windowId: tab.windowId });
    takeScreenshot(tab.id, tab.windowId);
  });
});

/**
 * Handle tab moving within a window
 */
chrome.tabs.onMoved.addListener(function(tabId, moveInfo){
  Background.sendMessage({
    command: 'tabUpdate',
    changeInfo: moveInfo.toIndex > moveInfo.fromIndex ? { indexFwd: moveInfo.toIndex } : { indexBkwd: moveInfo.toIndex },
    tab: {id: tabId }, // faux tab object with id only
    windowId: moveInfo.windowId
  });
});

/**
 * Tab detached from current window
 */
chrome.tabs.onDetached.addListener(function(tabId, detachInfo) {
  if (tabCaptures[tabId] != null) {
    tabCaptures[tabId] = null;
  }
  Background.sendMessage({command: 'tabRemove', 'tabIdArray': [tabId], windowId: detachInfo.oldWindowId});
});

/**
 * Tab attached to current window
 */
chrome.tabs.onAttached.addListener(function(tabId, attachInfo) {
  chrome.tabs.get(tabId, function(tab) {
    Background.sendMessage({ command: 'tabUpdate', tab: tab, windowId: tab.windowId });
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
function takeScreenshot(tabId, windowId) {
  chrome.tabs.captureVisibleTab(null, Background.CAPTURE_FORMAT, function(dataUrl) {
    // We need to check if active tab is STILL that tab that used to be
    // otherwise if tabs switch too fast then Chrome can substitute
    // another's tab (sic!) dataUrl result here
    if (activeTab == tabId) {
      tabCaptures[tabId] = dataUrl;
      Background.sendMessage({
        command: 'tabCaptureUpdate',
        changeInfo: { capture : dataUrl },
        tab: { id: tabId }, // simulate tab object
        windowId: windowId
      });
    }
  });
}

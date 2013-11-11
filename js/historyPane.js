/**
 * Created by alexei.chekulaev on 11/11/13.
 */

$.widget('tabsPane.historyPane', {
  options : {
    filter : ''
  },
  list : $('<div/>'),
  _create: function() {
    this._hide();
    this.element.html('<h1>History</h1><div id="historyList"></div>');
    this.list = $('#historyList', this.element);
  },
  _setOption: function(key, value) {
    switch (key) {
      case 'filter':
        if (value != '') {
          this.options.filter = value;
          var startTime = new Date();
          var widget = this;
          var itemSkeleton = '<div class="historyItem"><a href="{0}">{1}</a>&nbsp;<a href="{0}" class="grey">({2})</a></div>';

          this.list.html('');
          startTime.setFullYear(startTime.getFullYear(), startTime.getMonth() - 3);

          chrome.history.search(
            {
              text: value,
              startTime: startTime.getTime(),
              endTime: Date.now(),
              maxResults: 10
            }, function(items) {
              $.each(items, function(index, item) {
                widget.list.append(
                  itemSkeleton.format(item.url, item.title ? item.title : '[No Title]', item.url)
                );
              });
            });
          this._show();
        } else {
          this._hide();
          this.list.html('');
        }
        break;
      default:
        break
    }
  },
  _hide: function() {
    this.element.css({display:'none'});
  },
  _show: function() {
    this.element.css({display:'block'});
  }
});

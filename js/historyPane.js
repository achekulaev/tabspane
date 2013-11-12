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
    this.options[key] = value;

    switch (key) {
      case 'filter':
        if (value != '') {
          var startTime = new Date();
          var widget = this;
          var itemSkeleton =
            '<div class="historyItem">' +
              '<img src="{2}" />' +
              '<a href="{0}">{1}</a>&nbsp;&dash;&nbsp;<a href="{0}" class="grey">{0}</a>' +
            '</div>';

          this._clear();
          startTime.setFullYear(startTime.getFullYear(), startTime.getMonth() - 3); //TODO move 'time ago' to options

          chrome.history.search(
            {
              text: value,
              startTime: startTime.getTime(),
              endTime: Date.now(),
              maxResults: 10
            },
            function(items) {
              $.each(items, function(index, item) {
                widget.list.append(
                  itemSkeleton.format(
                    item.url,
                    item.title ? item.title : '[No Title]',
                    'chrome://favicon/size/16@1x/' + item.url
                  )
                );
              });
            });
          this._show();
        } else {
          this._hide();
          this._clear();
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
  },
  _clear: function() {
    this.list.html('');
  }
});

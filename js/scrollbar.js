define(['jquery', 'lib/class'], function($) {
  var Scrollbar = Class.extend({
    init: function(scrollingElement, scroller, thumb) {
      this.scrollingElement = scrollingElement;
      this.scroller = scroller;
      this.thumb = thumb;
    },

    handle: function(e) {
      var fraction = (this.scrollingElement[0].scrollTop + e.deltaY) / (this.scrollingElement[0].scrollHeight - this.scrollingElement[0].offsetHeight);
      if (fraction > 1) {
        fraction = 1;
      } else if (fraction < 0) {
        fraction = 0;
      }
      var total = (this.scroller[0].offsetHeight - this.thumb.height()) * fraction;

      var thumbTop = parseInt(this.thumb[0].style.top);
      var topDelta = Math.abs(total - thumbTop) !== 0 ? Math.abs(total - thumbTop) : 0.1;
      var inverseSpeed = 30 / topDelta;
      var maxInverseSpeed = 0.5;
      if (inverseSpeed > maxInverseSpeed) {
        inverseSpeed = maxInverseSpeed;
      }

      this.thumb.finish().css("top", thumbTop + "px").animate({ 'top': total + "px" }, 400 * inverseSpeed);

      var top = parseInt(this.scrollingElement[0].style.top);
      this.scrollingElement.finish().css("top", top + "px").animate({
        scrollTop: this.scrollingElement[0].scrollTop + e.deltaY
      }, 100, 'swing');
    },

    update: function() {
      var displayedMessages = this.scrollingElement.children().length;
      var baseDisplayedMessages = 40;
      var baseHeight = 160;
      var tScrollHeight = (this.scrollingElement.prop('scrollHeight'));

      var height;
      var tDifference = tScrollHeight - this.scrollingElement.height();
      var scrollerHeight = this.scroller.height();
      if (tScrollHeight > 0 && tDifference > 0) {
        height = scrollerHeight / tScrollHeight * scrollerHeight;
      } else {
        height = scrollerHeight;
      }
      if (height > scrollerHeight || height === 0) {
        height = scrollerHeight;
      }

      this.thumb.height(height + "px");

      if (height === scrollerHeight) {
        this.scroller.css('width', '0');
      } else {
        this.scroller.css('width', '8px');
      }

      var fraction;
      if (this.scrollingElement[0].scrollTop === 0) {
        fraction = 0;
      } else {
        fraction = (this.scrollingElement[0].scrollTop) / (this.scrollingElement[0].scrollHeight - this.scrollingElement[0].offsetHeight);
        if (fraction > 1) {
          fraction = 1;
        } else if (fraction < 0) {
          fraction = 0;
        }
      }

      var total = (this.scroller[0].offsetHeight - this.thumb.height()) * fraction;
      this.thumb.css('top', total + 'px');
    }
  });

  return Scrollbar;
});

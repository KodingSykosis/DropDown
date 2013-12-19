/*globals jQuery,window*/

(function($) {
    var moveEvent = {

    };

    $.extend($.event.special, {
        move: moveEvent
    });
})(jQuery);
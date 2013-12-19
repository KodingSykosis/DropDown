/*jslint sub:true,laxbreak:true*/
/*globals window,jQuery*/
/***
 *      Author: KodingSykosis
 *        Date: 12/17/2013
 *     Version: 1.1.0
 *     License: GPL v3 (see License.txt or http://www.gnu.org/licenses/)
 * Description: This widget extends and styles the browser's drop down control
 *
 *        Name: kodingsykosis.DropDown
 *
 *    Requires: jQueryUI 1.8.2 or better
 ***/

(function ($) {
    //Old IE Hacks
    if (!window.getComputedStyle) {
        window.getComputedStyle = function (el, pseudo) {
            this.el = el;
            this.getPropertyValue = function (prop) {
                var re = /(\-([a-z]){1})/g;
                if (prop == 'float') prop = 'styleFloat';
                if (re.test(prop)) {
                    prop = prop.replace(re, function () {
                        return arguments[2].toUpperCase();
                    });
                }
                return el.currentStyle[prop] ? el.currentStyle[prop] : null;
            };
            return this;
        };
    }

    if (!Array.prototype.indexOf) {
        Array.prototype.indexOf = function (elt /*, from*/) {
            var len = this.length >>> 0;

            var from = Number(arguments[1]) || 0;
            from = (from < 0)
                 ? Math.ceil(from)
                 : Math.floor(from);
            if (from < 0)
                from += len;

            for (; from < len; from++) {
                if (from in this &&
                    this[from] === elt)
                    return from;
            }
            return -1;
        };
    }

    $.fn.totalHeight = function (outer, max) {
        var height = 0;

        if (typeof outer == 'number' && typeof max == 'undefined') {
            max = outer;
            outer = false;
        }

        this.each(function (idx) {
            var el = $(this),
                pos = el.css('position'),
                disp = el.css('display'),
                vis = el.css('visibility'),
                uncomputed = !el.is(':visible');

            if (typeof max != 'undefined' && idx > max && max != -1 && max != null) {
                return false;
            }

            if (uncomputed) {
                el.css({
                    position: 'absolute',
                    display: 'block',
                    visibility: 'hidden'
                });
            }

            height +=
                el[outer ? 'outerHeight' : 'height']();

            if (uncomputed) {
                el.css({
                    position: pos,
                    display: disp,
                    visibility: vis
                });
            }
        });

        return height == 0 ? null : height;
    };

    $.fn.notClicked = function (handler) {
        if (!handler) return;
        var element = this;

        $(window).click(function (event) {
            var target = $(event.target);
            if (!target.is(element) && element.find(target).length == 0) {
                handler.call(element, $.Event('notClicked', { target: target }));
            }
        });
    };

    //FixMe: http://bugs.jqueryui.com/ticket/8932
    var orgHeight = $.fn.height;
    $.fn.height = function (height) {
        if (!height || this.css('box-sizing') !== 'border-box') {
            return orgHeight.apply(this, arguments);
        }

        var paddingTop = this.css('padding-top'),
            paddingBottom = this.css('padding-bottom'),
            paddingVert = parseFloat(paddingTop || 0) + parseFloat(paddingBottom || 0);

        return orgHeight.call(this, height - paddingVert);
    };

    $.widget("kodingsykosis.DropDown", {
        options: {
            other: false,
            listSize: 10,
            maxHeight: 350,
            emptyText: 'Choose Item',
            allowEmpty: true,
            ignoreEmptyOptions: true,
            emptyOption: '^$|^0$',
            filterEx: '^{0}',
            filterOpt: 'i',
            duration: 120,
            viewPort: window
        },
        keyTraps: [127, 27, 38, 40, 13, 8, 33, 34],
        currentFilter: '',

        // Set up the widget
        _create: function () {
            var self = this;
            this.wrap = $('<div>', {
                'class': 'ui-dropdown-wrap'
            });
            this.name =
                this.element
                    .attr('name');

            this.element
                .addClass('ui-dropdown-source')
                .hide()
                .removeAttr('name');

            var style = window.getComputedStyle(this.element[0]);
            this.wrap
                .css({
                    width: style.width,
                    height: style.height,
                    float: style.float,
                    position: style.position,
                    top: style.top,
                    left: style.left,
                    right: style.right,
                    bottom: style.bottom,
                    lineHeight: style.lineHeight,
                    fontSize: style.fontSize
                });

            this.element
                .wrap(this.wrap);

            this.wrap =
                this.element
                    .parent();

            //We are assuming the widget is instantiated on a select node
            //Wrap the element in a div or set it to display none?
            this.container = this._addContainer()
                .append(this._addInputs());

            //Insert the value field after the original
            //dropdown field.  This will allow validation
            //to operator without messing with the new
            //dropdown layout
            this.wrap
                .after(this.value);

            //Swap the select element out for our dropdown
            this.element
                .before(this.container);

            this.dropDownContainer = this._addDropDown()
                .appendTo('body');

            this.list = this._addList();
            this.scrollContainer = this._addScrollbar(this.list);
            this.otherValue = this._addOtherValue();

            //Initiate the scrollbar
            this.scroll
                .tinyscrollbar({
                    contentPadding: 0,
                    scrollPadding: 0
                });

            this.trigger = this._addTrigger()
                .appendTo(this.container);

            this.value
                .data(this.widgetName, this);

            //re-compute list items and size
            this.refresh();

            this.container
                .notClicked($.proxy(this._onNotClicked, this));

            this.container
                .mousedown(function () {
                    self.mouseDown = true;
                });

            $(window)
                .mouseup(function () {
                    self.mouseDown = false;
                })
                .resize(function() {
                    self.collapse();
                })
                .blur(function() {
                    self.skipFocus =
                        self.display
                            .is(document.activeElement);
                });

            this.dropDownContainer
                .hide();
        },

        /***********************************
        **     Public methods
        ***********************************/

        refresh: function () {
            var data = this._consumeSelect(this.element);
            var items = this._buildMenu(data);

            this.list
                .children('li')
                .remove();

            this.list
                .append(items);

            this.items = $(items);

            var validator = this._getFormValidator();
            if (validator) {
                var rules = $.extend({}, this.element.rules(), this.options['rules']);
                if (!this._hasProperties(rules)) rules = null;
                //Apply any validation rules to the display field
                this._applyValidation(rules);
            }

            this._computeContainerSize();
            this.selected(this.selected());
        },

        selected: function (item) {
            var option =
                this.list
                    .children('.ui-selected');

            if (typeof item != 'undefined' && item !== null) {
                if (option.length > 0) {
                    option.removeClass('ui-selected')
                        .data('menu-item').selected = false;
                }

                if (item.length > 0) {
                    item = item.data('menu-item');
                } else if (item.length === 0) {
                    item = { value: '' };
                }

                this.list
                    .children('li')
                    .each(function () {
                        var el = $(this);
                        var data = el.data('menu-item') || {};

                        data.selected = data.value === item.value;
                        el.toggleClass('ui-selected', data.selected);
                        el.data('menu-item', data);
                    });

                if (this.list.children('.ui-selected').length > 0 && this.otherValue) {
                    this.otherValue.val('');
                }

                this.value
                    .val(item.value || item.text);

                if (this.value.val() !== this.element.val()) {
                    this.element
                        .val(this.value.val());
                    this.element
                        .change();
                }



                var empty = this.value.val() === '';

                this.display
                    .val(empty ? this.options['emptyText'] : item.text)
                    .toggleClass('ui-dropdown-display-empty', empty);

                this._updScrollPosition(option);
            }

            return option;
        },

        expand: function () {
            if (this.dropDownContainer.is(':visible')) return;
            var inverted = this._position(this.dropDownContainer);

            this.dropDownContainer
                .toggleClass('ui-dropdown-inverted', inverted)
                .show({
                    effect: 'slide',
                    direction: inverted ? 'down' : 'up',
                    duration: this.options['duration']
                });

            this._updScrollPosition();
        },

        collapse: function () {
            if (!this.dropDownContainer.is(':visible')) return;
            var inverted = this.dropDownContainer
                               .is('.ui-dropdown-inverted')
                self = this;

            this.dropDownContainer
                .hide({
                    effect: 'slide',
                    direction: inverted ? 'down' : 'up',
                    duration: this.options['duration']
                });

            this.items
                .filter('.ui-state-hover')
                .removeClass('ui-state-hover');

            this.clearFilter();
        },

        toggle: function () {
            var vis = this.dropDownContainer.is(':visible');
            if (vis) this.collapse();
            else this.display.focus();
        },

        filter: function (value) {
            if (value.length === 0) {
                return this.clearFilter();
            }

            var pattern = this.options['filterEx'].replace('{0}', value);
            var options = this.options['filterOpt'];
            var re = new RegExp(pattern, options);

            var find =
                this.items
                    .filter(function (idx) {
                        return re.test($(this).text());
                    })
                    .show();

            if (find.length === 0) {
                this.display
                    .effect('highlight', { color: '#C6244A' }, 200);

                return null;
            }

            this.list
                .children()
                .not(find)
                .hide();

            this.list
                .children('.ui-state-hover')
                .removeClass('ui-state-hover');

            var currentValue = find
                .first()
                .addClass('ui-state-hover')
                .text();

            this.display
                .val(currentValue);

            this._setSelection(
                this.display[0],
                Math.min(value.length, currentValue.length),
                currentValue.length
            );

            this.currentFilter = value;
            this._updScrollPosition();

            return find;
        },

        clearFilter: function () {
            this.currentFilter = '';
            this.list
                .children()
                .show()
                .removeClass('ui-state-hover');

            this.display[0]
                .selectionStart = 0;

            this.display[0]
                .selectionEnd = 0;
        },

        /***********************************
        **     Helpers
        ***********************************/

        _position: function(elem) {
            elem.css({
                    visibility: 'hidden',
                    display: 'block',
                    width: this.container.outerWidth()
                });

            this._computeContainerSize();

            elem.position({
                my: 'left top',
                at: 'left bottom',
                of: this.container,
                collision: 'none flipfit',
                within: this.options['viewPort']
            });

            var inverted = this._isInverted();

            elem.css({
                    display: 'none',
                    visibility: ''
                });

            return inverted;
        },

        _isInverted: function() {
            var pos = this.dropDownContainer.position();
            var offset = this.container.offset();
            return offset.top - pos.top > 0;
        },

        _consumeSelect: function (el) {
            var data = [],
                ignore = this.options['ignoreEmptyOptions'],
                re = new RegExp(this.options['emptyOption'], 'i');

            el.children('option')
                .each(function () {
                    var opt = $(this);

                    if (re.test(opt.val()) && ignore) {
                        return;
                    }

                    data.push({
                        text: opt.text(),
                        value: opt.val(),
                        selected: opt.is(':selected'),
                        cls: opt.attr('class')
                    });
                });

            return data;
        },

        _buildMenu: function (data) {
            var self = this,
                items = [],
                el = null;

            if (this.options['allowEmpty']) {
                items.push(self._createItem({ text: '&nbsp;', value: '', selected: false }));
            }

            $.each(data, function (index, item) {
                items.push(self._createItem(item));
            });

            return items;
        },

        _createItem: function(menuItem) {
            return $('<li>', {
                'value': menuItem.value,
                'tabindex': -1,
                'data': { 'menu-item': menuItem },
                'class': (menuItem.selected ? 'ui-selected ' : '') + (menuItem.cls || ''),
                'html': menuItem.text,
                'on': {
                    mouseenter: function() { $(this).addClass('ui-state-hover'); },
                    mouseleave: function() { $(this).removeClass('ui-state-hover'); }
                },
                'prepend': menuItem.icon
                    ? $('<span>').appendClass('ui-icon')
                                 .appendClass(menuItem.icon)
                    : ''
            });
        },

        _computeContainerSize: function () {

            //We may not want all list items visible,
            //just include the height of the visible items
            var listSize = this.options['listSize'];
            var height =
                Math.ceil(this.list
                              .children()
                              .totalHeight(true, listSize));

            //Adjust the scroll container's height
            this.scrollContainer
                .height(height);

            if (this.otherValue) {
                //Add the other value input's height to the overall dropdown height
                height +=
                    this.otherValue
                        .parent()
                        .outerHeight(true);
            }

            this.dropDownContainer
                .height(height);

            this.scroll
                .tinyscrollbar_update('relative');
        },

        _addTrigger: function () {
            var fn = function (event) {
                var el = $(event.delegateTarget || event.target);
                if (!el.is('.ui-button')) return;
                el.toggleClass('ui-state-hover');
            };

            return $('<div>', {
                'class': 'ui-button ui-widget ui-state-default ui-dropdown-trigger',
                on: {
                    click: $.proxy(this.toggle, this),
                    mouseenter: fn,
                    mouseleave: fn
                },
                append: [$('<span>', { 'class': 'ui-icon ui-icon-triangle-1-s' })]
            });
        },

        _addOtherValue: function () {
            var othr = this.element.data('other');

            if (typeof othr == 'undefined' && this.options['other'] === false) {
                return false;
            }

            var node = $('<input>', {
                'type': 'text',
                'tabindex': -1,
                'class': 'ui-dropdown-othervalue ui-state-default ignore-validation',
                'placeholder': 'Other',
                'on': { keydown: $.proxy(this._onOtherKeyDown, this) },
                'data': {
                    'menu-item': {
                        text: othr,
                        value: othr,
                        selected: true
                    }
                }
            }).appendTo(this.dropDownContainer)
              .wrap('<div class="ui-dropdown-otherwrap">');

            if ($.validation) {
                node.rules({ required: false });
            }

            return node;
        },

        _addScrollbar: function (children) {
            return $('<div>', {
                css: {
                    position: 'relative',
                    width: '100%',
                    padding: '2px',
                    boxSizing: 'border-box'
                },
                append: [this.scroll = $('<div>', { 'class': 'tinyscrollbar' }).append(children)]
            }).appendTo(this.dropDownContainer);
        },

        _addInputs: function () {
            this.value = $('<input>', {
                'type': 'hidden',
                'name': this.name,
                'class': 'ui-dropdown-value',
                'on': {
                    change: $.proxy(this._onValueChanged, this),
                    validationrules: $.proxy(this._onValidationRules, this),
                    validationerror: $.proxy(this._onValidationError, this),
                    validationsuccess: $.proxy(this._onValidationSuccess, this)
                }
            });

            return this.display = $('<input>', {
                'type': 'text',
                'readonly': 'readonly',
                'class': 'ui-widget ui-widget-content ui-dropdown-display ignore-validation',
                'placeholder': this.options['emptyText'],
                'attr': {'autocomplete': 'off'},
                'css': {
                    width: '100%',
                    boxSizing: 'border-box',
                    height: '26px',
                    margin: '0px'
                },
                'on': {
                    focus: $.proxy(this._onFocus, this),
                    blur: $.proxy(this._onLostFocus, this),
                    keypress: $.proxy(this._onKeyPress, this)
                }
            });
        },

        _addContainer: function () {
            return $('<div>', {
                'class': 'ui-dropdown-container noSelect',
                'on': { keydown: $.proxy(this._onKeyDown, this) }
            });
        },

        _addDropDown: function () {
            return $('<div>', {
                'class': 'ui-dropdown-container-inner',
                'width': this.container.width()
            });
        },

        _addList: function () {
            return $('<ul>', {
                'class': 'ui-dropdown-list',
                'on': { click: $.proxy(this._onItemClicked, this) }
            });
        },

        _applyValidation: function (rules) {
            var validator = this._getFormValidator();
            if (!validator) return;

            try {
                this._injectElement();
                this.display
                    .rules('remove');
                this.display
                    .rules({ required: false });

                if (rules) {
                    this.value
                        .rules(rules);
                }
            } catch (e) {
                $.error(this.widgetName, e);
            }
        },

        _hasProperties: function (object) {
            for (var prop in object) {
                if (object.hasOwnProperty(prop)) {
                    return true;
                }
            }

            return false;
        },

        _getFormValidator: function () {
            return $(this.element[0].form)
                .data('validator');
        },

        _injectElement: function () {
            var validator = this._getFormValidator();
            var elementsSuper = $.validator.prototype.elements;
            var matches = elementsSuper.call(validator);
            var myElement = this.value;
            var display = this.display;

            if (!matches.is(myElement)) {
                //Inject our element
                $.validator.prototype.elements = function () {
                    var results = elementsSuper
                        .call(validator)
                        .add(myElement)
                        .not(display);

                    if (!display.is(':visible')) {
                        results = results.not(myElement);
                    }

                    return results;
                };
            }
        },

        _updScrollPosition: function (node) {
            var el = node || this.selected();
            if (el.length === 0) {
                this.scroll
                    .tinyscrollbar_update(0);

                return;
            }

            var max = this.scroll.find('.content').height()
                - this.scrollContainer.height();

            var top = el.position().top
                - (this.scrollContainer.height() / 2)
                + (el.outerHeight() / 2);

            top = Math.min(Math.max(top, 0), Math.abs(max));

            this.scroll
                .tinyscrollbar_update(top);
        },

        _setSelection: function (input, start, end) {
            input = $(input)[0];

            if (input.setSelectionRange) {
                //IE 9+
                input.setSelectionRange(start, end);
            } if (input.createTextRange) {
                //IE 8
                var range = input.createTextRange();
                range.moveStart('character', start);
                range.moveEnd('character', end);
                range.select();
            } else {
                //The rest of the world
                input.selectionStart = start;
                input.selectionEnd = end;
            }
        },

        /***********************************
        **     Events
        ***********************************/

        _onNotClicked: function(event) {
            var elem = $(event.target);

            if (!this.dropDownContainer.is(':visible') || this.dropDownContainer.find(elem).length > 0) {
                console.log('NotClicked ignored', this.value.prop('name'));
                return;
            }

            console.log('Not It!');
            this.collapse();
        },

        _onValueChanged: function (event) {
            var val = this.value.val();
            var selected = this.list.find('li[value="' + val + '"]');

            if (selected.length === 0 && this.otherValue) {
                selected = this.otherValue;
                this.otherValue.val(val);
                var tmp = selected.data('menu-item');
                tmp.text = val;
            }

            if (selected.length === 0) {
                return;
            }

            var data = selected.data('menu-item');
            this.selected(data);
            this.collapse();
        },

        _onKeyDown: function (event) {
            if (this.keyTraps.indexOf(event.which) == -1) return true;
            if (this.otherValue &&
                this.otherValue.is(event.target) &&
                event.which != 13 &&
                event.which != 27) return true;

            event.preventDefault();
            var open = this.list.is(':visible');
            var max = this.items.length;
            var size = this.options['listSize'];
            var opt = this.items
                .add(this.otherValue)
                .filter('.ui-state-hover:visible')
                .first();

            if (opt.length === 0) {
                opt = this.selected();
            }

            switch (event.which) {
                case 127:   //DEL
                    return this.clearFilter();
                case 27:    //ESC
                    return this.collapse();

                case 38: //Up
                    if (!opt.is('li') && open) return false;
                    if (opt.is('li') && opt.index() > 0 && opt.length > 0) {
                        if (open) {
                            opt = opt.prevAll(':visible:first');
                        }
                    } else {
                        opt = this.items.filter(':visible:last');
                    }

                    break;
                case 40: //Down
                    if (!opt.is('li') && open) return false;
                    if (opt.is('li') && opt.index() < max - 1 && opt.length > 0) {
                        if (open) {
                            opt = opt.nextAll(':visible:first');
                        }
                    } else {
                        opt = this.items.filter(':visible:first');
                    }


                    break;
                case 13: //Enter
                    if (open) {
                        if (opt.length > 0 && opt.val() !== '') {
                            this.selected(opt);
                        }

                        return this.collapse();
                    }

                    break;
                case 8: //Backspace
                    if (this.currentFilter.length > 0) {
                        return this.filter(this.currentFilter.substr(0, this.currentFilter.length - 1));
                    }

                    break;

                case 33: //PageUp
                    opt = this.items.eq(
                        Math.max(opt.index() - size, 0)
                    );

                    break;

                case 34: //PageDown
                    opt = this.items.eq(
                        Math.min(opt.index() + size, max - 1)
                    );

                    break;
            }

            this.items
                .filter('.ui-state-hover')
                .removeClass('ui-state-hover');

            if (!open) {
                this.expand();
            }

            opt.addClass('ui-state-hover');
            this._updScrollPosition(opt);
        },

        _onKeyPress: function (event) {
            if (event.which > 31 && event.which < 127) {
                this.filter(this.currentFilter + String.fromCharCode(event.which));
            }
        },

        _onOtherKeyDown: function (event) {
            switch (event.which) {
                case 13: //Enter
                case 9:  //Tab
                    //Update the other's data object
                    var data = this.otherValue.data('menu-item');
                    data.text = this.otherValue.val();
                    this.otherValue.data('menu-item', data);

                case 38: //Up
                case 40: //Down
                    event.preventDefault();
                    this._onKeyDown(event);
                    return;
            }

            this.items
                .filter('.ui-state-hover')
                .removeClass('ui-state-hover');

            this.otherValue
                .addClass('ui-state-hover');
        },

        _onItemClicked: function (event) {
            var element = $(event.target);
            if (!element.is('li')) return;

            event.preventDefault();
            var item = element.data('menu-item');
            if (!item) return;

            this.selected(item);
            this.collapse();
        },

        _onFocus: function(event) {
            if (!this.skipFocus) this.expand();
            this.skipFocus = false;
        },

        _onLostFocus: function (event) {
            var self = this;
            //Let the browser change focus, then we can see who's focused
            setTimeout(function() {
                var menuItem = self.dropDownContainer.find(':focus');
                if (menuItem.length > 0) return;
                self.collapse();
            }, 100);
        },

        _onValidationError: function (event, data) {
            var isError = this.value.is('.' + data.errorClass);
            this.display
                .toggleClass(data.errorClass, isError)
                .toggleClass(data.validClass, !isError);

            return false;
        },

        _onValidationSuccess: function (event, data) {
            var isError = this.value.is('.' + data.errorClass);
            this.display
                .toggleClass(data.errorClass, isError)
                .toggleClass(data.validClass, !isError);

            return false;
        },

        _onValidationRules: function (event, data) {
            if (data.command == 'add' || data.command == 'remove') {
                this._applyValidation();
            }
        }
    });

    //Adding events to the validation code.
    //This will allow us to update the display value on validation
    if ($.validator) {
        var highlight = $.validator.defaults.highlight;
        var unhighlight = $.validator.defaults.unhighlight;

        $.extend(true, $.validator.defaults, {
            ignore: $.validator.defaults.ignore + ',.ignore-validation',
            highlight: function (element, errorClass, validClass) {
                highlight(element, errorClass, validClass);
                var data = { errorClass: errorClass, validClass: validClass };
                $(element).trigger('validationerror', data);
            },
            unhighlight: function (element, errorClass, validClass) {
                unhighlight(element, errorClass, validClass);
                var data = { errorClass: errorClass, validClass: validClass };
                $(element).trigger('validationsuccess', data);
            }
        });

        if ($.fn.rules) {
            var rules = $.fn.rules;
            $.fn.rules = function (command, argument) {
                var ret = {};

                try {
                    ret = rules.call(this, command, argument);
                } catch(e) {
                }

                this.trigger('validationrules', { command: command, argument: argument });
                return ret;
            };
        }
    }
})(jQuery);

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
            filterOpt: 'i'
        },
        keyTraps: [127,27,38,40,13,8,33,34],
        currentFilter: '',

        // Set up the widget
        _create: function () {
            var self = this;
            this.wrap = $('<div>');
            this.name = this.element.attr('name');

            this.element
                .addClass('ui-dropdown-source');

            this.element.hide();

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

            this.element.wrap(this.wrap);
            this.wrap = this.element.parent();

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
                .removeAttr('name')
                .before(this.container);

            this.dropDownContainer = this._addDropDown()
                .appendTo(this.container);
            
            this.list = this._addList();
            this.scrollContainer = this._addScrollbar(this.list);
            this.otherValue = this._addOtherValue();

            //Initiate the scrollbar
            this.scroll
                .tinyscrollbar({
                    contentPadding: 0
                });

            this.trigger = this._addTrigger()
                .appendTo(this.container);

            //re-compute list items and size
            this.refresh();

            this.container
                .notClicked($.proxy(this.collapse, this));

            this.container
                .mousedown(function () {
                    self.mouseDown = true;
                });

            $(window)
                .mouseup(function () {
                    self.mouseDown = false;
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


            if (typeof item != 'undefined') {
                if (option.length > 0) {
                    option.removeClass('ui-selected')
                        .data('menu-item').selected = false;
                }

                if (item.length > 0) {
                    item = item.data('menu-item');
                } else if (item.length == 0) {
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

                var empty = this.value.val() == '';

                this.display
                    .val(empty ? this.options['emptyText'] : item.text)
                    .toggleClass('ui-dropdown-display-empty', empty);

                this._updScrollPosition(option);
            }

            return option;
        },

        expand: function () {
            if (this.dropDownContainer.is(':visible')) return;

            this.dropDownContainer
                .slideDown(120, $.proxy(this._computeContainerSize, this));

            this._updScrollPosition();
        },

        collapse: function () {
            if (!this.dropDownContainer.is(':visible')) return;

            this.dropDownContainer
                .slideUp(120);

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
            if (value.length == 0) {
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

            if (find.length == 0) {
                this.display
                    .effect('highlight', { color: '#C6244A' }, 200);

                $.debug('debug', this.widgetName, 'No matches');
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
            var items = [];

            if (this.options['allowEmpty']) {
                var el = $('<li>')
                    .data('menu-item', { text: '', value: '', selected: false })
                    .attr('value', '')
                    .append('&nbsp;')
                    .on({
                        mouseenter: function () { $(this).addClass('ui-state-hover'); },
                        mouseleave: function () { $(this).removeClass('ui-state-hover'); }
                    });

                items.push(el[0]);
            }

            $.each(data, function (index, item) {
                var el = $('<li>')
                    .data('menu-item', item)
                    .attr('value', item.value);

                if (item.icon) {
                    el.append(
                        $('<span>').appendClass('ui-icon')
                                   .appendClass(item.icon)
                    );
                }

                if (item.cls) el.addClass(item.cls);

                el.append(item.text);
                el.toggleClass('ui-selected', item.selected);
                el.on({
                    mouseenter: function () { $(this).addClass('ui-state-hover'); },
                    mouseleave: function () { $(this).removeClass('ui-state-hover'); }
                });

                items.push(el[0]);
            });

            return items;
        },

        _computeContainerSize: function () {

            //We may not want all list items visible,
            //just include the height of the visible items
            var listSize = this.options['listSize'];
            var height = this.list
                    .children()
                    .totalHeight(true, listSize);

            //Add the UL list margins & paddings
            height += this.list.outerHeight() -
                this.list.children().totalHeight(true);

            //Adjust the scroll container's height
            this.scrollContainer
                .height(height);

            if (this.otherValue) {
                //Add the other value input's height to the overall dropdown height
                height += this.otherValue.outerHeight() + 10;
            }

            this.dropDownContainer
                .height(height);

            this.scroll
                .find('.scrollbar')
                .width(10);

            this.scroll
                .tinyscrollbar_update('relative');
        },

        _addTrigger: function () {
            var fn = function (event) {
                var el = $(event.delegateTarget || event.target);
                if (!el.is('.ui-button')) return;
                el.toggleClass('ui-state-hover');
            };

            var btn = $('<div>', {
                'class': 'ui-button ui-widget ui-corner-all ui-state-default'
            }).css({
                position: 'absolute',
                top: '3px',
                right: '2px',
                bottom: '3px',
                width: '16px',
                borderRadius: '3px'
            }).on({
                click: $.proxy(this.toggle, this),
                mouseenter: fn, // function () { $(this).toggleClass('ui-state-hover', 'ui-state-default'); },
                mouseleave: fn //function () { $(this).toggleClass('ui-state-hover', 'ui-state-default'); }
            }).append(
                $('<span>', { 'class': 'ui-icon ui-icon-triangle-1-s' })
                    .css('margin-top', '1px')
            );

            return btn;
        },

        _addOtherValue: function () {
            var othr = this.element.data('other');

            if (typeof othr == 'undefined' && this.options['other'] === false) {
                return false;
            }

            var node = $('<input>', {
                type: 'text',
                tabindex: -1,
                'class': 'ui-dropdown-othervalue ui-widget ui-widget-content ui-corner-all ui-state-default ignore-validation',
                'placeholder': 'Other'
            });

            node.css({
                width: this.dropDownContainer.width() - 8
            })
                .on({
                    keydown: $.proxy(this._onOtherKeyDown, this),
                    focus: function () { $(this).addClass('ui-state-hover'); },
                    blur: $.proxy(this._onLostFocus, this)
                })
                .data('menu-item', {
                    text: othr,
                    value: othr,
                    selected: true
                })
                .appendTo(this.dropDownContainer);

            if ($.validation) {
                node.rules({ required: false });
            }

            return node;
        },

        _addScrollbar: function (children) {
            return $('<div>')
                .css({
                    position: 'relative',
                    width: '100%',
                    padding: '2px',
                    boxSizing: 'border-box'
                })
                .append(
                    this.scroll = $('<div>', { 'class': 'tinyscrollbar' }).append(children)
                )
                .appendTo(this.dropDownContainer);
        },

        _addInputs: function () {
            this.value = $('<input>', {
                type: 'hidden',
                name: this.name,
                'class': 'ui-dropdown-value'
            });

            this.value
                .on({
                    change: $.proxy(this._onValueChanged, this)
                });

            this.display = $('<input>', {
                type: 'text',
                readonly: 'readonly',
                'class': 'ui-widget ui-widget-content ui-corner-all ui-dropdown-display',
                placeholder: this.options['emptyText']
            });

            this.display
                .attr('autocomplete', 'off')
                .css({
                    width: '100%',
                    boxSizing: 'border-box',
                    height: '26px',
                    margin: '0px'
                })
                .on({
                    focus: $.proxy(this.expand, this),
                    blur: $.proxy(this._onLostFocus, this),
                    keydown: $.proxy(this._onKeyDown, this),
                    keypress: $.proxy(this._onKeyPress, this)
                });

            return this.display;
        },

        _addContainer: function () {
            return $('<div>', {
                'class': 'ui-dropdown-container noSelect'
            });
        },

        _addDropDown: function () {
            var el = $('<div>', {
                'class': 'ui-dropdown-container-inner'
            });

            return el
                .css({
                    width: '100%', //this.container.outerWidth(),
                    zIndex: 1000
                });
        },

        _addList: function () {
            var el = $('<ul>', {
                'class': 'ui-dropdown-list'
            });

            return el.on({
                click: $.proxy(this._onItemClicked, this)
            });
        },

        _applyValidation: function (rules) {
            var validator = this._getFormValidator();
            if (!validator) return;

            try {
                this._injectElement();
                
                if (rules) {
                    this.value
                        .rules(rules);
                }
            } catch (e) {
                $.debug('error', this.widgetName, e);
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

            if (!matches.is(myElement)) {
                //Inject our element
                $.validator.prototype.elements = function () {
                    var results = elementsSuper.call(validator).add(myElement);
                    console.log('Validator Elements', results);
                    return results;
                };
            }
        },
        
        _updScrollPosition: function (node) {
            var el = node || this.selected();
            if (el.length == 0) {
                this.scroll
                    .tinyscrollbar_update(0);

                return;
            }

            var max = this.scroll.find('.content').height()
                - this.scrollContainer.height();

            var top = el.position().top
                - (this.scrollContainer.height() / 2)
                + (el.outerHeight() / 2);

            top = Math.min(Math.max(top, 0), max);

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

        _onValueChanged: function (event) {
            var val = this.value.val();
            var selected = this.list.find('li[value="' + val + '"]');

            if (selected.length == 0 && this.otherValue) {
                selected = this.otherValue;
                this.otherValue.val(val);
                var tmp = selected.data('menu-item');
                tmp.text = val;
            }

            if (selected.length == 0) {
                return;
            }

            var data = selected.data('menu-item');
            this.selected(data);
            this.collapse();
        },

        _onKeyDown: function (event) {
            if (this.keyTraps.indexOf(event.which) == -1) return true;

            event.preventDefault();
            var open = this.list.is(':visible');
            var max = this.items.length;
            var size = this.options['listSize'];
            var opt = this.items
                .add(this.otherValue)
                .filter('.ui-state-hover:visible')
                .first();

            if (opt.length == 0) {
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
                        if (opt.length > 0 && opt.val() != '') {
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
            $.debug('debug', this.widgetName, 'Item Clicked', element);

            var item = element.data('menu-item');
            if (!item) return;

            this.selected(item);
            this.collapse();
        },

        _onLostFocus: function (event) {
            var el = $(event.relatedTarget);

            if ((this.mouseDown && !el.is('li')) || this.display.is(':focus')) {
                return;
            }

            var opt = this.items
                          .filter('.ui-state-hover');

            if (opt.length > 0) {
                this.selected(opt);
            }

            this.collapse();
        }
    });
})(jQuery);

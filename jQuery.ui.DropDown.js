(function ($) {
    $.widget("kodingsykosis.DropDown", {
        options: {
            other: false,
            listSize: 10,
            maxHeight: 350,
            emptyText: 'Choose Item',
            allowEmpty: true,
            ignoreEmptyOptions: true,
            emptyOption: '^$|^0$'
        },
        keyBlocks: [16, 9],

        // Set up the widget
        _create: function () {
            this.wrap = $('<div>');

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

            //We are assuming the widget is instantiated on a select node
            //Wrap the element in a div or set it to display none?
            this.container = this._addContainer()
                .append(this._addInputs());

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

            this.dropDownContainer
                .hide();

            if (this.options['rules'] && $.validator)
                this._applyValidation(this.options['rules']);
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

            if (this.otherValue) {
                this.items = this.items.add(this.otherValue);
            }

            if ($.validator) {
                var rules = this.element.rules();
                if (this._hasProperties(rules)) {
                    this.value
                    .rules(this.element.rules('remove'));
                }
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
            this.lastKeyisTab = false;
            this.dropDownContainer
                .slideDown(120, $.proxy(this._computeContainerSize, this));

            this._updScrollPosition();
        },

        collapse: function () {
            this.lastKeyisTab = false;

            this.dropDownContainer
                .slideUp(120);

            this.items
                .filter('.ui-state-hover')
                .removeClass('ui-state-hover');

            this.items
                .filter('.ui-state-nomousy')
                .removeClass('ui-state-nomousy');
        },

        toggle: function () {
            var vis = this.dropDownContainer.is(':visible');
            if (vis) this.collapse();
            else this.display.focus();
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
                        selected: opt.is(':selected')
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
                height += this.otherValue.outerHeight() + 6;
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
            var btn = $('<div>', {
                'class': 'ui-dropdown-trigger'
            }).css({
                position: 'absolute',
                top: '3px',
                right: '3px',
                bottom: '3px',
                width: '16px',
                borderRadius: '3px'
            }).on({
                click: $.proxy(this.toggle, this)
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
                'class': 'ui-dropdown-othervalue ignore-validation',
                'placeholder': 'Other',
                tabindex: -1
            });

            node.css({
                width: this.dropDownContainer.width() - 4,
                margin: '2px'
            })
                .on({
                    keydown: $.proxy(this._onOtherKeydown, this),
                    focus: function () { $(this).addClass('ui-state-hover'); }
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
                name: this.element.attr('name'),
                'class': 'ui-dropdown-value'
            });

            this.value
                .on({
                    change: $.proxy(this._onValueChanged, this)
                });

            this.display = $('<input>', {
                type: 'text',
                readonly: 'readonly',
                'class': 'ui-dropdown-display',
                placeholder: this.options['emptyText']
            });

            this.display
                .css({
                    width: '100%',
                    boxSizing: 'border-box',
                    height: '26px',
                    margin: '0px'
                })
                .on({
                    focus: $.proxy(this.expand, this),
                    blur: $.proxy(this._onLostFocus, this),
                    keydown: $.proxy(this._onKeydown, this)
                });

            return this.value.add(this.display);
        },

        _addContainer: function () {
            return $('<div>', {
                'class': 'ui-dropdown-container'
            }); //.width(this.element.width());
        },

        _addDropDown: function () {
            var el = $('<div>', {
                'class': 'ui-dropdown-container-inner'
            });

            return el
                .css({
                    width: this.container.outerWidth(),
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
            this._injectElement();

            this.value
                .on({
                    validationerror: $.proxy(this._onValidationError, this),
                    validationsuccess: $.proxy(this._onValidationSuccess, this)
                })
                .rules(rules);
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
            return this.element
                .parents('form')
                .first()
                .data('validator');
        },

        _injectElement: function () {
            var validator = this._getFormValidator();
            var builder = validator.elements;
            var matches = builder.call(validator);
            var myElement = this.value;

            if (!matches.is(myElement)) {
                //Inject our element
                validator.elements = function () {
                    var results = builder.call(validator).add(myElement);
                    return results;
                };
            }
        },

        _updScrollPosition: function (node) {
            var el = node || this.selected();
            if (el.length == 0) {
                this.scroll
                    .tinyscrollbar_update('relative');

                return;
            }

            var max = this.scroll.find('.content').height() - this.dropDownContainer.height();
            var top = el.position().top - (this.dropDownContainer.height() / 2)
                - (el.height() / 2);

            top = top < 0 ? 0 : (top > max ? max : top);

            if (max > this.options['maxHeight']) {
                this.scroll
                    .tinyscrollbar_update(top);
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

        _onValidationError: function (event, data) {
            var $el = $(event.target);

            if ($el.is(this.value)) {
                $el = this.display;
            }

            $el.addClass(data.errorClass).removeClass(data.validClass);
            return false;
        },

        _onValidationSuccess: function (event, data) {
            var $el = $(event.target);

            if ($el.is(this.value)) {
                $el = this.display;
            }

            $el.addClass(data.validClass).removeClass(data.errorClass);
            return false;
        },

        _onKeydown: function (event) {
            this.lastKeyisTab = event.which == 9;
            if (this.keyBlocks.indexOf(event.which) > -1) return;
            /*
            if (event.which == 9) { //Allow default behavior for tab key
            this.lastKeyisTab = true;
            return;
            }
            */
            event.preventDefault();
            $.debug('debug', this.widgetName, 'Keypress', event.which);
            var open = this.list.is(':visible');
            var opt = this.items.filter('.ui-state-hover');
            var max = this.items.length;
            //var nomousy = false;

            if (opt.length == 0) {
                opt = this.selected();
            }

            //this.lastKeyisTab = false;

            switch (event.which) {
                case 27:
                    this.collapse();
                    return;

                case 38: //Up
                    if (opt.index() > 0 && opt.length > 0) {
                        opt = opt.prev();
                    } else {
                        opt = this.items.last();
                    }
                    //nomousy = true;

                    break;
                case 40: //Down
                    if (opt.index() < max - 1 && opt.length > 0) {
                        opt = opt.next();
                    } else {
                        opt = this.items.first();
                    }

                    //nomousy = true;

                    break;
                //case 9: //Tab         
                case 32: //Space
                case 13: //Enter
                    if (open) {
                        if (opt.length > 0 && opt.val() != '') {
                            this.selected(opt);
                        }

                        this.collapse();
                        return;
                    }
                default:
                    opt = this.items
                        .first();

                    break;
            }

            this.items
                .filter('.ui-state-hover')
                .removeClass('ui-state-hover');
            /*
            this.items
            .filter('.ui-state-nomousy')
            .removeClass('ui-state-nomousy');
            */
            if (!open) {
                this.expand();
            }

            if (opt.is('input')) {
                opt.focus();
            } else if (this.otherValue) {
                this.display
                    .focus();
            }

            opt.addClass('ui-state-hover');
            /*
            if (nomousy) {
            opt.addClass('ui-state-nomousy');
            }
            */
            this._updScrollPosition(opt);
        },

        _onOtherKeydown: function (event) {
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
                    this._onKeydown(event);
                    return;
            }
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
            var opt = this.items.filter('.ui-state-hover');
            if (opt.length > 0) {
                this.selected(opt);
            }

            this.collapse();
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
                var data = { errorClass: errorClass, validClass: validClass };
                if ($(element).trigger('validationerror', data) != false) {
                    highlight(element, errorClass, validClass);
                }
            },
            unhighlight: function (element, errorClass, validClass) {
                var data = { errorClass: errorClass, validClass: validClass };
                if ($(element).trigger('validationsuccess', data) != false) {
                    unhighlight(element, errorClass, validClass);
                }
            }
        });
    }
})(jQuery);
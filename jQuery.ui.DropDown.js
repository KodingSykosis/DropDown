(function ($) {
    $.widget("ccic.DropDown", {
        options: {
            other: false,
            listSize: 10,
            maxHeight: 350
        },
        keyBlocks: [16],

        // Set up the widget
        _create: function () {
            this.element
                .addClass('ui-dropdown-source');

            //We are assuming the widget is instantiated on a select node
            //Wrap the element in a div or set it to display none?
            this.container = this._addContainer()
                .append(this._addInputs());

            //Swap the select element out for our dropdown
            this.element
                .removeAttr('name')
                .hide()
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

                if (item.length) {
                    item = item.data('menu-item');
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

                this.element
                    .val(item.value || item.text);

                this.display
                    .val(item.text);
            }

            return option;
        },

        expand: function () {
            this.dropDownContainer
                .slideDown(120, $.proxy(this._computeContainerSize, this));
        },

        collapse: function () {
            this.dropDownContainer
                .slideUp(120);
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
            var data = [];

            el.children('option')
                .each(function () {
                    var opt = $(this);
                    data.push({
                        text: opt.html(),
                        value: opt.val(),
                        selected: opt.is(':selected')
                    });
                });

            return data;
        },

        _buildMenu: function (data) {
            var items = [];

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
                    //click: $.proxy(this._onItemClicked, this),
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
                'class': 'ui-dropdown-othervalue',
                'placeholder': 'Other'
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

            this.display = $('<input>', {
                type: 'text',
                readonly: 'readonly',
                'class': 'ui-dropdown-display'
            });

            this.display
                .on({
                    focus: $.proxy(this.expand, this),
                    keydown: $.proxy(this._onKeydown, this)
                });

            return this.value.add(this.display);
        },

        _addContainer: function () {
            return $('<div>', {
                'class': 'ui-dropdown-container'
            }).width(this.element.width());
        },

        _addDropDown: function () {
            var el = $('<div>', {
                'class': 'ui-dropdown-container-inner'
            });

            return el
                .css({
                    width: this.container.outerWidth(),
                    zIndex: 100
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

        /***********************************
        **     Events
        ***********************************/

        _onKeydown: function (event) {
            if (this.keyBlocks.indexOf(event.which) > -1) return;

            if (event.which != 9) //Allow default behavior for tab key
                event.preventDefault();

            $.debug('debug', this.widgetName, 'Keypress', event.which);
            var open = this.list.is(':visible');
            var opt = open ? this.items.filter('.ui-state-hover') : this.selected();
            var max = this.items.length;

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

                    break;
                case 40: //Down
                    if (opt.index() < max - 1 && opt.length > 0) {
                        opt = opt.next();
                    } else {
                        opt = this.items.first();
                    }

                    break;
                case 9: //Tab
                case 32: //Space
                case 13: //Enter
                    if (open) {
                        this.selected(opt);
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
        }
    });
})(jQuery);
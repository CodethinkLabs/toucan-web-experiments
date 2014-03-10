(function (toucan, $, undefined) {
    
    toucan.Toucan = function (url) {
        this.url = url;
        this.service = new consonant.Service(this.url);
    };
    var Toucan = toucan.Toucan;

    toucan.Toucan.prototype = function () {
        var _updateLane = function (this_, lane, index, total) {
            var options = {lane: lane, index: index, total: total};
            var element = $('#' + lane.uuid).first();
            if (element.size() === 0) {
                // create the lane element
                element = $('<div></div>').appendTo('.kanban-board');
                element.lane(options);
            } else {
                // update the lane element
                element.data('toucan-lane').option(options);
            }
        };

        var _updateCard = function (this_, card, objects) {
            // resolve the assignees of the cards
            var assignees = [];
            if (card.get('assignees')) {
                var references = card.get('assignees');
                var uuids = $.map(references, function (r) { return r.uuid; });
                var assignees = $.grep(objects.user, function (user) {
                    return $.inArray(user.uuid, uuids) >= 0;
                });
            }

            var options = {card: card, assignees: assignees};
            var element = $('#' + card.uuid).first();
            if (element.size() === 0) {
                // create the card element
                var lane_element = $('#' + card.get('lane').uuid);
                var lane_cards = $(lane_element).find('.kanban-lane-cards');
                element = $('<li></li>').appendTo(lane_cards);
                element.card(options);
            } else {
                // update the card element
                element.data('toucan-card').option(options);
            }
        };

        var refresh = function (refname, callback) {
            var this_ = this;
            this.service.ref(refname, function (ref) {
                ref.head.objects(function (objects) {
                    // look up the default view
                    var view = $.grep(objects.view, function (view) {
                        return view.get('name') === 'Default';
                    })[0];

                    // update lanes
                    $.each(view.get('lanes'), function (index, reference) {
                        var lane = $.grep(objects.lane, function (lane) {
                            return lane.uuid == reference.uuid;
                        })[0];
                        _updateLane(this_, lane, index, view.get('lanes').length);
                    });

                    // update cards
                    $.each(objects.card, function (index, card) {
                        _updateCard(this_, card, objects);
                    });
                    
                    callback(ref.head);
                });
            });
        };

        return {
            refresh: refresh,
        };
    }();

    $.widget('toucan.lane', {
        _create: function () {
            this.element.addClass('kanban-lane');

            var box = $('<div></div>').appendTo(this.element);
            box.addClass('panel panel-default');
            box.css('background-color', function () {
                var r = Math.round(200 + Math.random() * 55);
                var g = Math.round(200 + Math.random() * 55);
                var b = Math.round(200 + Math.random() * 55);
                return '#' + (r + 256 * g + 65536 * b).toString(16);
            });

            this.title = $('<div></div>').appendTo(box);
            this.title.addClass('panel-heading kanban-lane-title');

            this.cards = $('<ul></ul>').appendTo(box);
            this.cards.addClass('list-group kanban-lane-cards');

            this.lane = this.options.lane;
            this._update();
        },

        _setOption: function (key, value) {
            if (key === 'lane') {
                this.lane = value;
                this._update();
            }
        },

        _update: function () {
            // update element ID
            this.element.attr('id', this.lane.uuid);

            // update lane title
            this.title.text(this.lane.get('name'));

            // update card counter
            var card_count = 0;
            if (this.lane.get('cards')) {
                card_count = this.lane.get('cards').length;
            }
            var counter = $('<span></span>').appendTo(this.title);
            counter.addClass('badge');
            counter.text(card_count);

            // update lane position and dimensions
            var index = this.options.index;
            var total = this.options.total;
            var distance = 1.0;
            var width = (100.0 - distance * total) / total;
            var offset = 100.0 + index * (width + distance);
            this.element.css('left', offset + '%');
            this.element.css('width', width + '%');
        },
    });

    $.widget('toucan.card', {
        _create: function () {
            this.element.addClass('list-group-item kanban-card');

            var box = $('<div></div>').appendTo(this.element);
            box.addClass('panel panel-default panel-xs');

            this.number = $('<div></div>').appendTo(box);
            this.number.addClass('panel-heading');

            this.lane = $('<div></div>').appendTo(box);
            this.lane.addClass('badge');

            this.title = $('<span></span>').appendTo(box);
            this.title.addClass('description');

            this.avatars = $('<div></div>').appendTo(box);
            this.avatars.addClass('kanban-card-avatars');

            this.card = this.options.card;
            this._update();
        },

        _setOption: function (key, value) {
            if (key === 'card') {
                this.card = value;
            } else if (key == 'assignees') {
                this.assignees = value;
            }
            this._update();
        },

        _update: function () {
            // update element ID
            this.element.attr('id', this.card.uuid);

            // update the card number
            this.number.text(this.card.uuid.substring(0, 7));

            // look up the lane element for the card
            var lane_element = $('#' + this.card.get('lane').uuid);
            var lane = lane_element.data('toucan-lane').option('lane');

            // move the card to its (new) lane
            lane_element.find('.kanban-lane-cards').append(this.element);

            // update the lane badge
            this.lane.text(lane.get('name'));

            // update the card title
            this.title.text(this.card.get('title'));

            // update avatars
            this.avatars.empty();
            if (this.assignees) {
                var this_ = this;
                $.each(this.assignees, function (index, user) {
                    var image = this_.avatars.append('<img></img>').children().last();
                    image.addClass('img-rounded');
                    image.attr('src', user.get('avatar'));
                    image.attr('alt', user.get('name'));
                    image.attr('title', user.get('name'));
                });
            }
        },
    });
} (window.toucan = window.toucan || {}, jQuery));

(function (toucan, $, undefined) {
    
    toucan.Toucan = function (url) {
        this.url = url;
        this.service = new consonant.Service(this.url);
        this.ref = null;
        this.objects = {};
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

        var getObject = function (klass, property, value) {
            if (klass in this.objects) {
                var klass_objects = this.objects[klass];
                var matches = $.grep(klass_objects, function (object) {
                    return object.get(property) === value;
                });
                if (matches.length >= 0) {
                    return matches[0];
                } else {
                    return null;
                }
            } else {
                return null;
            }
        };

        var keepUpdated = function () {
            var this_ = this;
            this.refresh('master', function (commit) {
                setTimeout(function () {
                    this_.keepUpdated();
                }, 500);
            });
        };

        var refresh = function (refname, callback) {
            var this_ = this;
            this.service.ref(refname, function (ref) {
                this_.ref = ref;
                ref.head.objects(function (objects) {
                    this_.objects = objects;

                    // look up the default view
                    var view = this_.getObject('view', 'name', 'Default');

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

        var resolveReferences = function (references, klass) {
            var this_ = this;
            var matches = $.map(references, function (reference) {
                return $.grep(this_.objects[klass], function (object) {
                    return object.uuid === reference.uuid;
                });
            });
            return [].concat.apply([], matches);
        };

        return {
            getObject: getObject,
            keepUpdated: keepUpdated,
            refresh: refresh,
            resolveReferences: resolveReferences,
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

            this._update(this.options.lane);
        },

        _setOption: function (key, value) {
            if (key === 'lane') {
                this._update(value);
            }
        },

        _update: function (lane) {
            // remember the new lane
            this.lane = lane;

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

    /**
     * Methods related to the create card dialog.
     */
    $(document).ready(function () {
        $('#create-card').on('show.bs.modal', function (e) {
            // look up the default view and its lanes
            var view = toucan.instance.getObject('view', 'name', 'Default');
            var lanes = toucan.instance.resolveReferences(view.get('lanes'), 'lane');

            // fill in potential lanes for the new card
            $('#create-card-lane').empty();
            $.each(lanes, function (index, lane) {
                var option = $('<option></option>').appendTo('#create-card-lane');
                option.attr('value', lane.uuid);
                option.text(lane.get('name'));
            });

            // fill in potential reasons for the new card
            $('#create-card-reason').empty();
            $.each(toucan.instance.objects.reason, function (index, reason) {
                var option = $('<option></option>').appendTo('#create-card-reason');
                option.attr('value', reason.uuid);
                option.text(reason.get('name'));
            });

            // fill in potential milestones for the new card
            $('#create-card-milestone').empty();
            $('#create-card-milestone').append('<option>- none -</option>');
            $.each(toucan.instance.objects.milestone, function (index, milestone) {
                var option = $('<option></option>').appendTo('#create-card-milestone');
                option.attr('value', milestone.uuid);
                option.text(milestone.get('name'));
            });

            // fill in potential assignees for the new card
            $('#create-card-assignees').empty();
            $.each(toucan.instance.objects.user, function (index, user) {
                var option = $('<option></option>').appendTo('#create-card-assignees');
                option.attr('value', user.uuid);
                option.text(user.get('name'));
            });
        });

        $('#create-card .btn-primary').click(function () {
        });
    });

    /**
     * Function to initialise toucan.ui and connect to a service.
     */
    toucan.connect = function (url) {
        toucan.instance = new toucan.Toucan(url);
        return toucan.instance;
    };

} (window.toucan = window.toucan || {}, jQuery));

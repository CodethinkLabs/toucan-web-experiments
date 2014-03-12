(function (toucan, $, undefined) {

    toucan.Toucan = function (url) {
        this.url = url;
        this.service = new consonant.Service(this.url);
        this.ref = null;
        this.objects = {};
        this.user = null;
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
            console.log('update card', card.uuid);

            // resolve the card's lane
            var lane = $.grep(objects.lane, function (lane) {
                return lane.uuid == card.get('lane').uuid;
            })[0];

            console.log('set lane to', lane.get('name'));

            // determine card's index in the lane
            var index = -1;
            $.each(lane.get('cards'), function (i, reference) {
                if (reference.uuid == card.uuid) {
                    index = i;
                }
            });
            console.log('index is', index);

            // resolve the assignees of the cards
            var assignees = [];
            if (card.get('assignees')) {
                var references = card.get('assignees');
                var uuids = $.map(references, function (r) { return r.uuid; });
                assignees = $.grep(objects.user, function (user) {
                    return $.inArray(user.uuid, uuids) >= 0;
                });
            }

            var options = {
                'card': card,
                'index': index,
                'lane': lane,
                'assignees': assignees,
            };
            var element = $('#' + card.uuid).first();
            if (element.size() === 0) {
                // create the card element
                var lane_element = $('#' + lane.uuid);
                var lane_cards = $(lane_element).find('.kanban-lane-cards');
                element = $('<li></li>').appendTo(lane_cards);
                element.card(options);
            } else {
                // update the card element
                element.data('toucan-card').option(options);
            }
        };

        var getObject = function (klass, property_or_uuid, value) {
            var klass_objects = this.objects[klass];
            var matches = [];
            if (arguments.length == 2) {
                matches = $.grep(klass_objects, function (object) {
                    return object.uuid == property_or_uuid;
                });
            } else {
                matches = $.grep(klass_objects, function (object) {
                    return object.get(property_or_uuid) === value;
                });
            }
            if (matches.length >= 0) {
                return matches[0];
            } else {
                return null;
            }
        };

        var keepUpdated = function () {
            var this_ = this;
            this.refresh('HEAD', function (commit) {
                setTimeout(function () {
                    this_.keepUpdated();
                }, 500);
            });
        };

        var moveCard = function (card_element, lane_element, index) {
            // obtain card, old lane and new lane
            var card = card_element.data('toucan-card').option('card');
            var old_lane = card_element.data('toucan-card').option('lane');
            var new_lane = lane_element.data('toucan-lane').option('lane');

            console.log('move card', card.uuid, card.get('title'));
            console.log('from ', old_lane.get('name'));
            console.log('to ', new_lane.get('name'));
            console.log('new index', index);

            var service = toucan.instance.service;
            var ref = toucan.instance.ref;

            // create a transaction based on the current commit
            var transaction = new consonant.Transaction(service);
            transaction.begin(ref.head.sha1);

            var updated_card = transaction.update(card);
            updated_card.set('lane', { uuid: new_lane.uuid });

            var updated_old_lane = transaction.update(old_lane);
            updated_old_lane.remove('cards', card);

            var updated_new_lane = null;
            if (old_lane === new_lane) {
                updated_new_lane = updated_old_lane;
            } else {
                updated_new_lane = transaction.update(new_lane);
            }
            updated_new_lane.insert('cards', index, card);

            console.log(transaction.data());

            // submit the transaction
            var author = toucan.instance.user.get('name') +
                         '<' + toucan.instance.user.get('email') + '>';
            var message = 'Move card';
            transaction.commit('HEAD', author, message, function () {
                console.log('card moved');
            });
        };

        var refresh = function (refname, callback) {
            var this_ = this;
            this.service.ref(refname, function (ref) {
                if (!this_.ref || this_.ref.head.sha1 != ref.head.sha1) {
                    this_.ref = ref;

                    console.log('ref changed from', this_.ref.head.sha1, 'to', ref.head.sha1);

                    ref.head.objects(function (objects) {
                        this_.objects = objects;
                        this_.user = this_.getObject('user', 'email',
                                                     'jannis.pohlmann@codethink.co.uk');

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

                        // make cards sortable
                        $('.kanban-lane-cards').sortable({
                            connectWith: '.kanban-lane-cards',
                            placeholder: 'kanban-card-placeholder',
                            forcePlaceholderSize: true,
                            stop: function (event, ui) {
                                var card_element = ui.item;
                                var lane_element = card_element.parentsUntil('.kanban-board', '.kanban-lane');
                                var index = lane_element.find('.kanban-lane-cards').children().index(card_element);
                                console.log('index', index);
                                this_.moveCard(card_element, lane_element, index);
                            },
                            out: function (event, ui) {
                                // TODO
                            },
                        }).disableSelection();
                    });
                }

                if (callback) {
                  callback(ref.head);
                }
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
            moveCard: moveCard,
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

            this._update();
        },

        _setOptions: function (options) {
            this._super(options);
            this._update();
        },

        _update: function () {
            var lane = this.options.lane;
            var index = this.options.index;
            var total = this.options.total;

            // update element ID
            this.element.attr('id', lane.uuid);

            // update lane title
            this.title.text(lane.get('name'));

            // update card counter
            var card_count = 0;
            if (lane.get('cards')) {
                card_count = lane.get('cards').length;
            }
            var counter = $('<span></span>').appendTo(this.title);
            counter.addClass('badge');
            counter.text(card_count);

            // update lane position and dimensions
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

            this.lane_badge = $('<div></div>').appendTo(box);
            this.lane_badge.addClass('badge');

            this.title = $('<span></span>').appendTo(box);
            this.title.addClass('description');

            this.avatars = $('<div></div>').appendTo(box);
            this.avatars.addClass('kanban-card-avatars');

            this._update();
        },

        _setOptions: function (options) {
            this._super(options);
            this._update();
        },

        _update: function () {
            var card = this.options.card;
            var lane = this.options.lane;
            var assignees = this.options.assignees;
            var index = this.options.index;

            // update element ID
            this.element.attr('id', card.uuid);

            // update the card number
            this.number.text(card.uuid.substring(0, 7));

            console.log('move card widget to lane', lane.get('name'));

            // look up the lane element for the card
            var lane_element = $('#' + lane.uuid);

            // move the card to its (new) lane
            lane_element.find('.kanban-lane-cards').children().eq(index).after(this.element);

            // update the lane badge
            this.lane_badge.text(lane.get('name'));

            // update the card title
            this.title.text(card.get('title'));

            // update avatars
            this.avatars.empty();
            if (assignees) {
                var this_ = this;
                $.each(assignees, function (index, user) {
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
            $('#create-card-milestone').append('<option value="null">- none -</option>');
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
            var service = toucan.instance.service;
            var ref = toucan.instance.ref;

            // create a transaction based on the current commit
            var transaction = new consonant.Transaction(service);
            transaction.begin(ref.head.sha1);

            // create a new card
            var card = transaction.create('card');
            card.set('title', $('#create-card-title').val());
            card.set('description', $('#create-card-description').text());
            card.set('lane', { uuid: $('#create-card-lane').val() });
            card.set('reason', { uuid: $('#create-card-reason').val() });
            card.set('creator', { uuid: toucan.instance.user.uuid });

            // optionally set card's milestone
            var milestone = $('#create-card-milestone').val();
            if (milestone != 'null') {
                card.set('milestone', { uuid: milestone });
            }

            // optionally add assignees of the card
            var assignees = $('#create-card-assignees').val();
            if (assignees) {
                $.each(assignees, function (index, assignee) {
                    card.append('assignees', { uuid: assignee });
                });
            }

            // resolve the selected target lane
            var lane_uuid = $('#create-card-lane').val();
            var lane = toucan.instance.getObject('lane', lane_uuid);

            // update the lane and prepend the card to it
            var updated_lane = transaction.update(lane);
            updated_lane.prepend('cards', card);
            
            // submit the transaction
            var author = toucan.instance.user.get('name') +
                         '<' + toucan.instance.user.get('email') + '>';
            var message = 'Create a new card';
            transaction.commit('HEAD', author, message, function () {
                console.log('created', arguments);
            });
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

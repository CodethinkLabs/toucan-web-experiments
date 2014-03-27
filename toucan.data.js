$(function () {

    Backbone.sync = function (method, model, options) {
        console.log(method, model, options);
        switch (method) {
            case "read": {
                $.getJSON('http://localhost:8989/classes/view/objects', function (data) {
                    options.success([].concat([], data));
                });
            }
        }
    };

    var ToucanView = Backbone.Model.extend({
        parse: function (response, options) {
            return response;
        },
    });

    var ToucanViewView = Backbone.View.extend({
        tagName: 'button',

        events: {
            'click': 'clicked',
        },

        initialize: function () {
        },

        render: function () {
            this.$el.attr('id', this.model.get('uuid'));
            this.$el.attr('href', '#');
            this.$el.text(this.model.get('properties').name);
            return this;
        },

        clicked: function (e) {
            console.log(e);
        },
    });

    var ToucanViewCollection = Backbone.Collection.extend({
        model: ToucanView,
    });

    var ToucanViews = new ToucanViewCollection();

    var ToucanBoard = Backbone.View.extend({
        el: $('#toucan-board'),

        initialize: function () {
            this.listenTo(ToucanViews, 'add', this.addView);
            this.listenTo(ToucanViews, 'reset', this.resetViews);
            this.listenTo(ToucanViews, 'all', this.render);

            ToucanViews.fetch({timeout: 1000});
        },

        render: function () {
            console.log('render');
        },

        addView: function (view) {
            console.log('add view');

            var view_ = new ToucanViewView({model: view});
            this.$('#toucan-view-nav').append(view_.render().el);
        },

        resetViews: function () {
            console.log('reset views');
        },
    });

    var Toucan = new ToucanBoard();

});

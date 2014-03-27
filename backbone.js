(function (toucan, $, undefined) {

    /**
     * Initialise and connect to Consonant
     */
    toucan.service = new consonant.Service('http://localhost:8989');



    /**
     * Main Toucan app
     */
    toucan.app = new Backbone.Marionette.Application();



    /**
     * Define app regions
     */
    toucan.app.addRegions({
        main: '#body',
    });



    /**
     * Start the app
     */
    toucan.app.start();



    /**
     * Consonant adapter
     */

    Backbone.sync = function (method, model, options) {
        if (!options) options = {};

        switch (method) {
            case 'read': {
                switch (model.url) {
                    case 'refs':
                        toucan.service.refs(function (refs) {
                            var result = $.map(refs, function (ref, name) {
                                ref.name = name;
                                return ref;
                            });
                            options.success(result);
                        });
                        break;
                    case 'views':
                        console.log(options.ref.get('head'));
                        break;
                }
            }
        }
    };



    /**
     * Models & collections
     */

    toucan.models = {};
    toucan.collections = {};

    toucan.models.Ref = Backbone.Model.extend({
        idAttribute: 'name',
    });

    toucan.collections.Refs = Backbone.Collection.extend({
        model: toucan.models.Ref,
        url: 'refs'
    });

    toucan.models.View = Backbone.Model.extend({
        idAttribute: 'uuid',
    });

    toucan.collections.Views = Backbone.Collection.extend({
        model: toucan.models.View,
        url: 'views',
    });
    
    
    /**
     * Views
     */

    toucan.views = {};
    toucan.layouts = {};

    toucan.views.RefView = Backbone.Marionette.ItemView.extend({
        tagName: 'li',
        template: _.template($('#ref-template').html()),
    });

    toucan.views.ViewItemView = Backbone.Marionette.ItemView.extend({
        tagName: 'li',
        template: _.template($('#view-item-template').html()),
    });

    toucan.views.ViewsView = Backbone.Marionette.CollectionView.extend({
        tagName: 'ul',
        itemView: toucan.views.ViewItemView,
    });

    toucan.views.RefsView = Backbone.Marionette.CollectionView.extend({
        tagName: 'ul',
        itemView: toucan.views.RefView,
    });

    toucan.layouts.RefLayout = Backbone.Marionette.Layout.extend({
        template: '#ref-layout',
        regions: {
            content: '#content',
        },
    });

    toucan.layouts.RefsLayout = Backbone.Marionette.Layout.extend({
        template: '#refs-layout',
        regions: {
            content: '#content'
        },
    });


    /**
     * Routes
     */
    
    toucan.Router = Backbone.Router.extend({
        routes: {
            '':          'refs',
            'refs/:ref': 'ref',
        },
    
        refs: function () {
            var refs = new toucan.collections.Refs();
            setInterval(function() { refs.fetch(); }, 500);

            var layout = new toucan.layouts.RefsLayout();
            layout.render();
            toucan.app.main.show(layout);

            var view = new toucan.views.RefsView({
                collection: refs,
                el: '#content',
            });
            layout.content.show(view);
        },
    
        ref: function (name) {
            var ref = new toucan.models.Ref({'id': name});
            ref.fetch();

            var views = new toucan.collections.Views();
            setInterval(function() { views.fetch({ ref: ref }); }, 500);

            var layout = new toucan.layouts.RefLayout();
            layout.render();
            toucan.app.main.show(layout);

            var view = new toucan.views.ViewsView({
                collection: views,
                el: '#content',
            });
            layout.content.show(view);
        },
    });
    
    $(document).ready(function () {
        var router = new toucan.Router();
        
        Backbone.history.start({
            pushState: false,
            root: document.location.pathname,
        });
    });

    $(document).on('click', 'a', function (evt) {
        var href = $(this).attr('href');
        evt.preventDefault();
        Backbone.history.navigate(href, true);
    });

} (window.toucan = window.toucan || {}, jQuery));

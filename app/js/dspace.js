$.domReady(function () {

  /*
   * Display basemap with UI
   */

  var globalOptions = {

    tileSet: {
        tilejson: '1.0.0',
        scheme: 'zxy',
        tiles: ['http://dspace.ruebezahl.cc:8888/v2/DSpace-tactical/{z}/{x}/{y}.png']
    },

    baseMap: {
      viewurl: 'http://localhost:3333/dev-data.json',
      //viewurl: '/places/_design/gc-utils/_list/geojson/all',
      //viewurl: 'http://dspace.ruebezahl.cc:5966/places/_design/gc-utils/_list/geojson/all',
    },

    geolat:  48.115293,
    geolon:  11.60218,
    minZoom: 13,
    maxZoom: 17,
    defaultZoom: 12
  };

  window.globalOptions = globalOptions;


  //get packages from ender
  var Backbone = require('backbone');
  Backbone.emulateHTTP = true;

  var _ = require('underscore');


  /*
   * single geographical featue of interest
   * with option to set from geoJSON feature object
   */
  var Feature = Backbone.Model.extend({
    initialize: function() {
      this.bind("all", this.setLatLon);
    },
    /*
     * helper method for setting lat: lon: attributes from coordinates array
     */
    setLatLon: function(){
      var g = this.get('geometry');
      if( 'coordinates' in g && g.coordinates.length == 2 ) {
      console.log(g.coordinates[1]);
        this.set({ lat: g.coordinates[1], lon: g.coordinates[0] });
      }
    },

    /*
     * receives feature element of geoJSON and set attributes from it
     */
    setGeoJsonFeature: function(geoJsonFeature){
      this.geoJsonFeature = geoJsonFeature;
      this.set({
        // array [lon, lon] from geoJSON Point
        coordinates: geoJsonFeature.geometry.coordinates,
        // object from geoJSON Feature
        properties: geoJsonFeature.properties
      });

      //this.setLatLon();
    }

  });


  /*
   * Add basic user model
   */
  var User = Backbone.Model.extend({

  });

  /*
   * main UI logic for global viewport
   */
  var Map = Backbone.View.extend({

    initialize: function(){
        /*
         * to use with map.world FIXME
         */
        this.world = this.options.world;
    },

    /*
     * renders main map
     * FIXME: add support for multiple overlays
     */
    render: function(){

      this.mm = this.renderBaseMap( {tileSet: globalOptions.tileSet });
      // Add User View
      //var user = new User();
      //var userView = new UserView({model: this.model });
      //var renderedTemplate = userView.render();
      //$('#keel').append(renderedTemplate);
      var featureBoxView = new FeatureBoxView({collection: this.world.collection});
    },
    renderBaseMap: function( opts ){//{{{
      var mm = com.modestmaps;
      var modestmap = new mm.Map(document.getElementById('map'),
                                 new wax.mm.connector(opts.tileSet), null, [
                                   easey_handlers.DragHandler(),
                                   easey_handlers.TouchHandler(),
                                   easey_handlers.MouseWheelHandler(),
                                   easey_handlers.DoubleClickHandler()
                                 ]);

      // setup boundaries
      modestmap.setZoomRange(globalOptions.minZoom, globalOptions.maxZoom);

      // enable zoom control buttons
      wax.mm.zoomer (modestmap, globalOptions.tileSet).appendTo(modestmap.parent);

      // show and zoom map
      modestmap.setCenterZoom(new mm.Location(globalOptions.geolat, globalOptions.geolon), globalOptions.defaultZoom);

      modestmap.addCallback('drawn', function(m)
      {
      $('#zoom-indicator').html('ZOOM ' + m.getZoom().toString().substring(0,2));
      });
      return modestmap;
    },//}}}


    renderOverlay: function(){
      // Add Overlay-Feature-List
      var markerLayer = mapbox.markers.layer();

      var markerOptions = {
        className: 'marker-image',
        iconPath: 'icons/black-shield-a.png'
      };
      var that = this;
      markerLayer.factory(function(feature){
        var img = document.createElement('img');
        img.className = that.markerOptions.className;
        img.setAttribute('src', that.markerOptions.iconPath);
        return img;
      });


//      // render all
//      var featureBoxView = new featureBoxView({collection: map.featureCollection});
//      featureBoxView.render();

//      // display markers
//      markerLayer.features(map.featureCollection.features);
//      this.model.modestmap.addLayer(markerLayer).setExtent(markerLayer.extent());

    },
  });

  /*
   * UI element with information about feature
   */
  var FeatuerBoxItemView = Backbone.View.extend({
    className: 'overlay-feature-info',

    initialize: function(){
      _.bindAll(this, 'render');
      this.template = Handlebars.compile($('#overlay-feature-info-template').html());
    },

    render: function(){

      // get template data from model
      var templateData = this.model.toJSON();

      // add markerLetter passed from options
      templateData.markerLetter = this.options.markerLetter;

      $(this.el).html(this.template(templateData));
      return this.el;
    },

    events: {
            "click": "jumpToMarker"
    },

    // function for above click event to jump to a marker on the map
    jumpToMarker: function (event) {
      var coordinate = this.mm.locationCoordinate({
          lat: this.model.get('coordinates')[1]
        , lon: this.model.get('coordinates')[0]
      });

      // easey interaction library for modestmaps
      easey().map(this.mm)
      .to(coordinate)
      .zoom(this.maxZoomTo).optimal();
    }
  });


  /*
   * UI element with list of features
   */
  var FeatureBoxView = Backbone.View.extend({
    el: $('#overlay-feature-list'),
    initialize: function(){
      var self = this;
      this.collection.on( 'reset', function( event, data ){
console.log( {event: event, data: data });
        self.render( );
      });
    },

    render: function(){//{{{
console.log( 'onall' );
      var that = this;
      var letter = 97; // DEC value of ascii "a" for marker lettering

      /* Loop through each feature in the model
       * using underscore each. Also a good exanple
       * how to add more data to the view:
       *
       * The additionally passend markerLetter ends up in
       * the FeatuerBoxItemView as Options.markerLetter.
       */
      _(this.collection.models).each(function(feature, i){
        var markerLetter = String.fromCharCode(letter+i);
        var featuerBoxItemView = new FeatuerBoxItemView({model: feature, markerLetter: markerLetter });
        var renderedTemplate = featuerBoxItemView.render();

        // here it gets added to DOM
        $(that.el).append(renderedTemplate);
      });
    },//}}}

    updateCollection: function( featureCollection ){
      // FIXME: this is because we didnt fix above 
      this.collection.update( featureCollection.features );
      this.render( );
    }

  });

   /*
   * UI element to show current position in botttom left
   */
  var UserView = Backbone.View.extend({
    id: 'userView',

    initialize: function(){
      _.bindAll(this, 'render');
      this.template = Handlebars.compile($('#userData-template').html());
    },

    render: function(){

      // temporary userData simulation, should come from user model in backbone
      var userDataJSON = this.model.toJSON();

      // add map center
      //FIXME:userDataJSON.mapCenter = this.model.modestmap.getCenter();

      $(this.el).html(this.template(userDataJSON));

      return this.el;
    }

  });
  var FeatureCollection = Backbone.Collection.extend({
      model: Feature,
      url: function(){
        return 'http://localhost:3333/dev-data.json'; },
      sync: function(){
        var self = this;
        reqwest({
          url: window.globalOptions.baseMap.viewurl,
          success: function( response ) {
console.log({ features: response });
            self.reset( response.features ); },
          failure: function( e ) {
            alert( e ); }
        });
      }
    });

  var World = Backbone.Model.extend({

    initialize: function(){
      /*
       * actual initialization and rendering of a Map
       */

      this.collection = new FeatureCollection( );
      this.collection.sync( );

      this.map = new Map({world: this});
      this.map.render();
    }
  });


  /*
   * creating single instance of Map model for global logic
   * for now attaching it to window
   */
  var world = new World();
  window.world = world; //FIXME: unbind!!


});


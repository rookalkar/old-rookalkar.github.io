    L.mapbox.accessToken = 'pk.eyJ1IjoiaW5pdGRvdCIsImEiOiJ3VkkxTldvIn0.7UPZ8q9fgBE70dMV7e0sLw';
    
    var new_map = L.mapbox.map('map2', 'initdot.ljplbdcp').setView([21, 80], 4.5)
    var map = L.mapbox.map('map1', 'initdot.ljplbdcp').setView([21,80], 4.5),
        // color reference from color brewer
        mapBrew = ["#edd997",'#E6B71E','#DA9C20','#CA8323','#B86B25','#A25626','#723122'],
        // population density range used for choropleth and legend
        mapRange = [ 4000, 3000, 2000, 1000, 500, 100, 0 ]; 

    // map legend for population density
    var legend = L.mapbox.legendControl( { position: "bottomleft" } ).addLegend( getLegendHTML() ).addTo(map),
        // popup for displaying state census details
        popup = new L.Popup({ autoPan: false, className: 'statsPopup' }),
        popup2 = new L.Popup({ autoPan: false, className: 'statsPopup' }),
        // layer for each state feature from geojson
        statesLayer,
        closeTooltip;
    
    var legend = L.mapbox.legendControl( { position: "bottomleft" } ).addLegend( getLegendHTML() ).addTo(new_map)
    
    map.scrollWheelZoom.disable();
    new_map.scrollWheelZoom.disable();
    
    // fetch the state geojson data
    d3.json( "IND_adm1.geojson", function (statesData) {
        var passvalue;
        statesLayer = L.geoJson(statesData,  {
            style: getStyle1,
            onEachFeature: onEachFeature
        }).addTo(map);
        
        statesLayer = L.geoJson(statesData,  {
            style: getStyle2,
            onEachFeature: onEachFeature
        }).addTo(new_map);
    } );

    function getStyle1(feature) {
        
        return {
            weight: 2,
            opacity: 0.1,
            color: 'black',
            fillOpacity: 0.85,
            fillColor: getDensityColor(datatotal.data2001[feature.properties.NAME_1.toUpperCase()].Total)
        };
    }
    
    function getStyle2(feature) {
        
        return {
            weight: 2,
            opacity: 0.1,
            color: 'black',
            fillOpacity: 0.85,
            fillColor: getDensityColor(datatotal.data2014[feature.properties.NAME_1.toUpperCase()].Total)
        };
    }

    // get color depending on population density value
    function getDensityColor(d) {
        var colors = Array.prototype.slice.call(mapBrew).reverse(), // creates a copy of the mapBrew array and reverses it
             range = mapRange;

        return  d > range[0] ? colors[0] :
                d > range[1] ? colors[1] :
                d > range[2] ? colors[2] :
                d > range[3] ? colors[3] :
                d > range[4] ? colors[4] :
                d > range[5] ? colors[5] :
                colors[6];
    }

    function onEachFeature(feature, layer) {
        layer.on({
            mousemove: mousemove,
            mouseout: mouseout,
            click: zoomToFeature
        });
    }

    function mousemove(e) {    
        var layer = e.target;

        var popupData2014 = {
            Total: datatotal.data2014[layer.feature.properties.NAME_1.toUpperCase()].Total,
            Year: datatotal.data2014[layer.feature.properties.NAME_1.toUpperCase()].Year,
            state: layer.feature.properties.NAME_1
        };
        
        var popupData2001 = {
            Total: datatotal.data2001[layer.feature.properties.NAME_1.toUpperCase()].Total,
            Year: datatotal.data2001[layer.feature.properties.NAME_1.toUpperCase()].Year,
            state: layer.feature.properties.NAME_1
        };

        popup.setLatLng(e.latlng);

        var popContent = L.mapbox.template( d3.select("#popup-template").text() , popupData2014 );
        popup.setContent( popContent );

        if (!popup._map) popup.openOn(new_map);
        window.clearTimeout(closeTooltip);
        
        popup2.setLatLng(e.latlng);

        var popContent2 = L.mapbox.template( d3.select("#popup-template").text() , popupData2001 );
        popup2.setContent( popContent2 );

        if (!popup2._map) popup2.openOn(map);
        window.clearTimeout(closeTooltip);

        if (!L.Browser.ie && !L.Browser.opera) {
            layer.bringToFront();
        }
    }
    function mouseout(e) {
       
        closeTooltip = window.setTimeout(function() {
            // ref: https://www.mapbox.com/mapbox.js/api/v2.1.6/l-map-class/
            map.closePopup( popup2 );
            new_map.closePopup( popup );// close only the state details popup
        }, 100);
    }

    function zoomToFeature(e) {
        map.fitBounds(e.target.getBounds());
    }

    function getLegendHTML() {
        var grades = Array.prototype.slice.call(mapRange).reverse(), // creates a copy of ranges and reverses it
            labels = [],
            from, to;
        // color reference from color brewer
        var brew = mapBrew;

        for (var i = 0; i < grades.length; i++) {
            from = grades[i];
            to = grades[i + 1];

            labels.push(
                '<i style="background:' + brew[i] + '"></i> ' +
                from + (to ? '&ndash;' + to : '+'));
        }

        //return '<span>Farmer Suicides per State/UT</span><br>' + labels.join('<br>');
        return labels.join('<br>');
    }

'use strict';

var mapStoreApp = angular.module('mapStoreApp', []);

mapStoreApp.controller('MapStoreCtrl', function($scope, $q) {
  $scope.numberOfMiles = 1000;
  $scope.locationText = "";
  $scope.mylocationInput = "Truckee, ca";
  $scope.browserGeoStatusText = "";
  $scope.storeMap = {};
  $scope.serviceStatusText = "";
  $scope.userMarker = [];
  $scope.storeMarkers = [];
  $scope.stores = storeList.getStores();
  $scope.outputDiv = "";

  var infoWindow = new google.maps.InfoWindow();
  var geocoder = new google.maps.Geocoder();
  var distanceService = new google.maps.DistanceMatrixService();
  var directionsService = new google.maps.DirectionsService();
  var directionsDisplay;

  $scope.openInfoWindow = function(e, selectedMarker){
      e.preventDefault();
      google.maps.event.trigger(selectedMarker, 'click');
  }

  $scope.getUserLocationClick = function() {
    console.log("::getUserLocationClick");
    getUserLocationFromMyLocationInputText();
  }

  $scope.findStoresWithinMilesClick = function() {
    getMarkersForStoresWithinDistanceFilter();
  }

  $scope.showDistancesClick = function() {
    showDistances();
  }
  $scope.resetMapClick = function() {
    init();
  }

  $scope.hasUserLocation = function() {
    if ($scope.userLat && $scope.userLng) {
      return true;
    }
    return false;
  }

  function init() {
    initializeMap();
    if (directionsDisplay) {
      directionsDisplay.setMap(null);
    }
    getMarkersForStores();
    getUserLocationFromBrowser();
  }
  init();

  function addStatusText(currentText) {
    $scope.serviceStatusText += currentText + " "
  }

  function getMarkersForStores() {
    for (var index = 0; index < $scope.stores.length; index++) {
      createStoreMarker($scope.stores[index]);
    }
  }

  function getMarkersForStoresWithinDistanceFilter() {
    if (!$scope.hasUserLocation) {
      return;
    }
    removeAllMarkers();
    var distance = 0;
    for (var index = 0; index < $scope.stores.length; index++) {
      distance = getDistance($scope.userLat, $scope.userLng, $scope.stores[index].lat, $scope.stores[index].lng);
      if (distance < $scope.numberOfMiles) {
        createStoreMarker($scope.stores[index]);
      }
    }
  }

  function createStoreMarker(store){
    console.log("::createmarker info.name info.lat info.lng " + store.name + " " + store.lat + " " + store.lng);
    var marker = new google.maps.Marker({
        map: $scope.storeMap,
        position: new google.maps.LatLng(store.lat, store.lng),
        title: store.name
    });
    marker.content = '<div class="infoWindowContent">' + store.streetaddress + '</div>';
    google.maps.event.addListener(marker, 'click', function(event){
        infoWindow.setContent('<h2>' + marker.title + '</h2>' + marker.content);
        infoWindow.open($scope.storeMap, marker);
        getDirectionsToStoreLocation(event);
    });

    $scope.storeMarkers.push(marker);
  }

  function getDirectionsToStoreLocation(event) {
    if (directionsDisplay) {
      directionsDisplay.setMap(null);
    }
    outputDiv.innerHTML = "";
    directionsDisplay = new google.maps.DirectionsRenderer();
    directionsDisplay.setPanel(document.getElementById("outputDiv"));
    directionsDisplay.setMap($scope.storeMap);
    var myLocation = new google.maps.LatLng($scope.userLat , $scope.userLng);
    var storeLocation = new google.maps.LatLng(event.latLng.lat(), event.latLng.lng());
    var request = {
      origin: myLocation,
      destination: storeLocation,
      travelMode: google.maps.TravelMode.DRIVING
    };
    directionsService.route(request, function(response, status) {
      if (status == google.maps.DirectionsStatus.OK) {
        directionsDisplay.setDirections(response);
      }
    });
  }

  function removeAllMarkers() {
    for (var i = $scope.storeMarkers.length - 1; i >= 0; i--){
      $scope.storeMarkers[i].setMap(null);
    }
  }

  function getUserLocationFromMyLocationInputText() {
    var address = $scope.mylocationInput;
    getLocationFromAddress(address)
    .then(function(result) {
      var latLng = result[0];
      $scope.userLat = latLng.lat();
      $scope.userLng = latLng.lng();
      $scope.locationText = address;
      createUserMarker();
    }, function (errorReason) {
      alert("failed to get location from address " + address);
    });
  }

  function getLocationFromAddress(address) {
    var deferred = $q.defer();
    geocoder.geocode({'address': address}, function(results, status) {
      if(status === google.maps.GeocoderStatus.OK) {
        return deferred.resolve([results[0].geometry.location,]);
      }
      deferred.reject();
    });
    return deferred.promise;
  }

  function getUserLocationFromBrowser() {
    console.log("::getUserLocation");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        $scope.$apply(function() {
          $scope.userLat = position.coords.latitude;
          $scope.userLng = position.coords.longitude;
          console.log($scope.userLat.toString() + ', ' + $scope.userLng);
          getAddressForUserLatLng()
          .then(function(result) {
            var address = result;
            $scope.locationText = address;
            createUserMarker();
            }, function (errorReason) {
              $scope.browserGeoStatusText = 'Unable to get user location from browser. Error reason: ' + errorReason;
          });
        });
      }, function(error) {
        $scope.browserGeoStatusText = 'Unable to get user location from browser. Error code: ' + error.code;
      },{timeout:5000});
    }else{
      $scope.browserGeoStatusText = 'Unable to get user location from browser. No geolocation support';
    }
  }

  function createUserMarker(){
    for (var i = $scope.userMarker.length - 1; i >= 0; i--){
      $scope.userMarker[i].setMap(null);
      $scope.userMarker.pop();
    }

    var marker = new google.maps.Marker({
        id: 0,
        map: $scope.storeMap,
        position: new google.maps.LatLng($scope.userLat, $scope.userLng),
        title: "My Location",
        icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
    });
    marker.content = '<div class="infoWindowContent">"' + $scope.locationText + '</div>';
    google.maps.event.addListener(marker, 'click', function(){
        infoWindow.setContent('<h2>' + marker.title + '</h2>' + marker.content);
        infoWindow.open($scope.storeMap, marker);
    });

    $scope.userMarker.push(marker);
  }

  function showDistances() {
    if (!$scope.hasUserLocation()) {
      return;
    }
    if (directionsDisplay) {
      directionsDisplay.setMap(null);
    }
    outputDiv.innerHTML = "<h2>Distance from: " + $scope.locationText + "</h2>";

    var distance = 0;
    for (var index = 0; index < $scope.stores.length; index++) {
      distance = getDistance($scope.userLat, $scope.userLng, $scope.stores[index].lat, $scope.stores[index].lng);
      outputDiv.innerHTML += "<div class=\"row\">" + "<div class=\"col-xs-6\">" + $scope.stores[index].name + "</div><div class=\"col-xs-6\">" + Math.floor(distance) + " miles</div></div>";
    }
  }

  function getAddressForUserLatLng() {
    var latlng = {lat: $scope.userLat, lng: $scope.userLng};
    var deferred = $q.defer();
    geocoder.geocode({'location': latlng}, function(results, status) {
      if(status === google.maps.GeocoderStatus.OK) {
        return deferred.resolve(results[1].formatted_address);
      }
      deferred.reject();
    });
    return deferred.promise;
  }

  function initializeMap() {
    var styles = [
      {
        stylers: [
          { hue: "#4C575E" },
          { saturation: 0 }
        ]
      },{
          "featureType": "landscape.natural.terrain",
          "stylers": [
              { "visibility": "off" }
          ]
      },{
          "featureType": "landscape.natural.landcover",
          "stylers": [
              { "visibility": "off" }
          ]
      },{
          "featureType": "poi.park",
          "stylers": [
              { "visibility": "off" }
          ]
      },{
          "featureType": "water",
          "stylers": [
              { "visibility": "on" }
          ]
      }
    ];

    var mapOptions = {
        zoom: 4,
        center: new google.maps.LatLng(40.0000, -98.0000),
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        styles: styles

    }
    $scope.storeMap = new google.maps.Map(document.getElementById('storeMap'), mapOptions);
  }

  function toRad(curVal) {
      return curVal * Math.PI / 180;
  }

  function getDistance(fromLat, fromLng, toLat, toLng) {
    var distance = 0;
    distance = 3959 * Math.acos( Math.cos( toRad(fromLat) ) * Math.cos( toRad( toLat ) ) * Math.cos( toRad( toLng ) - toRad(fromLng) ) + Math.sin( toRad(fromLat) ) * Math.sin( toRad( toLat ) ) );

    return distance;
  }
});

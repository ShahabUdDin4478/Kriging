var AOI = 
    /* color: #d63000 */
    /* shown: false */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[65.67443048852573, 36.03467341561909],
          [65.67443048852573, 29.021361458488855],
          [76.26525080102573, 29.021361458488855],
          [76.26525080102573, 36.03467341561909]]], null, false);




var chirps = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY').filterBounds(AOI).filter(ee.Filter.date('2019-01-01', '2019-12-31'));

var precipitation = chirps.select('precipitation').mean().clip(AOI)

var precipitationVis = {
  min: 1.0,
  max: 20.0,
  palette: ['001137', '0aab1e', 'e7eb05', 'ff4a2d', 'e90000'],
};
Map.setOptions('SATELLITE');
Map.centerObject(AOI);
Map.addLayer(precipitation, precipitationVis, 'Precipitation');


var samples = precipitation.addBands(ee.Image.pixelLonLat())
  .sample({region: AOI, numPixels: 500,
    scale:1000, projection: 'EPSG:4326'})
  .map(function(sample) {
    var lat = sample.get('latitude');
    var lon = sample.get('longitude');
    var prec = sample.get('precipitation');
    return ee.Feature(ee.Geometry.Point([lon, lat]), {prec: prec});
  });

Map.addLayer(samples, {color: 'blue',strokeWidth: 1}, 'Sample Points');


var combinedReducer = ee.Reducer.mean().combine({
  reducer2: ee.Reducer.stdDev(),
  sharedInputs: true});

var stats = samples.reduceColumns({
  reducer: combinedReducer,
  selectors: ['prec']});
  


var KRIGING = samples.kriging({
  propertyName: 'prec',
  shape: 'exponential',
  range: 100 * 1000,
  sill: 1.0,
  nugget: 0.1,
  maxDistance: 100 * 1000,
  reducer: 'mean',
});
  


var IDW = samples.inverseDistance({
  range: 7e4,
  propertyName: 'prec',
  mean: stats.get('mean'),
  stdDev: stats.get('stdDev'),
  gamma: 0.3});
  
Map.addLayer(IDW, precipitationVis, 'Precipitation Interpolated IDW');
Map.addLayer(KRIGING, precipitationVis, 'Precipitation Interpolated Kriging');

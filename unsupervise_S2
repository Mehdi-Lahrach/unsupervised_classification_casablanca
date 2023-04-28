function prepSrL8(image) {
  // Develop masks for unwanted pixels (fill, cloud, cloud shadow).
  var qaMask = image.select('pixel_qa').bitwiseAnd(parseInt('111111', 2)).eq(0);
  var saturationMask = image.select('sr_aerosol').eq(0);

  // Extract scaling factors for surface reflectance bands.
  var reflectanceScaling = ee.Image(image.get('SR_Band_Attribute_Reflectance')).select('Reflectance_MULT');
  var reflectanceOffset = ee.Image(image.get('SR_Band_Attribute_Reflectance')).select('Reflectance_ADD');

  // Apply the scaling factors to the appropriate bands.
  var scaled = image.select(['B2', 'B3', 'B4', 'B5', 'B6', 'B7']).multiply(reflectanceScaling).add(reflectanceOffset);
a
  // Replace original bands with scaled bands and apply masks.
  return image.addBands(scaled, null, true)
    .updateMask(qaMask).updateMask(saturationMask);
}

Map.addLayer(table);
//load sentitnel image
var image = ee.ImageCollection("COPERNICUS/S2_SR")
.filterDate('2020-01-01','2020-12-30')
.filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',10))
.filterBounds(table)
.median()
.select(['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8']);



// Print image properties
print('Image ID: ', image.id());
print('Cloudy pixel percentage: ', image.get('CLOUDY_PIXEL_PERCENTAGE'));
print('Image bands: ', image.bandNames());
print('Projection: ', image.projection());
print('Scale: ', image.projection().nominalScale());


//Train data with the sentinel Image
var training = image.sample({
  region: table,
  scale: 10,
  numPixels: 6000
});


//K-Means Clustering
var kmeans = ee.Clusterer.wekaKMeans(7).train(training);
var kmeansresult = image.cluster(kmeans);


//X-Means Clustering
var xmeans = ee.Clusterer.wekaXMeans().train(training);
var xmeansresult = image.cluster(xmeans);


//LVQ Clustering
var lvq = ee.Clusterer.wekaLVQ(7).train(training);
var lvqresult = image.cluster(lvq);

//Clip Classification to Region
var imageclip = image.clip(table);
var kmeansresultclip = kmeansresult.clip(table);
var xmeansresultclip = xmeansresult.clip(table);
var lvqresultclip = lvqresult.clip(table);

//Give a colour palette to the classified images
var palette = ['white', 'yellow', 'green', 'black','purple', 'pink', 'blue'];
var cluster_vis = {
  'min': 0,
  'max': 6,
  'palette': palette};

//X-Means classification works differently than the other two, so these vizualization 
// parameters will make it the same
var palette2 = ['gray', 'purple', 'green', 'black','purple', 'pink', 'blue'];
var cluster_vis2 = {
  'min': 0,
  'max': 6,
  'palette': palette2};

// Sentinel-2 Visualization Parameters
var visparams = {
  'bands': ['B4', 'B3', 'B2'],
  'min': 0,
  'max': 2500,
  'gamma': 1.4,
};


//Add Landsat8 Image and Classified Image onto the map

Map.addLayer(imageclip, visparams, 'img');
Map.addLayer(lvqresultclip, cluster_vis, 'lvq');
Map.addLayer(xmeansresultclip, cluster_vis2, 'xmeans');
Map.addLayer(kmeansresultclip, cluster_vis, 'kmeans');

//legend 

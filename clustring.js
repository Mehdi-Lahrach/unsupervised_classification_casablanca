///////////////////////////////////////////////////////
//Load Sentinel image
var image = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterDate('2019-01-01', '2019-12-31')
  .filterBounds(geometry)
  .sort('CLOUDY_PIXEL_PERCENTAGE')
  .first()
  .clip(geometry2);

print(image);


// Normalize the image 
// Machine learning algorithms work best on images when all features have
// the same range
// Function to Normalize Image
// Pixel Values should be between 0 and 1
// Formula is (x - xmin) / (xmax - xmin)
//************************************************************************** 
function normalize(image){
  var bandNames = image.bandNames();
  // Compute min and max of the image
  var minDict = image.reduceRegion({
    reducer: ee.Reducer.min(),
    geometry: geometry2,
    scale: 10,
    maxPixels: 1e9,
    bestEffort: true,
    tileScale: 16
  });
  var maxDict = image.reduceRegion({
    reducer: ee.Reducer.max(),
    geometry: geometry2,
    scale: 10,
    maxPixels: 1e9,
    bestEffort: true,
    tileScale: 16
  });
  var mins = ee.Image.constant(minDict.values(bandNames));
  var maxs = ee.Image.constant(maxDict.values(bandNames));

  var normalized = image.subtract(mins).divide(maxs.subtract(mins))
  return normalized;
}

// Add the image to the map.
Map.addLayer(image, {bands: ['B4', 'B3', 'B2'], min: 0, max: 3000}, 'sentinel 2 Image');

var image = normalize(image);

// Calculate NDVI
var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');

// Calculate NDBI
var ndbi = image.normalizedDifference(['B11', 'B8']).rename('NDBI');

// Calculate NDWI
var ndwi = image.normalizedDifference(['B3', 'B8']).rename('NDWI');

// Combine the indices into a single image
image = image.addBands([ndvi, ndbi, ndwi]);

// Define the bands to be used in clustering.
var bands = ['NDVI', 'NDBI', 'NDWI'];

// Select the bands for clustering from the combined image.
var input = image.select(bands);

var trainingData = input.sample({
  region: geometry2,
  scale: 10,
  numPixels: 6000
});

// Run k-means clustering with 5 clusters.
var clusters = ee.Clusterer.wekaKMeans(5).train(trainingData);

// Apply the clustering to the selected bands.
var output = input.cluster(clusters);

print(output.getInfo());

///////////////////////////////////////////xmeans////////////////////////////////////////

//X-Means Clustering
var xmeans = ee.Clusterer.wekaXMeans(2, 8).train(trainingData);
var xmeansresult = input.cluster(xmeans);

///////////////////////////////////////////// lvq////////////////////////////////////////

var clustererLVQ = ee.Clusterer.wekaLVQ(5).train(trainingData);

// Cluster the RESCALED IMAGE collection
var clustersLVQ = input.cluster(clustererLVQ);

// Define a color palette for the clusters.
var lvqPalett = ['lightgreen', 'red', 'darkgreen', 'yellow', 'blue'];
//////////////Lowveg 0 , urban 1, denseveg 2, soil 3 , water 4 ==> for LVQ
var cluster_lvq = {
  'min': 0,
  'max': 4,
  'palette': lvqPalett};

print(clustersLVQ.getInfo());

// Display the results
Map.centerObject(geometry);
Map.addLayer(ndvi.clip(geometry2), {min: -1, max: 1, palette: ['yellow', 'white', 'green']}, 'NDVI');
Map.addLayer(ndbi.clip(geometry2), {min: -1, max: 1, palette: ['red', 'white', 'blue']}, 'NDBI');
Map.addLayer(ndwi.clip(geometry2), {min: -1, max: 1, palette: ['purple', 'white', 'darkblue']}, 'NDWI');

// Define a color palette for the clusters.
var palette = ['blue', 'yellow', 'lightgreen', 'darkgreen', 'red'];
//////////////water 0 , soil 1, lowveg 2, denseveg 3, urban 4 ===> for kmeans
var cluster_vis = {
  'min': 0,
  'max': 4,
  'palette': palette};

// Display the clustering result.
Map.addLayer(output, cluster_vis,'kmeans');
Map.addLayer(clustersLVQ,  cluster_lvq, 'Lvq');
Map.addLayer(xmeansresult.randomVisualizer(),  {}, 'xmeans');



// Accuracy Assessment
//************************************************************************** 
// Load the reference data (ground truth) as a Feature Collection
var referenceData = water.merge(Urban).merge(lowveg).merge(denseveg).merge(soil);
var label = 'cl';
var composite = image.select(bands);

var clusteredResults = output;

// Extract the values of the clustered results corresponding to the reference data
var clusteredValues = clusteredResults.sampleRegions({
  collection: referenceData,
  projection: clusteredResults.projection(),
  scale: clusteredResults.projection().nominalScale()
});

// Calculate the accuracy metrics
var accuracy = clusteredValues.errorMatrix('cl', 'cluster');
var overallAccuracy = accuracy.accuracy();
var producerAccuracy = accuracy.producersAccuracy();
var consumerAccuracy = accuracy.consumersAccuracy();
var kappa = accuracy.kappa();
var fscore = accuracy.fscore();

// Print the results
print('accuracy: ', accuracy );
print('K-means Overall Accuracy:', overallAccuracy);
print('K-means Producer Accuracy:', producerAccuracy);
print('K-means Consumer Accuracy:', consumerAccuracy);
print('kappa: ', kappa);
print('fscore: ', fscore);


///////////////////////LVQ accuracy

/*
var clusteredResultsLVQ = clustersLVQ;
// Extract the values of the clustered results corresponding to the reference data
var clusteredValuesLVQ = clusteredResultsLVQ.sampleRegions({
  collection: referenceData,
  projection: clusteredResultsLVQ.projection(),
  scale: clusteredResultsLVQ.projection().nominalScale()
});

// Calculate the accuracy metrics
var accuracylvq = clusteredValuesLVQ.errorMatrix('cl', 'cluster');
var overallAccuracylvq = accuracylvq.accuracy();
var producerAccuracylvq = accuracylvq.producersAccuracy();
var consumerAccuracylvq = accuracylvq.consumersAccuracy();

// Print the results
print('LVQ Overall Accuracy:', overallAccuracylvq);
print('LVQ Producer Accuracy:', overallAccuracylvq);
print('LVQ Consumer Accuracy:', consumerAccuracylvq);
*/


//Legend
var panel = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '5px;'
  }
})
var title = ui.Label({
  value: 'Legend',
  style: {
    fontSize: '14px',
    fontWeight: 'bold',
    margin: '0px;'
  }
})
panel.add(title)
var color = ['blue', 'yellow', 'ff0000', 'darkgreen', 'lightgreen']
var lc_class = ['Water' ,'Bare soil' ,'Built-up', 'Dense vegetation' ,'Low-density vegetation']
var list_legend = function(color, description) {
  
  var c = ui.Label({
    style: {
      backgroundColor: color,
      padding: '10px',
      margin: '4px'
    }
  })
  
  var ds = ui.Label({
    value: description,
    style: {
      margin: '5px'
    }
  })
  
  return ui.Panel({
    widgets: [c, ds],
    layout: ui.Panel.Layout.Flow('horizontal')
  })
}
for(var a = 0; a < 5; a++){
  panel.add(list_legend(color[a], lc_class[a]))
}
//display legend
Map.add(panel)


// Define the title text
var titleText = "Clustring Results";

// Create a title label
var titleLabel = ui.Label({
  value: titleText,
  style: {
    fontWeight: 'bold',
    fontSize: '24px',
    margin: '10px 0',
  }
});

// Add the title label to the map
Map.add(titleLabel);


// Add the scale bar to the existing map
var scaleBar = function() {
  var scale = Map.getScale();
  var scaleLabel = ui.Label({
    value: 'Scale: 1:' + Math.round(scale),
    style: { fontWeight: 'bold' }
  });
  var scalePanel = ui.Panel({
    widgets: [scaleLabel],
    style: { position: 'bottom-right' }
  });
  Map.add(scalePanel);
};

// Call the scale bar function
scaleBar();

print(image);

// Get the image date
var date = '2019-09-24';
var cloudCover = 0.06;
var kmeansAcuraccy = 94

// Create the information panel
var infoPanel = ui.Panel({
  style: {
    position: 'bottom-right',
    width: '250px',
    padding: '10px',
    backgroundColor: 'white'
  }
});

// Add labels to the information panel
var dateLabel = ui.Label('Image Date: ' + date);
var cloudCoverLabel = ui.Label('Cloud Cover: ' + cloudCover + '%');
var kmeansAcuraccyLabel = ui.Label('Kmeans Acuraccy: ' + kmeansAcuraccy + '%');


// Add the labels to the information panel
infoPanel.add(dateLabel);
infoPanel.add(cloudCoverLabel);
infoPanel.add(kmeansAcuraccyLabel);

// Add the information panel above the legend
Map.add(infoPanel);

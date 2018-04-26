var state = {
	geoLoaded: 0,
	scenariosLoaded: 0,
	fileCount: 0,
	scenarioCount: 0,
	sizes: {
		parCoor: {
			main: {
				height: 0.95,
				mHeight: 0,
				mWidth: 0
			},
			controls: {
				height: 0.05
			}
		}
	},
	map: {
		selectedLayer: null,
	},
	parCoor: {
		year: -1,
		plot: 0,
		filenames: [],
		obj: null,
		axisKeys: {},
	},
	dataTable: {
		hasLoaded: false
	},
	evo: {
		mode: 0,
		pcaMode: 0,
		pythonMode: 0,
		obj: null,
		scatterDrawn: false
	},
	den: {
		colors: null,
		show: {
			names: true,
			dist: false
		},
	},
	clu: {
		kmeans: null,
		pca: null,
		k: 0,
		obj: null,
	},
	resize: false,
	years: [],
	yearsScaled: [],
	fileMode: 0,
	featuresSelected: 0,
};

// stores the shape file
var clusterShapefile = {},
// stores the scenario file information
clusterData = {},
clusterQueries = [],
// stores the associated cluster queries and their keys
clusterKeys = {},
currentLayerData = [],
currentFile = {};

var geoJsonArray = [],
dataArray = [],
parameters = [],
fileNames = [],
clusters;
// <<<<<<< HEAD
/*********************Begin Modification by Xing Liang, Aug 2016***************************/
var linecharts = {
	data:{},
	charts: []
};
var scatterplots = {
	data: {},
	plots: []
}
var blankImg = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';//smallest blank image
var tooltip = d3.select("body")
	.append("div")
	.style("position", "absolute")
	.style("z-index", "10")
	.style("background", "rgba(0, 0, 0, 0.8)")
	.style("color", "#fff")
	.style("visibility", "hidden");
// =======
// >>>>>>> GCAM-Electron/master
var shapeFilePath = '';
var clusterColors = [
   [20, 20, 80],
   [22, 22, 90],
   [250, 255, 253],
   [100, 54, 255]
];
var clusterMetrics = {};
/*var clusterMetrics = {
	"Building total final energy by region": "EJ",
	"CO2 emissions by aggregate sector": "MTC",
	"Electricity generation by aggregate technology": "EJ",
	"GDP MER by region": "Million1990US$",
	"Industry total final energy by region": "EJ",
	"Population by region": "thous",
	"Primary Energy Consumption (Direct Equivalent)": "EJ",
	"Transportation total final energy by region": "EJ",
	"biomass systems": "MTC",
	"building": "MTC",
	"district heat":"MTC",
	"electricity":"MTC",
	"gas systems":"MTC",
	"hydrogen":"MTC",
	"industry":"MTC",
	"liquid systems":"MTC",
	"regional sugar for ethanol":"MTC",
	"transportation":"MTC",
	"trn_pass_road_LDV":"MTC",
	"trn_pass_road_bus":"MTC",
	"a Coal":"EJ",
	"c Gas":"EJ",
	"e Oil":"EJ",
	"g Biomass":"EJ",
	"i Nuclear":"EJ",
	"j Geothermal":"EJ",
	"k Hydro":"EJ",
	"l Wind":"EJ",
	"m Solar":"EJ",
	"n CHP":"EJ",
	"a oil":"EJ",
	"b natural gas":"EJ",
	"c coal":"EJ",
	"d biomass":"EJ",
	"e Nuclear":"EJ",
	"f hydro":"EJ",
	"g wind":"EJ",
	"h solar":"EJ",
	"i geothermal":"EJ",
	"j traditional biomass":"EJ"
};*/
// <<<<<<< HEAD
/*********************End Modification by Xing Liang, Aug 2016***************************/
// =======

// >>>>>>> GCAM-Electron/master
// Addon functions
jQuery.fn.d3Click = function () {
  this.each(function (i, e) {
    var evt = new MouseEvent("click");
    e.dispatchEvent(evt);
  });
};

Array.prototype.unique = function() {
    var a = this.concat();
    for(var i=0; i<a.length; ++i) {
        for(var j=i+1; j<a.length; ++j) {
            if(a[i] === a[j])
                a.splice(j--, 1);
        }
    }

    return a;
};
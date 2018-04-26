$(function() {
	$( "#dialog-fea" ).dialog({
		resizable: false,
		height: $('body').height()-44,
		width: "auto",
		modal: true,
		autoOpen: false,
		buttons: [
			{
				text: "Run",
				click: function() {
					var features = getSelectedFeatures();
					if(d3.keys(features).length == 0){
						alert('Please select atleast one feature from the feature selection list.');
						return;
					} 
					else{
						$( this ).dialog( "close" );
						featuresSelected(features);					
					}				
				},
				"class": "ui-button-primary"
			},
			{
				text: "Cancel",
				click: function() {
					$( this ).dialog( "close" );
				},
				"class":"ui-button-secondary"
			}
			
		]
	});
});

var allFeaturesSelected = false;
function selectAllFeatures(){
	if(!allFeaturesSelected){
		$('#feature-list input[type=checkbox]').prop('checked', true);
		allFeaturesSelected = true;
	}
	else{
		$('#feature-list input[type=checkbox]').prop('checked', false);
		allFeaturesSelected  = false;
	}
}

function buildFeatureSelection(features){
	$( "#dialog-fea" ).empty();
	var featureList = $('<ul id="feature-list">');

	$.each(features, function(key, values) {
		var item = $('<li>');
		item.append('<input class="parentFeature" type="checkbox" value="' + key +'" id="' + key.replace(/ /g,"_") + '">');
		item.append('<label class="normalWeight" for="' + key.replace(/ /g,"_") + '">' + key + '</label>');
		if(values.length > 1){
			var subList = $('<ul>');
			$.each(values, function( index, value ) {
				var subItem = $('<li>');
				subItem.append('<input class="childFeature" type="checkbox" value="' + value +'" id="' + value.replace(/ /g,"_") + '">');
				subItem.append('<label class="normalWeight" for="' + value.replace(/ /g,"_") + '">' + value + '</label>');
				subList.append(subItem);
			});

			item.append(subList);
		}
		else{
			var subList = $('<ul>');
			$.each(values, function( index, value ) {
				var subItem = $('<li style="display:none;">');
				subItem.append('<input class="childFeature" type="checkbox" value="' + value +'" id="' + value.replace(/ /g,"_") + '">');
				subItem.append('<label class="normalWeight" for="' + value.replace(/ /g,"_") + '">' + value + '</label>');
				subList.append(subItem);
			});

			item.append(subList);
		}

		featureList.append(item);
	});

	$( "#dialog-fea" ).append('<button onclick="selectAllFeatures()">Select/Deselect All Features</button><br><br>');
	$( "#dialog-fea" ).append(featureList);

	$('#feature-list input[type=checkbox]').click(function () {
		// children checkboxes depend on current checkbox
	    $(this).parent().find('li input[type=checkbox]').prop('checked', $(this).is(':checked'));

	    // go up the hierarchy - and check/uncheck depending on number of children checked/unchecked
	    $(this).parents('ul').prevAll('input[type=checkbox]').prop('checked', function(){
	        return $(this).nextAll('ul').find(':checked').length;
	    });
	});
}

function getSelectedFeatures(){
	if(denver){
		return {"HMF":["HMF_UNITS"], "MMF":["MMF_UNITS"], "WMF":["WMF_UNITS"], "SMF":["SMF_UNITS"], "SSF":["SSF_UNITS"], "TSF":["TSF_UNITS"], "LSF":["LSF_UNITS"], "TOTDEM":["data"]};
	}
	var parentFeature = "";
	var selectedFeatures = {};
	$.each($("#feature-list :checked"), function(index, feature){
		// console.log(index, feature);
		if(feature.className == "parentFeature"){
			parentFeature = feature.value;
			selectedFeatures[parentFeature] = [];
		}
		else{
			selectedFeatures[parentFeature].push(feature.value);
		}
	});
	return selectedFeatures;
}
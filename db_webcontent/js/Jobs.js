var OSName = "Unknown OS";
if (navigator.appVersion.indexOf("Win") != -1) OSName = "Windows";
if (navigator.appVersion.indexOf("Mac") != -1) OSName = "MacOS";
if (navigator.appVersion.indexOf("X11") != -1) OSName = "UNIX";
if (navigator.appVersion.indexOf("Linux") != -1) OSName = "Linux";

$(function () {
	$("#dialog-newJob").dialog({
		resizable: false,
		height: "auto",
		width: "auto",
		modal: false,
		autoOpen: false,
		buttons: [{
			text: "Search",
			click: function () {
				var usePre = document.getElementById('predefined-dPaths-input').checked;
				var path = getDatabasePath();

				if (path != "" && path.length > 0) {
					$(this).dialog("close");
				}
				else {
					alert('Please provide a valid database path.');
					return;
				}

				allDatabasesSelected = false;
				// Send path to server for parsing and update progress                         
				console.log(path);
				socket.getDatabases(path);
				showLoading(true);
			},
			"class": "ui-button-primary"
		},
		{
			text: "Cancel",
			click: function () {
				$(this).dialog("close");
			}
		}
		]
	});

	$("#dialog-dbs").dialog({
		resizable: false,
		minWidth: 400,
		height: $('body').height() - 44,
		width: "auto",
		modal: true,
		autoOpen: false,
		open: function () {
			hideLoading();
		},
		buttons: [
			{
				text: "Run",
				click: function () {
					var databases = getSelectedDatabases();
					var jobName = $('#jobName').val();
					var sampleQuery = $('#sampleQueries').is(':checked');
					var queryFile = $('#qPath').val();
					if (databases.length < 3) {
						alert('Please select atleast three databases from the database selection list.');
						return;
					}
					else if (jobName == "") {
						alert('Please Enter a valid job name.');
						return;
					}
					else if (!sampleQuery && queryFile == "") {
						alert('Please Enter a valid query file.');
						return;
					}
					else {
						$(this).dialog("close");
						console.log(jobName, getDatabasePath(), databases, sampleQuery, queryFile);
						socket.createJob(jobName, getDatabasePath(), databases, sampleQuery, queryFile);
					}
				},
				"class": "ui-button-primary"
			},
			{
				text: "Cancel",
				click: function () {
					$(this).dialog("close");
				},
				"class": "ui-button-secondary"
			}

		]
	});

	$("#dialog-completedJobs").dialog({
		resizable: false,
		height: "auto",
		width: "auto",
		modal: false,
		autoOpen: false,
		// open: function () {
		// 	socket.getCompletedJobs();
		// },
		buttons: [{
			text: "Open",
			click: function () {
				var radioValue = $("input[name='completedJobs-radio']:checked").val();

				if (radioValue != undefined && radioValue != "") {
					$(this).dialog("close");
				}
				else {
					alert('Please select a job to open.');
					return;
				}

				// Send path to server for parsing and update progress
				// Should reset page to defaults                       
				console.log(state.completedJobs[radioValue]);
				socket.openJob(state.completedJobs[radioValue]);
			},
			"class": "ui-button-primary"
		},
		{
			text: "Cancel",
			click: function () {
				$(this).dialog("close");
			}
		}
		]
	});

	$("#dialog-processingJobs").dialog({
		resizable: false,
		height: "auto",
		width: "auto",
		modal: false,
		autoOpen: false,
		// open: function () {
		// 	socket.getProcessingJobs();
		// },
		buttons: [
			{
				text: "Okay",
				click: function () {
					$(this).dialog("close");
				}
			}
		]
	});
});

function getDatabasePath() {
	var usePre = document.getElementById('predefined-dPaths-input').checked;
	var path = '';

	if (!usePre) {
		path = $('#dPath').val();
	}
	else {
		path = '/pic/projects/GCAM/cornell_data/' + $('#predefined-dPaths-select :selected').val();

		if (OSName == "Windows") {
			path = 'D:\\msteptoe\\Documents\\git\\11_01_16\\GCAM-Electron\\r_scenarios';
		}
	}
	return path;
}

var allDatabasesSelected = false;
function selectAllDatabases() {
	if (!allDatabasesSelected) {
		$('#database-list input[type=checkbox]').prop('checked', true);
		allDatabasesSelected = true;
	}
	else {
		$('#database-list input[type=checkbox]').prop('checked', false);
		allDatabasesSelected = false;
	}
}

function filenameSort(a, b) {
	var aNum = a.value.match(/(\d+)/g);
	var bNum = b.value.match(/(\d+)/g);
	if (aNum != null && bNum != null) {
		return (Number(aNum[0]) - Number((bNum[0])));
	}
	else if (aNum == null && bNum == null) {
		var aUpper = a.value.toUpperCase();
		var bUpper = b.value.toUpperCase();

		if (aUpper < bUpper) {
			return -1;
		}
		if (aUpper > bUpper) {
			return 1;
		}

		return 0;
	}
	else if (aNum == null) {
		return -1;
	}
	else {
		return 1;
	}
}

function buildDatabaseSelection(databasePaths) {
	$("#database-selection-container").empty();
	var databaseList = $('<ul id="database-list">');

	var databases = databasePaths.map(function (database, index) {
		return { index: index, value: database.split(PATH_SEP).pop() };
	});
	// databases.sort(filenameSort);

	$.each(databases, function (key, database) {
		var item = $('<li>');
		item.append('<input class="parentFeature" type="checkbox" value="' + database.index + '" id="db-' + database.index + '">  ');
		item.append('<label class="normalWeight" for="db-' + database.index + '">' + database.value + '</label>');

		databaseList.append(item);
	});

	var selectAllButton = $('<button onclick="selectAllDatabases()" style="margin-bottom: 10px;">Select/Deselect All Databases</button><br>');
	$("#database-selection-container").append(selectAllButton);
	$("#database-selection-container").append(databaseList);

	selectAllButton.button();

	$('#database-list input[type=checkbox]').click(function () {
		allDatabasesSelected = false;

		// children checkboxes depend on current checkbox
		$(this).parent().find('li input[type=checkbox]').prop('checked', $(this).is(':checked'));

		// go up the hierarchy - and check/uncheck depending on number of children checked/unchecked
		$(this).parents('ul').prevAll('input[type=checkbox]').prop('checked', function () {
			return $(this).nextAll('ul').find(':checked').length;
		});
	});
}

function getSelectedDatabases() {
	var selectedDatabases = [];
	$.each($("#database-list :checked"), function (index, database) {
		selectedDatabases.push(state.subDirs[database.value].split(PATH_SEP).pop());
	});
	return selectedDatabases;
}

function buildCompletedJobRadio(jobsResult) {
	var radioContainer = $("#completedJobs-radio-container");
	radioContainer.empty();

	var jobs = jobsResult.map(function (job, index) {
		console.log(job, job.split(PATH_SEP));
		return { index: index, value: job.split(PATH_SEP).pop() };
	});

	$.each(jobs, function (key, job) {
		radioContainer.append('<input type="radio" name="completedJobs-radio" value="' + job.index + '" id="completedJobs-radio-' + job.index + '">  ');
		radioContainer.append('<label class="normalWeight" for="completedJobs-radio-' + job.index + '">' + job.value + '</label><br>');
	});
}

function buildProcessingJobRadio(jobsResult) {
	var radioContainer = $("#processingJobs-radio-container");
	radioContainer.empty();

	var jobs = jobsResult.map(function (job, index) {
		return { index: index, value: job.split(PATH_SEP).pop() };
	});

	$.each(jobs, function (key, job) {
		radioContainer.append('<input type="radio" name="processingJobs-radio" value="' + job.index + '" id="processingJobs-radio-' + job.index + '">  ');
		radioContainer.append('<label class="normalWeight" for="processingJobs-radio-' + job.index + '">' + job.value + '</label><br>');
	});
}
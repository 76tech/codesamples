var deviceList = [];
deviceList[1] = 'Fitbit';
deviceList[2] = 'Withings';
deviceList[3] = 'iHealth';

$(document).on('click touch','#devicesButton',function(e){
	
	e.preventDefault();
	
	var deviceTemplate = _.template("<div class='deviceEntry clickable' id='deviceEntry-{{= deviceIdx }}'><div class='deviceName'>{{= deviceName }}</div><div  class='deviceArrow'><img id='deviceArrow-{{= deviceIdx }}' src='/provider/images/triangleLeftBlueSm.png'></div></div><div class='deviceGraphContainer' id='deviceGraph-{{= deviceIdx }}'><div align='center' id='deviceGraphLoader-{{= deviceIdx }}'><img src='/images/loaderProvider.png'></div><div class='deviceData' id='deviceData-{{= deviceIdx }}' style='display:none;'></div><div class='deviceGraph' id='deviceWeightGraph-{{= deviceIdx }}'></div><div class='deviceGraph' id='deviceBpGraph-{{= deviceIdx }}'></div><div class='deviceGraph' id='deviceStepsGraph-{{= deviceIdx }}'></div><div class='deviceGraph' id='deviceBgGraph-{{= deviceIdx }}'></div><div class='deviceGraph' id='devicePulseGraph-{{= deviceIdx }}'></div><div class='deviceGraph' id='deviceSpo2Graph-{{= deviceIdx }}'></div><div><hr class='hrRule'></div></div>");

	if ($('#devicesBox').is(':hidden')) {
		
		$("#devicesBox").html("<div align='center'><img src='/images/loaderProvider.png'></div>");
				
		$('#devicesTrianlge').attr('src','/provider/images/triangleDownWhite.png');
		$('#devicesBox').slideDown();

		$.ajax({
		  type: "POST",
		  url: server.config.postUrl  +  '/prov',
		  data: {"action":"clientsPatientDetail","authType":"webtoken","uid":client.cuid,"pane":"locker","lockerAction":'getDevices'},
		  dataType: 'json',
		  xhrFields: { withCredentials: true }	
		}).done(function(resp){
			 
			 if (_.isString(resp.error)) {
				 alert(resp.error);
			 } else if (resp.resp === "OK") {
			 	//success
			 	app.logit("SUCCESS: ",resp);
			 	if ( resp.userDevices && resp.userDevices.length > 0 ) {
			 		$("#devicesBox").html("");
			 		_.each(resp.userDevices, function(device, idx) {
				 		$("#devicesBox").append(deviceTemplate({"deviceIdx":idx, "deviceName":device.name}));	
			 		});
			 		client.devices = resp.userDevices;
			 		client.deviceDays = resp.deviceDays;
				}
				else {
					$("#devicesBox").html("Client has no attached devices");
				}
				
			 } else {
				 alert ('There was a system error. Please try again later.');
				 app.logit('unknown error locker [jh4]');
			 }
		  })
		  .fail(function(x,err) {
			  alert ('There was a system error. Please try again later. [jh4]');
				 app.logit('unknown error  MSG: '  +  err);
		  }); //end ajax
		
	} else {
		$('#devicesTrianlge').attr('src','/provider/images/triangleLeftWhite.png');
		$('#devicesBox').slideUp();
	}
	
}); //- click


$(document).on('click', '.deviceEntry', function(event) {
	event.preventDefault();
	
	var id = event.currentTarget.id.split('-');
	var bodyId = '#deviceGraph-' + id[1];
	var loaderId = '#deviceGraphLoader-' + id[1];
	var arrowId = '#deviceArrow-' + id[1];
	
	if ( $(bodyId).is( ":hidden" ) ) {
	  	$(loaderId).show();
		$(arrowId).attr('src','/provider/images/triangleDownBlueSm.png');
	    $(bodyId).slideDown( "slow" );
	    if ( getDeviceCharts(id[1]) == 0 ) {
		    $('#deviceData-'+id[1]).html("No data to display for this device");
			$('#deviceData-'+id[1]).show();
	    }
	    $(loaderId).hide();
//		app.logit("device: ", client.devices[id[1]]);
  	} else {
  		$(arrowId).attr('src','/provider/images/triangleLeftBlueSm.png');
    	$(bodyId).slideUp('slow');
  	}

});

function getDeviceCharts(idx) {	
	
	var displayedCharts = 0;

	if ( !client.devices[idx].data || !_.isArray(client.devices[idx].data) || client.devices[idx].data.length == 0 ) {
		return 0;
	}
	
	var device = client.devices[idx];
	device.data = client.devices[idx].data.sort(function(a,b) {return moment(a.date) - moment(b.date)} );
	
	var startDate = device.data[0].date;
	
	var weights = _.pluck(device.data, 'weight');
	displayedCharts += getDeviceLineChart('Weight', startDate, '#deviceWeightGraph-'+idx, weights, 'Lbs', 'Lbs');

	var steps = _.pluck(device.data, 'steps');
	displayedCharts += getDeviceLineChart('Steps', startDate, '#deviceStepsGraph-'+idx, steps, 'Steps', 'Steps');
	
	var diaBp = _.pluck(device.data, 'diaBp');
	var sysBp = _.pluck(device.data, 'sysBp');
	displayedCharts += getDeviceTwoLineChart('Blood Pressure', startDate, '#deviceBpGraph-'+idx, diaBp, 'Diastolic', sysBp, 'Systolic', 'mm/Hg');

	var pulse = _.pluck(device.data, 'pulse');
	displayedCharts += getDeviceLineChart('Pulse', startDate, '#devicePulseGraph-'+idx, pulse, 'BPM', 'BPM');

	var bg = _.pluck(device.data, 'bg');
	displayedCharts += getDeviceLineChart('Blood Glucose', startDate, '#deviceBgGraph-'+idx, bg, 'mg/dL', 'mg/dL');

	var spo2 = _.pluck(device.data, 'spo2');
	displayedCharts += getDeviceLineChart('SpO2', startDate, '#deviceSpo2Graph-'+idx, spo2, 'SpO2 %', 'SpO2 %');

	return displayedCharts;
	
}  // ef getChart

function getDeviceLineChart(title, startDate, chartId, yData, yLegend, yLabel ) {
	
	if ( !_.isArray(yData) || yData.length == 0 ) {
		return 0;
	}
	
	var notNull = _.without(yData, null);
	if ( notNull.length == 0 ) {
		return 0;
	}

	startDate = parseInt(moment(startDate).format('x'));
	
	$(function () {				
	$(chartId).highcharts({
		credits: {
			enabled: false
		},
		chart :{
			type: 'line',
			height: 258
		},
		title: {
			text: title
		},
		xAxis: {
			title: {text: 'Days'},
			type: 'datetime',
			dateTimeLabelFormats: {
                day: '%b %e'
            },
			labels: {
				'rotation': -45
			}
		},
		yAxis: {
			title: {text: yLabel},
			endOnTick: false
		},
		series: [
			{
				connectNulls: false,
				pointInterval: 24 * 3600 * 1000,
				pointStart: startDate,
				data: yData,
				name: yLegend,
				legendIndex: 1
			}
		]
				    		    
		});
	});
	
	$(chartId).show();
	
	return 1;
	
}	// ef getLineChart

function getDeviceTwoLineChart(title, startDate, chartId, yData1, yLegend1, yData2, yLegend2, yLabel ) {

	if ( !_.isArray(yData1) || yData1.length == 0 || !_.isArray(yData2) || yData2.length == 0 ) {
		return 0;
	}

	var notNull = _.without(yData1, null);
	if ( notNull.length == 0 ) {
		return 0;
	}
	notNull = _.without(yData2, null);
	if ( notNull.length == 0 ) {
		return 0;
	}

	startDate = parseInt(moment(startDate).format('x'));
	
	$(function () {				
	$(chartId).highcharts({
	    credits: {
	    	enabled: false
    	},
		chart :{
			type: 'line',
			height: 258
		},
		title: {
			text: title
		},
		xAxis: {
			title: {text: 'Days'},
			type: 'datetime',
			dateTimeLabelFormats: {
                day: '%b %e'
            },
			labels: {
				'rotation': -45
			}
		},
		yAxis: {
			title: {text: yLabel},
			endOnTick: false
		},
		series: [
			{
				connectNulls: false,
				pointInterval: 24 * 3600 * 1000,
				pointStart: startDate,
				data: yData1,
				name: yLegend1,
				legendIndex: 1
			},
			{
				connectNulls: false,
				pointInterval: 24 * 3600 * 1000,
				pointStart: startDate,
				data: yData2,
				name: yLegend2,
				legendIndex: 2
			}
		]
				    		    
		});
	});
	
	$(chartId).show();
	
	return 1;
	
}	// ef getLineChart

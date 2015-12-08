var app = require('../../modules/Config.js');
var mysql = require('mysql');
var pool  = mysql.createPool(app.config.mysql);
var _ = require("underscore");
var async = require('async');
var moment = require('moment');

	
var deviceList = [];
deviceList[1] = 'Fitbit';
deviceList[2] = 'Withings';
deviceList[3] = 'iHealth';

function getDevices(barrel,obj) {
	
	var userShare = '';
	if ( obj.user.userType == 2 ) {
		// user is a provider
		userShare = 'providerLink';
	}
	else if ( obj.user.userType == 3 ) {
		//user is a caregiver
		userShare = 'caregiverLink';
	}
	else {
		// user type is patient or unknown
		barrel(err);return;
	}

    obj.send.userDevices = [];//Fitbit', 'Withings', 'Wahoo'
	var query = obj.dbp.query(
		"SELECT device FROM deviceAuth WHERE uRec = ? AND " + userShare + "=1",
		[obj.patientUrec],function(err,result){
		    
    	if (err) {barrel(err);return;}
        	
    	if (result.length > 0) {
	    	_.each(result,function(r){
				obj.send.userDevices.push({'id':r.device, 'name':deviceList[r.device]});
	    	}); //-each
    	} //- if
    	
		barrel(null);
		    	
	}); //-q
	
} //- ef getDevices

function getDeviceData(barrel,obj,device) {

	obj.send.deviceDays = 30;

	var devIdx = -1;
	_.each(obj.send.userDevices, function(dev, idx) {
		if ( dev.id == device ) {
			devIdx = idx;
			return;
		}
	});

	if ( devIdx == -1 ) {
		barrel(null);
		return;
	}

	var sql = '';
	if ( device == 1 ) {
		if ( ! obj.send.userDevices[devIdx] || !_.isObject(obj.send.userDevices[devIdx]) ) {
			barrel(null);
			return;	
		}
		sql = "SELECT * FROM fitbitData WHERE uRec=? AND date >= ?";
	}
	if ( device == 2 ) {
		if ( ! obj.send.userDevices[devIdx] || !_.isObject(obj.send.userDevices[devIdx]) ) {
			barrel(null);
			return;	
		}
		sql = "SELECT date, metric, value FROM deviceData WHERE device=2 AND uRec=? AND date >= ?";
	}
	if ( device == 3 ) {
		if ( ! obj.send.userDevices[devIdx] || !_.isObject(obj.send.userDevices[devIdx]) ) {
			barrel(null);
			return;	
		}
		sql = "SELECT date, metric, value FROM deviceData WHERE device=3 AND uRec=? AND date >= ?";
	}
	
	obj.send.userDevices[devIdx].data = [];
	
	var startDate = moment().subtract(obj.send.deviceDays, 'days').startOf('day');
	var query = obj.dbp.query(
		sql,
		[obj.patientUrec, startDate.toDate()],function(err,result){
			    
		if (err) {barrel(err);return;}
        	
    	if (result.length == 0) {
	    	barrel(null);
	    	return;
	    }

	    _.each(result,function(r, idx){
		   	result[idx].date = moment(r.date).format('YYYY-MM-DD');
		   	if ( r.metric && r.metric == 1 ) {
			   	result[idx].weight = r.value;
		   	}
		   	if ( r.metric && r.metric == 9 ) {
			   	result[idx].diaBp = r.value;
		   	}
		   	if ( r.metric && r.metric == 10 ) {
			   	result[idx].sysBp = r.value;
		   	}
		   	if ( r.metric && r.metric == 11 ) {
			   	result[idx].pulse = r.value;
		   	}
		   	if ( r.metric && r.metric == 3 ) {
			   	result[idx].bg = r.value;
		   	}
  		   	if ( r.metric && r.metric == 4 ) {
			   	result[idx].spo2 = r.value;
		   	}

	    }); //-each
    	
		var userDeviceData = [];
		
		var currentDate = startDate.format('YYYY-MM-DD');
		var endDate = moment().subtract(1, 'days').format('YYYY-MM-DD');
		while ( currentDate <= endDate ) {
			userDeviceData.push({"date":currentDate, 'weight':null, 'steps':null, 'calories':null, 'diaBp':null, 'sysBp':null, 'pulse':null, 'bg':null, 'spo2':null });
			currentDate = moment(currentDate).clone().add(1, 'd').format('YYYY-MM-DD');
		}

		_.each(userDeviceData, function(deviceData, idx) {
			var data = _.where(result, {"date":deviceData.date});
			_.each(data, function(dataPoint) {
				if ( dataPoint.weight ) { userDeviceData[idx].weight = dataPoint.weight; }
				if ( dataPoint.steps ) { userDeviceData[idx].steps = dataPoint.steps; }
				if ( dataPoint.diaBp ) { userDeviceData[idx].diaBp = dataPoint.diaBp; }
				if ( dataPoint.sysBp ) { userDeviceData[idx].sysBp = dataPoint.sysBp; }
				if ( dataPoint.pulse ) { userDeviceData[idx].pulse = dataPoint.pulse; }
				if ( dataPoint.bg ) { userDeviceData[idx].bg = dataPoint.bg; }
				if ( dataPoint.spo2 ) { userDeviceData[idx].spo2 = dataPoint.spo2; }
			});
		});

		obj.send.userDevices[devIdx].data = userDeviceData;		

		barrel(null);
	}); // - q
}

exports.getDevices = getDevices;
exports.getDeviceData = getDeviceData;
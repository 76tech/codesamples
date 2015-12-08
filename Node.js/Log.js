var app = require('../../modules/Config.js');
var mysql = require('mysql');
var pool  = mysql.createPool(app.config.mysql);
var _ = require("underscore");
var async = require('async');
var moment = require('moment');



function route(obj) {
	
	obj.send.log = {};
	
	obj.mysqlOpen = false;
	
	switch(obj.request.payload.logAction) {
		case 'saveLogEntry':
			async.waterfall(
				[
					function(barrel) {attachSql(barrel,obj);},
					function(barrel) {app.attachMongo(barrel,obj);},
					function(barrel) {saveLogEntry(barrel,obj);},
					function(barrel) {calcPatientEngagement(barrel,obj);},
					function(barrel) {barrel(null);}
					
				],
				function (err) { barrelCallback(err,obj) }
			);
			break;
			
		case 'getLogEntry':
			async.waterfall(
				[
					function(barrel) {attachSql(barrel,obj);},
					function(barrel) {getLogEntry(barrel,obj);},
					function(barrel) {barrel(null);}
					
				],
				function (err) { barrelCallback(err,obj) }
			);
			break;
			
		default:
			async.waterfall(
				[
					function(barrel) {attachSql(barrel,obj);},
					function(barrel) {app.attachMongo(barrel,obj);},
					function(barrel) {collectLogStrings(barrel,obj);},
					function(barrel) {getTeamMembers(barrel,obj);},
					function(barrel) {getLogEntries(barrel,obj);},
					function(barrel) {barrel(null);}
					
				],
				function (err) { barrelCallback(err,obj) }
			);
			break;
		
		
	} //- switch
	
} //- route

function collectLogStrings(barrel, obj) {
	
	if ( !obj.send.log || !_.isObject(obj.send.log) ) { obj.send.log = {}; }
	obj.send.log.strings = {};
	
	var mongoStrings = obj.mongodb.collection('strings');
	
	mongoStrings.findOne({"name":'ccLog'}, function(err,item){
		if (err) {barrel(err);return;}
		
		if (item) {
			obj.send.log.strings.eventTypes = item.eventTypes;
			obj.send.log.strings.regardingTypes = item.regardingTypes;
			obj.send.log.strings.eventStatus = item.eventStatus;
		} else {
			barrel(new Error("Couldn't find ccLog strings [CCL]"));
			return;
		}
		barrel(null);
	}); //- findone
}

function getTeamMembers(barrel, obj) {
	
	if ( !obj.send.log || !_.isObject(obj.send.log) ) { obj.send.log = {}; }

	obj.send.log.teamMembers = [];

	var query = obj.dbp.query(
		"SELECT provId, cgId FROM linkages WHERE userId = ? AND accepted=1",
		[obj.patientUrec],function(err,result){
		    
    	if (err) {barrel(err);return;}
    	
		var members = [];
    	if (result.length > 0) {
	    	_.each(result,function(r){
		    	if ( r.provId != 0 ) {
					members.push(r.provId);
				}
				if ( r.cgId != 0 ) {
					members.push(r.cgId);
				}
	    	}); //-each
	    	
			var query2 = obj.dbp.query(
				"SELECT fname, lname, userType, uid FROM users WHERE uRec in ?",
				[[members]],function(err2,result2){
		    
				if (err2) {barrel(err2);return;}
				if (result2.length > 0) {
					_.each(result2, function(member){
						var fname = app.psyDecrypt(member.fname);
						var lname = app.psyDecrypt(member.lname);
						var type;
						if ( member.userType == 2 ) { type = "provider"; }
						if ( member.userType == 3 ) { type = "caregiver"; }
						obj.send.log.teamMembers.push({"name":fname + " " + lname, "type":type, "uid":member.uid});
					});
    			} //- if
    	
				barrel(null);
		    	
			}); //-q2
	    	
	    	
    	} //- if
	}); //-q
} // ef

function getLogEntries(barrel, obj) {
	
	if ( !obj.send.log || !_.isObject(obj.send.log) ) { obj.send.log = {}; }

	obj.send.log.entries = [];
	
	if ( obj.user.practiceId != null ) {
		var query = obj.dbp.query(
			"SELECT id, DATE_FORMAT(startUTC, '%Y-%m-%dT%H:%i:00.000Z') AS startUTC, description FROM careCoordinatorLog WHERE (practiceID = ? OR createdBy = ?) AND uRec=?",
			[obj.user.practiceId, obj.user.uRec, obj.patientUrec],function(err,result){
		    
			if (err) {barrel(err);return;}
    	
			if (result.length > 0) {
	    		_.each(result,function(r){
		    		obj.send.log.entries.push({"logId":r.id, "start":r.startUTC, "description":app.psyDecrypt(r.description)});
	    		}); //-each
    		} //- if
			barrel(null);
			return;
		}); //-q
	}
	else {
		var query = obj.dbp.query(
			"SELECT id, DATE_FORMAT(startUTC, '%Y-%m-%dT%H:%i:00.000Z') AS startUTC, description FROM careCoordinatorLog WHERE createdBy = ? AND uRec=?",
			[obj.user.uRec, obj.patientUrec],function(err,result){
		    
			if (err) {barrel(err);return;}
    	
			if (result.length > 0) {
	    		_.each(result,function(r){
		    		obj.send.log.entries.push({"logId":r.id, "start":r.startUTC, "description":app.psyDecrypt(r.description)});
				}); //-each
			} //- if
			barrel(null);
			return;
		}); //-q		
	}
} // ef

function getLogEntry(barrel, obj) {
	
	if ( !obj.send.log || !_.isObject(obj.send.log) ) { obj.send.log = {}; }

	obj.send.log.entry = {};
	
	var query = obj.dbp.query(
		"SELECT DATE_FORMAT(startUTC, '%Y-%m-%dT%H:%i:00.000Z') AS startUTC, DATE_FORMAT(endUTC, '%Y-%m-%dT%H:%i:00.000Z') AS endUTC, description, type, regarding, status, summary, messageId FROM careCoordinatorLog WHERE id=?",
		[obj.request.payload.logId],function(err,result){
		    
    	if (err) {barrel(err);return;}
    	
    	result[0].description = app.psyDecrypt(result[0].description);
    	result[0].summary = app.psyDecrypt(result[0].summary);

		obj.send.log.entry = result[0];

		if ( result[0].messageId != null ) {
			app.logit("got msg");
			getLogMessage(barrel, obj);
		}
		else {
			app.logit("no msg");
			barrel(null);
			return;
		}
	}); //-q
} // ef

function getLogMessage(barrel, obj) {
	obj.send.log.entry.message = {};
	var query = obj.dbp.query(
		"SELECT subject, message FROM messages WHERE messageId=?",
		[obj.send.log.entry.messageId],function(err,result){
		    
    	if (err) {barrel(err);return;}
    	
		obj.send.log.entry.message.subject = app.psyDecrypt(result[0].subject);
		obj.send.log.entry.message.body = app.psyDecrypt(result[0].message);
		obj.send.log.entry.message.recipients = {};
		obj.send.log.entry.message.recipients.patients = [];
		obj.send.log.entry.message.recipients.providers = [];
	
		var query2 = obj.dbp.query(
			"SELECT distinct u.uid, u.fname, u.lname, u.userType from users u, messageDistribution m where m.uRec = u.uRec and m.messageId=?",
			[obj.send.log.entry.messageId],function(err,results){
		    
			if (err) {barrel(err);return;}
    	
			_.each(results, function(result) {
				if ( result.userType == 1 ) {
					obj.send.log.entry.message.recipients.patients.push(app.psyDecrypt(result.fname) + " " + app.psyDecrypt(result.lname));
				}
				else {
					obj.send.log.entry.message.recipients.providers.push(app.psyDecrypt(result.fname) + " " + app.psyDecrypt(result.lname));					
				}
			});

			barrel(null);
			return;

		}); //-q2

	}); //-q
}
function validateLogData(obj) {
	var errors = [];
	
	var logData = obj.request.payload.logData;
	
	if ( logData.description.length < 1 ) {
		errors.push("Description is too short.");
	}
	
	if ( !moment(logData.startDateTime).isValid() ) {
		errors.push("Start time is invalid.");
	}

	if ( !moment(logData.endDateTime).isValid() ) {
		errors.push("End time is invalid.");
	}

	if ( moment(logData.endDateTime).isBefore(moment(logData.startDateTime)) ) {
		errors.push("End time is before start time.");
	}
	
	if ( isNaN(parseInt(logData.type)) ) {
		errors.push("Invalid event type.");
	}

	if ( isNaN(parseInt(logData.regarding)) ) {
		errors.push("Invalid regarding.");
	}

	if ( isNaN(parseInt(logData.status)) ) {
		errors.push("Invalid status.");
	}

	if ( logData.summary.length < 1 ) {
		errors.push("Summary too short.");
	}
	
	if ( parseInt(logData.disclaimerAccepted) != 1 ) {
		errors.push("Disclaimer must be accepted.");
	}
	
	return errors;
}

function saveLogEntry(barrel, obj) {
	
	var errors = validateLogData(obj);
	if ( errors.length > 0 ) {
		obj.send.error = errors;
		barrel(null);
		return;
	}
		
	if ( isNaN(parseInt(obj.request.payload.logData.entryId)) ) {
		// insert new log entry

		var insertData = [];
		insertData.push(obj.patientUrec);
		insertData.push(obj.user.uRec);
		insertData.push(obj.user.uRec);
		insertData.push(moment().utc().toDate());
		insertData.push(app.psyEncrypt(obj.request.payload.logData.description));
		
		
		insertData.push(moment.utc(obj.request.payload.logData.startDateTime).format('YYYY-MM-DD HH:mm:ss'));

		insertData.push(moment.utc(obj.request.payload.logData.endDateTime).format('YYYY-MM-DD HH:mm:ss'));

		insertData.push(parseInt(obj.request.payload.logData.type));
		insertData.push(parseInt(obj.request.payload.logData.regarding));
		insertData.push(parseInt(obj.request.payload.logData.status));
		insertData.push(app.psyEncrypt(obj.request.payload.logData.summary));
		insertData.push(parseInt(obj.request.payload.logData.disclaimerAccepted));
		insertData.push(obj.user.practiceId);
		
		var query = obj.dbp.query(
			"INSERT INTO careCoordinatorLog (uRec, createdBy, updatedBy, created, description, startUTC, endUTC, type, regarding, status, summary, disclaimerAccepted, practiceId) VALUES (?)",
			[insertData],function(err,result){
			
			if (err) {app.logit("SQL ", query.sql);barrel(err);return;}
			obj.send.msg = "Log entry saved.";
			app.logit("insert: ", result);
			obj.send.logid = result.insertId;
			barrel(null);
			return;
		}); //-q
	}
	else {
		// update existing log entry
		
		var updateId = parseInt(obj.request.payload.logData.entryId);
		var updateData = {};
		updateData.uRec = obj.patientUrec;
		updateData.updatedBy = obj.user.uRec;
		updateData.description = app.psyEncrypt(obj.request.payload.logData.description);
		updateData.startUTC = moment.utc(obj.request.payload.logData.startDateTime).format('YYYY-MM-DD HH:mm:ss');
		updateData.endUTC = moment.utc(obj.request.payload.logData.endDateTime).format('YYYY-MM-DD HH:mm:ss');
		updateData.type = parseInt(obj.request.payload.logData.type);
		updateData.regarding = parseInt(obj.request.payload.logData.regarding);
		updateData.status = parseInt(obj.request.payload.logData.status);
		updateData.summary = app.psyEncrypt(obj.request.payload.logData.summary);
		updateData.disclaimerAccepted = parseInt(obj.request.payload.logData.disclaimerAccepted);

		var query = obj.dbp.query(
			"UPDATE careCoordinatorLog SET ? WHERE id=?",
			[updateData,updateId],function(err,result){
			if (err) {app.logit("SQL ", query.sql);barrel(err);return;}
			app.logit("update: ", updateId);
			obj.send.msg = "Log entry saved.";
			obj.send.logid = updateId;
			barrel(null);
			return;
		}); //-q
	}
}

function calcPatientEngagement(barrel, obj) {
	
	if ( _.isArray(obj.send.error) && obj.send.error.length > 0 ) {
		barrel(null);
		return;
	}

	
	var query = obj.dbp.query(
		"SELECT u.uid, l.uRec, DATE_FORMAT(l.startUTC, '%Y-%m-%dT%H:%i:00.000Z') AS startUTC, l.practiceId FROM careCoordinatorLog l, users u WHERE l.id=? AND u.uRec=l.uRec",
		[obj.send.logid],function(err,result){
		
		if (err) {app.logit("SQL ", query.sql);barrel(err);return;}
		
		if ( result[0].practiceId == null || result[0].practiceId == '' ) {barrel(null); return;}
		
		var monthStart = moment(result[0].startUTC).startOf('month');
		var monthEnd = moment(result[0].startUTC).endOf('month');

		var query2 = obj.dbp.query(
			"SELECT DATE_FORMAT(startUTC, '%Y-%m-%dT%H:%i:00.000Z') AS startUTC, DATE_FORMAT(endUTC, '%Y-%m-%dT%H:%i:00.000Z') AS endUTC FROM careCoordinatorLog WHERE uRec=? AND startUTC >= ? AND startUTC <= ? AND practiceId=?",
			[result[0].uRec, monthStart.toDate(), monthEnd.toDate(), result[0].practiceId],function(err,results){
			
			app.logit("SQL ", query2.sql);

			if (err) {app.logit("SQL ", query2.sql);barrel(err);return;}

			var secondsTally = 0;
			_.each(results, function(entry) {
				secondsTally += moment.duration(moment(entry.endUTC) - moment(entry.startUTC)).asSeconds();
			});
			
			var mongoCareCoordinatorTime = obj.mongodb.collection('CareCoordinatorTime');
	
			mongoCareCoordinatorTime.findOne({"practiceId":result[0].practiceId, "date":{"year":parseInt(monthStart.format('YYYY')), "month":parseInt(monthStart.format('M'))}},
			 	function(err,item){
				
				if (err) {barrel(err);return;}
		
				if (!_.isObject(item)) {
					item = { "practiceId":result[0].practiceId, 
							 "date":{"year":parseInt(monthStart.format('YYYY')),"month":parseInt(monthStart.format('M'))},
							 "patients":[ {"uid":result[0].uid, "time":{"ccLog":secondsTally}} ]};
				}
				else {
					var patientToUpdate = _.findWhere(item.patients, {"uid":result[0].uid});
					if ( !_.isObject(patientToUpdate) ) {
						patientToUpdate = {"uid":result[0].uid, "time":{"ccLog":secondsTally}};
						item.patients.push(patientToUpdate);
					}
					else {
						patientToUpdate.time.ccLog = secondsTally;
					}
				}

				mongoCareCoordinatorTime.save(item,function(err,records){
					if (err) {barrel2(err);return;}
					barrel(null);
				}); //- save

			}); //- findone
		});
	}); //-q
}

function barrelCallback(err, obj) { 
	
	if (obj.mysqlOpen == true && _.isFunction(obj.dbp.release)) {obj.dbp.release(); obj.mysqlOpen = false;}
	if (obj.mongoOpen == true && _.isFunction(obj.mongodb.close)) {obj.mongodb.close();obj.mongoOpen = false;}

	
	if ( err ) {
		app.logit("Provider Log JS: ",err,err.trace);
		obj.reply({"resp":"System error. Please try again later"});
		return;
	}
	if (_.isObject(obj) && _.isObject(obj.send)) {
		obj.send.resp = "OK";
		obj.reply(obj.send);
	} 
}

function attachSql(barrel,obj) {
	pool.getConnection(function(err, dbp){
	    if (err) {barrel(err);return;}
	    obj.dbp = dbp;
	    obj.mysqlOpen = true;
	    barrel(null);
	});
} //- attachSql

exports.route = route;






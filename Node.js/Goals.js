var app = require('../../modules/Config.js');
var mysql = require('mysql');
var pool  = mysql.createPool(app.config.mysql);
var _ = require("underscore");
var async = require('async');
var moment = require('moment');

function getGoalsAndResponses(obj) {
	obj.private = {};
	obj.private.goals = {};
	
	async.waterfall([]);

	async.waterfall(
		[
			function(barrel) {getGoals(barrel,obj);},
			function(barrel) {getGoalResponses(barrel,obj);},
			function(barrel) {barrel(null);}			
		],
		function (err) { if (_.isFunction(obj.barrel)) {obj.barrel(err);} }
	);
}

function getGoals(cb, obj) {
							  
    obj.send.goals = [];
    obj.send.goalDays = 30;
    
    pool.getConnection(function(err, dbp){
	
	if (err) { cb(err); dbp.release(); return; }
	
	var userShare = '';
	if ( obj.user.userType == 2 ) {
	    // user is a provider
	    userShare = 'shareProv';
	}
	else if ( obj.user.userType == 3 ) {
	    //user is a caregiver
	    userShare = 'shareCg';
	}
	else {
	    // user type is patient or unknown
	    dbp.release();
	    cb(null);
	    return;
	}	
	    		      
	var query = dbp.query("SELECT g.goalId, g.required, g.created, g.updated, g.goal, g.notes, g.qType, g.period, g.schedule, g.authorUrec, " +
	    		      "u.fname, u.lname, " +
	    		      "u2.uid " +
	    		      "FROM userGoals g, users u, users u2 " +
	    		      "WHERE g.enabled=1 AND u.uRec=g.authorUrec AND g.uRec=? " +
	    		      "AND u2.uRec=? " +
	    		      "ORDER BY g.created ASC",
			      [obj.patientUrec, obj.patientUrec],function(err,goals){
				  if (err) {
				      app.logit(query.sql);
				      dbp.release();
					  cb(err);
				      return;
				  }
				  
				  if ( goals.length == 0 ) {
				      // no goals found
				      dbp.release();
				      cb(null);
				      return;
				  }
				  var iv = app.getIv(goals[0].uid);
				  obj.private.goals.iv = iv;
				  _.each(goals, function(goal) {
    
					var editPrivs = 0;
					if ( obj.user.uRec == goal.authorUrec ) { editPrivs = 1; }

					obj.send.goals.push({'id':goal.goalId, 'goal':app.psyDecrypt(goal.goal, iv), 'required':goal.required,
						  	       'notes':app.psyDecrypt(goal.notes, iv), 'type':goal.qType, 'period':goal.period,
						  	       'schedule':goal.schedule,
						  		   'created':goal.created, 'updated':goal.updated,
						  		   'editPrivs':editPrivs,
							       'author':app.psyDecrypt(goal.fname) + " " + app.psyDecrypt(goal.lname)});
							      
				  });
			dbp.release();
			cb(null);				    	  
    	}); //- q
    }); //- pool
} // ef getGoals

function getGoalResponses(cb, obj) {
	if ( !_.isObject(obj.send) || !_.isArray(obj.send.goals) || obj.send.goals.length == 0 ) { cb(null); return;}
    
    var goalIds = _.pluck(obj.send.goals, 'id');
	if ( goalIds.length == 0 ) {
		// no goals found
		cb(null);
		return;
	}

	_.each(obj.send.goals, function(goal, idx) {
    	obj.send.goals[idx].responses = [];
    });
    	
    pool.getConnection(function(err, dbp){
	
		if (err) { cb(err); dbp.release(); return; }
		
		var query = dbp.query("SELECT gId, responseId, added, responseVector, surveyId, response, responseText, responded " +
	    		      "FROM userGoalResponses WHERE responded>=? AND gId IN (?) ",
			      [moment().subtract(obj.send.goalDays, 'days').startOf('day').toDate(), goalIds],function(err,goalResponses){
			if (err) {
				app.logit(query.sql);
				dbp.release();
				cb(err);
				return;
			}
			
			if ( goalResponses.length == 0 ) {
				// no goals found
				dbp.release();
				cb(null);
				return;
			}
				  
			_.each(goalResponses, function(goalResp) {
				if ( goalResp.responseText && goalResp.responseText.length>0 ) {
					goalResp.responseText = app.psyDecrypt(goalResp.responseText, obj.private.goals.iv);
				}		
			});
			
			_.each(obj.send.goals, function(goal, idx) {
				var responses = _.where(goalResponses, {'gId':goal.id});
				obj.send.goals[idx].responses = responses;	  
			});
			dbp.release();
			cb(null);				    	  
    	}); //- q
	
    }); //- pool
} // ef getGoalResponses

exports.getGoalsAndResponses = getGoalsAndResponses;













client.log.slugs = {};

$(document).ready(function(){
	
	if (!_.isString(client.log.slugs.main)) {
		client.log.slugs.main = $('#logPageSlug').html();
		$('#logPageSlug').remove();
	}

	if (!_.isString(client.log.slugs.list)) {
		client.log.slugs.list = $('#logListSlug').html();
		$('#logListSlug').remove();
	}

	if (!_.isString(client.log.slugs.form)) {
		client.log.slugs.form = $('#logFormSlug').html();
		$('#logFormSlug').remove();
	}

	if (!_.isString(client.log.slugs.sendMessage)) {
		client.log.slugs.sendMessage = $('#logSendMessageSlug').html();
		$('#logSendMessageSlug').remove();
	}

	if (!_.isString(client.log.slugs.showMessage)) {
		client.log.slugs.showMessage = $('#logShowMessageSlug').html();
		$('#logShowMessageSlug').remove();
	}
		
	//templates
	client.log.template = {};
	
	client.log.activeView = 'list';
	
	$( "button" ).button();
	
});

client.log.load = function(){

	$('#contentDiv').html(client.log.slugs.main);
	
	switch (client.log.activeView) {
		case 'list':
			client.log.displayList();
			break;
		case 'new':
			client.log.enterNew();
			break;
		case 'edit':
			client.log.edit();
			break;
		case 'view':
			client.log.view();
			break;
		default:
			client.log.displayList();
			break;
	} 	
} //- load

client.log.displayList = function() {
	$('#logContent').html(client.log.slugs.list);

	if ( !_.isObject(client.resp.log.entries) || client.resp.log.entries.length == 0 ) {
		return;
	}
	
	var entries = client.resp.log.entries.sort(function(a,b) {
		var d1 = moment(a.start);
		var d2 = moment(b.start);
		if ( d1 < d2 ) {
			return 1;
		}
		else if ( d1 > d2 ) {
			return -1;
		}
		return 0;
	});
	
	$('#logList').empty();
	$('#logList').html();	
	_.each(entries, function(entry) {
		
		entry.start = moment(entry.start);

		$('#logList').append('<div class="logListEntry"><div class="logDescription">'+entry.description+'</div><br /><div style="clear: both;"></div><div class="logDate">'+entry.start.format('M/D/YYYY h:mm a')+'</div>	<div style="clear: both;"></div></div><div class="logIcon"><a href="#" class="logEditClick" data-role-logid="'+entry.logId+'"><img src="/images/icons/pencil_16.png"></a></div><div style="clear: both;"></div><div><hr class="hrRule"></div>');



	});	

	
}

client.log.enterNew = function() {
	
	$('#logContent').html(client.log.slugs.form);
	$('#ccMessage').html(client.log.slugs.sendMessage);
	
	client.log.populateDefaults();
}

client.log.edit = function() {

	$.ajax({
		type: "POST",
		url: server.config.postUrl  +  '/prov',
		data: {"action":"clientsPatientDetail","authType":"webtoken","uid":client.cuid,"pane":"log",
		       "logAction":'getLogEntry','logId':client.log.activeEntry},
		dataType: 'json',
		xhrFields: { withCredentials: true },
		beforeSend: function(){
			//show loader msg/img
			$('#logContent').html("<img src='/images/loaderProvider.png'>");
			}
		}).done(function(resp){
			 if (_.isString(resp.error)) {
				 alert(resp.error);
			 } else if (resp.resp === "OK") {
			 	//success
			 	//app.logit("SUCCESS: ",resp);
			 	$('#logContent').html(client.log.slugs.form);
			 	$('#ccMessage').html(client.log.slugs.showMessage);


			 	client.log.populateDefaults();

				client.log.populateLogEdit(resp.log.entry);
				
			 } else {
				 alert ('There was a system error. Please try again later.');
				 app.logit('unknown error team [ccl9]');
			 }
		  })
		  .fail(function(x,err) {
		  	alert ('There was a system error. Please try again later. [ccl8]');
			app.logit('unknown error  MSG: '  +  err);
		  }); //end ajax
}

client.log.populateLogEdit = function(data) {
	if ( !_.isObject(data)) {
		return;
	}
	
	$('#logDescription').val(data.description);
	
	data.startUTC = moment(data.startUTC);
	data.endUTC = moment(data.endUTC);

	$('#logStartDate').val(data.startUTC.format('MM/DD/YYYY'));
	$('#logStartHour').val(data.startUTC.format('hh'));
	$('#logStartMinute').val(data.startUTC.format('mm'));
	$("#logStartMeridiem option[value='"+data.startUTC.format('a')+"']").prop('selected', true);

	$('#logEndDate').val(data.endUTC.format('MM/DD/YYYY'));
	$('#logEndHour').val(data.endUTC.format('hh'));
	$('#logEndMinute').val(data.endUTC.format('mm'));
	$("#logEndMeridiem option[value='"+data.endUTC.format('a')+"']").prop('selected', true);
 
	$("#logEventType option[value='"+parseInt(data.type)+"']").prop('selected', true);
	$("#logEventRegarding option[value='"+parseInt(data.regarding)+"']").prop('selected', true);
	$("#logEventStatus option[value='"+parseInt(data.status)+"']").prop('selected', true);

	$('#logSummary').text(data.summary);
	
	if ( _.isObject(data.message) ) {
		$('#ccLogMessageHeader').html("Message sent regarding this event:");
		$('#logMessageSubject').html(data.message.subject);
		$('#logMessageBody').html(data.message.body);
		_.each(data.message.recipients.patients, function(recipient) {
			$('#logRecipientsDiv').append(recipient+' (Patient)<br/>');		
		});
		_.each(data.message.recipients.providers, function(recipient) {
			$('#logRecipientsDiv').append(recipient+'<br/>');		
		});
	}
	else {
		$('#ccLogMessageHeader').html("No patient message was attached to this log entry.");
		$('#ccLogSentMessage').html('');
	}
} 

client.log.view = function() {
	client.log.edit();
}

// Button handling functions
$(document).on('click touch','#logAddNew', function(e){
	e.preventDefault();
	
	client.log.activeEntry = '';
	client.log.enterNew();
	
});

$(document).on('click touch','#logDisplayList', function(e){
	e.preventDefault();
	
	client.log.activeEntry = '';
	client.loadPane();
	
});

$(document).on("click touch",'.logViewClick',function(e){
	e.preventDefault();
	client.log.activeEntry = $(this).attr('data-role-logid');	
	client.log.view();
});

$(document).on("click touch",'.logEditClick',function(e){
	e.preventDefault();
	client.log.activeEntry = $(this).attr('data-role-logid');	
	client.log.edit();
});

$(document).on("click touch focusin",'.logDateEntry',function(e){
	e.preventDefault();
	$(this).datepicker();
});

$(document).on('click','#logSave', function(e){
	e.preventDefault();
	
	client.log.validateForm();
	if ( client.log.formErrors.length > 0 ) {
		var dialogText = "<strong>There are errors in your log notes:</strong><br /><br />";
		dialogText += client.log.formErrors.join('<br />');		
		logConfirmationDialog(false, "Log save error", dialogText);
	}	
	else {
		client.log.saveForm();
	}
});

$(document).on('click','#logCancel', function(e){
	e.preventDefault();
	$('#ccLog')[0].reset();
	client.log.activeEntry = '';
	client.loadPane();

});

$(document).on('click','#logSaveAndSend', function(e){
	e.preventDefault();
	client.log.validateForm();
	client.log.validateMessage();

	if ( client.log.formErrors.length > 0 ) {
		var dialogText = "<strong>There are errors in your log notes:</strong><br /><br />";
		dialogText += client.log.formErrors.join('<br />');		
		logConfirmationDialog(false, "Log save & send error", dialogText);
		return false;
	}	
	else {
		client.log.saveFormAndSend();
	}
});
// end button handling functions

client.log.populateDefaults = function() {
	client.log.populateEventTypes();
	client.log.populateEventRegarding();
	client.log.populateEventStatus();
	client.log.populateRecipients();
	client.log.populateDateTimes();
}

client.log.populateEventTypes = function() {
	if ( client.resp.log.strings.eventTypes.length == 0 ) {
		return;
	}
	
	var eventTypes = client.resp.log.strings.eventTypes.sort(function(a,b) {return parseInt(a.sort) - parseInt(b.sort) });

	$('#logEventType').empty();	
	$('#logEventType').append('<option value="">Select</option>');
	_.each(eventTypes, function(type) {
		$('#logEventType').append('<option value="'+type.id+'">'+type.name+'</option>');
	});	
}
// ef

client.log.populateEventRegarding = function() {
	if ( client.resp.log.strings.regardingTypes.length == 0 ) {
		return;
	}
	var regardingTypes = client.resp.log.strings.regardingTypes.sort(function(a,b) {return parseInt(a.sort) - parseInt(b.sort) });

	$('#logEventRegarding').empty();	
	$('#logEventRegarding').append('<option value="">Select</option>');
	_.each(regardingTypes, function(type) {
		$('#logEventRegarding').append('<option value="'+type.id+'">'+type.name+'</option>');
	});
}
// ef

client.log.populateEventStatus = function() {
	if ( client.resp.log.strings.eventStatus.length == 0 ) {
		return;
	}
	var eventStatus = client.resp.log.strings.eventStatus.sort(function(a,b) {return parseInt(a.sort) - parseInt(b.sort) });

	$('#logEventStatus').empty();	
	$('#logEventStatus').append('<option value="">Select</option>');
	_.each(eventStatus, function(status) {
		$('#logEventStatus').append('<option value="'+status.id+'">'+status.name+'</option>');
	});	
}

client.log.populateRecipients = function() {

	$('#logPatientDiv').empty();
	$('#logPatientDiv').append('<input type="checkbox" name="logPatientRecipients" value="'+client.cuid+'" class="paddedCheckbox"><span class="logLabel">'+client.resp.patientName.fname + " " + client.resp.patientName.lname+'</span><br />');
		
	if ( client.resp.log.teamMembers.length == 0 ) {
		return;
	}
	var teamMembers = client.resp.log.teamMembers.sort(function(a,b) {	
		if ( a.name.toLowerCase() > b.name.toLowerCase() ) {
			return 1;
		}
		else if ( a.name.toLowerCase() < b.name.toLowerCase() ) {
			return -1;
		}
		return 0;
	});
	$('#logProviderDiv').empty();	
	_.each(teamMembers, function(member) {
		$('#logProviderDiv').append('<input type="checkbox" name="logProviderRecipients" value="'+member.uid+'" class="paddedCheckbox"><span class="logLabel">'+member.name+'</span><br />');
	});
}
// ef

client.log.populateDateTimes = function() {
	var now = moment();
	$('.logDateEntry').val(now.format('MM/DD/YYYY').toString());
	$('#logStartHour').val(now.format('hh').toString());
	$('#logStartMinute').val(now.format('mm').toString());
	$('#logEndHour').val(now.format('hh').toString());
	$('#logEndMinute').val(now.format('mm').toString());
	$("#logStartMeridiem option[value='"+now.format('a').toString().toLowerCase()+"']").prop('selected', true);
	$("#logEndMeridiem option[value='"+now.format('a').toString().toLowerCase()+"']").prop('selected', true);
}//ef

client.log.validateForm = function() {
	
	client.log.saveData = {};
	client.log.saveData.entryId = client.log.activeEntry;
	client.log.formErrors = [];
	
	var formErrors = [];
	
	if ( $.trim($('#logDescription').val()).length < 1 ) {
		formErrors.push("Description");
	}
	else {
		client.log.saveData.description = $.trim($('#logDescription').val());
	}
	
	if (  $.trim($('#logStartDate').val()).length < 8 || $.trim($('#logStartDate').val()).length > 10 ||
		( $.trim($('#logStartHour').val()).length != 1 && $.trim($('#logStartHour').val()).length != 2 ) || 
		( $.trim($('#logStartMinute').val()).length != 1 && $.trim($('#logStartMinute').val()).length != 2 ) ||
		  $.trim($('#logStartMeridiem').val()).length != 2 ) {
		formErrors.push("Start date/time");
	}
	else {

		var dateSplit = $.trim($('#logStartDate').val()).split('/');
		var month = parseInt(dateSplit[0]);
		var day = parseInt(dateSplit[1]);
		var year = parseInt(dateSplit[2]);
		var hour = parseInt($.trim($('#logStartHour').val()));
		var minute = parseInt($.trim($('#logStartMinute').val()));
		if (  $.trim($('#logStartMeridiem').val()).toLowerCase() == 'pm' && hour != 12 ) { hour += 12; }
		
		if ( hour < 10 ) {
			hour = '0' + hour;
		}
		if ( minute < 10 ) {
			minute = '0' + minute;
		}
		if ( month < 10 ) {
			month = '0' + month;
		}
		if ( day < 10 ) {
			day = '0' + day;
		}

		var startDateString = year + '-' + month + '-' + day + "T" + hour + ":" + minute + ":00.000";
		
		client.log.saveData.startDateTime = moment(startDateString).utc().format();
		
	}

	if (  $.trim($('#logEndDate').val()).length < 8 || $.trim($('#logEndDate').val()).length > 10 ||
		( $.trim($('#logEndHour').val()).length != 1 && $.trim($('#logEndHour').val()).length != 2 ) || 
		( $.trim($('#logEndMinute').val()).length != 1 && $.trim($('#logEndMinute').val()).length != 2 ) ||
		  $.trim($('#logEndMeridiem').val()).length != 2 ) {
		formErrors.push("End date/time");
	}
	else {

		var dateSplit = $.trim($('#logEndDate').val()).split('/');
		var month = parseInt(dateSplit[0]);
		var day = parseInt(dateSplit[1]);
		var year = parseInt(dateSplit[2]);
		var hour = parseInt($.trim($('#logEndHour').val()));
		var minute = parseInt($.trim($('#logEndMinute').val()));
		if (  $.trim($('#logEndMeridiem').val()).toLowerCase() == 'pm' && hour != 12 ) { hour += 12; }
		
		if ( hour < 10 ) {
			hour = '0' + hour;
		}
		if ( minute < 10 ) {
			minute = '0' + minute;
		}
		if ( month < 10 ) {
			month = '0' + month;
		}
		if ( day < 10 ) {
			day = '0' + day;
		}

		var endDateString = year + '-' + month + '-' + day + "T" + hour + ":" + minute + ":00.000";
		
		client.log.saveData.endDateTime = moment(endDateString).utc().format();
	}
	
	if ( $('#logEventType').val().length < 1 ) {
		formErrors.push("Event type");
	}
	else {
		client.log.saveData.type = $('#logEventType').val();
	}
	
	if ( $('#logEventRegarding').val().length < 1 ) {
		formErrors.push("Regarding");
	}
	else {
		client.log.saveData.regarding = $('#logEventRegarding').val();
	}

	if ( $('#logEventStatus').val().length < 1 ) {
		formErrors.push("Status");
	}
	else {
		client.log.saveData.status = $('#logEventStatus').val();
	}
	
	if ( $.trim($('#logSummary').val()).length < 1 ) {
		formErrors.push("Summary");
	}
	else {
		client.log.saveData.summary = $.trim($('#logSummary').val());		
	}
	
	if ( !$('#logSaveDisclaimer').is(':checked') ) {
		formErrors.push("<br /><br />Please accept the save disclaimer<br /><br />");
	}
	else {
		client.log.saveData.disclaimerAccepted = 1;
	}

	client.log.formErrors = formErrors;

}
// ef

client.log.validateMessage = function() {
	
	client.log.sendData = {};
	
	if ( !client.log.formErrors || !_.isArray(client.log.formErrors) ) { client.log.formErrors = []; }

	client.log.sendData.clientRecipients = {};
	client.log.sendData.providerRecipients = {};
	
	$('input:checkbox[name=logPatientRecipients]').each(function() {    
		if($(this).is(':checked')) { 
			client.log.sendData.clientRecipients[$(this).val()] = $(this).next('span[class=label]').text();
		}
	});
	$('input:checkbox[name=logProviderRecipients]').each(function() {    
		if($(this).is(':checked')) { 
			client.log.sendData.providerRecipients[$(this).val()] = $(this).next('span[class=label]').text();
		}

	});

	if ( _.size(client.log.sendData.clientRecipients) == 0 && _.size(client.log.sendData.providerRecipients) == 0 ) {
		client.log.formErrors.push("No recipients chosen");
	}

	if ( $.trim($('#logMessageSubject').val()).length < 1 ) {
		client.log.formErrors.push("Please enter a subject");
	}
	else {
		client.log.sendData.subject = $('#logMessageSubject').val().trim();
	}

	if ( $.trim($('#logMessageBody').val()).length < 1 ) {
		client.log.formErrors.push("Please enter a message");
	}
	else {
		client.log.sendData.msgEditor = $('#logMessageBody').val().trim();
	}
	
	if ( !$('#logMsgDisclaimer').is(':checked') ) {
		client.log.formErrors.push("<br /><br />Please accept the message send disclaimer<br /><br />");
	}
	else {
		client.log.sendData.disclaimer = 1;
	}
	
	client.log.sendData.clientReference = client.cuid;

}
// ef

client.log.saveForm = function() {
	
	$.ajax({
		type: "POST",
		url: server.config.postUrl  +  '/prov',
		data: {"action":"clientsPatientDetail","authType":"webtoken","uid":client.cuid,"pane":"log",
			  "logAction":'saveLogEntry','logData':client.log.saveData},
		  dataType: 'json',
		  xhrFields: { withCredentials: true },
		  beforeSend: function(){
		  		//show loader msg/img
			 	if ( $('#logConfDialog').hasClass('ui-dialog-content') && $('#logConfDialog').dialog('isOpen') == true ) {
				 	$('#logConfWaitText').html("Saving <img src='/images/loaderProvider.png'>");
				}
				else {
		  			logConfirmationDialog(true, "Saving log entry", "Saving <img src='/images/loaderProvider.png'>");
		  		}
			}
		}).done(function(resp){
			 if (_.isArray(resp.error)) {
				 var errorString = resp.error.join('<br />');
				 errorString += '<br /><br />Please fix these errors and try again.';
				 logConfirmationDialog(false, "Saving log entry", errorString);
			 } else if (resp.resp === "OK") {
			 	//success
//			 	app.logit("SUCCESS: ",resp);
			 	if ( $('#logConfDialog').hasClass('ui-dialog-content') && $('#logConfDialog').dialog('isOpen') == true ) {
					$('#logConfWaitText').html();
					$('#logConfWaitText').empty();
					$('#logConfText').append("<br />"+resp.msg);
				}
				else {
					logConfirmationDialog(true, "Saving log entry",resp.msg);
				}
			 } else {
				 alert ('There was a system error. Please try again later.');
				 app.logit('unknown error team [ccl14]');
			 }
		  })
		  .fail(function(x,err) {
		  	alert ('There was a system error. Please try again later. [ccl15]');
			app.logit('unknown error  MSG: '  +  err);
		  }); //end ajax
	
} // ef

client.log.saveFormAndSend = function() {
	
	$.ajax({
		type: "POST",
		url: server.config.postUrl  +  '/prov',
		data: {"action":"clientsPatientDetail","authType":"webtoken","uid":client.cuid,"pane":"log",
			  "logAction":'saveLogEntry','logData':client.log.saveData},
		  dataType: 'json',
		  xhrFields: { withCredentials: true },
		  beforeSend: function(){
		  		//show loader msg/img
			 	if ( $('#logConfDialog').hasClass('ui-dialog-content') && $('#logConfDialog').dialog('isOpen') == true ) {
				 	$('#logConfWaitText').html("Saving <img src='/images/loaderProvider.png'>");
				}
				else {
		  			logConfirmationDialog(true, "Saving log entry", "Saving <img src='/images/loaderProvider.png'>");
		  		}
			}
		}).done(function(resp){
			 if (_.isArray(resp.error)) {
				 var errorString = resp.error.join('<br />');
				 errorString += '<br /><br />Please fix these errors and try again.';
				 logConfirmationDialog(false, "Saving log entry", errorString);
			 } else if (resp.resp === "OK") {
			 	//success
//			 	app.logit("SUCCESS: ",resp);
			 	if ( $('#logConfDialog').hasClass('ui-dialog-content') && $('#logConfDialog').dialog('isOpen') == true ) {
					$('#logConfWaitText').html();
					$('#logConfWaitText').empty();
					$('#logConfText').append("<br />"+resp.msg);
				}
				else {
					logConfirmationDialog(true, "Saving log entry",resp.msg);
				}
				client.log.sendMessage(resp.logid);
			 } else {
				 alert ('There was a system error. Please try again later.');
				 app.logit('unknown error team [ccl9]');
			 }
		  })
		  .fail(function(x,err) {
		  	alert ('There was a system error. Please try again later. [ccl8]');
			app.logit('unknown error  MSG: '  +  err);
		  }); //end ajax
	
} // ef

client.log.sendMessage = function(logid) {

	client.log.sendData.logid = logid;

	$.ajax({
		type: "POST",
		url: '/xServers/provider/messages.webconnector.php',
		data: {parse: ['sendMessageCCLog'], payload: client.log.sendData},
		  dataType: 'json',
		  xhrFields: { withCredentials: true },
		  beforeSend: function(){
		  		//show loader msg/img
				 if ( $('#logConfDialog').hasClass('ui-dialog-content') && $('#logConfDialog').dialog('isOpen') == true ) {
					$('#logConfWaitText').html("Saving log entry", "Sending message <img src='/images/loaderProvider.png'>");
				 }
				 else {
					logConfirmationDialog(true, "Saving log entry",resp.msg);
				 }
			}
		}).done(function(resp){

			 if (_.isArray(resp.error)) {
				 var errorString = resp.error.join('<br />');
				 errorString += '<br /><br />Please fix these errors and try again.';
				 logConfirmationDialog(false, "Saving log entry", errorString);
			 } else if (_.isObject(resp.display) && _.isString(resp.display.msgDialog) ) { 
			 	//success
			 	//app.logit("SUCCESS: ",resp);
			 	if ( $('#logConfDialog').hasClass('ui-dialog-content') && $('#logConfDialog').dialog('isOpen') == true ) {
				 	$('#logConfWaitText').html();
				 	$('#logConfWaitText').empty();
				 	$('#logConfText').append("<br />"+resp.display.msgDialog);
			 	}
			 	else {
					logConfirmationDialog(true, "Saving log entry",resp.display.msgDialog);
				}
			 } else {
				 alert ('There was a system error. Please try again later.');
				 app.logit('unknown error team [ccl9]');
			 }
		  })
		  .fail(function(x,err) {
		  	alert ('There was a system error. Please try again later. [ccl8]');
			app.logit('unknown error  MSG: '  +  err);
		  }); //end ajax

} // ef

function logConfirmationDialog(reload, dialogTitle, dialogWaitText, dialogText) {
	
	if (!_.isString(client.log.slugs.confDialog)) {
		client.log.slugs.confDialog = $('#logConfDialogSlug').html();
		$('#logConfDialogSlug').remove();
	}
	$('#logConfDialog').html(client.log.slugs.confDialog);
	$('#logConfText').html(dialogText);
	$('#logConfWaitText').html(dialogWaitText);
	$( "#logConfDialog" ).dialog(
	{
		'width':400,modal: true,
		'title': dialogTitle,
		buttons: {
        	"OK": function() {
				$( this ).dialog( "close" );
				if ( reload == true ) {
					client.log.activeEntry = '';
					client.loadPane();
				}
        	}
    }});
}

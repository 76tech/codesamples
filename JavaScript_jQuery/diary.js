client.diary.load = function(){
	
	var entryDisplay = "";
	
	var diaryEntries = client.resp.diaryEntries.sort(function(a,b) {return moment(b.created) - moment(a.created)});
	
	if ( !_.isArray(diaryEntries) || diaryEntries.length == 0 ) {
			$('#contentDiv').html("No diary entries to display");
			return;
	}
	_.each(diaryEntries, function(entry) {
		var diarySmilies = [ "<img style='opacity:0.4' src='/images/icons/Smiley5.jpg'>",
						 "<img style='opacity:0.4' src='/images/icons/Smiley4.jpg'>",
						 "<img style='opacity:0.4' src='/images/icons/Smiley3.jpg'>",
						 "<img style='opacity:0.4' src='/images/icons/Smiley2.jpg'>",
						 "<img style='opacity:0.4' src='/images/icons/Smiley1.jpg'>" 
					   ];
		entry.created = moment(entry.created).format('M/D/YYYY, h:mm a');
		entry.updated = moment(entry.updated).format('M/D/YYYY, h:mm a');
		
		if ( entry.title == null || entry.title == "" ) {
			entry.title = entry.entry.substr(0, 140) + "...";
		}

		if ( entry.diaryImpact != null && entry.diaryImpact != '' && entry.diaryImpact >= 1 && entry.diaryImpact <= 5 ) {
			diarySmilies[5-entry.diaryImpact] = "<img style='opacity:1' src='/images/icons/Smiley"+entry.diaryImpact+".jpg'>";
		}

		//format date here not in node
		entryDisplay += "<div class='diaryEntry' id='diary-"+entry.entryId+"'>" +
	   "<div class='diaryLeftBlock'>Created "+entry.created+"</div><div class='diaryRightBlock'>"+entry.title+"</div>"+
	   "<div class='diaryArrow clickable' id='diaryArrow-"+entry.entryId+"'><img src='/provider/images/triangleLeftBlue.png'></div></div>"+
	   
	   "<div class='diaryBody' id='diaryBody-"+entry.entryId+"'>"+
	   "Created: "+entry.created+"<br />Updated: "+entry.updated+"<br /><br />"+
	   entry.entry+"<br /><br />Diary impact:"+
	   "<div class='smileyGroup'>"+diarySmilies.join('')+"</div></div>"+
	   
	   "</div><div><hr class='hrRule'></div>";
	});
	
	$('#contentDiv').html(entryDisplay);

}

$(document).on('click', '.diaryArrow', function(event) {
	event.preventDefault();
	
	var id = event.currentTarget.id.split('-');
	var bodyId = '#diaryBody-' + id[1];
	
	if ( $(bodyId).is( ":hidden" ) ) {
		$(event.target).attr('src','/provider/images/triangleDownBlue.png');
	    $(bodyId).slideDown( "slow" );
  	} else {
  		$(event.target).attr('src','/provider/images/triangleLeftBlue.png');
    	$(bodyId).slideUp('slow');
  	}

});
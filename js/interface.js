var url = 'http://localhost:7474/db/data/cypher';

var json;
var copa_questions;

/*
* Load copa questions and extracted entities in GUI.
*/
function load_json_to_ui(path){
    json = $.getJSON(path);
	
	// combobox for question numbers
	var cb_quest = document.getElementById('cb_questions');
	
	// read questions
    $.getJSON(path,function(result){
	  copa_questions = result.questions;
      $.each(copa_questions, function(num, field){
	    var el = document.createElement("option");
	    el.textContent = num + ": " + field.premise_text;
	    el.value = num;	
	    cb_quest.appendChild(el);

      });

	// load first question at start
	load_quest_entities(1);
    });

}

/*
* Helper function to add entries to combobox
*/
function add_option(cb,num, field){
	var el = document.createElement("option");
	el.textContent = field;
	el.value = num;	
    cb.appendChild(el);

	//// jquery way
	// cb_prem_nouns.append(
	//         $('<option></option>').val(num).html(text)
	//     );

}
 
/*
* 
*/
function load_quest_entities(quest_num){

	// questions texts
    $("#l_premise").text(copa_questions[quest_num].premise_text);
    $("#l_alternative1").text(copa_questions[quest_num].alt1_text);
    $("#l_alternative2").text(copa_questions[quest_num].alt2_text);

	// comboboxes

	//premise nouns
    $("#premise_nouns").empty();
   	$.each(copa_questions[quest_num].premise_nouns, function(num, field){
		add_option(document.getElementById('premise_nouns'),num,field);
    });
    $("#premise_stats").empty();
   	$.each(copa_questions[quest_num].premise_stats, function(num, field){
		add_option(document.getElementById('premise_stats'),num,field);
    });
	// alt1
    $("#alternative1_nouns").empty();
   	$.each(copa_questions[quest_num].alt1_nouns, function(num, field){
		add_option(document.getElementById('alternative1_nouns'),num,field);
    });
    $("#alternative1_stats").empty();
   	$.each(copa_questions[quest_num].alt1_stats, function(num, field){
		add_option(document.getElementById('alternative1_stats'),num,field);
    });
	// alt2 
    $("#alternative2_nouns").empty();
	$.each(copa_questions[quest_num].alt2_nouns, function(num, field){
		add_option(document.getElementById('alternative2_nouns'),num,field);
    });
    $("#alternative2_stats").empty();
   	$.each(copa_questions[quest_num].alt2_stats, function(num, field){
		add_option(document.getElementById('alternative2_stats'),num,field);
    });
}

//  query += 'n=node:' + cb_start.split("_")[1] + '(' + (cb_start.split("_")[1] == 'nouns' ? 'word' : 'term') + '="' + $('#'+ cb_start + ' option:selected').text() +  '" ),'
// // end node
//  query += 'm=node:' + cb_end.split("_")[1] + '(' + (cb_end.split("_")[1] == 'nouns' ? 'word' : 'term') + '="' + $('#'+ cb_end + ' option:selected').text() + '")\n'

/*
* Build cypher query with given data. Algorithm parameters are from the GUI.
*/
function build_copa_query(start_content,start_type,end_content,end_type){
	console.log(start_content,start_type,end_content,end_type);
	var query = 'START ';

	// start node
	 query += 'n=node:' + start_type + '(' + (start_type == 'nouns' ? 'word' : 'term') + '="' + start_content +  '" ),'
	// end node
	 query += 'm=node:' + end_type + '(' + (end_type == 'nouns' ? 'word' : 'term') + '="' + end_content + '")\n'
 	
	// set algorithm and path length
	if ($('#allshorttest').is(':checked')){
	    query += 'MATCH p=allShortestPaths((n)-[*..' + $('#max_length').val() +']->(m))\n';
	} else {
	    query += 'MATCH p=shortestPath((n)-[*..' + $('#max_length').val() +']->(m))\n';
	}

	query += 'RETURN EXTRACT( n in FILTER( x IN nodes(p) WHERE HAS(x.word)) | [id(n),n.word] ) as nouns,\n';
	query += 'EXTRACT( s in FILTER( v IN nodes(p) WHERE HAS(v.term)) | [id(s),s.term] ) as stats,\n';
	query += 'EXTRACT( r IN relationships(p) |[id(r),type(r),r]) as rels, ';
	query += 'p LIMIT ' + $('#max_path').val() + ';'

	$('#query_input').val(query);
	return query;
}


/*
* Build cypher query with data from gui. The parameters are the ids of the comboboxes with the start and end nodes.
* cb_start combobox with start ReasonGraph entity
* cb_end combobox with end ReasonGraph entity
*/
function build_copa_query_from_cbs(cb_start,cb_end) {
	// highlight interface elements connected to query
    highlight_query_interface(cb_start,cb_end)

	var start_content = $('#'+ cb_start + ' option:selected').text()	
	console.log(start_content);
	var start_type = cb_start.split("_")[1]; 
	console.log(start_type);
	var end_content = $('#'+ cb_end + ' option:selected').text()	

	var end_type = cb_end.split("_")[1]; 

	return build_copa_query(start_content,start_type,end_content,end_type);
}

function highlight_query_interface(cb_start,cb_end){
	// reset all comboboxes and buttons
	$('.query_cb, .query_control').css("background-color", "white");

    // cbs
	$('#' + cb_start).css("background-color", "#ff756b");
	$('#' + cb_end).css("background-color", "#ff756b");

	// pressed button
	$('#b_' + cb_start + '__' + cb_end).css("background-color", "#ff756b");
}

function update_cbs(){
    $( "#cb_questions option:selected" ).each(function() {
      load_quest_entities($( this ).val());
    });
}

function update_results(text){
	    $("#text_results").val(text);
}



var url = 'http://localhost:7474/db/data/cypher';

var json;
var copa_question;


function load_json_to_ui(path){
    json = $.getJSON(path);
	
	// combobox for question numbers
	var cb_quest = document.getElementById('cb_questions');
	
	// read questions
    $.getJSON(path,function(result){
	  copa_question = result.questions;
      $.each(copa_question, function(num, field){
	    var el = document.createElement("option");
	    el.textContent = num + ": " + field.premise_text;
	    el.value = num;	
	    cb_quest.appendChild(el);

      });
	  
	// TODO start with first
	// load first question
	load_quest_entities(6);
    });

}

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
 
function load_quest_entities(quest_num){

	// questions texts
    $("#l_premise").text(copa_question[quest_num].premise_text);
    $("#l_alternative1").text(copa_question[quest_num].alt1_text);
    $("#l_alternative2").text(copa_question[quest_num].alt2_text);

	// comboboxes

	//premise nouns
    $("#premise_nouns").empty();
   	$.each(copa_question[quest_num].premise_nouns, function(num, field){
		add_option(document.getElementById('premise_nouns'),num,field);
    });
    $("#premise_stats").empty();
   	$.each(copa_question[quest_num].premise_stats, function(num, field){
		add_option(document.getElementById('premise_stats'),num,field);
    });
	// alt1
    $("#alternative1_nouns").empty();
   	$.each(copa_question[quest_num].alt1_nouns, function(num, field){
		add_option(document.getElementById('alternative1_nouns'),num,field);
    });
    $("#alternative1_stats").empty();
   	$.each(copa_question[quest_num].alt1_stats, function(num, field){
		add_option(document.getElementById('alternative1_stats'),num,field);
    });
	// alt2 
    $("#alternative2_nouns").empty();
	$.each(copa_question[quest_num].alt2_nouns, function(num, field){
		add_option(document.getElementById('alternative2_nouns'),num,field);
    });
    $("#alternative2_stats").empty();
   	$.each(copa_question[quest_num].alt2_stats, function(num, field){
		add_option(document.getElementById('alternative2_stats'),num,field);
    });
}


function build_copa_query(cb_start,cb_end) {
	// highlight interface elements connected to query
    highlight_query_interface(cb_start,cb_end)

	// cb_start combobox with start entity
	// cb_end combobox with end entity
    var query = 'START ';

	// start node
	 query += 'n=node:' + cb_start.split("_")[1] + '(' + (cb_start.split("_")[1] == 'nouns' ? 'word' : 'term') + '="' + $('#'+ cb_start + ' option:selected').text() +  '" ),'
	// end node
	 query += 'm=node:' + cb_end.split("_")[1] + '(' + (cb_end.split("_")[1] == 'nouns' ? 'word' : 'term') + '="' + $('#'+ cb_end + ' option:selected').text() + '")\n'
	 	
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

function highlight_query_interface(cb_start,cb_end){
	// reset all comboboxes and buttons
	$('.query_cb, .query_control').css("background-color", "white");

    // cbs
	$('#' + cb_start).css("background-color", "#ff756b");
	$('#' + cb_end).css("background-color", "#ff756b");

	// pressed button
	$('#b_' + cb_start + '__' + cb_end).css("background-color", "#ff756b");
}

function build_custom_query(mode) {
    var query = 'START ';

    // define starting nodes
    if (mode == 'noun_state'){
        query += 'n=node:nouns(word="' + $('#noun1').val() +  '" ),m=node:stats(term="' + $('#statement1').val()  +'")\n';
    } else if (mode == 'noun_noun'){
        query += 'n=node:nouns(word="' + $('#noun1').val() +  '" ),m=node:nouns(word="' + $('#noun2').val() +'")\n';
    } else if (mode == 'state_state'){
        query += 'n=node:stats(term="'+ $('#statement1').val()  +'"),m=node:stats(term="'+ $('#statement2').val()  +'")\n';
    }
	
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

function update_cbs(){
    $( "#cb_questions option:selected" ).each(function() {
      load_quest_entities($( this ).val());
    });
}

function update_results(text){
	    $("#text_results").val(text);
}

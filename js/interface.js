var url = 'http://localhost:7474/db/data/cypher';

var json;
var copa_question;


function load_json_to_ui(path){
    json = $.getJSON(path);
	
	// combobox for question numbers
	var cb_quest = document.getElementById('cb_questions');
	
	// read questions
    $.getJSON(path,function(result){
      console.log(result);
	  copa_question = result.questions;
      $.each(copa_question, function(num, field){
        console.log("q",num,field); 
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



function build_query(mode) {
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
    console.log(query); 
}

// $("#cb_questions").change(function () {

function update_cbs(){
    $( "#cb_questions option:selected" ).each(function() {
      load_quest_entities($( this ).val());
    });
}

//var express = require('express');
var request = require('request');

var neo4j = require('neo4j');
var db = new neo4j.GraphDatabase('http://localhost:7474');

var url = 'http://localhost:7474/db/data/cypher';

function query_db(query) {
  db.query(query, function(err, result){
      if(err) throw err;
      console.log(result);
      // console.log(result.data); // delivers an array of query results
      // console.log(result.columns); // delivers an array of names of objects getting returned
  });

}
/*
* Load copa questions from file
*/
function eval_with_copa_questions(json_path){
  
  var fs = require('fs');
  console.log(json_path);
 
  fs.readFile(json_path, 'utf8', function (err, data) {
    if (err) {
      console.log('Error: ' + err);
      return;
    }

    var copa_data = JSON.parse(data);
    eval_query_options(copa_data['questions']);
  });
}

/*
 * Get list of all possible query options.
 */
function eval_query_options(copa_questions) {
  // get two list for options: premise - alternative1, premise - alternative2
  var copa_query_options = {}
  for (quest_num in copa_questions) {
    console.log(quest_num);
    if (copa_questions.hasOwnProperty(quest_num)) {
      // all query options for this copa question
      quest_options = {}
      // for alternative 1
      quest_options['alt1'] = all_premise_alt_options(copa_questions[quest_num], 1);
      // for alternative 2
      quest_options['alt2'] = all_premise_alt_options(copa_questions[quest_num], 2);
      copa_query_options[quest_num] = quest_options;

      // eval this question
      console.log(quest_options);
      //eval_question(quest_options);
      // query with all options for this question

      // alt1
      count_paths_for_alternative(quest_num, 1, quest_options['alt1']);
      // alt2

    }
    // TODO remove this only uses the first question
    break;
  }
  return copa_query_options;
}




/*
 * To decide copa questions by max found path heuristic.
 */
function count_paths_for_alternative(quest_num, alt_num, quest_options, callback) {
  path_len_sum = 0;
  questions_processed = 0;
  // console.log("quest_options",quest_options)
  for (query_opt in quest_options) {



    // console.log("query_opt",query_opt);
    // generate query
    query = build_copa_query(quest_options[query_opt][0], quest_options[query_opt][1], quest_options[
      query_opt][2], quest_options[query_opt][3],'allshorttest',5,15);
    // query graph db
    console.log(query);
    query_db(query);

    // query_db_with_action(url, query, function (data) {
    //   path_len_sum += data.data.length;
    //   questions_processed += 1;
    //   console.log('PATH LEN',
    //     // TODO change call in a way that right query opts are outputed aka chain the appropiate one to the callback
    //     quest_num, alt_num, data.data.length, quest_options[query_opt][0], quest_options[query_opt][1],
    //     quest_options[query_opt][2], quest_options[query_opt][3]);
    // 
    // 
    //   // if (questions_processed == 1){
    //   //  // 
    //   //  callback(paths);
    //   // }
    // });
  }

}

/*
 * Build cypher query with given data. Algorithm parameters are from the GUI.
 */
function build_copa_query(start_content, start_type, end_content, end_type,algo, max_length,max_paths) {
  console.log(start_content, start_type, end_content, end_type, algo, max_length, max_paths);
  var query = 'START ';

  // start node
  query += 'n=node:' + start_type + '(' + (start_type == 'nouns' ? 'word' : 'term') + '="' + start_content +
    '" ),'
  // end node
  query += 'm=node:' + end_type + '(' + (end_type == 'nouns' ? 'word' : 'term') + '="' + end_content + '")\n'

  // set algorithm and path length
  if ( algo == 'allshorttest') {
    query += 'MATCH p=allShortestPaths((n)-[*..' + max_length + ']->(m))\n';
  } else if (algo == 'allshorttest'){
    query += 'MATCH p=shortestPath((n)-[*..' + max_length + ']->(m))\n';      
  }

  query += 'RETURN EXTRACT( n in FILTER( x IN nodes(p) WHERE HAS(x.word)) | [id(n),n.word] ) as nouns,\n';
  query += 'EXTRACT( s in FILTER( v IN nodes(p) WHERE HAS(v.term)) | [id(s),s.term] ) as stats,\n';
  query += 'EXTRACT( r IN relationships(p) |[id(r),type(r),r]) as rels, ';
  query += 'p LIMIT ' + max_paths + ';'

  return query;
}

// evaluation code 
// Copa Quesst structure
// alt1_nouns: Array[2]
// alt1_stats: Array[2]
// alt1_text: "Many citizens relocated to the capitol."
// alt2_nouns: Array[3]
// alt2_stats: Array[3]
// alt2_text: "Many citizens took refuge in other territories."
// premise_nouns: Array[2]
// premise_stats: Array[2]
// premise_text: "Political violence broke out in the nation."


// var paths_lens = {};
// 

/*
 * Gets all option for the combination of the premise and one alternative.
 */
function all_premise_alt_options(copa_quest, alt_num) {
  options = []
  console.log(copa_quest);
  // get data for given alternative
  alt_name = "alt" + alt_num;
  alt_nouns = copa_quest[alt_name + "_nouns"]
  alt_stats = copa_quest[alt_name + "_stats"]
  
  prem_nouns = copa_quest['premise_nouns']
  prem_stats = copa_quest['premise_stats']
  
  // make all p noun - a state
  options = make_option_bundle(options, prem_nouns, alt_stats, 'nouns', 'stats');
  // make all a noun - p state
  options = make_option_bundle(options, alt_nouns, prem_stats, 'nouns', 'stats');
  // make all p noun - a noun
  options = make_option_bundle(options, prem_nouns, alt_nouns, 'nouns', 'nouns');
  // make all p state - a state
  options = make_option_bundle(options, prem_stats, alt_stats, 'stats', 'stats');
  return options;
}
 
/*
 * Add all query options for one query mode e.g. noun noun.
 */
function make_option_bundle(options, contents1, contents2, type1, type2) {
  for (item1 in contents1) {
    for (item2 in contents2) {
      options.push([contents1[item1], type1, contents2[item2], type2])
      // TODO remove
      break;
    }
    // TODO remove
    break;
  }
  return options;
}
 


//console.log(db);
var query = 'START n=node:nouns(word="body" ),m=node:nouns(word="grass") MATCH p=allShortestPaths((n)-[*..5]->(m)) \ RETURN EXTRACT( n in FILTER( x IN nodes(p) WHERE HAS(x.word)) | [id(n),n.word] ) as nouns, EXTRACT( s in FILTER( v IN nodes(p) WHERE HAS(v.term)) | [id(s),s.term] ) as stats, EXTRACT( r IN relationships(p) |[id(r),type(r),r]) as rels, p LIMIT 15';



json_path = '../../website/data/copa_quest.json';
eval_with_copa_questions(json_path);

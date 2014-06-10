"use strict";
/*
* evaluation code 
*
* Copa Quest structure.
*
* alt1_nouns: Array[2]
* alt1_stats: Array[2]
* alt1_text: "Many citizens relocated to the capitol."
* alt2_nouns: Array[3]
* alt2_stats: Array[3]
* alt2_text: "Many citizens took refuge in other territories."
* premise_nouns: Array[2]
* premise_stats: Array[2]
* premise_text: "Political violence broke out in the nation."
*/

//var express = require('express');
var request = require('request'),
  async = require('async'),
  Q = require('q'),
  neo4j = require('neo4j'),
  fs = require('fs');

var db = new neo4j.GraphDatabase('http://localhost:7474'),
  url = 'http://localhost:7474/db/data/cypher';

/*
* Load copa questions from file
*/
function eval_with_copa_questions(json_path){

  console.log('loading questions from: ' + json_path);
 
  fs.readFile(json_path, 'utf8', function (err, data) {
    if (err) {
      console.log('Error: ' + err);
      // return;
    }
    var copa_data = JSON.parse(data);
    eval_all_copa_questions(copa_data.questions);
  });
}


/*
 * Eval all copa questions.
 */
function eval_all_copa_questions(copa_questions) {
  for (var quest_num in copa_questions) {
    if (copa_questions.hasOwnProperty(quest_num)) {
      // Eval this copa question.
      eval_copa_question(copa_questions[quest_num], quest_num)
      .then( function (results) {
        console.log('quest_num\t' + results[0].quest_num + '\t' + results[0].data.path_count + '\t' + results[1].data.path_count + '\t' + results[0].data.path_len_sum + '\t' + results[1].data.path_len_sum);
      } // TODO add error function);
    );

    }
    if (quest_num === '2'){
      // TODO remove this only uses the first question
      console.log('DEV MODE ONLY FIRST QUESTION PROCESSED');
      break;
    }
  }

  // TODO collect promises
  // return Q.all([
  //     eventualAdd(2, 2),
  //     eventualAdd(10, 20)
  // ]);
}

/*
 * Check if a single copa question was answered correct.
 */
function eval_copa_question(copa_question,quest_num) {
  // all query options for this copa question
  var quest_options = {};

  // for alternative 1
  quest_options['alt1'] = all_premise_alt_options(copa_question, 1);
  //for alternative 2
  quest_options['alt2'] = all_premise_alt_options(copa_question, 2);


  // TODO result 2 is always the same
  // query with all options for this question
  return Q.all([
    count_paths_for_alternative(quest_num, 1, quest_options['alt1']),
    count_paths_for_alternative(quest_num, 2, quest_options['alt2'])
    ]);
}

/*
 * Count found paths for one alternative.
 */
function count_paths_for_alternative(quest_num, alt_num, quest_options) {
  var path_len_sum = 0,
    path_lens = 0;
  //console.log('quest_options',quest_options)

  return Q.Promise(function(resolve, reject, notify) {

    count_paths(quest_options, function(err, result) {
      // console.log('Result: ' + quest_num  + '\t' + alt_num + '\t'+ result);
      // Return  path count sum.
      resolve({'quest_num' :quest_num, 'alt_num' : alt_num, 'data' : result });
    });
  });
}

/*
* Query DB for one alternative and counting found paths.
*/
function count_paths(quest_options, callback) { 
  var path_count = 0;
  var path_len_sum = 0;
  // console.log('Fired queries\t' + quest_options.length);
  async.forEach(quest_options, 
    function(quest_option, callback) {
      // generate query
      //console.log('query_opt: ' + quest_option);
      query = build_copa_query(quest_option[0], quest_option[1], quest_option[2], quest_option[3],'allshorttest',5,15);

      // query neo4j and count found paths
      db.query(query, {}, function (err, result) {

        /*
        * Path count heuristic.
        */
        // add the found path to the count for this alternative
        path_count += result.length;
        
        /*
        * Path length heuristic.
        */
        // for path length heuristic loop over results and add path length
        for (resultNr in result){
          // this is the length of one path 
          path_len_sum += result[resultNr]['p'].length;
          // console.log(query + ' ### ' + found_paths + JSON.stringify(result));
        }

        // signal that call back finished
        callback();
      });

      // db.query(query, {}, function (err, result) {
      //   return get_path_length(result,path_count);
      // });
      //parseAndProcessFeed(item, callback);
    }, 
    function(err) {
      if (err){
        console.log('A call failed to process');
      }
      // runs after all items calls have finished
      //callback(err, path_count);
      callback(err, {'path_count' : path_count,'path_len_sum' : path_len_sum});
    }
  );
}

/*
 * Build cypher query with given data. Algorithm parameters are from the GUI.
 */
function build_copa_query(start_content, start_type, end_content, end_type,algo, max_length,max_paths) {
  // console.log(start_content, start_type, end_content, end_type, algo, max_length, max_paths);
  var query = 'START ';

  // start node
  query += 'n=node:' + start_type + '(' + (start_type === 'nouns' ? 'word' : 'term') + '="' + start_content +
    '" ),';
  // end node
  query += 'm=node:' + end_type + '(' + (end_type === 'nouns' ? 'word' : 'term') + '="' + end_content + '")\n';

  // set algorithm and path length
  if ( algo === 'allshorttest') {
    query += 'MATCH p=allShortestPaths((n)-[*..' + max_length + ']->(m))\n';
  } else if (algo === 'allshorttest'){
    query += 'MATCH p=shortestPath((n)-[*..' + max_length + ']->(m))\n';      
  }

  query += 'RETURN EXTRACT( n in FILTER( x IN nodes(p) WHERE HAS(x.word)) | [id(n),n.word] ) as nouns,\n';
  query += 'EXTRACT( s in FILTER( v IN nodes(p) WHERE HAS(v.term)) | [id(s),s.term] ) as stats,\n';
  query += 'EXTRACT( r IN relationships(p) |[id(r),type(r),r]) as rels, ';
  query += 'p LIMIT ' + max_paths + ';'

  return query;
}

/*
 * Gets all option for the combination of the premise and one alternative.
 */
function all_premise_alt_options(copa_quest, alt_num) {
  var options = [];
  //console.log(copa_quest);

  // get data for given alternative
  var alt_name = 'alt' + alt_num,
    alt_nouns = copa_quest[alt_name + '_nouns'],
    alt_stats = copa_quest[alt_name + '_stats'],
    prem_nouns = copa_quest['premise_nouns'],
    prem_stats = copa_quest['premise_stats'];

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
  for (var item1 in contents1) {
    for (var item2 in contents2) {
      options.push([contents1[item1], type1, contents2[item2], type2])
    }
  }
  // console.log(options.length + ' options');
  return options;
}

var TEST_QUERY = 'START n=node:nouns(word="body" ),m=node:nouns(word="grass") MATCH p=allShortestPaths((n)-[*..5]->(m)) \ RETURN EXTRACT( n in FILTER( x IN nodes(p) WHERE HAS(x.word)) | [id(n),n.word] ) as nouns, EXTRACT( s in FILTER( v IN nodes(p) WHERE HAS(v.term)) | [id(s),s.term] ) as stats, EXTRACT( r IN relationships(p) |[id(r),type(r),r]) as rels, p LIMIT 15';

var JSON_PATH = '../../website/data/copa_quest.json';
eval_with_copa_questions(JSON_PATH);

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

var max_path_length = 4,
  max_path_count = 15;

var quests_to_test = 500;

var directed = true;

var debug_output = false;

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
* Calculate accuracy values for eval results.
*/
function calc_accuracy(eval_results){

  var decisions = {
                  'path_count' : {
                    'right' : 0,
                    'wrong' : 0,
                    'same' : 0
                  }, 
                  'path_len' : {
                    'right' : 0,
                    'wrong' : 0,
                    'same' : 0
                  }, 
                  'path_count_len' : {
                    'right' : 0,
                    'wrong' : 0,
                    'same' : 0
                  }, 
                  'pmi_sum' : {
                    'right' : 0,
                    'wrong' : 0,
                    'same' : 0
                  }, 
                  'cos_sum' : {
                    'right' : 0,
                    'wrong' : 0,
                    'same' : 0
                  },
                  'pmi_mean' : {
                    'right' : 0,
                    'wrong' : 0,
                    'same' : 0
                  }, 
                  'cos_mean' : {
                    'right' : 0,
                    'wrong' : 0,
                    'same' : 0
                  },
                  'pmi_count' : {
                    'right' : 0,
                    'wrong' : 0,
                    'same' : 0
                  }, 
                  'cos_count' : {
                    'right' : 0,
                    'wrong' : 0,
                    'same' : 0
                  }
  }
  // console.log(Object.keys(eval_results));

  eval_results.forEach(function(eval_result) {
    // console.log('result:' + eval_result);
    /*
    * Count results for different eval types.
    */
    // Path count.
    var choosenAlternativePathCount = decide_by_greater_number(eval_result.path_count1, eval_result.path_count2);
    decisions.path_count = add_decision(decisions.path_count, eval_result.correctAlternative, choosenAlternativePathCount);

    // Path length.
    var choosenAlternativePathLen = decide_by_smaller_number(eval_result.path_len_sum1, eval_result.path_len_sum2);
    decisions.path_len = add_decision(decisions.path_len, eval_result.correctAlternative, choosenAlternativePathLen);

    // Path count/ length
    var path_by_len1;
    if (eval_result.path_len_sum1 != 0){
      path_by_len1 = eval_result.path_count1 * 1.0 / eval_result.path_len_sum1;
    } else {
      path_by_len1 = 0;
    }

    var path_by_len2;
    if (eval_result.path_len_sum2 != 0){
      path_by_len2 = eval_result.path_count2 * 1.0 / eval_result.path_len_sum2;
    } else {
      path_by_len2 = 0;
    }

    var choosenAlternativePathCountLen = decide_by_greater_number(path_by_len1 , path_by_len2);
    decisions.path_count_len = add_decision(decisions.path_count_len, eval_result.correctAlternative, choosenAlternativePathCountLen);

    // PMI
    var choosenAlternativePmiSum = decide_by_greater_number(eval_result.pmi_sum1, eval_result.pmi_sum2);
    decisions.pmi_sum = add_decision(decisions.pmi_sum, eval_result.correctAlternative, choosenAlternativePmiSum);

    // COS min
    var choosenAlternativeCosSum = decide_by_smaller_number(eval_result.cos_sum1, eval_result.cos_sum2);
    decisions.cos_sum = add_decision(decisions.cos_sum, eval_result.correctAlternative, choosenAlternativeCosSum);

    // PMI mean
    var choosenAlternativePmiMean = decide_by_greater_number(eval_result.pmi_sum1 / eval_result.pmi_count1, eval_result.pmi_sum2 / eval_result.pmi_count2);
    decisions.pmi_mean = add_decision(decisions.pmi_mean, eval_result.correctAlternative, choosenAlternativePmiMean);

    // COS min mean
    var choosenAlternativeCosMean = decide_by_smaller_number(eval_result.cos_sum1 / eval_result.cos_count1, eval_result.cos_sum2 / eval_result.cos_count2);
    decisions.cos_mean = add_decision(decisions.cos_mean, eval_result.correctAlternative, choosenAlternativeCosMean);

    // PMI mean
    var choosenAlternativePmiCount = decide_by_greater_number(eval_result.pmi_count1, eval_result.pmi_count2);
    decisions.pmi_count = add_decision(decisions.pmi_count, eval_result.correctAlternative, choosenAlternativePmiCount);

    // COS min mean
    var choosenAlternativeCosCount = decide_by_greater_number(eval_result.cos_count1, eval_result.cos_count2);
    decisions.cos_count = add_decision(decisions.cos_count, eval_result.correctAlternative, choosenAlternativeCosCount);

    // console.log(decisions);
  });

  /*
  * Calc accuracies
  */
  ['path_count', 'path_len', 'path_count_len', 'pmi_sum', 'cos_sum', 'pmi_mean', 'cos_mean','pmi_count', 'cos_count'].forEach( function (heuristic) {
    var decision = decisions[heuristic];
    var accuracy = decision.right / (decision.right + decision.wrong)

    // split same equally between both to emulate random choice in case where no alternative was choosen.
    var accuracy_complete = (decision.right + (decision.same / 2.0))/ (decision.right + decision.wrong + decision.same);

    console.log(heuristic + '\tacc: ' + accuracy + '\tacc_same: ' + accuracy_complete);
  });
  console.log(decisions);
  console.log('max_path_count: ' + max_path_count);
  console.log('max_path_length: ' + max_path_length);
  console.log('directed: ' + directed);
}

function add_decision(decision, correctAlternative, choosenAlternative){
  if (choosenAlternative == 0){
    decision.same += 1;
  } else if (correctAlternative == choosenAlternative){
    decision.right += 1;
  } else {
    decision.wrong += 1;
  }
  return decision;
}

/*
* Decide towards higher number.
*/
function decide_by_greater_number(count1, count2){

  if (count1 > count2){
    return 1;
  } else if (count2 > count1){
    return 2;
  } else {
    return 0;
  }
}

/*
* Decide towards smaller number.
*/
function decide_by_smaller_number(count1, count2){
  if (count1 < count2){
    return 1;
  } else if (count2 < count1){
    return 2;
  } else {
    return 0;
  }
}

/*
 * Eval all copa questions.
 */
function eval_all_copa_questions(copa_questions) {
  var questCount = copa_questions.length;

  var all_results = []

  for (var quest_num in copa_questions) {
    if (copa_questions.hasOwnProperty(quest_num)) {
      // Eval this copa question.
      eval_copa_question(copa_questions[quest_num], quest_num)
      .then( function (results) {
        console.log('qnr\t' + results[0].quest_num + '\t' +
          'c ' + results[0].correctAlternative + '\t' + results[0].data.path_count +'\t' +
          results[1].data.path_count + '\t' + results[0].data.path_len_sum + '\t' +
          results[1].data.path_len_sum + '\t' + results[0].data.pmi_sum + '\t' +
          results[1].data.pmi_sum + '\t' + results[0].data.cos_sum + '\t' +
          results[1].data.cos_sum);

        all_results.push({
          'quest_num' : results[0].quest_num,
          'correctAlternative' : results[0].correctAlternative,
          'path_count1' : results[0].data.path_count,
          'path_count2' : results[1].data.path_count,
          'path_len_sum1' : results[0].data.path_len_sum,
          'path_len_sum2' : results[1].data.path_len_sum,
          'pmi_sum1' : results[0].data.pmi_sum,
          'pmi_sum2' : results[1].data.pmi_sum,
          'cos_sum1' : results[0].data.cos_sum,
          'cos_sum2' : results[1].data.cos_sum,
          'pmi_count1' : results[0].data.pmi_count,
          'pmi_count2' : results[1].data.pmi_count,
          'cos_count1' : results[0].data.cos_count,
          'cos_count2' : results[1].data.cos_count
        });

        // Calculate accuracies after all results are in .
        if (Object.keys(all_results).length == quests_to_test){
          // console.log(all_results);
          calc_accuracy(all_results);
        }
      } // TODO add error function);
    );

    }
    if (quest_num == quests_to_test){
      // TODO remove this only uses the first question
      console.log('DEV MODE ONLY FIRST ' + quests_to_test + ' QUESTIONS PROCESSED');
      break;
    }

  }
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
    count_paths_for_alternative(quest_num, 1, quest_options['alt1'], copa_question['correctAlternative']),
    count_paths_for_alternative(quest_num, 2, quest_options['alt2'], copa_question['correctAlternative'])
    ]);
}

/*
 * Count found paths for one alternative.
 */
function count_paths_for_alternative(quest_num, alt_num, quest_options, correctAlternative) {
  var path_len_sum = 0,
    path_lens = 0;

  //console.log('quest_options',quest_options)

  return Q.Promise(function(resolve, reject, notify) {

    count_paths(quest_options, function(err, result) {
      // console.log('Result: ' + quest_num  + '\t' + alt_num + '\t'+ result);
      // Return  path count sum.
      resolve({'quest_num' :quest_num, 'alt_num' : alt_num, 'data' : result , 'correctAlternative' : correctAlternative});
    });
  });
}

function print_paths (result_item) {
  var result_parts = result_item.nouns.concat(result_item.stats).concat(result_item.rels);

  // Make mapping of neo4j Ids to strings
  var strings_to_ids = {}
  for (var part_index  in result_parts){
    // console.log(result_parts[part_index]);
    strings_to_ids[result_parts[part_index][0]] = result_parts[part_index][1]
  }
  // console.log(strings_to_ids);

  for (var rel_index in result_item.rels){
    var rel = result_item.rels[rel_index];
    var splitted_start_url = rel[2]._data['start'].split('/');
    var splitted_end_url = rel[2]._data['end'].split('/');
    var start_id = splitted_start_url[splitted_start_url.length - 1];
    var end_id = splitted_end_url[splitted_end_url.length - 1];

    console.log(strings_to_ids[start_id] + ' - ' + rel[1] + ' - ' + strings_to_ids[end_id]);
  }
  console.log();
}

/*
* Query DB for one alternative and counting found paths.
*/
function count_paths(quest_options, callback) { 
  var path_count = 0;
  var path_len_sum = 0;

  // To collect als rel. that have pmi or cos sim value.
  var rels_with_data = [];
  // console.log('Fired queries\t' + quest_options.length);
  async.forEach(quest_options, 
    function(quest_option, callback) {
      // generate query
      // console.log('query_opt: ' + quest_option);
      
      var query = build_copa_query(quest_option[0], quest_option[1], quest_option[2],
        // quest_option[3], 'shorttest', max_path_length, max_path_count);
        quest_option[3], 'allshorttest', max_path_length, max_path_count);

      // query neo4j and count found paths
      db.query(query, {}, function (err, result) {

        /*
        * Path count heuristic.
        */
        // add the found path to the count for this alternative
        path_count += result.length;

        // console.log(JSON.stringify(result) + '\n');

        /*
        * Path length heuristic.
        */
        // for path length heuristic loop over results and add path length
        result.forEach(function(result_item) {
          // this is the length of one path 
          path_len_sum += result_item['p'].length;

          // Print found paths
          if (debug_output){
            print_paths(result_item);
          }

          // console.log(query + ' ### ' + found_paths + JSON.stringify(result));
          result_item['rels'].forEach( function(rel) {
            // // exclude may be relations
            // if (rel[2].type != 'MAY_BE'){
            //   rels_with_data.push(rel[2]._data);
            //   // console.log(rel[2]._data);
            // }
          rels_with_data.push(rel[2]._data);
          });
        });

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

      // console.log(rels_with_data);
      // Remove double entries of rels.
      var unique_rels = make_rels_unique(rels_with_data);

      // Count and sum similarity measures.
      var pmi_count = 0;
      var pmi_sum = 0;
      var cos_count = 0;
      var cos_sum = 0;

      unique_rels.forEach( function (rel) {

        // console.log(rel);
        if (rel.data.hasOwnProperty('pmi')){
          pmi_count += 1;
          pmi_sum += rel.data.pmi;
        } else if (rel.data.hasOwnProperty('cos_dist')){
          cos_count += 1;
          cos_sum += rel.data.cos_dist;
        }
      });

      // console.log(pmi_sum + ' ' + pmi_count);

      // runs after all items calls have finished
      //callback(err, path_count);
      callback(err, {'path_count' : path_count,'path_len_sum' : path_len_sum,
                     'pmi_sum' : pmi_sum, 'pmi_count': pmi_count,
                     'cos_sum' : cos_sum, 'cos_count': cos_count });
    }
  );
}

/*
* Remove duplicate form array of relations.
*
* uses: start, end and type
*/
function make_rels_unique(rels){
  var uniq_rels = {};
  rels.forEach(function (rel) {
    var startNode = rel.start.split('/')[rel.start.split('/').length - 1];
    var endNode = rel.end.split('/')[rel.end.split('/').length - 1];
    // Make unique string with start, end and type, double entries just overwrite each other.
    uniq_rels[startNode + '_' + endNode + '_' + rel.type] = rel;
  });

  var uniq_rels_array = [];
  for(var o in uniq_rels) {
      uniq_rels_array.push(uniq_rels[o]);
  }
  // console.log(rels.length + ' ' +  uniq_rels_array.length);

  return uniq_rels_array;
}

/*
 * Build cypher query with given data. Algorithm parameters are from the GUI.
 */
function build_copa_query(start_content, start_type, end_content, end_type,algo, max_length,max_paths) {
  
  var query = 'START ';

  // start node
  query += 'n=node:' + start_type + '(' + (start_type === 'nouns' ? 'word' : 'term') + '="' + start_content +
    '" ),';
  // end node
  query += 'm=node:' + end_type + '(' + (end_type === 'nouns' ? 'word' : 'term') + '="' + end_content + '")\n';


  //set algorithm and path length

  if (directed) {
    // directed
    if ( algo === 'allshorttest') {
      query += 'MATCH p=allShortestPaths((n)-[*..' + max_length + ']->(m))\n';
    } else if (algo === 'shorttest'){
      query += 'MATCH p=shortestPath((n)-[*..' + max_length + ']->(m))\n';
    }
  } else {
    // undirected
    if ( algo === 'allshorttest') {
      query += 'MATCH p=allShortestPaths((n)-[*..' + max_length + ']-(m))\n';
    } else if (algo === 'allshorttest'){
      query += 'MATCH p=shortestPath((n)-[*..' + max_length + ']-(m))\n';
    }
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

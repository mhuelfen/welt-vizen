function query_db(url, query) {
  query_db_with_action(url, query, parse_results);
}

/*
 * Query Neo4J Graph Db.
 */
function query_db_with_action(url, query, action) {
  var data = {
    "query": query,
    // "params" : params.
  }

  jQuery.ajax({
    type: "POST",
    url: url,
    data: data,
    dataType: "json",
    //        success: parse_results, //,
    success: action,
    error: function (data) {
      console.log('error');
    }
  });
}

/*
 * Get id from a neo4j url.
 */
function id_from_url(url) {
  return url.split('/').slice(-1)[0];
}

/*
 * Get number of found results (paths)
 */
function get_paths_found(data) {
  var results = data.data;
  return results.length;

}

/*
 * Parse results from neo4J api for visualisation.
 */
function parse_results(data) {

  var nodes_from_query = [];
  var relations_for_viz = [];
  var paths_for_viz = [];
  var results = data.data;
  var link_counts = {};
  var unique_links = {};

  // display found results info
  update_results('Results found: ' + get_paths_found(data));

  // console.log("Data", data);
  // console.log("Results", results.length, results, results.length);

  for (var i = 0; i < results.length; i++) {

    // add noun nodes 
    for (var noun_ind = 0; noun_ind < results[i][0].length; noun_ind++) {
      var noun_data = results[i][0][noun_ind];
      nodes_from_query.push({
        'index': noun_data[0],
        'text': noun_data[1],
        'type': 'noun'
      })
    }
    // add state nodes 
    for (var stat_ind = 0; stat_ind < results[i][1].length; stat_ind++) {
      var stat_data = results[i][1][stat_ind];
      nodes_from_query.push({
        'index': stat_data[0],
        'text': stat_data[1],
        'type': 'stat'
      })
    }
    // add relation data
    for (var rel = 0; rel < results[i][2].length; rel++) {
      var rel_data = results[i][2][rel];

      var start_id = id_from_url(rel_data[2].start);
      var end_id = id_from_url(rel_data[2].end);
      var type = rel_data[1];

      // check if relation is already there to prevent double links in vizualisation
      var rel_type_key = "" + start_id + ":" + type + ":" + end_id;
      // only rels with different nodes or types
      if (!unique_links.hasOwnProperty(rel_type_key)) {
        unique_links[rel_type_key] = true;

        // count number of links
        var rel_key = "" + start_id + ":" + end_id;
        if (link_counts.hasOwnProperty(rel_key)) {
          link_counts[rel_key] = link_counts[rel_key] + 1
        } else {
          link_counts[rel_key] = 1
        }

        var relation = {
          'source': start_id,
          'target': end_id,
          'type': type,
          'link_num': link_counts[rel_key]
        };

        // get properties of relation
        var rel_properties = results[i][2][rel][2].data;
        for (attr in rel_properties) {
          relation[attr] = rel_properties[attr];
        }
        relations_for_viz.push(relation);
      }
    }
  }

  var paths = []
    // add path data	
  var path_nodes_urls;
  for (var i = 0; i < results.length; i++) {
    //        console.log("PATH", results[i][3].nodes);
    path_nodes = results[i][3].nodes;
    path_node_ids = []
    // nodes are str        
    for (var n = 0; n < path_nodes.length; n++) {
      path_nodes[n] = parseInt(id_from_url(path_nodes[n]));
    }
    // console.log(path_nodes);
    paths.push(path_nodes);

  }
  console.log("paths", paths);

  // console.log('nodes:', nodes_from_query);
  // console.log('rels', relations_for_viz);
  // console.log('nodes:', nodes_from_query[0]);
  // console.log('rels', relations_for_viz[0]);

  var nodes_for_viz = []

  // transform graph ids to indices starting from 0 for vizualisation 
  var node_ids = {}
  var id_count = 0;
  for (n in nodes_from_query) {
    graph_id = nodes_from_query[n].index;

    if (graph_id in node_ids) {
      // console.log("seen", graph_id ," to ", node_ids[graph_id])
      // nodes_from_query[n].index = node_ids[graph_id];
    } else {
      node_ids[graph_id] = id_count;
      var new_node = nodes_from_query[n];
      new_node.index = node_ids[graph_id];
      nodes_for_viz.push(new_node);
      id_count++;
      // console.log("new", graph_id ," to ", node_ids[graph_id], new_node)
    }
  }
  // change ids in relations from graph ids to new ones
  for (rel in relations_for_viz) {
    // console.log(relations_for_viz[rel], relations_for_viz[rel].source, " -- ", relations_for_viz[rel].target)
    relations_for_viz[rel].source = node_ids[relations_for_viz[rel].source];
    relations_for_viz[rel].target = node_ids[relations_for_viz[rel].target]

  }
  // change ids in path from graph ids to new ones
  $.each(paths, function (p_index, path) {
    $.each(path, function (n_index, node) {
      paths[p_index][n_index] = node_ids[node];
    });
  });

  draw_graph(nodes_for_viz, relations_for_viz, paths);
}

// function unique(elems) {
//     var unique = [];
//     $.each(elems, function (i, el) {
//         if ($.inArray(el, unique) === -1) unique.push(el);
//     });
//     return unique;
// }
var nodes;
var rels;

var linkedByIndex = {};
var paths;

function draw_graph(nodes_for_viz, relations_for_viz, paths_for_viz) {
    nodes = nodes_for_viz;
    rels = relations_for_viz;

    paths = paths_for_viz;

    var width = 960,
        height = 700;


    var force = d3.layout.force()
        .nodes(nodes_for_viz)
        .links(relations_for_viz)
        .size([width, height])
        .linkDistance(140)
        .charge(-1000)
        .on("tick", tick)
        .start();

    var fisheye = d3.fisheye.circular()
        .radius(200)
        .distortion(2);

    // remove old graph
    $('#graph_svg').remove();

    // make new graphic
    var svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("id", 'graph_svg');



    var link = svg.selectAll(".link")
        .data(force.links())
        .enter().append("line")
        .attr("class", "link")
        .style("stroke-width", function (d) {
            if (d.type == "IN_STATE") {
                return 1;
            } else {
                return 4;
            }
        });
    // .on("mouseover", link_mouseover)
    // .on("mouseout", link_mouseout);

    link.append("text")
        .attr("x", 12)
        .attr("dy", ".35em")
        .style("fill", "#000")
        .text(function (d) {
            return d.pmi;
        });
    // 
    var node = svg.selectAll(".node")
        .data(force.nodes())
        .enter().append("g")
        .attr("class", "node")
        .style("fill", function (d) {
            if (d.type == "stat") {
                return "blue";
            } else {
                return "red";
            }
        })
        .on("mouseover", node_mouseover)
        .on("mouseout", node_mouseout)
        .call(force.drag);



    // 
    node.append("circle")
        .attr("r", 8);
    // 
    node.append("text")
        .attr("x", 12)
        .attr("dy", ".35em")
        .style("fill", "#000")
        .text(function (d) {
            return d.text;
        });

    function tick() {
        link
            .attr("x1", function (d) {
                return d.source.x;
            })
            .attr("y1", function (d) {
                return d.source.y;
            })
            .attr("x2", function (d) {
                return d.target.x;
            })
            .attr("y2", function (d) {
                return d.target.y;
            });

        node
            .attr("transform", function (d) {
                return "translate(" + d.x + "," + d.y + ")";
            });
    }


    rels.forEach(function (d) {
        linkedByIndex[d.source.index + "," + d.target.index] = 1;
    });

}



d3.selection.prototype.moveToFront = function () {
    return this.each(function () {
        this.parentNode.appendChild(this);
    });
};

d3.selection.prototype.moveToBack = function () {
    return this.each(function () {
        var firstChild = this.parentNode.firstChild;
        if (firstChild) {
            this.parentNode.insertBefore(this, firstChild);
        }
    });
};


function node_mouseover() {
    d3.select(this).select("circle").transition()
        .duration(750)
        .attr("r", 16);

    d3.select(this).select("text")
        .transition()
        .duration(750)
        .attr("x", 20)
        .attr("dy", ".70em")
        .attr("class", "shadow")
        .style("font-size", "20px");
    d3.select(this).moveToFront();
    var node_id = d3.select(this)[0][0]['__data__']['index'];
    //    console.log(nodes[node_id]);

    var paths_with_node = paths_for_node(node_id, paths);
//    console.log("paths:", paths_with_node);

    d3.selectAll(".node")
        .style("stroke-opacity", function (d) {
            thisOpacity = isInPaths(d.index, paths_with_node) ? 1 : 0.1;
            this.setAttribute('fill-opacity', thisOpacity);
                       //console.log(d.index, "in", paths_with_node, "=", inP, " -> op:", thisOpacity)
            return thisOpacity;
      });


      d3.selectAll(".link").style("stroke-opacity", function (l) {
          return isInPaths(l.source.index, paths_with_node) && isInPaths(l.target.index, paths_with_node) ? 1 : 0.1;
      });


    //    //	highlight_node_links(d3.select(this),2);

}

function node_mouseout() {
    d3.select(this).select("circle").transition()
        .duration(750)
        .attr("r", 8);
    d3.select(this).select("text").transition()
        .duration(750)
        .attr("x", 12)
        .attr("dy", ".35em")
        .style("font-size", "10px");

// show all nodes
	    d3.selectAll(".node")
	        .style("stroke-opacity", function (d) {

	            thisOpacity =  1 ;

	            this.setAttribute('fill-opacity', thisOpacity);

	            return thisOpacity;
	        });
	//show all links
	      d3.selectAll(".link").style("stroke-opacity", 1 );
	
    // d3.select(this).moveToBack();
    // console.log(d3.select(this));

}

// get all paths with this node
function paths_for_node(node_id, paths) {
    var node_paths = [];
    $.each(paths, function (p_index, path) {
        if ($.inArray(node_id, path) != -1) {
// console.log("in",path,$.inArray(node_id, path));
                node_paths.push(p_index);
        }
    });
    return node_paths;
}

function isInPaths(node_id, path_ids) {
	var inP = false
    $.each(path_ids, function (i, p_id) {
//console.log(node_id,"in",p_id,":",paths[p_id],"->",$.inArray(node_id, paths[p_id]) != -1);
        if ($.inArray(node_id, paths[p_id]) != -1) {
            inP = true;
        }
    });
    return inP;
}
    // function link_mouseover() {
    // 	console.log("over link")
    //     d3.select(this).select("line").transition()
    //         .style("stroke-width", 8);
    // }
    // 
    // function link_mouseout() {
    //     d3.select(this).select("line")//.transition()
    //         .style("stroke-width", 2);
    // }

    // function highlight_node_links(node,i){
    // 
    //   var remainingNodes=[],
    //       nextNodes=[];
    // 
    //   var stroke_opacity = 0;
    //   if( d3.select(this).attr("data-clicked") == "1" ){
    //     d3.select(this).attr("data-clicked","0");
    //     stroke_opacity = 0.2;
    //   }else{
    //     d3.select(this).attr("data-clicked","1");
    //     stroke_opacity = 0.5;
    //   }
    // 
    //   var traverse = [{
    //                     linkType : "sourceLinks",
    //                     nodeType : "target"
    //                   },{
    //                     linkType : "targetLinks",
    //                     nodeType : "source"
    //                   }];
    // 
    //   traverse.forEach(function(step){
    //     node[step.linkType].forEach(function(link) {
    //       remainingNodes.push(link[step.nodeType]);
    //       highlight_link(link.id, stroke_opacity);
    //     });
    // 
    //     while (remainingNodes.length) {
    //       nextNodes = [];
    //       remainingNodes.forEach(function(node) {
    //         node[step.linkType].forEach(function(link) {
    //           nextNodes.push(link[step.nodeType]);
    //           highlight_link(link.id, stroke_opacity);
    //         });
    //       });
    //       remainingNodes = nextNodes;
    //     }
    //   });
    // }
    // 
    // function highlight_link(id,opacity){
    //     d3.select("#link-"+id).style("stroke-opacity", opacity);
    // }
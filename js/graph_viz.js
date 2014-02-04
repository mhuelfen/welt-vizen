var nodes;
var rels;

var linkedByIndex = {};
var paths;

var mouseDown = 0;


function draw_legend(svg,legend_content,rel_types){

	var legend = svg.append("g")
	    .attr("class", "legend")
	//.attr("x", w - 65)
	//.attr("y", 50)
	    .attr("height", 100)
	    .attr("width", 100)
	    .attr('transform', 'translate(-20,50)')

	var w = svg[0][0].clientWidth;    

	legend.selectAll('rect')
	    .data(rel_types)
	    .enter()
	    .append("rect")
	    .attr("x", w - 165)
	    .attr("y", function (d, i) {
	        return i * 20 +5;
	    })
	    .attr("width", 20)
	    .attr("height", 1)
	    .style("stroke-width", 2)
	    .style("stroke", function (d) {
//	        var color = color_hash[dataset.indexOf(d)][1];
		        var color = legend_content[d].color;
		console.log(d);
	        return color;
	    });
	

	legend.selectAll('text')
	    .data(rel_types)
	    .enter()
	    .append("text")
	    .attr("x", w - 142)
	    .attr("y", function (d, i) {
	        return i * 20 + 9;
	    })
	    .text(function (d) {
		    var text = legend_content[d].text;
	    
	    //    var text = color_hash[dataset.indexOf(d)][0];
	        return text;
	    });

}
	
function draw_graph(nodes_for_viz, relations_for_viz, paths_for_viz) {
    nodes = nodes_for_viz;
    rels = relations_for_viz;

    var node_diameter = 8;

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

    // remove old graph
    $('#graph_svg').remove();

    // make new graphic
    var svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("id", 'graph_svg');

    var rel_colors = {  "IN_STATE" : { color : "green", text : "noun in statement"},
                        "MAY_BE" : { color :"violet", text : "noun may be"},
                        "SIM_NOUN": { color :"brown",text : "similar nouns"},
                        "SIM_STAT": { color :"blue",text : "similar statements"}
                     }
    var rel_types = ["IN_STATE","MAY_BE","SIM_NOUN","SIM_STAT"]

    // arrow head
	svg.append("defs").append("marker")
	    .attr("id", "arrowhead")
	    .attr("refX", node_diameter + 5) /*must be smarter way to calculate shift*/
	    .attr("refY", 2)
	    .attr("markerWidth", 6)
	    .attr("markerHeight", 4)
	    .attr("orient", "auto")
	    .append("path")
        .attr("d", "M 0,0 V 4 L6,2 Z");

    // graph legend
    draw_legend(svg,rel_colors,rel_types);

    var link = svg.selectAll(".link")
        .data(force.links())
        .enter().append("line")
        .attr("class", "link")
        .style("stroke", function (d) {
            return rel_colors[d.type].color;
        })
        .style("stroke-width", 1)
        .attr("marker-end", function (d){
             if (!(d.type == "SIM_NOUN" || d.type == "SIM_STAT"))
                return "url(#arrowhead)";
        });

    //         .style("stroke-width", function (d) {
    //             if (d.type == "IN_STATE") {
    //                 return 1;
    //             } else {
    //                 return 4;
    //             }
    //         })
    // ;
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
    // draw node 
    node.append("circle")
        .attr("r", node_diameter);
    // add text
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
    // rels.forEach(function (d) {
    //     linkedByIndex[d.source.index + "," + d.target.index] = 1;
    // });


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
    if (!mouseDown) {
        console.log("mouse", mouseDown);
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

        //    //    highlight_node_links(d3.select(this),2);
    }
}

function node_mouseout() {
    if (!mouseDown) {

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

                thisOpacity = 1;

                this.setAttribute('fill-opacity', thisOpacity);

                return thisOpacity;
            });
        //show all links
        d3.selectAll(".link").style("stroke-opacity", 1);

        // d3.select(this).moveToBack();

    }
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
        if ($.inArray(node_id, paths[p_id]) != -1) {
            inP = true;
        }
    });
    return inP;
}


$(document).mousedown(function () {
    ++mouseDown;
});

$(document).mouseup(function () {
    --mouseDown;
});
// function link_mouseover() {
//  console.log("over link")
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
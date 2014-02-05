var nodes;
var rels;

var linkedByIndex = {};
var paths;

var mouseDown = 0;

var max_stroke_width = 5;
var min_stroke_width = 2;
var stroke_range = max_stroke_width - min_stroke_width;
var max_cos_dist = 0.88;
var min_cos_dist = 0.65;

var max_pmi = 0;
var min_pmi = 1;


function draw_legend(svg, legend_content, rel_types) {

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
            return i * 20 + 5;
        })
        .attr("width", 20)
        .attr("height", 1)
        .style("stroke-width", 2)
        .style("stroke", function (d) {
            //          var color = color_hash[dataset.indexOf(d)][1];
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

    var width = 600,
        height = 680;

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
//    var svg = d3.select("body").append("svg")
    var svg = d3.select("#draw_area").append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("id", 'graph_svg');

    var rel_colors = {
        "IN_STATE": {
            color: "green",
            text: "noun in statement"
        },
        "MAY_BE": {
            color: "violet",
            text: "noun may be"
        },
        "SIM_NOUN": {
            color: "brown",
            text: "similar nouns"
        },
        "SIM_STAT": {
            color: "blue",
            text: "similar statements"
        }
    }
    var rel_types = ["IN_STATE", "MAY_BE", "SIM_NOUN", "SIM_STAT"]

    // arrow head
    svg.append("defs").append("marker")
        .attr("id", "arrowhead")
        .attr("viewBox", "0 0 10 10")
        .attr("refX", node_diameter + 14) /*must be smarter way to calculate shift*/
        .attr("refY", 5)
        .attr("markerUnits", "strokeWidth")
        .attr("markerWidth", 4)
        .attr("markerHeight", 3)
        .attr("orient", "auto")
        .append("path")
//        .style("stroke-opacity", 0.5)
        .attr("d", "M 0 0 L 10 5 L 0 10 z");

    // graph legend
    draw_legend(svg, rel_colors, rel_types);

    var link = svg.selectAll(".link")
        .data(force.links())
        .enter().append("line")
        .attr("class", "link")
        .style("stroke", function (d) {
            console.log("line", d.type)
            return rel_colors[d.type].color;

        })
        .style("stroke-width", function (d) {
            if (d.type == "SIM_NOUN" || d.type == "SIM_STAT") {
                // calc how much of stroke width range is used
                var percent = (d.cos_dist - min_cos_dist) / (max_cos_dist - min_cos_dist);
                console.log(d, d.cos_dist);
                console.log("p", percent, "calc", d.cos_dist, min_cos_dist, "/", max_cos_dist, min_cos_dist);
                console.log("w", min_stroke_width + stroke_range * percent);
                return min_stroke_width + stroke_range * percent;
            } else if (d.type == "IN_STATE") {
                var percent = (d.pmi - min_pmi) / (max_pmi - min_pmi);
                console.log(d,"pmi_stroke",min_stroke_width + stroke_range * percent, "p",percent)
                return min_stroke_width + stroke_range * percent;

            }
        })
        .attr("marker-end", function (d) {
            if (!(d.type == "SIM_NOUN" || d.type == "SIM_STAT"))
                return "url(#arrowhead)";
        })
        .style("stroke-opacity",0.5);


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
            return isInPaths(l.source.index, paths_with_node) && isInPaths(l.target.index, paths_with_node) ? 0.5 : 0.1;
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
        d3.selectAll(".link").style("stroke-opacity", 0.5);

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

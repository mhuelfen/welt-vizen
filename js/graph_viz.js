function draw_graph(nodes_for_viz,relations_for_viz) {

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
    .style("stroke-width", function(d) { if (d.type == "IN_STATE") {return 1;} else{return 4;} });
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
    .style("fill", function(d) { if (d.type == "stat") {return "blue";} else{return "red";} })
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
}

d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};

d3.selection.prototype.moveToBack = function() { 
    return this.each(function() { 
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
        .style("font-size","20px");
		d3.select(this).moveToFront();
}

function node_mouseout() {
    d3.select(this).select("circle").transition()
        .duration(750)
        .attr("r", 8);
   d3.select(this).select("text").transition()
       .duration(750)
       .attr("x", 12)
       .attr("dy", ".35em")
       .style("font-size","10px");
		// d3.select(this).moveToBack();
	// console.log(d3.select(this));

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

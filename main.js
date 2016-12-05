            window.addEventListener('message', function(e) {
                var opts = e.data.opts,
                    data = e.data.data;

                return main(opts, data);
            });

            var defaults = {
                margin: {top: 24, right: 0, bottom: 0, left: 0},
                rootname: "TOP",
                format: ",.1%",
                title: "",
                width: window.innerWidth,
                height: window.innerHeight
            };
            var data_F1 = [], data_F2 = [];

            var division_selected,
                counter = 0,
                selection = "Playground";

            function main(o, data) {
              var root,
                  opts = $.extend(true, {}, defaults, o),
                  rname = opts.rootname,
                  margin = opts.margin,
                  theight = 36 + 16;

              var width = $('#chart').width(),
                    height = window.innerHeight*0.8,
                    transitioning;

              var color = d3.scale.linear()
                    .domain([0.5,1])
                    .range(["#CFD2DE","#373F68"]);

              var x = d3.scale.linear()
                  .domain([0, width])
                  .range([0, width]);

              var y = d3.scale.linear()
                  .domain([0, height])
                  .range([0, height]);

              var treemap = d3.layout.treemap()
                  .children(function(d, depth) { return depth ? null : d._children; })
                  .sort(function(a, b) { return a.value - b.value; })
                  .ratio(height / width * 0.5 * (1 + Math.sqrt(5)))
                  .round(false);

              var svg = d3.selectAll("svg")
                  .attr("width", width + margin.left + margin.right)
                  .attr("height", height + margin.bottom + margin.top)
                  .style("margin-left", -margin.left + "px")
                  .style("margin.right", -margin.right + "px")
                  .append("g")
                  .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
                  .style("shape-rendering", "crispEdges");

              var grandparent = svg.append("g")
                  .attr("class", "grandparent");

              grandparent.append("rect")
                  .attr("y", -margin.top)
                  .attr("width", width)
                  .attr("height", margin.top);

              grandparent.append("text")
                  .attr("x", 6)
                  .attr("y", 6 - margin.top)
                  .attr("dy", ".75em");

              if (opts.title) {
                $("#chart").prepend("<p class='title'>" + opts.title + "</p>");
              }
              if (data instanceof Array) {
                root = { key: rname, values: data };
              } else {
                root = data;
              }

              initialize(root);
              accumulate(root);
              layout(root);
              display(root);

              if (window.parent !== window) {
                var myheight = document.documentElement.scrollHeight || document.body.scrollHeight;
                window.parent.postMessage({height: myheight}, '*');
              }

              function formatNumber(d){
                  var rounded = d3.format("r");
                  return rounded((d*100).toFixed(2));
              }

              function camelize(str) {
                  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function(letter, index) {
                    return index == 0 ? letter.toUpperCase() : letter.toLowerCase();
                  }).replace(/\s+/g, '');
                }

              function initialize(root) {
                root.x = root.y = 0;
                root.dx = width;
                root.dy = height;
                root.depth = 0;
              }

              // Aggregate the values for internal nodes. This is normally done by the
              // treemap layout, but not here because of our custom implementation.
              // We also take a snapshot of the original children (_children) to avoid
              // the children being overwritten when when layout is computed.
              function accumulate(d) {
                return (d._children = d.values)
                    ? d.value = d.values.reduce(function(p, v) { return p + accumulate(v); }, 0)
                    : d.value;
              }

              // Compute the treemap layout recursively such that each group of siblings
              // uses the same size (1×1) rather than the dimensions of the parent cell.
              // This optimizes the layout for the current zoom state. Note that a wrapper
              // object is created for the parent node for each group of siblings so that
              // the parent’s dimensions are not discarded as we recurse. Since each group
              // of sibling was laid out in 1×1, we must rescale to fit using absolute
              // coordinates. This lets us use a viewport to zoom.
              function layout(d) {
                if (d._children) {
                  treemap.nodes({_children: d._children});
                  d._children.forEach(function(c) {
                    c.x = d.x + c.x * d.dx;
                    c.y = d.y + c.y * d.dy;
                    c.dx *= d.dx;
                    c.dy *= d.dy;
                    c.parent = d;
                    layout(c);
                  });
                }
              }

              function display(d) {

                grandparent
                    .datum(d.parent)
                    .on("click", transition)
                    .select("text")
                    .text(name(d));

                var g1 = svg.insert("g", ".grandparent")
                    .datum(d)
                    .attr("class", "depth");

                var g = g1.selectAll("g")
                    .data(d._children)
                    .enter().append("g");

                g.filter(function(d) { return d._children; })
                    .classed("children", true)
                    .on("click", transition);

                var children = g.selectAll(".child")
                    .data(function(d) { return d._children || [d]; })
                    .attr("id",function(d){
                        return d.key;
                    })
                  .enter().append("g")


                children.append("rect")
                    .attr("class", "child")
                    .call(rect)
                    .attr("id",function(d){
                        return d.key;
                    })
                    .append("title")
                    .text(function(d) {

                        switch(selection){
                            case "Electricity":
                                return  d.key + " (" + formatNumber(d.Electricity/d.Count) + "%)";
                            case "Playground" :
                                return  d.key + " (" + formatNumber(d.Playground/d.Count) + "%)";
                            case "Water" :
                                return  d.key + " (" + formatNumber(d.Water/d.Count) + "%)";
                            case "GClassrooms" :
                                return  d.key + " (" + formatNumber(d.Clgood/d.Clrooms) + "%)";
                            case "MjClassrooms" :
                                return  d.key + " (" + formatNumber(d.Clmajor/d.Clrooms) + "%)";
                            case "MnClassrooms" :
                                return  d.key + " (" + formatNumber(d.Clminor/d.Clrooms) + "%)";
                            case "ToiletB" :
                                return  d.key + " (" + formatNumber(d.Toilet_B) + ")";
                            case "ToiletG" :
                                return  d.key + " (" + formatNumber(d.Toilet_G) + ")";
                            case "CAL" :
                                return  d.key + " (" + formatNumber(d.CAL/d.Count) + "%)";
                            case "Library" :
                                return  d.key + " (" + formatNumber(d.Library/d.Count) + "%)";
                            case "Medical" :
                                return  d.key + " (" + formatNumber(d.Medical/d.Count) + "%)";
                            case "Ramp" :
                                return  d.key + " (" + formatNumber(d.Ramps/d.Count) + "%)";
                            case "Meal" :
                                return  d.key + " (" + Math.min(formatNumber(d.MDM/d.Count),100) + "%)";
                        }

                });

                  children.append("text")
                    .attr("class", "ctext")
                    .text(function(d) { return (d.key); })
                    .call(text2)
                    ;

                g.append("rect")
                    .attr("class", "parent")
                    .call(rect)
                    .attr("id",function(d){
                        return d.key;
                    })
                    ;

                var t = g.append("text")
                    .attr("class", "ptext")
                    .attr("dy", ".75em")


                t.append("tspan")
                    .text(function(d) { return d.key; });
                t.append("tspan")
                    .attr("dy", "1.0em")
                    .text(function(d) {

                    switch(selection){
                            case "Electricity":
                                return  " (" + formatNumber(d.Electricity/d.Count) + "%)";
                            case "Playground" :
                                return  " (" + formatNumber(d.Playground/d.Count) + "%)";
                            case "Water" :
                                return  " (" + formatNumber(d.Water/d.Count) + "%)";
                            case "GClassrooms" :
                                return  " (" + formatNumber(d.Clgood/d.Clrooms) + "%)";
                            case "MjClassrooms" :
                                return  " (" + formatNumber(d.Clmajor/d.Clrooms) + "%)";
                            case "MnClassrooms" :
                                return  " (" + formatNumber(d.Clminor/d.Clrooms) + "%)";
                            case "ToiletB" :
                                return  " (" + formatNumber(d.Toilet_B) + ")";
                            case "ToiletG" :
                                return  " (" + formatNumber(d.Toilet_G) + ")";
                            case "CAL" :
                                return  " (" + formatNumber(d.CAL/d.Count) + "%)";
                            case "Library" :
                                return  " (" + formatNumber(d.Library/d.Count) + "%)";
                            case "Medical" :
                                return  " (" + formatNumber(d.Medical/d.Count) + "%)";
                            case "Ramp" :
                                return  " (" + Math.max(0, Math.min(formatNumber(d.Ramps/d.Count, 100))) + "%)";
                            case "Meal" :
                                return  " (" + Math.min(formatNumber(d.MDM/d.Count),100) + "%)";
                        }

                });

                t.call(text);

                svg.append("rect")
                   .attr('x', 0)
                   .attr('y', 0)
                   .attr('id', 'hover-effect')
                   .attr('width', 0)
                   .attr('height', 0)
                   ;

                g.selectAll("rect")
                    .style("fill", function(d) {
                        var color;
                        switch(selection){
                            case "Electricity":
                                color = d3.scale.linear()
                                                .domain([0,1])
                                                .range(["#CFD2DE","#373F68"]);
                                return color((d.Electricity/d.Count));
                            case "Playground" :
                                color = d3.scale.linear()
                                                .domain([0,1])
                                                .range(["#CFD2DE","rgb(19, 91, 73)"]);
                                return color((d.Playground/d.Count));
                            case "Water" :
                                color = d3.scale.linear()
                                                .domain([0.5,1])
                                                .range(["#CFD2DE","rgb(70, 109, 140)"]);
                                return color((d.Water/d.Count));
                            case "GClassrooms" :
                                color = d3.scale.linear()
                                                .domain([0,1])
                                                .range(["#CFD2DE","rgb(89, 89, 86)"]);
                                return color((d.Clgood/d.Clrooms));
                            case "MjClassrooms" :
                                color = d3.scale.linear()
                                                .domain([0,0.4])
                                                .range(["#9096a0","#6e727a","#4e5156","#2c2f33,#2c2f33,#2c2f33,#2c2f33","#2c2f33"]);
                                return color((d.Clmajor/d.Clrooms));
                            case "MnClassrooms" :
                                color = d3.scale.linear()
                                                .domain([0,0.4])
                                                .range(["#9096a0","rgb(89, 89, 86)"]);
                                return color((d.Clminor/d.Clrooms));
                            case "ToiletB" :    //TBD
                                color = d3.scale.linear()
                                                .domain([0,5000000])
                                                .range(["#CFD2DE","#d95f0e","#d4946e"]);
                                return color(d.Toilet_B);
                            case "ToiletG" :    //TBD
                                color = d3.scale.linear()
                                                .domain([0,4761200])
                                                .range(["white","#d95f0e"]);
                                return color(d.Toilet_G);
                            case "CAL" :
                                color = d3.scale.quantize()
                                                .domain([0,1])
                                                .range(["#f9bbd6","#f799c2","#f97cb3","#f75b9f","#f23285","#ce1062","#ce1062"]);
                                return color((d.CAL/d.Count));
                            case "Library" :
                                color = d3.scale.linear()
                                                .domain([0,1])
                                                .range(["#CFD2DE","rgb(112, 30, 45)"]);
                                return color((d.Library/d.Count));
                            case "Medical" :
                                color = d3.scale.linear()
                                                .domain([0,1])
                                                .range(["#CFD2DE","rgb(19, 62, 91)"]);
                                return color((d.Medical/d.Count));
                            case "Ramp" :
                                color = d3.scale.linear()
                                                .domain([0,1])
                                                .range(["#CFD2DE","#8856a7"]);
                                return color((d.Ramps/d.Count));
                            case "Meal" :
                                color = d3.scale.linear()
                                                .domain([0.5,2])
                                                .range(["#CFD2DE","#ff5400"]);
                                return color((d.MDM/d.Count));
                        }
                    })
                    .on("mouseover", function(){
                        for(var i = 0; i< $(".children").length ; i++){
                          for( var j = 0; j < $($(".children")[i]).children().length ; j++){
                              for( var k = 0; k < $($($(".children")[i]).children()[j]).children().length ; k++){
                                  if($($($(".children")[i]).children()[j]).children()[k].getAttribute('id') == this.getAttribute('id')){
                                    svg.select("#hover-effect")
//                                       .transition()
//                                       .duration(200)
                                       .attr('x', d3.select(($(".children")[i])).selectAll(".parent")[0][0].getAttribute('x'))
                                       .attr('y', d3.select(($(".children")[i])).selectAll(".parent")[0][0].getAttribute('y'))
                                       .attr('width', d3.select(($(".children")[i])).selectAll(".parent")[0][0].getAttribute('width'))
                                       .attr('height', d3.select(($(".children")[i])).selectAll(".parent")[0][0].getAttribute('height'))
                                       ;
                                  }
                              }
                          }
                        }
                    })
                    ;


                function transition(d) {
                  svg.select("#hover-effect")
//                     .transition()
//                     .duration(50)
                     .attr('width', 0)
                     .attr('height', 0)
                     ;
                  if (transitioning || !d) return;
                  transitioning = true;

                  var g2 = display(d),
                      t1 = g1.transition().duration(750),
                      t2 = g2.transition().duration(750);

                  // Update the domain only after entering new elements.
                  x.domain([d.x, d.x + d.dx]);
                  y.domain([d.y, d.y + d.dy]);

                  // Enable anti-aliasing during the transition.
                  svg.style("shape-rendering", null);

                  // Draw child nodes on top of parent nodes.
                  svg.selectAll(".depth").sort(function(a, b) { return a.depth - b.depth; });

                  // Fade-in entering text.
                  g2.selectAll("text").style("fill-opacity", 0);

                  // Transition to the new view.
                  t1.selectAll(".ptext").call(text).style("fill-opacity", 0);
                  t1.selectAll(".ctext").call(text2).style("fill-opacity", 0);
                  t2.selectAll(".ptext").call(text).style("fill-opacity", 1);
                  t2.selectAll(".ctext").call(text2).style("fill-opacity", 1);
                  t1.selectAll("rect").call(rect);
                  t2.selectAll("rect").call(rect);

                  // Remove the old node when the transition is finished.
                  t1.remove().each("end", function() {
                    svg.style("shape-rendering", "crispEdges");
                    transitioning = false;
                  });

                }


                  var temp = $('.ctext')
                  for (var i=0;i< temp.length; i++){
                        var text_width = temp[i].scrollWidth;
                        var rect_width = temp[i].parentNode.children[0].width.animVal.value;
                        var rect_x = temp[i].parentNode.children[0].getBBox().x;

                        var rect_height = temp[i].parentNode.children[0].getBBox().height;
                        if ((rect_height < 10) || (rect_width < 5)){
                            temp[i].style.cssText = "opacity: 0;"
                        }

                  }

                  return g;

              }

              function text(text) {
                text.selectAll("tspan")
                    .attr("x", function(d) { return x(d.x) + 6;})
                text.attr("x", function(d) { return x(d.x) + 6; })
                    .attr("y", function(d) { return y(d.y) + 6; })
                    .style("font-size","14px")
                    .style("opacity",0.8);
              }

              function text2(text) {
                text.attr("x", function(d) { return x(d.x + d.dx) - this.getComputedTextLength() - 10; })
                    .attr("y", function(d) { return y(d.y + d.dy) - 6; })
                    .style("font-size","12px");
              }

              function rect(rect) {
                rect.attr("x", function(d) { return x(d.x); })
                    .attr("y", function(d) { return y(d.y); })
                    .attr("width", function(d) { return x(d.x + d.dx) - x(d.x); })
                    .attr("height", function(d) { return y(d.y + d.dy) - y(d.y); });
              }

              function name(d) {
                switch(selection){
                            case "Electricity":
                                return d.parent
                                ? name(d.parent) + " / " + (d.key) + " (" + formatNumber(d.Electricity/d.Count) + "%)"
                                : d.key ;
                            case "Playground" :
                                return d.parent
                                ? name(d.parent) + " / " + d.key + " (" + formatNumber(d.Playground/d.Count) + "%)"
                                : d.key ;
                            case "Water" :
                                return d.parent
                                ? name(d.parent) + " / " + d.key + " (" + formatNumber(d.Water/d.Count) + "%)"
                                : d.key ;
                            case "GClassrooms" :
                                return d.parent
                                ? name(d.parent) + " / " + d.key + " (" + formatNumber(d.Clgood/d.Clrooms) + "%)"
                                : d.key ;
                            case "MjClassrooms" :
                                return d.parent
                                ? name(d.parent) + " / " + d.key + " (" + formatNumber(d.Clmajor/d.Clrooms) + "%)"
                                : d.key ;
                            case "MnClassrooms" :
                                return d.parent
                                ? name(d.parent) + " / " + d.key + " (" + formatNumber(d.Clminor/d.Clrooms) + "%)"
                                : d.key ;
                            case "ToiletB" :    //TBD
                                return d.parent
                                ? name(d.parent) + " / " + d.key + " (" + formatNumber(d.Toilet_B) + ")"
                                : d.key ;
                            case "ToiletG" :    //TBD
                                return d.parent
                                ? name(d.parent) + " / " + d.key + " (" + formatNumber(d.Toilet_G) + ")"
                                : d.key ;
                            case "CAL" :
                                return d.parent
                                ? name(d.parent) + " / " + d.key + " (" + formatNumber(d.CAL/d.Count) + "%)"
                                : d.key ;
                            case "Library" :
                                return d.parent
                                ? name(d.parent) + " / " + d.key + " (" + formatNumber(d.Library/d.Count) + "%)"
                                : d.key ;
                            case "Medical" :
                                return d.parent
                                ? name(d.parent) + " / " + d.key + " (" + formatNumber(d.Medical/d.Count) + "%)"
                                : d.key ;
                            case "Ramp" :
                                return d.parent
                                ? name(d.parent) + " / " + d.key + " (" + formatNumber(d.Ramps/d.Count) + "%)"
                                : d.key ;
                            case "Meal" :
                                return d.parent
                                ? name(d.parent) + " / " + d.key + " (" + Math.min(formatNumber(d.MDM/d.Count),100) + "%)"
                                : d.key ;
                        }


              }

            
            d3.selectAll(".facility").on("click",function(){
                
                selection = this.value;
                $('svg').empty(); $('.title').empty();
                switch(selection){
                            case "Electricity":
                                main({title: "Electricity"}, {key: "MAHARASHTRA", values: data_F1});
                                break;
                            case "Playground" :
                                main({title: "Playground"}, {key: "Maharashtra", values: data_F1});
                                break;
                            case "Water" :
                                main({title: "Water"}, {key: "Maharashtra", values: data_F1});
                                break;
                            case "GClassrooms" :
                                main({title: "Good Classrooms"}, {key: "Maharashtra", values: data_F2});
                                break;
                            case "MjClassrooms" :
                                main({title: "Classrooms needing Major Repair"}, {key: "Maharashtra", values: data_F2});
                                break;
                            case "MnClassrooms" :
                                main({title: "Classrooms needing Minor Repair"}, {key: "Maharashtra", values: data_F2});
                                break;
                            case "ToiletB" :
                                main({title: "Maharashtra DISE Facility Data"}, {key: "Maharashtra", values: data_F2});
                                break;
                            case "ToiletG" :
                                main({title: "Maharashtra DISE Facility Data"}, {key: "Maharashtra", values: data_F2});
                                break;
                            case "CAL" :
                                main({title: "Computer Aided Labs"}, {key: "Maharashtra", values: data_F2});
                                break;
                            case "Library" :
                                main({title: "Library"}, {key: "Maharashtra", values: data_F1});
                                break;
                            case "Medical" :
                                main({title: "Medical Checkups"}, {key: "Maharashtra", values: data_F1});
                                break;
                            case "Ramp" :
                                main({title: "Ramps"}, {key: "Maharashtra", values: data_F1});
                                break;
                            case "Meal" :
                                main({title: "Mid Day Meals"}, {key: "Maharashtra", values: data_F2});
                                break;
                        }
            }) 

            }

            function convert(a){

                a.forEach(function(element){

                    element.value = +element.value;
                    element.Water = +element.Water;
                    element.Toilet_B = +element.Toilet_B;
                    element.Toilet_G = +element.Toilet_G;
                    element.Playground = +element.Playground;
                    element.Medical = +element.Medical;
                    element.MDM = +element.MDM;
                    element.Library = +element.Library;
                    element.Electricity = +element.Electricity;
                    element.Count = +element.Count;
                    element.Computer = +element.Computer;
                    element.Clrooms = +element.Clrooms;
                    element.Clminor = +element.Clminor;
                    element.Clmajor = +element.Clmajor;
                    element.Clgood = +element.Clgood;
                    element.CAL = +element.CAL;
                    element.Bookinlib = +element.Bookinlib;
                    element.Bndrywall = +element.Bndrywall;
                    element.Ramps = +element.Ramps;

                    if(element.values)
                    {
                        convert(element.values);
                    }
                })
            }

            function start(){
                if (window.location.hash === "") {

                    d3.json("Facility_1.json", function(err, res) { //Electricity, Library, Playground, Books, Water, Medical, Ramps, Computer
                        if (!err) {
                            data_F1 = res;
                            convert(data_F1);

                            main({title: "Playground"}, {key: "MAHARASHTRA", values: data_F1});

                        }
                    });
                    d3.json("Facility_2.json", function(err, res) { //G, Major, Minor Classroom, Toilet B, G, MDM, CAL
                        if (!err) {
                            data_F2 = res;
                            convert(data_F2);
                        }
                    });
                }
            }

            start();

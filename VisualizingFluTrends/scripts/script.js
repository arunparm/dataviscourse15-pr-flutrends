/**
 * Created by Harshit on 11/10/2015.
 */

const DATA_FILENAME = "data/flu_trends_data - 2003.csv";
const MAPDATA_FILENAME = "data/us.json";
const YEAR_START = 2004;
const YEAR_END = 2014;

var yearsData = {};
var seasonsData;
var statesData = [];
var yearStatesData = {};
var regionsData;
var monthsData = {};
var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
var selectedStates = [];
var statesFluAggregate = [];
var colorScale;
var stateCodes = {};
var selectedYear;
var stateIdNameMap = {};
var mapData = [];

function loadData() {

    for (var k = 0; k < selectedStates.length; k++)
        statesFluAggregate[k] = 0;

    d3.csv("data/us_state_codes.csv", function (d) {
        d.forEach(function (kvp) {
            stateCodes[kvp.Code] = kvp.State;
        });
    });

    d3.tsv("data/us-state-names.tsv", function (d) {
        d.forEach(function (key) {
            stateIdNameMap[key.id] = [key.code, key.name];
        });

        for (var i = 1; i <= 78; i++) {
            //uStatePaths[i]["Value"] = {};
            //yearStatesData[uStatePaths[i]["n"]] = {}
            if (stateIdNameMap[i] != undefined) {
                yearStatesData[stateIdNameMap[i][1]] = {};
                for (var j = YEAR_START; j <= YEAR_END; j++) {
                    //uStatePaths[i]["Value"][j] = 0;
                    yearStatesData[stateIdNameMap[i][1]][j] = 0;
                }
            }
        }
    });


    queue()
        .defer(d3.csv, DATA_FILENAME, function (d) {
            //console.log(d);
            var sumPerRecord = 0;
            var currentDate;
            sumPerRecord = 0;
            currentDate = "";
            var currentYear = d["Date"].substring(d["Date"].lastIndexOf("/") + 1);
            var itr = 0;
            for (var key in d) {
                if (d.hasOwnProperty(key)) {
                    if ((key == 'Date'))
                        currentDate = d[key];
                    else if (key != "United States")
                        sumPerRecord += parseInt(d[key]);

                    var commaIndex = key.indexOf(',');
                    var stateName = undefined;
                    if (commaIndex > 0 && currentYear >= YEAR_START && currentYear <= YEAR_END) {
                        stateName = stateCodes[key.substring(commaIndex + 2)];
                    }
                    else if (key != "Date" && key != "United States" && currentYear >= YEAR_START && currentYear <= YEAR_END)
                        stateName = key;

                    if (stateName != undefined && yearStatesData[stateName].hasOwnProperty(parseInt(currentYear)))
                        yearStatesData[stateName][parseInt(currentYear)] += parseInt(d[key]);
                }
                if (selectedStates.indexOf(key) > -1) {
                    statesFluAggregate[itr] += parseInt(d[key]);
                    itr++;
                }
            }
            yearsData[currentDate] = sumPerRecord;
        })
        .defer(d3.json, MAPDATA_FILENAME)
        //.defer(d3.tsv, "data/us-state-names.tsv")
        .await(loadMonthData);
}


//returns month wise data for the given year
function loadMonthData(error, yearData, usStateData) {

    if (error) {
        throw error;
    }

    mapData = topojson.feature(usStateData, usStateData.objects.states).features;
    mapData.forEach(function (d) {
        var id = d.id;
        d["StateName"] = stateIdNameMap[id][1];
        d["StateCode"] = stateIdNameMap[id][0];
        d["Value"] = yearStatesData[stateIdNameMap[id][1]];
    });

    /*for (var key in uStatePaths) {
     uStatePaths[key]["Value"] = yearStatesData[uStatePaths[key]["n"]];
     }*/

    drawMap();
    //draw();

    console.log(yearsData);
    var year = "";
    var currentMonthData = [];
    for (var j = YEAR_START; j <= YEAR_END; j++) {
        //initializing array values
        for (var i = 0; i < 12; i++) {
            currentMonthData[i] = 0;
        }
        year = j;
        for (var key in yearsData) {
            if (key.indexOf(year) > -1) {
                var currentDate = new Date(key);
                var currentValue = currentMonthData[parseInt(currentDate.getMonth())];
                currentMonthData[currentDate.getMonth()] = currentValue + yearsData[key];
            }
        }
        monthsData[year] = currentMonthData;
        currentMonthData = [];
    }
    for (var k = 0; k < selectedStates.length; k++) {
        var obj = {};
        obj['state'] = selectedStates[k];
        obj['aggregate'] = statesFluAggregate[k];
        statesData.push(obj);
    }
    //console.log(statesData);

    updateMonthBarChart("2009");
    updatePieChart();

}

function drawMap() {
    colorScale = d3.scale.ordinal()
        .domain(mapData, function (d) {
            year = document.getElementById("year").value;
            return d["Value"][parseInt(year)];
        })
        .range(["#a1d99b", "#31a354"]);

    var map = d3.select("#map");
    var states = d3.selectAll("#states");
    var projection = d3.geo.albersUsa()
        .scale(800)
        .translate([300, 200]);
    var path = d3.geo.path().projection(projection);

    map.html("");

    map.append("g")
        .selectAll("path")
        .data(mapData)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("stroke", "white")
        .attr("class", "states")
        .style("fill", function (d) {
            year = document.getElementById("year").value;
            if (d["Value"] != undefined)
                return colorScale(d["Value"][parseInt(year)]);
        })
        .on("mouseover", function (d) {
            year = document.getElementById("year").value;
            d3.select("#tooltip")
                .transition()
                .duration(200)
                .style("opacity", .9);

            d3.select("#tooltip")
                .html(showToolTip(d["StateName"], d["Value"][parseInt(year)]))
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        })
        .on("mouseout", function (d) {
            d3.select("#tooltip")
                .transition()
                .duration(500)
                .style("opacity", 0);
        })
        .on("click", function (d) {
            year = document.getElementById("year").value;
            if (this.style.fill != "white") {
                this.style.fill = "white";
                selectedStates[selectedStates.length] = d["StateName"];
            }
            else {
                this.style.fill = colorScale(d["Value"][parseInt(year)]);
                var index = selectedStates.indexOf(d["StateName"]);
                selectedStates.splice(index, 1);
            }
            //alert(d["StateName"] + " was clicked");
            console.log(selectedStates);
            updatePieChart();
        });

    map.append("g")
        .selectAll("text")
        .data(mapData)
        .enter()
        .append("svg:text")
        .text(function (d) {
            return d["StateCode"];
        })
        .attr("x", function (d) {
            if (d["StateName"] != "Puerto Rico" && d["StateName"] != "Virgin Islands of the United States")
                return path.centroid(d)[0];
        })
        .attr("y", function (d) {
            if (d["StateName"] != "Puerto Rico" && d["StateName"] != "Virgin Islands of the United States")
                return path.centroid(d)[1];
        })
        .attr("text-anchor", "middle")
        .attr('fill', 'red');
}

//updates monthly bar chart
function updateMonthBarChart(year) {

    var margin = {top: 30, right: 30, bottom: 30, left: 40},
        width = 600 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;
    var textHeight = 40;
    var textWidth = 40;
    var max = d3.max(monthsData[year], function (d) {
        return d;
    });
    var min = d3.min(monthsData[year], function (d) {
        return d;
    });

    var xScale = d3.scale.ordinal().rangeRoundBands([textWidth, 400], .1);
    xScale.domain(monthsData[year].map(function (d) {
        return d;
    }))
    var yScale = d3.scale.linear()
        .domain([0, max])
        .range([0, 300])
        .nice();


    var xAxisScale = d3.scale.ordinal().rangeRoundBands([textWidth, 400], .1);
    xAxisScale.domain(months.map(function (d) {
        return d;
    }))
    var xAxisG = d3.select("#xAxis");
    var xAxis = d3.svg.axis()
        .scale(xAxisScale)
        .orient("bottom");

    xAxisG
        .call(xAxis)
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.15em")
        .attr("dy", ".02em")
        .attr("transform", "rotate(-65)");

    var yAxisG = d3.select("#yAxis");
    var yScaleInverted = d3.scale.linear()
        .domain([max, 0])
        .range([0, 300])
        .nice();
    var yAxis = d3.svg.axis()
        .scale(yScaleInverted)
        .orient("left");
    yAxisG
        .call(yAxis);


    var barchartG = d3.select("#monthBarChart")
        .attr({
            width: 600,
            height: 400
        })
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


    var bars = d3.select("#bars")
        .selectAll("rect")
        .data(monthsData[year]);
    bars
        .enter()
        .append("rect");
    bars
        .attr("x", function (d, i) {
            return xScale(d);
        })
        .attr("y", margin.top + textHeight)
        .attr("height", function (d, i) {
            return yScale(d);
        })
        .attr("width", 20);

    bars
        .exit()
        .remove();
}

function updatePieChart() {
    var width = 600,
        height = 400,
        radius = Math.min(width, height) / 2;

    var color = d3.scale.ordinal()
        .range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b"]);

    var arc = d3.svg.arc()
        .outerRadius(radius - 10)
        .innerRadius(0);

    var pieLayout = d3.layout.pie()
        .sort(null)
        .value(function (d) {
            return d.aggregate;
        });

    var pieChartSVG = d3.select("#pieChart")
        .append("g")
        .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

    var gObj = pieChartSVG.selectAll(".arc")
        .data(pieLayout(statesData))
        .enter().append("g")
        .attr("class", "arc");

    gObj.append("path")
        .attr("d", arc)
        .style("fill", function (d) {
            return color(d.data.aggregate);
        });

    gObj.append("text")
        .attr("transform", function (d) {
            return "translate(" + arc.centroid(d) + ")";
        })
        .attr("dy", ".35em")
        .style("text-anchor", "middle")
        .text(function (d) {
            return d.data.state;
        });
}
//called on slider event
function updateCharts(year) {
    selectedYear = year;
    $('#yearSpan').text(year);
    updateMonthBarChart(year);
    drawMap();
}

function showToolTip(n, d) {
    /*return "<h4>" + n + "</h4><table>" +
     "<tr><td>Flu Cases:</td><td>" + d + "</td></tr>" +
     "</table>";*/

    return "<h4>" + n + "</h4> Flu Cases: " + d;
}

function draw() {
    var projection = d3.geo.albersUsa()
        .scale(800)
        .translate([300, 200]);

    colorScale = d3.scale.ordinal()
        .domain(uStatePaths, function (d) {
            year = document.getElementById("year").value;
            return d["Value"][parseInt(year)];
        })
        .range(["#a1d99b", "#31a354"]);

    d3.select("#map").selectAll(".state")
        .data(uStatePaths)
        .enter().append("path")
        .attr("class", "state")
        .attr("d", function (d) {
            return d.d;
        })
        .style("fill", function (d) {
            year = document.getElementById("year").value;
            return colorScale(d["Value"][parseInt(year)]);
        })
        .on("mouseover", function (d) {
            year = document.getElementById("year").value;
            d3.select("#tooltip")
                .transition()
                .duration(200)
                .style("opacity", .9);

            d3.select("#tooltip")
                .html(showToolTip(d.n, d["Value"][parseInt(year)]))
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        })
        .on("mouseout", function (d) {
            d3.select("#tooltip")
                .transition()
                .duration(500)
                .style("opacity", 0);
        })
        .on("click", function (d) {
            year = document.getElementById("year").value;
            if (this.style.fill != "white") {
                this.style.fill = "white";
            }
            else
                this.style.fill = colorScale(d["Value"][parseInt(year)]);
            alert(d.n + " was clicked");
        });
}








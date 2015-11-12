/**
 * Created by Harshit on 11/10/2015.
 */

const DATA_FILENAME = "data/flu_trends_data.csv";
const YEAR_START = 2004;
const YEAR_END = 2014;

var yearsData = {};
var seasonsData;
var statesData;
var regionsData;
var monthsData = {};
var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function loadData() {
    queue()
        .defer(d3.csv,DATA_FILENAME,function(d) {
            var sumPerRecord = 0;
            var currentDate;

            sumPerRecord = 0;
            currentDate = "";
                for(var key in d){
                    if(d.hasOwnProperty(key)){
                        if((key == 'Date') )
                            currentDate = d[key];
                        else
                            if(key!="United States")
                                sumPerRecord+= parseInt(d[key]);
                    }
                }
            yearsData[currentDate]=sumPerRecord;
        })
        .await(loadMonthData);
}


//returns month wise data for the given year
function loadMonthData() {
    var year ="";
    var currentMonthData = [];
    for(var j=YEAR_START;j<=YEAR_END;j++){
        //initializing array values
        for(var i=0;i<12 ;i++) {
            currentMonthData[i]=0;
        }
        year = j;
        for (var key in yearsData){
            if(key.indexOf(year) > -1){
                var currentDate = new Date(key);
                var currentValue = currentMonthData[parseInt(currentDate.getMonth())];
                currentMonthData[currentDate.getMonth()] = currentValue + yearsData[key];
            }
        }
        monthsData[year] = currentMonthData;
        currentMonthData = [];
    }
    console.log(monthsData);
    updateMonthBarChart("2009");
}

function updateMonthBarChart(year) {

    var margin ={top:30, right:30, bottom:30, left:40},
        width  = 600 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;
    var textHeight = 40;
    var textWidth  = 40;
    var max = d3.max(monthsData[year], function(d) { return d; });
    var min = d3.min(monthsData[year], function(d) { return d; });

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
        .attr("transform", "rotate(-65)" );

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
        .attr("transform", "translate(" + margin.left  + "," + margin.top + ")");



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
        .attr("height", function(d, i) {
            return yScale(d);
        })
        .attr("width",  20);

    bars
        .exit()
        .remove();
}

function updateCharts(year){
    $('#yearSpan').text(year);
    updateMonthBarChart(year);
}






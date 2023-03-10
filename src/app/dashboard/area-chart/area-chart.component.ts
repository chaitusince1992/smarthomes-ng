import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import * as d3 from 'd3';
import { ConstantsService } from '../../services/constants.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-area-chart',
  templateUrl: './area-chart.component.html',
  styleUrls: ['./area-chart.component.scss']
})
export class AreaChartComponent implements OnInit, OnChanges {

  @Input() applianceList: any;
  @Input() sliderData: any;
  // @Input() fromData;
  // @Input() toData;
  @Input() clickedApplianceId: any;
  // @Input() chartDataArray;
  // @Input() timeSliderChartData;

  // @Input() chartData;
  chartData: any;
  @Input() clickedAppliancesArray: any;
  @Input() clickedHomesArray: any;

  // @Output() timeSliderChangedOutput: EventEmitter<any> = new EventEmitter<any>();
  @Output() sliderDataChange: EventEmitter<any> = new EventEmitter<any>();

  chartDataset: any;
  oldChartDataset: any;

  structuredHouseData: any;
  constructor(
    private constants: ConstantsService,
    private apiService: ApiService
  ) { }

  // isInitialized: boolean = false;
  ngOnInit() {
    this.timeSliderSVGApi();
    // this.isInitialized = true;
  }

  ngOnChanges(changes: any) {
    // console.log(changes.clickedHomesArray, "changed");
    if (changes.clickedHomesArray && !changes.clickedHomesArray.firstChange) {
      this.oldChartDataset = undefined;
      this.timeSliderSVGApi();
    } else if (changes.clickedAppliancesArray &&
      !changes.clickedAppliancesArray.firstChange &&
      this.chartData && this.oldChartDataset) {
      this.chartDataFormatting();
    }
  }
  chartCreate(dataArray: any) {
    var data: any = {};
    for (var key in dataArray[0]) {
      var test = [];
      for (var i = 0; i < dataArray.length; i++) {
        test.push(dataArray[i][key]);
      }
      data[key] = test;
    }
    var applArray: any = [];
    var yC = 0,
      keyArr = [];
    for (let key in dataArray[0]) {
      if (key.indexOf("y") > -1) {
        keyArr.push(key);
        applArray.push([])
        for (var j = 0; j < dataArray.length; j++) {
          applArray[yC].push({});
          applArray[yC]["color"] = this.constants.colorArray[key.split("y")[1]];
          applArray[yC]["key"] = key;
        }
        yC++;
      }
    }
    for (var j = 0; j < dataArray.length; j++) {
      var yCount = 0;
      for (var key in dataArray[j]) {
        if (key.indexOf("y") > -1) {
          var sum = 0;
          for (var i = 0; i <= yCount; i++) {
            sum += dataArray[j]["y" + keyArr[i].split("y")[1]];
          }
          if (yCount === 0) {
            applArray[yCount][j]["yl"] = 0;
          } else {
            applArray[yCount][j]["yl"] = applArray[yCount - 1][j]["yh"];
          }
          applArray[yCount][j]["yh"] = sum;
          yCount++;
        } else {
          for (var t = 0; t < yC; t++) {
            if (key === 'x') {
              applArray[t][j][key] = new Date(dataArray[j][key]).getUTCHours();
            } else {
              applArray[t][j][key] = dataArray[j][key];
            }
          }
        }
      }
    }
    this.chartDataset = { //saving the current values to use in future
      data: data,
      applArray: applArray
    };
    // console.log(this.chartDataset, this.oldChartDataset);
    if (this.oldChartDataset === undefined || this.oldChartDataset.applArray.length === 0) {
      var applArray: any = this.getApplArray({
        longArray: this.chartDataset.applArray,
        longArrayName: "curr",
        shortArrayName: "prev",
        firstOrLast: true
      });
    } else if (this.oldChartDataset.applArray.length > this.chartDataset.applArray.length && this.chartDataset.applArray.length !== 0) {
      // console.log("removed", "y" + this.clickedApplianceId);
      var applArray: any = this.getApplArray({
        longArray: this.oldChartDataset.applArray,
        shortArray: this.chartDataset.applArray,
        longArrayName: "prev",
        shortArrayName: "curr",
        changedApplianceId: this.clickedApplianceId,
        ylOrYh: 'yl',
        firstOrLast: false
      });
    } else if (this.oldChartDataset.applArray.length < this.chartDataset.applArray.length) {
      // console.log("added", "y" + this.clickedApplianceId);
      var applArray: any = this.getApplArray({
        longArray: this.chartDataset.applArray,
        shortArray: this.oldChartDataset.applArray,
        longArrayName: "curr",
        shortArrayName: "prev",
        changedApplianceId: this.clickedApplianceId,
        ylOrYh: 'yh',
        firstOrLast: false
      });
    } else if (this.oldChartDataset.applArray.length === this.chartDataset.applArray.length && this.chartDataset.applArray.length !== 0) {
      // console.log("when both are equal length");
      var applArray: any = this.getApplArray({
        longArray: this.oldChartDataset.applArray, //old
        shortArray: this.chartDataset.applArray, //curr
        longArrayName: "prev",
        shortArrayName: "curr",
        equalLength: true
      });
    } else {
      // console.log("when current length is zero, old is one");
      var applArray: any = this.getApplArray({
        longArray: this.oldChartDataset.applArray,
        longArrayName: "prev",
        shortArrayName: "curr",
        firstOrLast: true
      });
    }
    // console.log(data, applArray);


    this.chartSVGLinear(data, applArray);
    this.oldChartDataset = this.chartDataset;

  }

  // chartDataFlag: boolean = false;
  timeSliderSVGApi() {
    /********************
    To get normal data
    ********************/
    this.apiService.callServicePost("applHomeReqBody", {
      homes: this.clickedHomesArray,
      // appliances: this.clickedAppliancesArray
    }, (data: any) => {
      this.structuredHouseData = data;
      this.apiService.callServicePost("allApplHomesDataNormal", {
        from: this.sliderData.scaleRange[0],
        to: this.sliderData.scaleRange[1],
        houseData: data
      }, (res: any) => {

        this.timeSliderChart(res);
      }, () => { })
    }, () => { })
  }

  chartSVGLinear(data: any, applArray: any) {
    d3.select("svg.chart-container>g").remove();
    d3.select("svg.chart-container").attr("viewBox", null).attr("preserveAspectRatio", null);
    var chartPadding = 40,
      axisTextColor = "#9c9c9c",
      axisLineStroke = "#262c56";
    let dailyChart: any = document.getElementById("daily-trend-chart");
    var height: any = dailyChart.offsetHeight - (chartPadding),
      width: any = dailyChart.offsetWidth - (chartPadding);
    var svg: any = d3.select("svg.chart-container")
      .attr("viewBox", "0 0 " + (width + (chartPadding)) + " " + (height + chartPadding) + "")
      .attr("preserveAspectRatio", "xMidYMid meet")
      .append("g")
      .attr("class", "chart-group")
      .attr("transform", "translate(" + chartPadding + "," + 0 + ")");
    var bgShades = svg.append("g")
      .attr("class", "bgShades")
      .attr("stroke", "#4a5496");
    var x: any = d3.scaleLinear().range([0, width]).domain([0, 23]) // this is a method
    var y: any = d3.scaleLinear().range([height, 0]).domain([0, Number(d3.max(data.total))]) // this is a method
    var yCurr: any, yPrev: any;
    if (this.oldChartDataset === undefined) {
      yCurr = yPrev = d3.scaleLinear().range([height, 10]).domain([0, Number(d3.max(this.chartDataset.data.total))]) // this is a method
    } else {
      yPrev = d3.scaleLinear().range([height, 10]).domain([0, Number(d3.max(this.oldChartDataset.data.total))]) // this is a method
      yCurr = d3.scaleLinear().range([height, 10]).domain([0, Number(d3.max(this.chartDataset.data.total))]) // this is a method
    }

    var xAxis: any = d3.axisBottom(x).scale(x).ticks(12).tickSize(-height).tickPadding(10) // method to make x y axis lines
    var yAxisPrev: any = d3.axisLeft(yPrev).scale(yPrev).ticks(5).tickSize(-width).tickPadding(-30) // method to make x y axis lines
    var yAxisCurr: any = d3.axisLeft(yCurr).scale(yCurr).ticks(5).tickSize(-width).tickPadding(-30) // method to make x y axis lines


    bgShades.append("rect")
      .attr("width", x(12))
      .attr("height", height)
      .attr("x", 0)
      .attr("y", 0)
      .attr("fill", "rgba(22, 16, 53, 0.86)");
    bgShades.append("rect")
      .attr("width", x(11))
      .attr("height", height)
      .attr("x", x(12))
      .attr("y", 0)
      .attr("fill", "rgba(18, 18, 43, 0.85)");

    svg.append("g")
      .attr("class", "x-axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis)
      .call(() => {
        d3.selectAll("g.x-axis g.tick text").attr("fill", axisTextColor)
        d3.selectAll("g.x-axis g.tick line").attr("stroke", axisLineStroke)
        d3.selectAll("g.x-axis path.domain").attr("stroke", "none")
      });
    svg.append("g").attr("class", "y-axis").call(yAxisPrev).transition().duration(1000).call(yAxisCurr)
      .call(() => {
        d3.selectAll("g.y-axis g.tick text").attr("y", -15)
        d3.selectAll("g.y-axis g.tick text").attr("fill", axisTextColor)
        d3.selectAll("g.y-axis g.tick line").attr("stroke", axisLineStroke)
        d3.selectAll("g.y-axis path.domain").attr("stroke", "none")
      });;

    svg.append("text")
      .attr("transform",
        "translate(" + (width / 2) + " ," +
        (height + 30) + ")")
      .style("text-anchor", "middle")
      .text("Hours");

    svg.append("text")
      .attr("transform",
        "rotate(-90)")
      .attr("y", -15)
      .attr("x", -(height / 2) - 40)
      .text("Power (Watts)");

    var areaGroup: any = svg.append("g")
      .attr("class", "area-group")
      .attr("transform", "translate(1,0)"); //to move whole paths right side to make y aixs visible properly

    applArray.forEach((applData: any) => {
      // console.log(applData.key)
      var itr = applData.key.substr(1);
      areaGroup.append("g")
        .attr("class", "each-area")
        .attr("id", "each-area" + itr)
        .datum(applData)
        .attr("stroke", applData.color)
        .attr("stroke-opacity", 1)
        .attr("stroke-width", 2)
        .attr("fill-opacity", 0.5)
        .attr("fill", applData.color)
        .append("path")
        .attr("class", "area")
        .attr("data-area-id", itr)
        .attr("transform-origin", "0px " + (svg.node().getBBox().height - 20) + "px 0px")
        .attr("transform", "scale(1,1)")
        .attr("d", d3.area()
          // .curve(d3.curveCardinal)
          // .curve(d3.curveCatmullRom)
          .curve(d3.curveMonotoneX)
          .x((d: any) => x(new Date(d.x).getTime()))
          .y1((d: any) => yPrev(d.prev.yh))
          .y0((d: any) => yPrev(d.prev.yl)))



        .on("mousemove", function (d: any, i: number, e: any) {
          var xVal = Math.floor(x.invert(d.currentTarget));
          d3.select("rect.tooltip")
            .attr("height", height - yCurr(data["total"][xVal]))
            .attr("y", yCurr(data["total"][xVal]))
            .attr("fill", d3.select(e[0].parentElement).attr("fill"))
        })
        .on("mouseover", (d: any, i: number, e: any) => {
          d3.selectAll("g.each-area")
            .transition()
            .duration(250)
            .attr("fill-opacity", (a, b, c: any) => {
              if (c[b].id === "each-area" + itr) {
                return 0.5;
              } else {
                return 0.2;
              }
            })
            .attr("stroke", (a, b, c: any) => {
              if (c[b].id === "each-area" + itr) {
                return d3.select(e[0].parentElement).attr("fill");
              } else {
                return "none";
              }
            })
          var classes = document.getElementsByClassName("mac-effect-container")
          for (let i = 0; i < classes.length; i++) {
            var ele: any = classes[i];
            if (Number(ele["dataset"].areaId) === Number(itr)) {
              ele.classList.add("hover");
              ele.nextElementSibling ? ele.nextElementSibling.classList.add("nearby") : '';
              ele.previousElementSibling ? ele.previousElementSibling.classList.add("nearby") : '';
            }

          }
        })
        .on("mouseout", (d: any, i: number, e: any) => {
          d3.selectAll("g.each-area")
            .transition()
            .duration(250)
            .attr("fill-opacity", 0.5)
            .attr("stroke", (a, b, c) => {
              return d3.select(c[b]).attr("fill");
            });
          var classes = document.getElementsByClassName("mac-effect-container")
          for (let i = 0; i < classes.length; i++) {
            var ele: any = classes[i];
            if (Number(ele["dataset"].areaId) === Number(itr)) {
              ele.classList.remove("hover");
              ele.nextElementSibling ? ele.nextElementSibling.classList.remove("nearby") : '';
              ele.previousElementSibling ? ele.previousElementSibling.classList.remove("nearby") : '';
            }

          }
        })
        .transition()
        .duration(1000)
        .attr("d", d3.area()
          // .curve(d3.curveCardinal)
          // .curve(d3.curveCatmullRom)
          .curve(d3.curveMonotoneX)
          .x((d: any) => x(new Date(d.x).getTime()))
          .y1((d: any) => yCurr(d.curr.yh))
          .y0((d: any) => yCurr(d.curr.yl)))
    })
    var tooltip = svg.append("g")
      .attr("class", "tooltip-group")
      .attr("transform", "translate(0,0)"); //to move whole paths right side to make y aixs visible properly
    var lineGroup = svg.append("g")
      .attr("class", "line-group")
      .attr("transform", "translate(0,0)"); //to move whole paths right side to make y aixs visible properly

    tooltip.append("g")
      .attr("class", "each-bar")
      .append("rect")
      .attr("fill", "transparent")
      .attr("class", "tooltip")
      .attr("x", (d: any) => x(2))
      .attr("y", (d: any) => height - height)
      .attr("width", 1)
      .attr("height", (d: any) => height);
    d3.select("g.area-group")
      .on("mouseout", d => {
        // console.log("mouseovered");
        d3.select("rect.tooltip")
          .attr("fill", "transparent")
      })
    .on("mousemove", (d: any, i: number, e: any) => {
      var xVal = x(Math.floor(x.invert(d3.mouse(e[0])[0])));
      var color = "#ffffff";
      if (Math.floor(x.invert(d3.mouse(e[0])[0])) > 11) {
        color = "#f7f7f7";
      }
      // console.log("mousemoved");
      d3.select("rect.tooltip")
        .attr("x", xVal + 1)
    })
  }
  getApplArray(data: any) { //to get previous and current data array in proper format
    var resultArray: any = [];
    data.longArray.forEach((d: any, i: number, f: any) => {
      resultArray.push([]);
      resultArray[i]["color"] = d.color;
      resultArray[i]["key"] = d.key;
      for (var j = 0; j < d.length; j++) {
        var keyToCompare = Number(d.key.split("y")[1]);
        resultArray[i].push({});
        resultArray[i][j][data.shortArrayName] = {};
        resultArray[i][j][data.longArrayName] = {};
        /*
          data.firstOrLast used to differentiate between very first/last or remaining appliance.
          */
        if (keyToCompare < data.changedApplianceId && !data.firstOrLast && !data.equalLength) {
          resultArray[i][j][data.shortArrayName]["yh"] = data.shortArray[i][j].yl;
          resultArray[i][j][data.shortArrayName]["yl"] = data.shortArray[i][j].yh;
          resultArray[i][j][data.longArrayName]["yh"] = d[j].yl;
          resultArray[i][j][data.longArrayName]["yl"] = d[j].yh;
        } else if (keyToCompare === data.changedApplianceId && !data.firstOrLast && !data.equalLength) {
          /*
          data.ylOrYh used to differentiate between added or removed appliance.
          "yl" used when removed and "yh" used when new one is added
          */
          resultArray[i][j][data.shortArrayName]["yh"] = data.shortArray[i] ? data.shortArray[i][j][data.ylOrYh] : data.shortArray[i - 1][j].yh;
          resultArray[i][j][data.shortArrayName]["yl"] = data.shortArray[i - 1] ? data.shortArray[i - 1][j].yh : 0;
          resultArray[i][j][data.longArrayName]["yh"] = d[j].yh;
          resultArray[i][j][data.longArrayName]["yl"] = d[j].yl;
        } else if (!data.firstOrLast && data.equalLength) {
          resultArray[i][j][data.shortArrayName]["yh"] = data.shortArray[i][j].yh;
          resultArray[i][j][data.shortArrayName]["yl"] = data.shortArray[i][j].yl;
          resultArray[i][j][data.longArrayName]["yh"] = d[j].yh;
          resultArray[i][j][data.longArrayName]["yl"] = d[j].yl;
        } else {
          resultArray[i][j][data.shortArrayName]["yh"] = data.firstOrLast ? 0 : data.shortArray[i - 1][j].yh;
          resultArray[i][j][data.shortArrayName]["yl"] = data.firstOrLast ? 0 : data.shortArray[i - 1][j].yl;
          resultArray[i][j][data.longArrayName]["yh"] = d[j].yh;
          resultArray[i][j][data.longArrayName]["yl"] = d[j].yl;
        }
        resultArray[i][j]["angle"] = d[j].angle;
        resultArray[i][j]["x"] = d[j].x;

      }
    })
    return resultArray;
  };

  timeSliderChart(res: any) {
    // console.log(res);
    res.sort((x: any, y: any) => d3.ascending(x.x, y.x));

    d3.select("svg.slider-container>g").remove();
    d3.select("svg.slider-container").attr("viewBox", null).attr("preserveAspectRatio", null);
    var chartPadding = 40,
      axisTextColor = "#9c9c9c",
      axisLineStroke = "#4a5496";
    let trendOverTime: any = document.getElementById("trend-over-the-time");
    var height2 = trendOverTime.offsetHeight - (chartPadding),
      width = trendOverTime.offsetWidth - (chartPadding);
    var svg = d3.select("svg.slider-container")
      .attr("viewBox", "0 0 " + (width + chartPadding + 2) + " " + (height2 + 2) + "")
      .attr("preserveAspectRatio", "xMidYMid meet")
      .append("g")
      .attr("class", "chart-group")
      .attr("transform", "translate(" + (chartPadding) + "," + 1 + ")");;
    var parseDate = d3.timeParse("%b %Y");

    var x2: any = d3.scaleTime().range([0, width]),
      y2: any = d3.scaleLinear().range([height2 + 1, 0]);
    x2.domain([this.sliderData.scaleRange[0], this.sliderData.scaleRange[1]]);
    y2.domain([0, d3.max(res, (d: any) => Number(d.total))]);
    var xAxis2 = d3.axisBottom(x2);
    var context = svg.append("g")
      .attr("class", "context")
    var brush: any = d3.brushX()
      .extent([[0, 0], [width, height2]])
      .on("brush end", (d: any) => {
        if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return; // ignore brush-by-zoom
        if (d3.event && d3.event.type === "end") {
          var s = d3.event.selection || x2.range();
          // console.log("brushed teeth :P !!", s.map(x2.invert, x2))
          var timeVals = s.map(x2.invert, x2);
          this.sliderData.values = [new Date(timeVals[0]).getTime(), new Date(timeVals[1]).getTime()];
          this.sliderDataChange.emit({ ...this.sliderData });
          this.timeSliderChanged();
        }
      });

    var area2 = d3.area()
      .curve(d3.curveMonotoneX)
      .x((d: any) => x2(new Date(d.x)))
      .y0(height2)
      .y1((d: any) => y2(d.total));

    context.append("path")
      .datum(res)
      .attr("class", "area")
      .attr("fill", "#12173e")
      .attr("d", area2);

    context.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", "translate(0," + height2 + ")")
      .call(xAxis2);

    context.append("g")
      .attr("class", "brush")
      .call(brush)
      .call(brush.move, [x2(this.sliderData.values[0]), x2(this.sliderData.values[1])]);
  }

  timeSliderChanged() {
    this.apiService.callServicePost("allApplHomesData", {
      from: this.sliderData.values[0],
      to: this.sliderData.values[1],
      houseData: this.structuredHouseData
    }, (res: any) => {
      // console.log(res);
      if (res.length === 0) {
        res = this.dummyDataObject();
      }
      res.forEach((a: any, i: number) => {
        var total = 0;
        for (var key in a) {
          if (key.indexOf("y") > -1) {
            total += a[key]
          }
        }
        a["total"] = total;
        a["angle"] = i * 2 * Math.PI / res.length;
      })
      this.chartData = res;
      this.chartDataFormatting();
    }, () => { });
  }

  chartDataFormatting() {

    var chartDataArray: any = [];
    this.chartData.forEach((a: any) => {
      var eachPoint: any = {};
      var total = 0;
      for (var key in a) {
        if (key.indexOf("y") === -1) {
          eachPoint[key] = a[key];
        } else {
          this.clickedAppliancesArray.forEach((b: any) => {
            if (b === Number(key.split("y")[1])) {
              eachPoint[key] = a[key];
              total += a[key];
            }
          })
        }
      }
      eachPoint['total'] = total;
      chartDataArray.push(eachPoint);
    });
    this.chartCreate(chartDataArray); //uncomment it don't dlete it
  }

  dummyDataObject() {
    var res: any = [];
    for (var i = 0; i < 24; i++) {
      res.push({});
      res[i]["x"] = i;
      res[i]["total"] = 0;
      for (var key in this.structuredHouseData.appliances) {
        res[i]["y" + key] = 0;
      }
    }
    return res;
  }
}

initMap = (maps) => {
    L.Map.addInitHook(function () {
        maps.push(this);
    });

    let mainmap = L
        .map("mainmap")
        .setView([34.0522, -118.2437], 10);

    L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
        }
    ).addTo(mainmap);

    var dataLayer = new L.svg();
    dataLayer.addTo(mainmap);

    var drawnItems = new L.FeatureGroup();
    mainmap.addLayer(drawnItems);

    var drawControl = new L.Control.Draw({
        draw: {
            polyline: false,
            rectangle: false,
            circle: false,
            marker: false,
            circlemarker: false
        },
        edit: {
            edit: false,
            featureGroup: drawnItems
        }
    });
    mainmap.addControl(drawControl);

    mainmap.on("moveend", function() {update(mainmap)})

    mainmap.on('draw:created', (e) => {addBound(e, map, drawnItems)});
    mainmap.on('draw:deleted', (e) => {deleteFilter(e, map, drawnItems)});

    plotLegend();

    return [mainmap, drawnItems];
}

palette = (value) => {
    let palette = d3.scaleSequential()
        .domain([0, 20, 40, 60, 80, 100, 1000])
        .interpolator(d3.interpolateViridis);
    return palette(value);
}

loadMap = (data, map, pm, drawnItems) => {
    data = JSON.parse(data); 
    var parseTime = d3.timeParse("%Y-%m-%dT%H:%M:%SZ");    
    data[1] = data[1].map(function (d) { d['when_captured'] = parseTime(d['when_captured']); return d;})

    if (data[0] == 'raw') {
        plot(data[1], map, pm);

    } else if (data[0] == 'filtered') {
        let bound = data[3].map(point => [point['lat'], point['lng']]);
        L.polygon(bound, {fill: false, color: '#000000'}).addTo(drawnItems);
        plot(data[1], map, pm);
    }
};

plot = (data, map, pm) => {
    d3.select('#mainmap')
    .select('svg')
    .attr('pointer-events', 'all')
    .selectAll('sensors')
    .data(data)
    .enter()
    .append('circle')
        .attr('id', function(d) {return 'circle' + d['device']})
        .attr('cx', function(d) {return map.latLngToLayerPoint([d['loc_lat'], d['loc_lon']]).x})
        .attr('cy', function(d) {return map.latLngToLayerPoint([d['loc_lat'], d['loc_lon']]).y})
        .attr('r', 20)
        .attr('fill-opacity', 0.8)
        .attr('class', 'sensors')
        .attr('fill', function(d) {return palette(d[pm])})
        .on('mouseover', function(d) {
            d3.selectAll(".timeCircle").attr("fill-opacity", 0.2);
            d3.select('#timeCircle' + d['device']).attr("fill-opacity", 1);
            d3.selectAll(".line").attr('stroke-opacity', 0.2);
            d3.select("#line" + d["device"]).attr('stroke-opacity', 1).style("stroke-width", 2);
            plotInfo(d, pm);
        })
        .on('mouseout', function(d) {
            d3.selectAll(".timeCircle").attr("fill-opacity", 1);
            d3.selectAll(".line").attr('stroke-opacity', 1).style("stroke-width", 1);
            d3.select("#info").style("visibility", "hidden");
        })
}

update = (map) => {
    d3.selectAll(".sensors")
        .attr('cx', function(d) {return map.latLngToLayerPoint([d['loc_lat'], d['loc_lon']]).x})
        .attr('cy', function(d) {return map.latLngToLayerPoint([d['loc_lat'], d['loc_lon']]).y})
}

addBound = (e, map, drawnItems) => {
    drawnItems.addLayer(e.layer)
    $.ajax({
        url: "/data",
        type: "post",
        data: JSON.stringify(e.layer.getLatLngs()),
        contentType: 'application/json',
        success: function(data) {
            d3.select('#mainmap').select('svg').selectAll('circle').remove();
            drawnItems.clearLayers();
            let pm = document.getElementById("pmDropdown").value;
            loadMap(data, map, pm, drawnItems);
            d3.select('#sidebar').select('svg').remove();
            plotTime(data, map, pm);
        },
        error: function(xhr) {
        }
    });
}

deleteFilter = (e, map, drawnItems) => {
    $.ajax({
        url: "/data",
        type: "get",
        success: function(data) {
            drawnItems.clearLayers();
            d3.select('#mainmap').select('svg').selectAll('circle').remove();
            d3.select('#sidebar').select('svg').remove();
            let pm = document.getElementById("pmDropdown").value;
            loadMap(data, map, pm, drawnItems);
            plotTime(data, map, pm);
        },
        error: function(xhr) {
        }
    })
}

plotTime = (data, map, pm) => {
    data = JSON.parse(data);
    data = data[2];

    var margin = {top: 30, right: 40, bottom: 40, left: 30};
    var width = document.getElementById('sidebar').offsetWidth - margin.left - margin.right;
    var height = document.getElementById('sidebar').offsetHeight - margin.top - margin.bottom;

    var parseTime = d3.timeParse("%Y-%m-%dT%H:%M:%SZ");
    var color = d3.scaleOrdinal(d3.schemeTableau10).domain(data.map(function(c) { return c['device']; }));
    
    data = data.map(function (d) { d['when_captured'] = parseTime(d['when_captured']); return d;})

    var g = d3.select('#sidebar')
        .append("svg")
        .attr("width", (width + margin.left + margin.right - 10))
        .attr("height", (height + margin.top + margin.bottom - 10))
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var xRange = d3.scaleTime()
        .rangeRound([0, width])
        .domain(d3.extent(data.map(function(d) { return d['when_captured']; })));

    var yRange = d3.scaleLinear()
        .range([height, 0])
        .domain(d3.extent(data.map(function(d) { return d[pm]; })));

    var line = d3.line()
        .x(function(d) { return xRange(+d['when_captured']);  })
        .y(function(d) { return yRange(+d[pm]);  })

    data = data.reduce((r, { device: device, ...object }) => {
        var temp = r.find(o => o.device === device);
        if (!temp) r.push(temp = { device, values: [] });
        temp.values.push(object);
        return r;
    }, []);

    g.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(xRange).tickFormat(d3.timeFormat("%m-%d-%y")))
        .selectAll('text')
        .style("text-anchor", "end")
        .attr("dx", "-.1em")
        .attr("transform", "rotate(-20)");

    g.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(yRange))
        .append("text")
        .attr("x",2)
        .attr("y", 6)
        .attr("dy", "0.71em")
        .attr("fill", "#000")
        .attr("text-anchor", "start");

    var chart = g.selectAll(".chart")
        .data(data)
        .enter()
        .append("path")
        .style("fill", "none")
        .attr("class", "line")
        .attr("id", function(d) {return "line" + d['device']})
        .attr("d", function(d){ return line(d['values']) })
        .style("stroke", function(d) { return color(d['device']); })
        .on('mouseover', function(d) {
            let deviceCircle = '#circle' + d['device'];
            d3.select(deviceCircle).style('stroke', '#000');
            let deviceData = d3.select(deviceCircle).datum();
            map.panTo([deviceData['loc_lat'], deviceData['loc_lon']], {animate: true});
            d3.selectAll(".timeCircle").attr("fill-opacity", 0.2);
            d3.select('#timeCircle' + d['device']).attr("fill-opacity", 1);
            d3.selectAll(".line").attr('stroke-opacity', 0.2);
            d3.select(this).attr('stroke-opacity', 1).style("stroke-width", 2);
            plotInfo(d3.select(deviceCircle).datum(), pm);
        })
        .on('mouseout', function(d) {
            let deviceCircle = '#circle' + d['device'];
            d3.select(deviceCircle).style('stroke', null);
            d3.selectAll(".timeCircle").attr("fill-opacity", 1);
            d3.selectAll(".line").attr('stroke-opacity', 1);
            d3.select(this).style("stroke-width", 1);
            d3.select("#info").html("").style("visibility", "hidden");
        });

    var mouseG = g.append("g")
        .attr("class", "mouse-over-effects");

    var mousePerLine = mouseG.selectAll('.mouse-per-line')
        .data(data)
        .enter()
        .append("circle")
        .attr("class", "timeCircle")
        .attr("id", function(d) { return "timeCircle" + d['device']})
        .attr("r", 4)
        .attr("transform", function (d) {
            var bisect = d3.bisector(function (d) {return d['when_captured']; }).left
            var idx = bisect(d['values'], xRange.domain()[1]) - 1;
            return "translate(" + xRange(d['values'][idx]['when_captured']) + "," + yRange(d['values'][idx][pm]) + ")";
        })
        .style("fill", function (d) {
            return color(d['device'])
        })

    var date = xRange.domain()[1];
    document.getElementById('date').value = (date.getMonth() + 1).toString() + '/' + date.getDate().toString() + '/' + date.getFullYear().toString();
    plotDraggable(data, pm, g, xRange, height, color, yRange, map);
}

plotDraggable = (data, pm, g, xRange, height, color, yRange, map) => {
    var drag = d3.drag()
        .on('start', function() { d3.select(this).raise().classed('active', true); })
        .on('drag', function() {
            var mouse = d3.mouse(this);
            var xDate = xRange.invert(mouse[0]);

            document.getElementById('date').value = (xDate.getMonth() + 1).toString() + '/' + xDate.getDate().toString() + '/' + xDate.getFullYear().toString();
            d3.select(this).attr("x", mouse[0]);
            d3.selectAll(".timeCircle")
                .attr("transform", function (d) {
                    var idx = getIdx(d, xDate);
                    if (idx > 0) {
                        return "translate(" + xRange(d['values'][idx]['when_captured']) + "," + yRange(d['values'][idx][pm]) + ")";
                    }
                })
                .style("visibility", function(d) {
                    var idx = getIdx(d, xDate);
                    if (idx > 0 && d['values'][idx]['when_captured'].getDate() == xDate.getDate() ) {return "visible"} else {return "hidden"}
                })
            
            var dataAtTime = data.map((d) => {
                var idx = getIdx(d, xDate)
                if (idx > 0 ) {
                    let data = {device: d['device'], loc_lat: d['values'][idx]['loc_lat'], loc_lon: d['values'][idx]['loc_lon'], when_captured: d['values'][idx]['when_captured']};
                    data[pm] = d['values'][idx][pm];
                    return data;
                }
            }).filter(function(d) {return d !== undefined});
            d3.selectAll('.sensors').remove();
            plot(dataAtTime, map, pm);
        })
        .on('end', function() { d3.select(this).classed('active', false); })
    
    d3.select(".mouse-over-effects").append("rect") // create vertical line to follow mouse
        .attr("class", "mouse-line")
        .call(drag)
        .attr("width", 1).attr("height", height)
        .attr("x", xRange(xRange.domain()[1]))
        .style("fill", "#000")
}

getIdx = (d, xDate) => {
    var bisect = d3.bisector(function (d) {return d['when_captured']; }).left
    var idx = bisect(d['values'], xDate);
    if (idx > 0 && idx < d['values'].length) { return idx - 1; } else {return -1;}
}

plotInfo = (d, pm) => {
    let date = d['when_captured'];
    let info = "<b>Time Captured</b>: " + (date.getMonth() + 1).toString() + '/' + date.getDate().toString() + '/' + date.getFullYear().toString() + ", ";
    let pmMap = {'pms_pm02_5': 'PM2.5', 'pms_pm01_0': 'PM1.0', 'pms_pm10_0': 'PM10'}
    info += date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds() + "<br>";
    info += "<b>" + pmMap[pm] + "</b>: " + d[pm].toString() + 'µg/m3';
    d3.select("#info").html(info).style("visibility", "visible")
};

plotLegend = () => {
    let svg = d3.select("#legend")
        .append("svg").attr("width", document.getElementById("legend").offsetWidth).attr("height", document.getElementById("legend").offsetHeight - 5)

    svg.append("circle").attr("r", 10).attr("fill", palette(5)).attr("cx", "15px").attr("cy", "20px")
    svg.append("circle").attr("r", 10).attr("fill", palette(10)).attr("cx", "15px").attr("cy", "50px")
    svg.append("circle").attr("r", 10).attr("fill", palette(15)).attr("cx", "15px").attr("cy", "80px")
    svg.append("circle").attr("r", 10).attr("fill", palette(20)).attr("cx", "15px").attr("cy", "110px")

    svg.append("text").text("5 µg/m3").attr("x", "40px").attr("y", "25px")
    svg.append("text").text("10 µg/m3").attr("x", "40px").attr("y", "55px")
    svg.append("text").text("15 µg/m3").attr("x", "40px").attr("y", "85px")
    svg.append("text").text("> 20 µg/m3").attr("x", "40px").attr("y", "115px")
}
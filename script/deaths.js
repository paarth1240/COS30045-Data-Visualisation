// Define initial width and height for the SVG element
var w = 900;
var h = 1000;

// Create SVG element for the map
var svg = d3.select("#map")
    .append("svg")
    .attr("width", w)
    .attr("height", h);

// Adjust SVG attributes for responsiveness
svg.attr("preserveAspectRatio", "xMidYMid meet")
    .attr("viewBox", "0 0 " + w + " " + h)
    .attr("width", "100%")
    .attr("height", "100%");

// Modern color scale - gradient from light to dark purple for death intensity
var colorScaleOrdinal = d3.scaleThreshold()
    .domain([0, 1000, 2000, 3000, 4000, 5000, 6000])
    .range(["#E8DFF5", "#D4C5E8", "#BFABDB", "#AA91CE", "#9577C1", "#805DB4", "#6B43A7", "#56299A"]);

// Set map projection
var projection = d3.geoMercator()
    .center([135, -29.5])
    .translate([w / 2, h / 2])
    .scale(700);

// Create path generator for the map
var path = d3.geoPath().projection(projection);

// Variable to track the selected state
var selectedState = null;


/*
2. Loading and processing data
*/

// Load the data files
Promise.all([
    d3.csv("dataset/deaths.csv"),
    d3.csv("dataset/vaccination.csv"),
    d3.json("script/aus.json")
]).then(function (files) {
    var deathData = files[0];
    var vaccinationData = files[1];
    var geoData = files[2];

    var deathTotals = {};
    var vaccinationTotals = {};
    var stateData = {};

    // Process death data
    deathData.forEach(function (d) {
        deathTotals[d.States] = +d.Total;
        stateData[d.States] = d;
    });

    // Process vaccination data
    vaccinationData.forEach(function (d) {
        vaccinationTotals[d.States] = +d["2024"];
        if (stateData[d.States]) {
            stateData[d.States].vaccination = d;
        }
    });

    // Create paths for each state on the map
    svg.selectAll("path")
        .data(geoData.features)
        .enter()
        .append("path")
        .attr("d", path)
        .style("fill", function (d) {
            var stateName = d.properties.name;
            var stateCode = StateCodes[stateName];
            return colorScaleOrdinal(deathTotals[stateCode]);
        })
        .style("stroke", "#FFFFFF")
        .style("stroke-width", "2px")
        .attr("stateCode", function (d) {
            return StateCodes[d.properties.name];
        })
        .style("transition", "all 0.3s ease")
        .style("cursor", "pointer")


        /*
        3. Tooltip and interaction functions
        */
        .on("mouseover", function (event, d) {
            var stateName = d.properties.name;
            var stateCode = StateCodes[stateName];
            d3.select(this)
                .transition()
                .duration(200)
                .style("fill", "#e7d10b")
                .style("filter", "brightness(1.1)");

            showTooltip(event, deathTotals[stateCode], vaccinationTotals[stateCode], stateName);
        })
        .on("mouseout", function (event, d) {
            var stateName = d.properties.name;
            var stateCode = StateCodes[stateName];
            if (stateCode !== selectedState) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .style("fill", colorScaleOrdinal(deathTotals[stateCode]))
                    .style("filter", "none");
            }
            hideTooltip();
        })
        .on("click", function (event, d) {
            var stateName = d.properties.name;
            var stateCode = StateCodes[stateName];
            if (selectedState === stateCode) {
                selectedState = null;
                createDefaultBarChart(deathData, vaccinationData);
            } else {
                selectedState = stateCode;
                updateBarCharts(stateData[stateCode], stateData[stateCode].vaccination, stateName);
            }
            svg.selectAll("path")
                .transition()
                .duration(200)
                .style("fill", function (d) {
                    var stateName = d.properties.name;
                    var stateCode = StateCodes[stateName];
                    if (stateCode === selectedState) {
                        return "#e7d10b";
                    } else {
                        return colorScaleOrdinal(deathTotals[stateCode]);
                    }
                });
        });

    /*
    4. Creating and updating map elements
    */

    // Add state label text
    svg.selectAll("text")
        .data(geoData.features)
        .enter()
        .append("text")
        .attr("x", function (d) { return path.centroid(d)[0]; })
        .attr("y", function (d) { return path.centroid(d)[1]; })
        .attr("text-anchor", "middle")
        .attr("dy", ".35em")
        .text(function (d) { return StateCodes[d.properties.name]; })
        .attr("class", "state-label")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .style("fill", "white")
        .style("text-shadow", "1px 1px 2px rgba(0,0,0,0.8)")
        .style("pointer-events", "none");

    // Create modern legend
    var legend = svg.append("g")
        .attr("transform", "translate(" + (w - 320) + ",20)")
        .attr("class", "legend");

    legend.append("rect")
        .attr("x", 100)
        .attr("y", -30)
        .attr("width", 200)
        .attr("height", 200)
        .attr("fill", "rgba(255, 255, 255, 0.95)")
        .attr("rx", 8)
        .style("filter", "drop-shadow(0 2px 8px rgba(0,0,0,0.15))");

    legend.append("text")
        .attr("x", 200)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-weight", "bold")
        .style("font-size", "14px")
        .style("fill", "#1F2937")
        .text("Death Cases");

    legend.selectAll("rect.legend-box")
        .data(colorScaleOrdinal.range().slice(1))
        .enter()
        .append("rect")
        .attr("class", "legend-box")
        .attr("x", 120)
        .attr("y", function (d, i) { return i * 18; })
        .attr("width", 16)
        .attr("height", 16)
        .attr("rx", 2)
        .style("fill", function (d) { return d; });

    legend.selectAll("text.legend-label")
        .data(colorScaleOrdinal.domain())
        .enter()
        .append("text")
        .attr("class", "legend-label")
        .attr("x", 145)
        .attr("y", function (d, i) { return i * 18 + 12; })
        .style("font-size", "12px")
        .style("fill", "#374151")
        .text(function (d, i) {
            if (i === colorScaleOrdinal.domain().length - 1) {
                return d + "+";
            } else {
                return d + "-" + (colorScaleOrdinal.domain()[i + 1] - 1);
            }
        });

    function showTooltip(event, deaths, vaccinations, stateName) {
        const tooltip = d3.select("#map-tooltip");
        const totalVaccinations = (vaccinations / 1000000).toFixed(2);

        tooltip.html(`
            <div style="font-weight: 700; color: #FF6666; margin-bottom: 8px;">${stateName}</div>
            <div style="font-size: 13px; color: #E0E0E0;">
                <div style="margin: 4px 0;"><strong>Deaths:</strong> ${deaths.toLocaleString()}</div>
                <div style="margin: 4px 0;"><strong>Vaccinations:</strong> ${totalVaccinations}M</div>
            </div>
        `)
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 60) + "px")
            .style("opacity", "1")
            .style("display", "block");
    }

    function hideTooltip() {
        d3.select("#map-tooltip")
            .style("opacity", "0")
            .style("display", "none");
    }

    /*
    5. Creating and updating state-specific bar charts
    */

    function updateBarCharts(deathState, vaccinationState, stateName) {
        removeBarCharts();

        var years = ["2021", "2022", "2023", "2024"];
        var deathValues = years.map(function (year) { return +deathState[year]; });

        // Vaccinations in MILLIONS
        var vaccinationValues = years.map(function (year) { return (+vaccinationState[year]) / 1000000; });

        var barWidth = 90;
        var barHeight = 400;
        var margin = { top: 120, right: 40, bottom: 70, left: 100 };
        var chartWidth = years.length * barWidth;

        //DEATHS CHART 
        var xScaleDeath = d3.scaleBand().domain(years).range([0, chartWidth]).padding(0.35);
        var yScaleDeath = d3.scaleLinear().domain([0, 4000]).range([barHeight, 0]);

        var svgDeathBar = d3.select("#death-bar-chart")
            .append("svg")
            .attr("class", "svg-container")
            .attr("preserveAspectRatio", "xMidYMid meet")
            .attr("viewBox", "0 0 " + (chartWidth + margin.left + margin.right) + " " + (barHeight + margin.top + margin.bottom))
            .attr("width", "100%")
            .attr("height", "100%")
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        var deathGradient = svgDeathBar.append("defs").append("linearGradient")
            .attr("id", "deathGradient-state")
            .attr("x1", "0%").attr("y1", "0%").attr("x2", "0%").attr("y2", "100%");
        deathGradient.append("stop").attr("offset", "0%").attr("stop-color", "#FF6666");
        deathGradient.append("stop").attr("offset", "100%").attr("stop-color", "#CC0000");

        svgDeathBar.append("text")
            .attr("x", chartWidth / 2).attr("y", -50).attr("text-anchor", "middle")
            .style("font-size", "16px").style("font-weight", "bold").style("fill", "#FF6666")
            .text("COVID-19 Deaths");

        svgDeathBar.append("text")
            .attr("x", chartWidth / 2).attr("y", -25).attr("text-anchor", "middle")
            .style("font-size", "18px").style("font-weight", "700").style("fill", "#1F2937")
            .text(stateName);

        svgDeathBar.append("g").attr("class", "grid")
            .style("stroke", "#E5E7EB").style("stroke-dasharray", "4").style("opacity", "0.4")
            .call(d3.axisLeft(yScaleDeath).tickSize(-chartWidth).tickFormat(""));

        svgDeathBar.selectAll(".grid .domain").style("display", "none");

        svgDeathBar.selectAll("rect.death-bar")
            .data(deathValues)
            .enter()
            .append("rect")
            .attr("class", "death-bar")
            .attr("x", function (d, i) { return xScaleDeath(years[i]); })
            .attr("y", barHeight)
            .attr("width", xScaleDeath.bandwidth())
            .attr("height", 0)
            .attr("fill", "url(#deathGradient-state)")
            .attr("rx", 6)
            .style("cursor", "pointer")
            .style("filter", "drop-shadow(0 2px 4px rgba(204, 0, 0, 0.3))")
            .transition().duration(800).delay((d, i) => i * 100).ease(d3.easeQuadInOut)
            .attr("y", function (d) { return yScaleDeath(d); })
            .attr("height", function (d) { return barHeight - yScaleDeath(d); });

        svgDeathBar.selectAll("text.death-label")
            .data(deathValues)
            .enter()
            .append("text")
            .attr("class", "death-label")
            .attr("x", function (d, i) { return xScaleDeath(years[i]) + xScaleDeath.bandwidth() / 2; })
            .attr("y", function (d) { return yScaleDeath(d) - 10; })
            .attr("text-anchor", "middle")
            .style("font-size", "12px").style("font-weight", "700").style("fill", "#CC0000")
            .style("opacity", "0")
            .text(function (d) { return d.toLocaleString(); })
            .transition().duration(800).delay((d, i) => i * 100 + 400).ease(d3.easeQuadInOut)
            .style("opacity", "1");

        svgDeathBar.append("g").attr("transform", "translate(0," + barHeight + ")")
            .call(d3.axisBottom(xScaleDeath)).selectAll("text")
            .style("font-size", "13px").style("fill", "#6B7280");

        svgDeathBar.append("g")
            .call(d3.axisLeft(yScaleDeath).ticks(5))
            .selectAll("text").style("font-size", "12px").style("fill", "#6B7280");

        //VACCINATION CHART 
        var xScaleVaccination = d3.scaleBand().domain(years).range([0, chartWidth]).padding(0.35);

        //dynamic y-domain so points NEVER go off chart
        var maxVacc = d3.max(vaccinationValues) || 0;
        var yMaxVacc = maxVacc === 0 ? 1 : maxVacc * 1.15; 
        // round up to a nice number (0.5 steps)
        yMaxVacc = Math.ceil(yMaxVacc * 2) / 2;

        var yScaleVaccination = d3.scaleLinear()
            .domain([0, yMaxVacc])
            .range([barHeight, 0])
            .nice();

        var svgVaccinationBar = d3.select("#vaccination-bar-chart")
            .append("svg")
            .attr("class", "svg-container")
            .attr("preserveAspectRatio", "xMidYMid meet")
            .attr("viewBox", "0 0 " + (chartWidth + margin.left + margin.right) + " " + (barHeight + margin.top + margin.bottom))
            .attr("width", "100%")
            .attr("height", "100%")
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        svgVaccinationBar.append("text")
            .attr("x", chartWidth / 2).attr("y", -50).attr("text-anchor", "middle")
            .style("font-size", "16px").style("font-weight", "bold").style("fill", "#0099FF")
            .text("Vaccinations");

        svgVaccinationBar.append("text")
            .attr("x", chartWidth / 2).attr("y", -25).attr("text-anchor", "middle")
            .style("font-size", "18px").style("font-weight", "700").style("fill", "#1F2937")
            .text(stateName);

        svgVaccinationBar.append("g").attr("class", "grid")
            .style("stroke", "#E5E7EB").style("stroke-dasharray", "4").style("opacity", "0.4")
            .call(d3.axisLeft(yScaleVaccination).tickSize(-chartWidth).tickFormat(""));

        svgVaccinationBar.selectAll(".grid .domain").style("display", "none");

        svgVaccinationBar.selectAll("circle.vacc-dot")
            .data(vaccinationValues)
            .enter()
            .append("circle")
            .attr("class", "vacc-dot")
            .attr("cx", function (d, i) { return xScaleVaccination(years[i]) + xScaleVaccination.bandwidth() / 2; })
            .attr("cy", barHeight)
            .attr("r", 6)
            .attr("fill", "#00BCD4")
            .attr("stroke", "#0099FF")
            .attr("stroke-width", 2)
            .style("filter", "drop-shadow(0 2px 4px rgba(0, 153, 255, 0.3))")
            .transition().duration(800).delay((d, i) => i * 100).ease(d3.easeQuadInOut)
            .attr("cy", function (d) { return yScaleVaccination(d); });

        var lineGenerator = d3.line()
            .x(function (d, i) { return xScaleVaccination(years[i]) + xScaleVaccination.bandwidth() / 2; })
            .y(function (d) { return yScaleVaccination(d); });

        svgVaccinationBar.append("path")
            .attr("d", lineGenerator(vaccinationValues))
            .attr("stroke", "#0099FF")
            .attr("stroke-width", 2.5)
            .attr("fill", "none")
            .attr("stroke-dasharray", "0," + (barHeight * 2))
            .style("filter", "drop-shadow(0 1px 3px rgba(0, 153, 255, 0.4))")
            .transition().duration(800).delay(500).ease(d3.easeQuadInOut)
            .attr("stroke-dasharray", (barHeight * 2) + ",0");

        svgVaccinationBar.selectAll("text.vacc-label")
            .data(vaccinationValues)
            .enter()
            .append("text")
            .attr("class", "vacc-label")
            .attr("x", function (d, i) { return xScaleVaccination(years[i]) + xScaleVaccination.bandwidth() / 2; })
            .attr("y", function (d) { return yScaleVaccination(d) - 15; })
            .attr("text-anchor", "middle")
            .style("font-size", "13px").style("font-weight", "700").style("fill", "#0099FF")
            .style("opacity", "0")
            .text(function (d) { return d.toFixed(1) + "M"; })
            .transition().duration(800).delay((d, i) => i * 100).ease(d3.easeQuadInOut)
            .style("opacity", "1");

        svgVaccinationBar.append("g").attr("transform", "translate(0," + barHeight + ")")
            .call(d3.axisBottom(xScaleVaccination)).selectAll("text")
            .style("font-size", "13px").style("fill", "#6B7280");

        svgVaccinationBar.append("g")
            .call(d3.axisLeft(yScaleVaccination).ticks(5))
            .selectAll("text").style("font-size", "12px").style("fill", "#6B7280");
    }

    /*
    6. Creating and updating national bar charts
    */

    function createDefaultBarChart(deathData, vaccinationData) {
        removeBarCharts();

        var years = ["2021", "2022", "2023", "2024"];
        var deathValues = years.map(function (year) {
            return d3.sum(deathData, function (d) { return +d[year]; }) / 2;
        });

        // Vaccinations in MILLIONS
        var vaccinationValues = years.map(function (year) {
            return d3.sum(vaccinationData, function (d) { return +d[year]; }) / (2 * 1000000);
        });

        var barWidth = 90;
        var barHeight = 400;
        var margin = { top: 120, right: 40, bottom: 70, left: 100 };
        var chartWidth = years.length * barWidth;

        //DEATHS CHART
        var xScaleDeath = d3.scaleBand().domain(years).range([0, chartWidth]).padding(0.35);
        var yScaleDeath = d3.scaleLinear().domain([0, 11000]).range([barHeight, 0]);

        var svgDeathBar = d3.select("#death-bar-chart")
            .append("svg")
            .attr("class", "svg-container")
            .attr("preserveAspectRatio", "xMidYMid meet")
            .attr("viewBox", "0 0 " + (chartWidth + margin.left + margin.right) + " " + (barHeight + margin.top + margin.bottom))
            .attr("width", "100%")
            .attr("height", "100%")
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        var deathGradient = svgDeathBar.append("defs").append("linearGradient")
            .attr("id", "deathGradient-national")
            .attr("x1", "0%").attr("y1", "0%").attr("x2", "0%").attr("y2", "100%");
        deathGradient.append("stop").attr("offset", "0%").attr("stop-color", "#FF6666");
        deathGradient.append("stop").attr("offset", "100%").attr("stop-color", "#CC0000");

        svgDeathBar.append("text")
            .attr("x", chartWidth / 2).attr("y", -50).attr("text-anchor", "middle")
            .style("font-size", "16px").style("font-weight", "bold").style("fill", "#FF6666")
            .text("COVID-19 Deaths");

        svgDeathBar.append("text")
            .attr("x", chartWidth / 2).attr("y", -25).attr("text-anchor", "middle")
            .style("font-size", "18px").style("font-weight", "700").style("fill", "#1F2937")
            .text("Australia");

        svgDeathBar.append("g").attr("class", "grid")
            .style("stroke", "#E5E7EB").style("stroke-dasharray", "4").style("opacity", "0.4")
            .call(d3.axisLeft(yScaleDeath).tickSize(-chartWidth).tickFormat(""));

        svgDeathBar.selectAll(".grid .domain").style("display", "none");

        svgDeathBar.selectAll("rect.death-bar")
            .data(deathValues)
            .enter()
            .append("rect")
            .attr("class", "death-bar")
            .attr("x", function (d, i) { return xScaleDeath(years[i]); })
            .attr("y", barHeight)
            .attr("width", xScaleDeath.bandwidth())
            .attr("height", 0)
            .attr("fill", "url(#deathGradient-national)")
            .attr("rx", 6)
            .transition().duration(800).delay((d, i) => i * 100).ease(d3.easeQuadInOut)
            .attr("y", function (d) { return yScaleDeath(d); })
            .attr("height", function (d) { return barHeight - yScaleDeath(d); });

        svgDeathBar.selectAll("text.death-label")
            .data(deathValues)
            .enter()
            .append("text")
            .attr("class", "death-label")
            .attr("x", function (d, i) { return xScaleDeath(years[i]) + xScaleDeath.bandwidth() / 2; })
            .attr("y", function (d) { return yScaleDeath(d) - 10; })
            .attr("text-anchor", "middle")
            .style("font-size", "12px").style("font-weight", "700").style("fill", "#CC0000")
            .style("opacity", "0")
            .text(function (d) { return Math.round(d).toLocaleString(); })
            .transition().duration(800).delay((d, i) => i * 100 + 400).ease(d3.easeQuadInOut)
            .style("opacity", "1");

        svgDeathBar.append("g").attr("transform", "translate(0," + barHeight + ")")
            .call(d3.axisBottom(xScaleDeath)).selectAll("text")
            .style("font-size", "13px").style("fill", "#6B7280");

        svgDeathBar.append("g")
            .call(d3.axisLeft(yScaleDeath).ticks(5))
            .selectAll("text").style("font-size", "12px").style("fill", "#6B7280");

        //VACCINATION CHART
        var xScaleVaccination = d3.scaleBand().domain(years).range([0, chartWidth]).padding(0.35);

        //dynamic y-domain for Australia totals
        var maxVacc = d3.max(vaccinationValues) || 0;
        var yMaxVacc = maxVacc === 0 ? 1 : maxVacc * 1.15;
        yMaxVacc = Math.ceil(yMaxVacc * 2) / 2;

        var yScaleVaccination = d3.scaleLinear()
            .domain([0, yMaxVacc])
            .range([barHeight, 0])
            .nice();

        var svgVaccinationBar = d3.select("#vaccination-bar-chart")
            .append("svg")
            .attr("class", "svg-container")
            .attr("preserveAspectRatio", "xMidYMid meet")
            .attr("viewBox", "0 0 " + (chartWidth + margin.left + margin.right) + " " + (barHeight + margin.top + margin.bottom))
            .attr("width", "100%")
            .attr("height", "100%")
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        svgVaccinationBar.append("text")
            .attr("x", chartWidth / 2).attr("y", -50).attr("text-anchor", "middle")
            .style("font-size", "16px").style("font-weight", "bold").style("fill", "#0099FF")
            .text("Vaccinations");

        svgVaccinationBar.append("text")
            .attr("x", chartWidth / 2).attr("y", -25).attr("text-anchor", "middle")
            .style("font-size", "18px").style("font-weight", "700").style("fill", "#1F2937")
            .text("Australia");

        svgVaccinationBar.append("g").attr("class", "grid")
            .style("stroke", "#E5E7EB").style("stroke-dasharray", "4").style("opacity", "0.4")
            .call(d3.axisLeft(yScaleVaccination).tickSize(-chartWidth).tickFormat(""));

        svgVaccinationBar.selectAll(".grid .domain").style("display", "none");

        svgVaccinationBar.selectAll("circle.vacc-dot")
            .data(vaccinationValues)
            .enter()
            .append("circle")
            .attr("class", "vacc-dot")
            .attr("cx", function (d, i) { return xScaleVaccination(years[i]) + xScaleVaccination.bandwidth() / 2; })
            .attr("cy", barHeight)
            .attr("r", 6)
            .attr("fill", "#00BCD4")
            .attr("stroke", "#0099FF")
            .attr("stroke-width", 2)
            .transition().duration(800).delay((d, i) => i * 100).ease(d3.easeQuadInOut)
            .attr("cy", function (d) { return yScaleVaccination(d); });

        var lineGenerator = d3.line()
            .x(function (d, i) { return xScaleVaccination(years[i]) + xScaleVaccination.bandwidth() / 2; })
            .y(function (d) { return yScaleVaccination(d); });

        svgVaccinationBar.append("path")
            .attr("d", lineGenerator(vaccinationValues))
            .attr("stroke", "#0099FF")
            .attr("stroke-width", 2.5)
            .attr("fill", "none")
            .attr("stroke-dasharray", "0," + (barHeight * 2))
            .transition().duration(800).delay(500).ease(d3.easeQuadInOut)
            .attr("stroke-dasharray", (barHeight * 2) + ",0");

        svgVaccinationBar.selectAll("text.vacc-label")
            .data(vaccinationValues)
            .enter()
            .append("text")
            .attr("class", "vacc-label")
            .attr("x", function (d, i) { return xScaleVaccination(years[i]) + xScaleVaccination.bandwidth() / 2; })
            .attr("y", function (d) { return yScaleVaccination(d) - 15; })
            .attr("text-anchor", "middle")
            .style("font-size", "13px").style("font-weight", "700").style("fill", "#0099FF")
            .style("opacity", "0")
            .text(function (d) { return d.toFixed(1) + "M"; })
            .transition().duration(800).delay((d, i) => i * 100).ease(d3.easeQuadInOut)
            .style("opacity", "1");

        svgVaccinationBar.append("g").attr("transform", "translate(0," + barHeight + ")")
            .call(d3.axisBottom(xScaleVaccination)).selectAll("text")
            .style("font-size", "13px").style("fill", "#6B7280");

        svgVaccinationBar.append("g")
            .call(d3.axisLeft(yScaleVaccination).ticks(5))
            .selectAll("text").style("font-size", "12px").style("fill", "#6B7280");
    }

    createDefaultBarChart(deathData, vaccinationData);

    /*
    7. Function to remove bar charts
    */

    function removeBarCharts() {
        // Only remove the D3-generated SVG, keep the chart header + fullscreen button intact
        d3.select("#death-bar-chart").selectAll("svg").remove();
        d3.select("#vaccination-bar-chart").selectAll("svg").remove();
    }
});
/*
8. Fullscreen toggle for the Deaths/Vaccinations charts
 - Confines fullscreen to the right panel (#chart3-section)
 - Click again (or ESC) to exit
*/

(function () {
    const chart3 = document.getElementById("chart3-section");
    if (!chart3) return;

    const deathCard = document.getElementById("death-bar-chart");
    const vaccCard = document.getElementById("vaccination-bar-chart");
    const btns = chart3.querySelectorAll(".chart-fs-btn");

    function setBtnIcon(btn, isFullscreen) {
        const icon = btn.querySelector("i");
        if (!icon) return;
        icon.className = isFullscreen ? "fa-solid fa-compress" : "fa-solid fa-expand";
    }

    function exitFullscreen() {
        chart3.classList.remove("fullscreen-active");
        deathCard?.classList.remove("chart-fullscreen");
        vaccCard?.classList.remove("chart-fullscreen");
        btns.forEach((b) => setBtnIcon(b, false));
    }

    function toggleFullscreen(targetId) {
        const target = document.getElementById(targetId);
        if (!target) return;

        const isAlreadyFullscreen = target.classList.contains("chart-fullscreen");

        // Reset first
        exitFullscreen();

        // If it wasn't fullscreen already, make it fullscreen now
        if (!isAlreadyFullscreen) {
            chart3.classList.add("fullscreen-active");
            target.classList.add("chart-fullscreen");

            const btn = chart3.querySelector(`.chart-fs-btn[data-target="${targetId}"]`);
            if (btn) setBtnIcon(btn, true);
        }
    }

    btns.forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const targetId = btn.getAttribute("data-target");
            if (targetId) toggleFullscreen(targetId);
        });
    });

    // ESC to exit
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && chart3.classList.contains("fullscreen-active")) {
            exitFullscreen();
        }
    });
})();

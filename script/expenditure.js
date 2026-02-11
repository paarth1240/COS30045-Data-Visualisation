
document.addEventListener("DOMContentLoaded", function() {
  // Load and display the chart
  d3.json("dataset/healthExpenditure.json").then(function(data) {
    // Extract Australia data
    const australiaData = data.find(d => d.Country === "Australia");
    
    // Format data for visualization
    const chartData = [
      { year: "2019", expenditure: parseFloat(australiaData["2019"]), formatted: "203.2B" },
      { year: "2020", expenditure: parseFloat(australiaData["2020"]), formatted: "223.3B" },
      { year: "2021", expenditure: parseFloat(australiaData["2021"]), formatted: "245.1B" },
      { year: "2022", expenditure: parseFloat(australiaData["2022"]), formatted: "254.0B" }
    ];
    
    createModernBarChart(chartData);
  }).catch(error => {
    console.error('Error loading data:', error);
  });
});

function createModernBarChart(data) {
  // Responsive dimensions
  const container = d3.select("#chart1");
  const containerWidth = container.node().clientWidth || 800;
  const containerHeight = container.node().clientHeight || 600;
  
  const margin = { top: 40, right: 30, bottom: 60, left: 80 };
  const width = Math.max(containerWidth - margin.left - margin.right, 300);
  const height = Math.max(containerHeight - margin.top - margin.bottom, 300);

  // Create SVG
  const svg = container
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Add gradient definitions
  const defs = svg.append("defs");
  
  const gradient = defs.append("linearGradient")
    .attr("id", "barGradient")
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "0%")
    .attr("y2", "100%");
  
  gradient.append("stop")
    .attr("offset", "0%")
    .attr("stop-color", "#00D4FF")
    .attr("stop-opacity", 1);
  
  gradient.append("stop")
    .attr("offset", "100%")
    .attr("stop-color", "#0066CC")
    .attr("stop-opacity", 1);

  // Scales
  const xScale = d3.scaleBand()
    .domain(data.map(d => d.year))
    .range([0, width])
    .padding(0.3);

  const yScale = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.expenditure) * 1.1])
    .range([height, 0]);

  // X Axis
  const xAxis = d3.axisBottom(xScale);
  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(xAxis)
    .attr("class", "x-axis")
    .style("font-size", "13px")
    .style("font-weight", "500")
    .style("color", "#6B7280");

  // Y Axis
  const yAxis = d3.axisLeft(yScale)
    .ticks(5)
    .tickFormat(d => `$${(d).toLocaleString()}M`);
  
  svg.append("g")
    .call(yAxis)
    .attr("class", "y-axis")
    .style("font-size", "10px")
    .style("color", "#6B7280");

  // Y Axis Label
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left - 5)
    .attr("x", 0 - height / 2)
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("font-size", "15px")
    .style("font-weight", "600")
    .style("fill", "#000205")
    .text("Expenditure (Million AUD)");

  // Create tooltip
  const tooltip = d3.select("body").append("div")
    .attr("class", "expenditure-tooltip")
    .style("position", "absolute")
    .style("background", "rgba(0, 0, 0, 0.9)")
    .style("color", "white")
    .style("padding", "12px 16px")
    .style("border-radius", "8px")
    .style("font-size", "14px")
    .style("font-weight", "600")
    .style("pointer-events", "none")
    .style("opacity", "0")
    .style("z-index", "999")
    .style("transition", "opacity 0.3s ease");

  // Add subtle grid lines BEFORE bars 
  svg.append("g")
    .attr("class", "grid")
    .style("stroke", "#E5E7EB")
    .style("stroke-dasharray", "4")
    .style("opacity", "0.5")
    .call(d3.axisLeft(yScale)
      .tickSize(-width)
      .tickFormat("")
    );

  // Styling adjustments for grid
  svg.selectAll(".grid .domain").style("display", "none");

  // Bars with animation
  svg.selectAll(".bar")
    .data(data)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", d => xScale(d.year))
    .attr("width", xScale.bandwidth())
    .attr("y", height)
    .attr("height", 0)
    .attr("fill", "url(#barGradient)")
    .attr("rx", 6)
    .attr("ry", 6)
    .style("cursor", "pointer")
    .style("transition", "filter 0.3s ease")
    .on("mouseover", function(event, d) {
      d3.select(this)
        .style("filter", "brightness(1.2)");
      
      tooltip
        .style("opacity", "1")
        .html(`
          <div style="text-align: center;">
            <strong>${d.year}</strong><br/>
            AU$${(d.expenditure).toLocaleString()}M<br/>
            <span style="font-size: 12px; opacity: 0.9;">${(d.expenditure).toLocaleString()} million</span>
          </div>
        `)
        .style("left", (event.pageX - 80) + "px")
        .style("top", (event.pageY - 80) + "px");
    })
    .on("mousemove", function(event) {
      tooltip
        .style("left", (event.pageX - 80) + "px")
        .style("top", (event.pageY - 80) + "px");
    })
    .on("mouseout", function() {
      d3.select(this)
        .style("filter", "brightness(1)");
      tooltip.style("opacity", "0");
    })
    .transition()
    .duration(800)
    .ease(d3.easeQuadInOut)
    .attr("y", d => yScale(d.expenditure))
    .attr("height", d => height - yScale(d.expenditure));

  // Value labels on top of bars
  svg.selectAll(".bar-label")
    .data(data)
    .enter()
    .append("text")
    .attr("class", "bar-label")
    .attr("x", d => xScale(d.year) + xScale.bandwidth() / 2)
    .attr("y", height)
    .attr("text-anchor", "middle")
    .attr("dy", "-5px")
    .style("font-size", "14px")
    .style("font-weight", "700")
    .style("fill", "#0066CC")
    .style("opacity", "0")
    .text(d => `AU$${(d.expenditure).toLocaleString()}M`)
    .transition()
    .duration(800)
    .delay((d, i) => i * 100)
    .ease(d3.easeQuadInOut)
    .attr("y", d => yScale(d.expenditure) - 10)
    .style("opacity", "1");

  // Styling adjustments
  svg.selectAll(".x-axis .domain, .y-axis .domain")
    .style("stroke", "#D1D5DB")
    .style("stroke-width", "1px");
  
  svg.selectAll(".x-axis line, .y-axis line")
    .style("stroke", "#D1D5DB")
    .style("stroke-width", "1px");

  // Add title
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", -20)
    .attr("text-anchor", "middle")
    .style("font-size", "18px")
    .style("font-weight", "700")
    .style("fill", "#1F2937")
    .text("Health Expenditure Trend");
}

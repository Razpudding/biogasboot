const d3 = require('d3');
const config = require('../../../modules/config');

//TODO: add month to datestamps on the x-axis. This means actually connecting the ticks to the data because atm
// The available pixels are divided over days in the month january (31) no matter which month you select :P
if (document.querySelector('#history-graph') && document.querySelector('#history-graph').clientWidth) {
  const containerWidth = document.querySelector('#history-graph').parentNode.clientWidth;
  const containerHeight = document.querySelector('#history-graph').parentNode.clientHeight;

  // Set the dimensions of the canvas / graph
  const margin = {top: 20, right: 40, bottom: 60, left: 40};
  const width = containerWidth - margin.left - margin.right - 32;
  const height = containerHeight - margin.top - margin.bottom - 16;

  // Get initial values
  const firstYear = document.querySelector('#firstYear');
  const secondYear = document.querySelector('#secondYear');
  const firstMonth = document.querySelector('#firstMonth');
  const secondMonth = document.querySelector('#secondMonth');

  const filters = document.querySelector('.filters');
  const compareButton = document.querySelector('label.compare');

  // Make objects for D3.js
  const getUsedValues = function () {
    let i = 0;
    const values = [];
    for (const key in config.defineValues) {
      if (Object.prototype.hasOwnProperty.call(config.defineValues, key)) {
        i++;
        values.push({
          name: config.defineValues[key].name,
          title: config.defineValues[key].title,
          min: config.defineValues[key].min,
          max: config.defineValues[key].max
        });
      }
      if (i === Object.keys(config.defineValues).length) {
        return values;
      }
    }
  };

  // Fill the values
  const usedValues = getUsedValues();

  const range = {
    firstYear: firstYear.value,
    secondYear: secondYear.value,
    firstMonth: firstMonth.value,
    secondMonth: secondMonth.value
  };

  let drawnValues = [2, 3];

  let maxSelected = 2;
  let singleMonth = false;

  // Parse the date / time
  const parseDate = d3.timeParse('%m-%d-%Y');
  const parseYear = d3.timeParse('%Y');
  const parseMonth = d3.timeParse('%Y-%m');

  // Set the ranges
  const x = d3
    .scaleTime()
    .range([0, width]);

  const y = d3
    .scaleLinear()
    .range([height, 0]);

  const y1 = d3
    .scaleLinear()
    .range([height, 0]);

  // Define the axes
  const xAxis = d3
    .axisBottom()
    .tickFormat(d => d.getDate())
    .scale(x);

  const yAxis = d3
    .axisLeft()
    .scale(y)
    .ticks(10)
    .tickSize(-width);

  const y1Axis = d3
    .axisRight()
    .scale(y1)
    .ticks(4)
    .tickSize(-width);

  // Define the lines
  const valueline = d3.line()
    .x(d => x(d.date))
    .y(d => y(d[usedValues[drawnValues[0] - 1].name]));

  const compareValueline = d3.line()
    .x(d => x(d.date))
    .y(d => singleMonth ? y(d[usedValues[drawnValues[0] - 1].name]) : y1(d[usedValues[drawnValues[1] - 1].name]));

  // Adds the svg
  const svg = d3.select('#history-graph')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

  // Create and add buttons to the page
  usedValues.forEach((value, i) => {
    const el = document.createElement('button');
    el.innerHTML = value.title;
    el.setAttribute('name', value.name);
    el.setAttribute('data-index', i + 1);
    el.addEventListener('click', e => {
      handleFilterClick(e);
    });
    filters.appendChild(el);
  });

  // Change the values needed for the single month mode
  compareButton.addEventListener('click', e => {
    maxSelected === 2 ? maxSelected = 1 : maxSelected = 2;

    singleMonth = !singleMonth;

    svg.node().classList.toggle('compare-month');

    if (drawnValues[1]) {
      drawnValues.splice(1, 1);
    }

    activateButtons();
  });

  // Get the data on initial load
  let url = showMonth(firstMonth.value, firstYear.value);
  const xhttp = new XMLHttpRequest();
  let response;
  xhttp.onreadystatechange = function() {
    if (this.readyState === 4 && this.status === 200) {        
      response = xhttp.responseText;
      let data = JSON.parse(response);
  
      data = cleanData(data);

      // Scale the range of the data
      x.domain(d3.extent(data, d => d.date));

      if (drawnValues[0]) {
        y.domain([usedValues[drawnValues[0] - 1].min, usedValues[drawnValues[0] - 1].max]);
      }

      if (drawnValues[1]) {
        y1.domain([usedValues[drawnValues[1] - 1].min, usedValues[drawnValues[1] - 1].max]);
      }

      // Add the valueline path.
      if (drawnValues[0]) {
        svg.append('path')
          .attr('class', 'line first')
          .attr('d', valueline(data));
      } else {
        svg.append('path')
          .attr('class', 'line first');
      }

      if (drawnValues[1]) {
        svg.append('path')
          .attr('class', 'line compare')
          .attr('d', compareValueline(data));
      } else {
        svg.append('path')
          .attr('class', 'line compare');
      }

      // Add the X Axis
      svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);

      // Add the Y Axis
      if (drawnValues[0]) { // if there are selected values
        svg.append('g')
          .attr('class', 'y axis')
          .call(yAxis);
      } else { // if not, just draw the 'g' element to be filled later
        svg.append('g')
          .attr('class', 'y axis');
      }

      if (drawnValues[1]) { // if there are selected values
        svg.append('g')
          .attr('class', 'y axis right')
          .attr('transform', `translate(${width})`)
          .call(y1Axis);
      } else { // if not, just draw the 'g' element to be filled later
        svg.append('g')
          .attr('class', 'y axis right')
          .attr('transform', `translate(${width})`);
      }
    }
    xhttp.open('GET', url, true);
    xhttp.send();
  };

  // Update graph with new data
  function updateData(url) {
    console.log("update data calling to ", url)
    // Get the data again
    const xhttp = new XMLHttpRequest();
    let response;
    xhttp.onreadystatechange = function() {
      if (this.readyState === 4 && this.status === 200) {        
        response = xhttp.responseText;
        let data = JSON.parse(response);
        data = cleanData(data);

        // Scale the range of the data again
        x.domain(d3.extent(data, d => {
          return d.date;
        }));

        // change domain if first value is in drawnValues array
        if (drawnValues[0]) {
          y.domain([usedValues[drawnValues[0] - 1].min, usedValues[drawnValues[0] - 1].max]);
        }

        // change domain if second value is in drawnValues array
        if (drawnValues[1]) {
          y1.domain([usedValues[drawnValues[1] - 1].min, usedValues[drawnValues[1] - 1].max]);
        }

        // Select the section where changes are made
        const svg = d3.select('body');

        // Make the changes
        if (drawnValues[0]) {
          svg.select('.line')
            .attr('d', valueline(data));
        } else {
          svg.select('.line').node().setAttribute('d', '');
        }

        if (drawnValues[1] && !singleMonth) { // check if there is a first value and it's not in singleMonth mode
          svg.select('.line.compare')
            .attr('d', compareValueline(data));
        } else if (singleMonth) {
          d3.json(showMonth(range.secondMonth, range.secondYear), compareData => {
            compareData = cleanData(compareData);

            svg.select('.line.compare')
              .attr('d', compareValueline(compareData));
          });
        } else {
          svg.select('.line.compare').node().setAttribute('d', '');
        }

        svg.select('.x.axis')
          .call(xAxis);

        if (drawnValues[0]) {
          svg.select('.y.axis')
            .call(yAxis);
        } else {
          svg.select('.y.axis').node().innerHMTL = '';
        }

        if (drawnValues[1]) {
          svg.select('.y.axis.right')
            .call(y1Axis);
        } else {
          svg.select('.y.axis.right').node().innerHTML = '';
        }
      }
    }
    xhttp.open('GET', url, true);
    xhttp.send();
  }

  function showMonth(monthNumber, yearNumber) {
    const month = parseMonth(`${yearNumber}-${monthNumber}`);
    const monthFromMonth = parseMonth(`${yearNumber}-${Number(monthNumber) + 1}`);

    const monthUnix = month / 1000;
    const monthFromMonthUnix = monthFromMonth / 1000;

    const url = `/api/range/monthperday?dateStart=${monthUnix}&dateEnd=${monthFromMonthUnix}&api_key=CMD17`;
    console.log("showmonth calling to ", url)
    return url;
  }

  if (firstYear && secondYear && firstMonth && secondMonth) {
    firstYear.addEventListener('change', e => {
      const value = e.target.value;

      range.firstYear = value;

      getRange();
    });

    secondYear.addEventListener('change', e => {
      const value = e.target.value;

      range.secondYear = value;

      getRange();
    });

    firstMonth.addEventListener('change', e => {
      const value = e.target.value;
      const year = firstYear.value;

      range.firstMonth = value;
      range.firstYear = year;

      getRange();
    });

    secondMonth.addEventListener('change', e => {
      const value = e.target.value;
      const year = secondYear.value;

      range.secondMonth = value;
      range.secondYear = year;

      setSecondMonth();
    });
  }

  // Get month for usage
  function showMonthUsage(monthNumber, yearNumber) {
    const month = parseMonth(`${yearNumber}-${monthNumber}`);

    const monthUnix = month / 1000;
    //const monthFromMonthUnix = monthFromMonth / 1000;
    const url = `/api/status/range/${monthUnix}?api_key=CMD17`;
    console.log("showmonthusage, gerating url", url)
    return url;
  }

  // Update usage table
  function updateCompareUsage(url, indicator) {
    console.log("contacting through xhhtp API at ", url);
    const compareContainer = document.querySelector('#compare');
    compareContainer.classList.add('loading');
    const xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
      if (this.readyState === 4 && this.status === 200) {
        // First date
        if (indicator === 0) {
          let response = xhttp.responseText;
          response = JSON.parse(response);
          const compareTable = document.querySelector('#compareTable');
          Object.keys(response).map(function (key, index) {
            let getIDtd = document.getElementById(key);
            // Fill in the table
            getIDtd.getElementsByClassName('timeON')[0].innerHTML = Math.round(Number((response[key].timeON) / 60));
            getIDtd.getElementsByClassName('kWh')[0].innerHTML = Math.round(Number(response[key].kWh));
            getIDtd.getElementsByClassName('Wh')[0].innerHTML = Math.round(Number(response[key].Wh));
          });
          compareContainer.classList.remove('loading');
        } // Second date
        else if (indicator === 1) {
          let response = xhttp.responseText;
          response = JSON.parse(response);
          const compareTable = document.querySelector('#compareTable');
          Object.keys(response).map(function (key, index) {
            let getIDtd = document.getElementById(key);
            // Fill in the table
            getIDtd.getElementsByClassName('timeON')[1].innerHTML = Math.round(Number((response[key].timeON) / 60));
            getIDtd.getElementsByClassName('kWh')[1].innerHTML = Math.round(Number(response[key].kWh));
            getIDtd.getElementsByClassName('Wh')[1].innerHTML = Math.round(Number(response[key].Wh));
          });
          compareContainer.classList.remove('loading');
        }
      }
    };
    xhttp.open('GET', url, true);
    xhttp.send();
  }
  updateCompareUsage(showMonthUsage(range.firstMonth, range.firstYear), 0);

  function getRange() {
    if (range.secondYear === '0' || range.secondMonth === '0') {
      updateData(showMonth(range.firstMonth, range.firstYear));
      updateCompareUsage(showMonthUsage(range.firstMonth, range.firstYear), 0);
    } else {
      updateData(showMonth(range.firstMonth, range.firstYear));
      updateCompareUsage(showMonthUsage(range.secondMonth, range.secondYear), 1);
    }
  }

  function setSecondMonth() {
    maxSelected = 1;

    activateButtons();
    updateData(showMonth(firstMonth.value, firstYear.value));
    updateCompareUsage(showMonthUsage(range.firstMonth, range.firstYear), 1);
  }

  function handleFilterClick(e) {
    const index = Number(e.target.attributes['data-index'].value);

    if (singleMonth) {
      drawnValues = [index];
    } else if (drawnValues.length < maxSelected && drawnValues.indexOf(index) === -1) {
      drawnValues.push(index);
    } else if (drawnValues.indexOf(index) > -1) {
      drawnValues.splice(drawnValues.indexOf(index), 1);
    }

    activateButtons();

    updateData(showMonth(firstMonth.value, firstYear.value));
  }

  function cleanData(data) {
    return data.map(d => {
      d.date = parseDate(`01-${d._id.day}-1970`);
      d.Bag_Height = +d.Bag_Height;

      return d;
    });
  }

  function activateButtons() {
    const buttons = document.querySelectorAll('.filters button')

    Array.prototype.forEach.call(buttons, button => {
      button.classList.remove('active');
      button.classList.remove('first');
      button.classList.remove('second');
    });

    drawnValues.forEach((value, index) => {
      const el = document.querySelector(`[data-index='${value}']`);

      index === 0 ? el.classList.add('first') : el.classList.add('second');

      if (el) {
        el.classList.add('active');
      }
    });
  }

  activateButtons();
}

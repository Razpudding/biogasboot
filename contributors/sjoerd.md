# Contribution of Sjoerd Beentjes
This project I have been working on a dashboard for the [Biogasboot](http://www.biogasboot.nl/), together with [Diego](https://github.com/djaygo), [Timo](https://github.com/TimoVerkroost) and [Camille](https://github.com/camille500). This boat converts food waste to biogas, which can be used in the kitchen of a restaurant or festival. The boat has a number of sensors in it to monitor the process.

We made a dashboard to give insights in the data. The app consists of two parts:
- Real time view
- History view

The chart in the real time view updates immediately when new data is available. The history view is used to compare all saved data.

## Things I worked on

### Real time chart
We started building the real-time chart. This is where I started thinking about how we should transfer the data. I used a package called [csv-parse](https://www.npmjs.com/package/csv-parse). This was a good setup and it was used (in an expanded form) in the final product.

```javascript
// server side
fs.readFile('./data/sample-data.csv', (err, data) => {
  if (err) {
    throw err;
  }
  parse(data, {columns: ['Date', 'Time', 'PT100_real_1', 'PT100_real_2', 'Gaszak_hoogte_hu', 'ph_value', 'input_value', 'heater_status']}, (error, output) => {
    if (error) {
      throw error;
    }

    let i = 1;

    setInterval(() => {
      if (!output[i]) {
        i = 1;
      }

      io.sockets.emit('dataPoint', output[i]);

      i++;
    }, 1000);
  });
});

// client side
socket.on('dataPoint', point => {
  tick(point);
});
```

I later [rebuild](https://github.com/sjoerdbeentjes/biogasboot/blob/master/src/js/modules/real-time-graph.js#L141) the `tick()` funtion on the client side so it could take an array of datapoints.

For the chart we used [D3](https://www.npmjs.com/package/d3). This is used for inserting the SVG into the DOM as well as updating it. The code that I wrote for it as a start can be found [here](https://github.com/sjoerdbeentjes/biogasboot/blob/feature/real-time-data/src/js/modules/real-time-graph.js). The final code can be found [here](https://github.com/sjoerdbeentjes/biogasboot/blob/master/src/js/modules/real-time-graph.js).

### History chart

It was a big challange to present all the saved data in a useful way. After discussing a lot as well internally as with the client, we decided to let the user choose with the range of a month. These are the options:
- Choose a month and two values
- Choose two months and one value
This way the chart always has a maximum of two y-axis, which keeps it simple and clear.

The history chart also uses D3. The range selector sends API calls and after that calls the [update()](https://github.com/sjoerdbeentjes/biogasboot/blob/master/src/js/modules/history-graph.js#L199) function.

This is the code i used to generate the url for a month:
```javascript
// parseMonth()
const parseMonth = d3.timeParse('%Y-%m');

// showMonth()
function showMonth(monthNumber, yearNumber) {
  const month = parseMonth(`${yearNumber}-${monthNumber}`);
  const monthFromMonth = parseMonth(`${yearNumber}-${Number(monthNumber) + 1}`);

  const monthUnix = month / 1000;
  const monthFromMonthUnix = monthFromMonth / 1000;

  const url = `/api/range/monthperday?dateStart=${monthUnix}&dateEnd=${monthFromMonthUnix}&api_key=CMD17`;

  return url;
}
```

## Subjects
I worked on a lot of subjects during this project. This are the subjects I've been working on:
- Working with an API, that we made ourselves
- Determining a good structure for a scalable application
- [Working](https://github.com/sjoerdbeentjes/biogasboot/blob/master/models/dataPoint.js) with MongoDB and Mongoose
- [Creating](https://github.com/sjoerdbeentjes/biogasboot/blob/master/routes/auth.js) a login flow using [passport](https://www.npmjs.com/package/passport)

### Web App from scratch

The app is not a single-page application, but uses a lot of DOM manipulation. The individual screens can be seen as applications as themselves. There is a lot of interaction and feedback happening during when viewing the history chart. There is a lot of use of the API, which is very important in this application.

### CSS to the Rescue

To determine the page layout we used flexbox, but we did not forget older browsers like IE10. We used floats at first, and enhanced it by using flexbox.

```CSS
main.history {
  display: flex;
}

aside {
  flex: 0 0 25em;
  float: left; <- make sure the layout doesn't break
}
```

### Performance Matters

The most important elements of the pages are rendered serverside, so the user doesn't have to wait for this. The files that get requested are minified en optimized for all browsers (using [browserify](https://www.npmjs.com/package/browserify) and [babel](https://www.npmjs.com/package/babel)).

The D3 visualisation (which is currently rendered client-side) use API requests with queries to get the data. It appeared that these were very slow, which is not good for the user experience. I helped with thinking about how we could make this faster. I noticed that all the data was gotten from the database, and after that analyzed an processed in Node. This could be done way easier, by letting mongoDB handle the analyzing and processing. The API ended up to be way faster.

### Real-Time Web

We use Websockets to transfer the real-time data. We used [socket.io](https://www.npmjs.com/package/socket.io) to ensure the connection can always be made. The socket connection is used for the real-time view, where the tiles and chart are updated immediately when new data is available.

### Web of Things

The data we use is acquired by sensors. This data is transferred to the control-unit, where it gets stored on an SD-card. We used this data, from the sensors to simulate the data flow for the real-time view. From there it was as if we were working with real sensors.

## Branches i've been working on a lot
- [feature/server](https://github.com/sjoerdbeentjes/biogasboot/tree/feature/server) setup for the server
- [feature/real-time-data](https://github.com/sjoerdbeentjes/biogasboot/tree/feature/real-time-data) setup for the real-time data via sockets
- [feature/history](https://github.com/sjoerdbeentjes/biogasboot/tree/feature/history) the history chart
- [date-range-functions](https://github.com/sjoerdbeentjes/biogasboot/tree/date-range-functions) functions for getting ranges of dates from the API

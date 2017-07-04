const http = require('http').Server;
const path = require('path');
const express = require('express');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const sassMiddleware = require('node-sass-middleware');
const expressValidator = require('express-validator');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const mongo = require('mongodb');
const mongoose = require('mongoose');
const socketio = require('socket.io');

const app = express();
// Init modules
const FTP = require('./modules/getFTPFiles');
const webSockets = require('./modules/websockets');
const serviceWorker = require('./modules/server-service-worker');

const db = mongoose.connection;

// Socket.io connection
const io = socketio();
app.io = io;

require('dotenv').config();

const index = require('./routes/index');
const auth = require('./routes/auth');
const users = require('./routes/users');
const api = require('./routes/api');
const error = require('./routes/error');
const customerDashboard = require('./routes/customer-dashboard');
const operatorDashboard = require('./routes/operator/dashboard');
const operatorDashboardHistory = require('./routes/operator/dashboard-history');

// mongoose setup
mongoose.connect(process.env.DB_URL);

// Get files/data from FTP
FTP.checkForNewFilesIn('value');


// WebSockets
webSockets(app, io);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
// app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, 'public')));

// express session
app.use(session({
  secret: 'appelflap',
  saveUninitialized: true,
  resave: true
}));

// passport init
app.use(passport.initialize());
app.use(passport.session());

// express validator
app.use(expressValidator({
  errorFormatter(param, msg, value) {
    const namespace = param.split('.');
    const root = namespace.shift();
    let formParam = root;

    while (namespace.length) {
      formParam += '[' + namespace.shift() + ']';
    }

    return {
      param: formParam,
      msg,
      value
    };
  }
}));

// global vars
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.locals.user = req.user || null;
  next();
});

// error handler
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

io.on('connection', socket => {
  console.log('CONNECTION');
});

app.use('/', index);
app.use('/auth', auth);
app.use('/users', users);
app.use('/api', api);
app.use('/operator/dashboard', operatorDashboard);
app.use('/operator/dashboard/history', operatorDashboardHistory);
app.use('/customer/dashboard', customerDashboard);
app.use('*', error);

// Service worker push notifications
serviceWorker(app);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

module.exports = app;

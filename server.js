require('dotenv').config()

// Core dependencies
const express = require('express');
const path = require('path');
const flash = require('connect-flash');

// Security and optimization middleware
const compression = require('compression');
const cors = require('cors');
const cookieParser = require('cookie-parser');

// Session handling
const session = require('express-session');
const MongoStore = require('connect-mongo');

// Logging and parsing middleware
const morgan = require('morgan');
const bodyParser = require('body-parser');

// Template engine
const ejs = require('ejs');


const routerMaterial = require('./routers/materialsrouter');
const routerSupplies = require('./routers/supplyrouter');
const pageRenderRouter = require('./routers/pageRender');
const userRouter = require('./routers/user.router');
const salesRouter = require('./routers/sales.router');
const financeRouter = require('./routers/finance.router');

// Error handlers
const notFoundHandler = require('./middlewares/404');
const { validationErrorHandler, errorHandler } = require('./middlewares/400');


const app = express();

// Session configuration
const sessionConfig = {
    secret: 'Secret_Key',
    resave: true,
    saveUninitialized: true,
    store: MongoStore.create({
      mongoUrl: process.env.MongoDBConnectionUrl
    })
  };
  
  
  // Essential middleware stack
  app.use(compression());
  app.use(cors());
  app.use(morgan('tiny'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(session(sessionConfig));
  
  app.use(express.static(path.join(__dirname, 'public')));

  
  // View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));



// Global middleware for messages
app.use(flash());

app.use((req, res, next) => {
    res.locals.message = req.flash('alert');
    next();
});

// Performance monitoring middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} took ${duration}ms timestamp ${new Date()}`);
  });
  next();
});



// Database configuration
require('./database/database')()

// Routes
app.use('/', pageRenderRouter)
app.use(routerMaterial);
app.use(routerSupplies)
app.use(userRouter)
app.use('/api/sales', salesRouter);
app.use('/api/finance', financeRouter);
// Error handlers

app.use(notFoundHandler);
app.use(validationErrorHandler);
app.use(errorHandler);


const port = process.env.PORT || 3000;
// creating a functio to handel server
const handleServer = () => {
  const server = app.listen(port, () => {
    console.log(`Server is running on port http://localhost:${port}`);
  });

  // handling errors
  server.on('error', (error) => {
    console.error('Server error:', error);
    process.exit(1);
  });
};

handleServer()
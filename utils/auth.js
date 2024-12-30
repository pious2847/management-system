const User = require('../models/user')

// Check if user is logged in
const isLoggedIn = (req, res, next) => {
  if (req.session && req.session.userId) {
    // User is logged in
    next();
  } else {
    req.flash('message', `Please login to acess page`);
    req.flash('status', 'danger');
    res.redirect('/');
  }
};

// Check if user is an admin
const isAdmin = (req, res, next) => {
  if (req.session && req.session.userId) {
    User.findById(req.session.userId)
      .then(user => {
        if (user && user.role === 'admin') {
          // User is logged in and is an admin
          next();
        } else {
          // User is not an admin, redirect to login page or handle the unauthorized access
          req.flash("alertMessage", "Please login as admin");
          req.flash("alertStatus", "danger");
          res.redirect('/');
        }
      })
      .catch(err => {
        // Error occurred while fetching the user, handle it appropriately
        res.redirect('/');
      });
  } else {
    // User is not logged in, redirect to login page or handle the unauthorized access
    res.redirect('/');
  }
};

module.exports = { isLoggedIn, isAdmin };

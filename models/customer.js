const mongoose = require('mongoose')

const CustomerScheme = new mongoose.Schema({
    name: {
        type: String,
        trim: true
    },
    phone:{
        type: String,
        require: true,
        trim: true
    },
    email: {
        type: String,
        require: true,
        trim: true
    }
}, {timestamps: true});

const Customer = mongoose.model('Customer', CustomerScheme);
module.exports = Customer;
const mongoose = require('mongoose');

const MaterialsSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    stock: {
        type: Number,
        required: true
    },
    unit: {
        type: String,
        required: true
    },
    weight: {
        type: Number,
        required: true
    },
    unitPrice: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: true,
        minlength: 10,
        maxlength: 200,
    },

});

const Materials = mongoose.model('Materials', MaterialsSchema);

module.exports = Materials;
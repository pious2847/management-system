const mongoose = require('mongoose');

// creating supplies model

const supplySchema = new mongoose.Schema({

  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  material:{
    type: mongoose.Schema.ObjectId,
    ref: 'Material',
    required: true,
  },
  SupplyTime:{
    type: String,
    required: true,
    enum: ['day', 'night'],
  },
  expectedproduction:{
    type: Number,
    required: true,
  },
  remainingmaterials:{
    type: Number,
    required: true,
  },
  wastedMaterial:{
    type: Number,
    required: true,
  }

}, {
    timestamps: true,  
});

const Supply = mongoose.model('Supply', supplySchema);

module.exports = Supply;
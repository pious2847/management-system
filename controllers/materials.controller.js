const Materials = require('../models/materials');
const Supply = require('../models/supplies');
const mongoose = require('mongoose');

exports.createMaterial = async (req, res) => {
    try {
        const material = new Materials(req.body);
        await material.save();
        res.status(201).json(material);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.getAllMaterials = async (req, res) => {
    try {
        const materials = await Materials.find();
        res.status(200).json(materials);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getMaterialById = async (req, res) => {
    try {
        const material = await Materials.findById(req.params.id);
        if (!material) return res.status(404).json({ message: 'Material not found' });
        res.status(200).json(material);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateMaterial = async (req, res) => {
    try {
        const material = await Materials.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!material) return res.status(404).json({ message: 'Material not found' });
        res.status(200).json(material);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.deleteMaterial = async (req, res) => {
    try {
        const material = await Materials.findByIdAndDelete(req.params.id);
        if (!material) return res.status(404).json({ message: 'Material not found' });
        res.status(200).json({ message: 'Material deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
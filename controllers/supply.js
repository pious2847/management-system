const Supply = require('../models/supplies');
const Materials = require('../models/materials');

const SuppliesController = {
    async createSupply(req, res) {
        try {
            const supplyData = req.body;

            if (supplyData._id) {
                // Update existing supply
                const updatedSupply = await Supply.findByIdAndUpdate(
                    supplyData._id, 
                    supplyData, 
                    { new: true }
                );
                req.flash('message', 'Supply Updated successfully');
                req.flash('status', 'success');
                res.redirect('/dashboard/supplies');
            } else {
                delete supplyData._id;

                // Create new supply
                const newSupply = new Supply(supplyData);
                await newSupply.save();
                req.flash('message', 'Supply Added successfully');
                req.flash('status', 'success');
                res.redirect('/dashboard/supplies');
            }
        } catch (error) {
            console.error('Error saving supply:', error);
            req.flash('message', `Error saving supply: ${error.message}`);
            req.flash('status', 'danger');
            res.redirect('/dashboard/supplies');
        }
    },

    async getSuppliesDetails(req, res) {
        try {
            const supply = await Supply.findById(req.params.id).populate('material');

            if (!supply) {
                return res.status(404).json({ message: 'Supply not found' });
            }

            res.json(supply);
        } catch (error) {
            console.error('Error fetching supply details:', error);
            res.status(500).json({
                message: 'Error retrieving supply details',
                error: error.message
            });
        }
    },

    async updateSupply(req, res) {
        try {
            const supplyId = req.params.id;
            const updateData = {
                quantity: req.body.quantity,
                material: req.body.material,
                SupplyTime: req.body.SupplyTime,
                expectedproduction: req.body.expectedproduction,
                remainingmaterials: req.body.remainingmaterials,
                wastedMaterial: req.body.wastedMaterial
            };

            const updatedSupply = await Supply.findByIdAndUpdate(
                supplyId,
                updateData,
                { new: true, runValidators: true }
            );

            if (!updatedSupply) {
                req.flash('message', `Supply not found`);
                req.flash('status', 'danger');
                return res.redirect('/dashboard/supplies');
            }

            req.flash('message', 'Supply updated successfully');
            req.flash('status', 'success');
            res.redirect('/dashboard/supplies');
        } catch (error) {
            console.error('Update error:', error);
            req.flash('message', `Failed to update supply: ${error.message}`);
            req.flash('status', 'danger');
            res.status(500).redirect('/dashboard/supplies');
        }
    },

    async deleteSupply(req, res) {
        try {
            const supply = await Supply.findByIdAndDelete(req.params.id);
            if (!supply) return res.status(404).json({ message: 'Supply not found' });
            
            req.flash('message', `Supply deleted successfully`);
            req.flash('status', 'success');
            res.redirect('/dashboard/supplies');
        } catch (error) {
            console.error('Delete error:', error);
            req.flash('message', `Failed to delete supply`);
            req.flash('status', 'danger');
            res.status(500).json({ message: error.message });
        }
    },

    async getAllSupplies(req, res) {
        try {
            const supplies = await Supply.find().populate('material');
            res.render('supplies', { supplies });
        } catch (error) {
            console.error('Error fetching supplies:', error);
            req.flash('message', `Failed to retrieve supplies`);
            req.flash('status', 'danger');
            res.redirect('/dashboard');
        }
    }
};

module.exports = SuppliesController;
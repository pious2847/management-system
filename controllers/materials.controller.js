const Materials = require('../models/materials');


const MaterialsController = {
    async createMaterial(req, res) {
        try {
            const materialData = req.body;

            if (materialData._id) {
                // Update existing material
                const updatedMaterial = await Materials.findByIdAndUpdate(
                    materialData._id, 
                    materialData, 
                    { new: true }
                );
                req.flash('message', 'Material Updated successfully');
                req.flash('status', 'success');
                res.redirect('/dashboard/materials');
            } else {
                delete materialData._id;

                // Create new material
                const newMaterial = new Materials(materialData);
                await newMaterial.save();
                req.flash('message', 'Material Added successfully');
                req.flash('status', 'success');
                res.redirect('/dashboard/materials');
            }

        } catch (error) {
            console.error('Error saving material:', error);
            req.flash('message', `Error saving material`);
            req.flash('status', 'danger');
            res.redirect('/dashboard/materials');
        }
    },
    async getMaterialsDetails(req, res) {
        try {
            const material = await Materials.findById(req.params.id);

            if (!material) {
                return res.status(404).json({ message: 'Material not found' });
            }

            res.json(material);
        } catch (error) {
            console.error('Error fetching material details:', error);
            res.status(500).json({
                message: 'Error retrieving material details',
                error: error.message
            });
        }
    },
    async updateMaterial(req, res) {
        try {
            const materialId = req.params.id;
            const updateData = {
                name: req.body.name,
                stock: req.body.stock,
                unit: req.body.unit,
                weight: req.body.weight,
                unitPrice: req.body.unitPrice,
                description: req.body.description
            };
            console.log("materialId",materialId);

            // Find and update the material
            const updatedMaterial = await Materials.findByIdAndUpdate(
                materialId,
                updateData,
                { new: true, runValidators: true }
            );
            console.log("updatedMaterial",updatedMaterial);
            if (!updatedMaterial) {
                req.flash('message', `Material not found`);
                req.flash('status', 'danger');
              res.redirect('/dashboard/materials');
                
            }

            // Redirect back to materials page with success message
            req.flash('message', 'Material updated successfully');
            req.flash('status', 'success');

            res.redirect('/dashboard/materials');
        } catch (error) {
            console.error('Update error:', error);
            req.flash('message', `Failed to update material`);
            req.flash('status', 'danger');
            res.status(500).redirect('/dashboard/materials');
        }
    },
    async deleteMaterial(req, res) {
        try {
            const material = await Materials.findByIdAndDelete(req.params.id);
            if (!material) return res.status(404).json({ message: 'Material not found' });
            req.flash('message', `${material.name} deleted successfully`);
            req.flash('status', 'success');
            res.redirect('/dashboard/materials');
        } catch (error) {
            console.error('Delete error:', error);
            req.flash('message', `Failed to delete material`);
            req.flash('status', 'danger');
            res.status(500).json({ message: error.message });
        }
    }
}






exports.deleteMaterial = async (req, res) => {
    try {
        const material = await Materials.findByIdAndDelete(req.params.id);
        if (!material) return res.status(404).json({ message: 'Material not found' });
        res.status(200).json({ message: 'Material deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = MaterialsController;
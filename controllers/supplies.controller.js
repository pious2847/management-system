const Supply = require('../models/supplies');
const Materials = require('../models/materials');

const SuppliesController = {
    async createSupply(req, res) {
        try {
            const supplyData = req.body;

            const material = await Materials.findById(supplyData.material);
            if (!material) {
                req.flash('message', `Material not found`);
                req.flash('status', 'danger');
            }

            // Calculate estimated production weight
            const expectedproduction = supplyData.quantity * material.weight;
            const wastedMaterial = supplyData.wastedMaterial * material.weight;

            const remainingmaterials = material.stock - supplyData.quantity;

            console.log("estimatedProductionWeight", expectedproduction)
            console.log("wastedMaterialWeight", wastedMaterial)

            console.log("remainingmaterials", remainingmaterials)

            if (supplyData._id) {
                // Update existing supply
                const updatedSupply = await Supply.findByIdAndUpdate(
                    supplyData._id,
                    supplyData,
                    expectedproduction,
                    wastedMaterial,
                    remainingmaterials,
                    { new: true }
                );
                req.flash('message', 'Supply Updated successfully');
                req.flash('status', 'success');
                res.redirect('/dashboard/supplies');
            } else {
                delete supplyData._id;

                // Create new supply
                const newSupply = new Supply(
                    {
                        ...supplyData,
                        expectedproduction,
                        wastedMaterial,
                        remainingmaterials
                    }
                );
                await newSupply.save();
                material.quantity = material.stock - newSupply.quantity;
                await material.save();

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
                wastedMaterial: req.body.wastedMaterial
            };

            const supply = await Supply.findById(supplyId).populate('material');
            const material = supply.material;
            if (!material) {
                req.flash('message', `Material not found`);
                req.flash('status', 'danger');
            }

            // Calculate estimated production weight
            const estimatedProductionWeight = updateData.quantity * material.weight;
            const wastedMaterialWeight = updateData.wastedMaterial * material.weight;

            // check if the current quantity has changed and update the material quantity accordingly
            if (supply.quantity !== updateData.quantity) {
                const supplydifference = updateData.quantity - supply.quantity

                // get material and subtract new quantity from material quantity
                const material = await Materials.findById(updateData.material);

                if (!material) {
                    req.flash('message', `Material not found`);
                    req.flash('status', 'danger');
                }

                material.stock -= supplydifference
                await material.save()

            }


            const updatedSupply = await Supply.findByIdAndUpdate(
                supplyId,
                {
                    ...updateData,
                    estimatedProductionWeight,
                    wastedMaterialWeight,
                },
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
            req.flash('message', `Failed to update supply: ${error.message}`);
            req.flash('status', 'danger');
            res.status(500).redirect('/dashboard/supplies');
        }
    },
    async deleteSupply(req, res) {
        try {
            const supply = await Supply.findByIdAndDelete(req.params.id);
            if(!supply){
                req.flash('message', `Supply not fount`);
                req.flash('status', 'danger');
                res.redirect('/dashboard/supplies');
            }

            req.flash('message', `Supply deleted successfully`);
            req.flash('status', 'success');
            res.redirect('/dashboard/supplies');
        } catch (error) {
            req.flash('message', `Failed to delete supply`);
            req.flash('status', 'danger');
            res.status(500).json({ message: error.message });
        }
    },

}


exports.getWeeklySupplies = async (req, res) => {
    try {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const supplies = await Supply.aggregate([
            {
                $match: {
                    createdAt: { $gte: weekAgo }
                }
            },
            {
                $lookup: {
                    from: 'materials',
                    localField: 'material',
                    foreignField: '_id',
                    as: 'materialDetails'
                }
            },
            { $unwind: '$materialDetails' },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        supplyTime: "$SupplyTime"
                    },
                    totalQuantity: { $sum: "$quantity" },
                    totalExpectedProduction: { $sum: "$expectedproduction" },
                    totalWastedMaterial: { $sum: "$wastedMaterial" },
                    materials: {
                        $push: {
                            name: "$materialDetails.name",
                            quantity: "$quantity",
                            expectedProduction: "$expectedproduction",
                            wastedMaterial: "$wastedMaterial"
                        }
                    }
                }
            },
            {
                $sort: { "_id.date": 1 }
            }
        ]);

        res.status(200).json(supplies);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = SuppliesController;
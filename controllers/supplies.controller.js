const Supply = require('../models/supplies');
const Materials = require('../models/materials');

exports.createSupply = async (req, res) => {
    try {
        const material = await Materials.findById(req.body.material);
        if (!material) return res.status(404).json({ message: 'Material not found' });

        // Calculate estimated production weight
        const estimatedProductionWeight = req.body.quantity * material.weight;
        const wastedMaterialWeight = req.body.wastedMaterial * material.weight;

        const supply = new Supply({
            ...req.body,
            expectedproduction: estimatedProductionWeight,
            remainingmaterials: req.body.quantity - req.body.wastedMaterial
        });

        await supply.save();
        res.status(201).json(supply);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

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

exports.updateSupply = async (req, res) => {
    try {
        const material = await Materials.findById(req.body.material);
        if (!material) return res.status(404).json({ message: 'Material not found' });

        const estimatedProductionWeight = req.body.quantity * material.weight;
        const wastedMaterialWeight = req.body.wastedMaterial * material.weight;

        const supply = await Supply.findByIdAndUpdate(
            req.params.id, 
            {
                ...req.body,
                expectedproduction: estimatedProductionWeight,
                remainingmaterials: req.body.quantity - req.body.wastedMaterial
            }, 
            { new: true }
        );

        if (!supply) return res.status(404).json({ message: 'Supply not found' });
        res.status(200).json(supply);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.deleteSupply = async (req, res) => {
    try {
        const supply = await Supply.findByIdAndDelete(req.params.id);
        if (!supply) return res.status(404).json({ message: 'Supply not found' });
        res.status(200).json({ message: 'Supply deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
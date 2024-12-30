
const aggregateDataIntoMonths = async (model)=>{
    const currentYear = new Date().getFullYear();

    const monthlyRecords = await model.aggregate([
        {
            $match: {
                createdAt: {
                    $gte: new Date(currentYear, 0, 1),
                    $lte: new Date(currentYear, 11, 31)
                }
            }
        },
        {
            $group: {
                _id: { $month: "$createdAt" },
                count: { $sum: 1 }
            }
        },
        { $sort: { "_id": 1 } }
    ]);

    const recordsData = new Array(12).fill(0);

    monthlyRecords.forEach(record => {
        recordsData[record._id - 1] = record.count;
    });

    return JSON.stringify(recordsData)
        
}

module.exports = aggregateDataIntoMonths;
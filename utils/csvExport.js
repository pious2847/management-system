const fs = require('fs');
const { Parser } = require('json2csv');
const mongoose = require('mongoose');
const archiver = require('archiver');
const path = require('path')

/**
 * Field mapping for full field names
 */
const fieldNameMapping = {
    staffId: "Staff ID",
    name: "Full Name",
    email: "Email Address",
    role: "Role",
    dob: "Date of Birth",
    houseNumber: "House Number",
    truckName: "Truck Name",
    truckType: "Truck Type",
    vehicleRegistrationNumber: "Vehicle Registration Number",
    date: "Date",
    driverName: "Driver Name",
    tripDate: "Trip Date",
    tripType: "Trip Type",
    startLocation: "Start Location",
    endLocation: "End Location",
    vendor: "Vendor",
    salarySummary_totalSalary: "Total Salary",
    staffName: "Staff Name",
    truckName: "Truck Name"
};

const inventoryFieldNameMapping = {
    name: "Material Name",
    stock: "Stock Quantity",
    unit: "Unit",
    weight: "Weight",
    unitPrice: "Unit Price",
    description: "Description",
};

/**
 * Remove unwanted fields like `_id` and `__v`
 * @param {Object} data - Object containing the data
 * @returns {Object} - Cleaned object without unwanted fields
 */
function cleanData(data) {
    const unwantedFields = ['_id', '__v', 'password'];
    const cleanedData = { ...data };

    unwantedFields.forEach(field => {
        delete cleanedData[field];
    });

    return cleanedData;
}

/**
 * Replace abbreviated field names with full names in an object
 * @param {Object} data - Object containing the data
 * @returns {Object} - Transformed object with full field names
 */
function mapFields(data) {
    const transformedData = {};
    for (const [key, value] of Object.entries(data)) {
        const fullFieldName = fieldNameMapping[key] || key; // Use mapping or keep original
        transformedData[fullFieldName] = value;
    }
    return transformedData;
}

function mapInventoryFields(data) {
    const transformedData = {};
    for (const [key, value] of Object.entries(data)) {
        const fullFieldName = inventoryFieldNameMapping[key] || key;
        transformedData[fullFieldName] = value;
    }
    return transformedData;
}

/**
 * Export a Mongoose model to CSV with optional date range filtering and field selection
 * @param {mongoose.Model} Model - Mongoose model to export
 * @param {string} outputFileName - Name of the output CSV file
 * @param {Object} [options={}] - Export options
 * @returns {Promise<string>} Path to the exported CSV file
 */
async function exportModelToCSV(Model, outputFileName, options = {}) {
    const {
        startDate,
        endDate,
        dateField = 'date',
        fields = [], // Allow custom field selection
        additionalPopulate = []
    } = options;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = startDate;
    if (endDate) dateFilter.$lte = endDate;

    let query = Object.keys(dateFilter).length > 0 ? { [dateField]: dateFilter } : {};
    let data = await Model.find(query);

    if (additionalPopulate.length > 0) {
        data = await Promise.all(
            data.map(async (doc) => {
                for (const populate of additionalPopulate) {
                    await doc.populate(populate);
                }
                return doc;
            })
        );
    }

    const jsonData = data.map((doc) => {
        const plainDoc = doc.toObject();
        const cleanedDoc = cleanData(plainDoc); // Remove unwanted fields
        const mappedDoc = mapFields(cleanedDoc); // Replace abbreviated names with full names
        return mappedDoc;
    });

    const parser = new Parser({
        fields: fields.length > 0 ? fields.map((field) => fieldNameMapping[field] || field) : Object.keys(jsonData[0] || {}),
        quote: '"',
        delimiter: ',',
        eol: '\r\n'
    });
    const csv = parser.parse(jsonData);

    const exportDir = './exports';
    if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir);
    }

    const fullPath = `${exportDir}/${outputFileName}_${Date.now()}.csv`;
    fs.writeFileSync(fullPath, csv);

    return fullPath;
}

async function exportInventoryToCSV(outputFileName, options = {}) {
    const { startDate, endDate, dateField = 'createdAt', fields = [] } = options;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = startDate;
    if (endDate) dateFilter.$lte = endDate;

    const query = Object.keys(dateFilter).length > 0 ? { [dateField]: dateFilter } : {};
    const data = await Materials.find(query);

    const jsonData = data.map((doc) => {
        const plainDoc = doc.toObject();
        const cleanedDoc = cleanData(plainDoc);
        const mappedDoc = mapInventoryFields(cleanedDoc);
        return mappedDoc;
    });

    const parser = new Parser({ fields: fields.length ? fields : Object.keys(inventoryFieldNameMapping) });
    const csv = parser.parse(jsonData);

    fs.writeFileSync(outputFileName, csv);
    return path.resolve(outputFileName);
}

/**
 * Create a zip file from multiple files
 * @param {string[]} filePaths - Array of file paths to zip
 * @param {string} outputZipPath - Path where the zip file will be saved
 * @returns {Promise<string>} - Path to the created zip file
 */
const createZipArchive = (filePaths, outputZipPath) => {
    return new Promise((resolve, reject) => {
        // Ensure exports directory exists
        const exportDir = './exports';
        if (!fs.existsSync(exportDir)) {
            fs.mkdirSync(exportDir);
        }

        // Create a file to stream archive data to
        const output = fs.createWriteStream(outputZipPath);
        const archive = archiver('zip', {
            zlib: { level: 9 } // Sets the compression level
        });

        // Listen for all archive data to be written
        output.on('close', () => {
            resolve(outputZipPath);
        });

        // Catch errors
        archive.on('error', (err) => {
            reject(err);
        });

        // Pipe archive data to the file
        archive.pipe(output);

        // Add files to the archive
        filePaths.forEach(filePath => {
            if (fs.existsSync(filePath)) {
                archive.file(filePath, { name: path.basename(filePath) });
            }
        });

        // Finalize the archive
        archive.finalize();
    });
};


/**
 * Clean up export files after a specified delay
 * @param {number} [delayInSeconds=20] - Time to wait before deleting files
 * @param {string} [exportDir='./exports'] - Directory to clean
 */
function scheduleExportCleanup(delayInSeconds = 20, exportDir = './exports') {
    setTimeout(() => {
        try {
            // Ensure the export directory exists
            if (!fs.existsSync(exportDir)) {
                return;
            }

            // Read all files in the export directory
            const files = fs.readdirSync(exportDir);

            // Remove each file
            files.forEach(file => {
                const filePath = path.join(exportDir, file);
                
                try {
                    // Remove the file
                    fs.unlinkSync(filePath);
                    console.log(`Deleted export file: ${file}`);
                } catch (error) {
                    console.error(`Error deleting file ${file}:`, error);
                }
            });
        } catch (error) {
            console.error('Error during export folder cleanup:', error);
        }
    }, delayInSeconds * 1000);
}



// Export utility functions remain the same as in the previous implementation
const exportUtils = {
    exportStaff: async (options = {}) => {
        const Staff = mongoose.model('Staff');
        return exportModelToCSV(Staff, 'staff_records', {
            dateField: 'dob',
            ...options
        });
    },
    exportTrip: async (options = {}) => {
        const TruckTrip = mongoose.model('TruckTrip');
        return exportModelToCSV(TruckTrip, 'Trips_records', {
            dateField: 'tripDate',
            ...options
        });
    },
    exportTrucks: async (options = {}) => {
        const Truck = mongoose.model('Truck');
        return exportModelToCSV(Truck, 'Trucks_records', {
            dateField: 'date',
            ...options
        });
    },
    exportPayroll: async (options = {}) => {
        const Payroll = mongoose.model('Payroll');
        return exportModelToCSV(Payroll, 'Payrolls_records', {
            dateField: 'date',
            ...options
        });
    },
    exportInventoryToCSV,
    // ... (other export methods remain unchanged)
    exportModelToCSV
};

module.exports = { 
    exportModelToCSV, 
    createZipArchive,
    exportUtils ,
    scheduleExportCleanup
};
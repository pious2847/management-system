const Sales = require('../models/sales');
const Excel = require('exceljs');
const moment = require('moment');


/**
 * Enhanced report generator class with support for CSV and Excel formats
 */
class ReportGenerator {
    constructor() {
        this.currencyFormat = '#,##0.00 "₵"';
        this.dateFormat = 'ddd MMM DD YYYY';
    }

    /**
     * Generate sales report data
     */
    async generateSalesReport(startDate, endDate) {
        const sales = await Sales.find({
            saleDate: { $gte: startDate, $lte: endDate }
        })
        .populate('customer')
        .populate('payment')
        .populate('productId')
        .sort({ saleDate: -1 });

        return sales.map(sale => ({
            customer: sale.customer?.name || 'Unknown',
            product: sale.productId.name,
            quantitySold: sale.quantitySold,
            totalPrice: sale.formattedTotalPrice,
            saleDate: moment(sale.saleDate).format(this.dateFormat),
            paymentStatus: this.formatPaymentStatus(sale.payment?.paymentStatus),
            paidAmount: sale.payment?.paidAmount || 0,
        }));
    }

    /**
     * Format payment status for better readability
     */
    formatPaymentStatus(status) {
        if (!status) return 'Not Paid';
        return status
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * Generate CSV report with proper escaping and formatting
     */
    generateCSVReport(salesData) {
        const headers = [
            'Customer',
            'Product',
            'Quantity Sold',
            'Total Price (₵)',
            'Sale Date',
            'Payment Status',
            'Amount Paid (₵)'
        ];

        const rows = salesData.map(data => [
            this.escapeCsvField(data.customer),
            this.escapeCsvField(data.product),
            data.quantitySold,
            this.formatCurrency(parseInt(data.totalPrice)),
            data.saleDate,
            data.paymentStatus,
            this.formatCurrency(parseInt(data.paidAmount))
        ]);

        return [headers, ...rows]
            .map(row => row.join(','))
            .join('\n');
    }

    /**
     * Generate Excel report with styling and formatting
     */
    async generateExcelReport(salesData, startDate, endDate) {
        const workbook = new Excel.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        // Set column widths and properties
        worksheet.columns = [
            
            { header: "Customer", key: 'customer', width: 30 ,},
            { header: 'Product', key: 'product', width: 20 },
            { header: 'Quantity Sold', key: 'quantitySold', width: 15 },
            { header: 'Total Price (₵)', key: 'totalPrice', width: 15 },
            { header: 'Sale Date', key: 'saleDate', width: 20 },
            { header: 'Payment Status', key: 'paymentStatus', width: 15 },
            { header: 'Amount Paid (₵)', key: 'paidAmount', width: 15 }
        ];

        // Add title with date range
        worksheet.mergeCells('A1:G1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = `Sales Report (${moment(startDate).format('MMM DD, YYYY')} - ${moment(endDate).format('MMM DD, YYYY')})`;
        titleCell.font = {
            size: 14,
            bold: true
        };
        titleCell.alignment = { horizontal: 'center' };

        // Style header row
        const headerRow = worksheet.getRow(2);

        headerRow.font = { bold: true };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };
        worksheet.getCell(`A2`).value = 'Customer'
        worksheet.getCell(`B2`).value = 'Product'
        worksheet.getCell(`C2`).value = 'Quantity Sold'
        worksheet.getCell(`D2`).value = 'Total Price (₵)'
        worksheet.getCell(`E2`).value = 'Sale Date'
        worksheet.getCell(`F2`).value = 'Payment Status'
        worksheet.getCell(`G2`).value = 'Amount Paid (₵)'

        // Add data and apply formatting
        salesData.forEach(data => {
            worksheet.addRow({
                customer: data.customer,
                product: data.product,
                quantitySold: data.quantitySold,
                totalPrice: parseInt(data.totalPrice),
                saleDate: data.saleDate,
                paymentStatus: data.paymentStatus,
                paidAmount: parseInt(data.paidAmount)
            });
        });

        // Apply currency formatting
        worksheet.getColumn('totalPrice').numFmt = this.currencyFormat;
        worksheet.getColumn('paidAmount').numFmt = this.currencyFormat;

        // Add totals row
        const lastRow = worksheet.rowCount + 1;
        worksheet.getCell(`A${lastRow}`).value = 'Totals';
        worksheet.getCell(`C${lastRow}`).value = { formula: `SUM(C3:C${lastRow-1})` };
        worksheet.getCell(`D${lastRow}`).value = { formula: `SUM(D3:D${lastRow-1})` };
        worksheet.getCell(`G${lastRow}`).value = { formula: `SUM(G3:G${lastRow-1})` };

        // add differences between total price abd amount paid
        worksheet.mergeCells(`A${lastRow+1}:F${lastRow+1}`)
        worksheet.getCell(`A${lastRow+1}`).value = 'Differences Amount Between Total Price and Paid Amount'
        worksheet.getCell(`G${lastRow+1}`).value = {formula: `=SUM(D${lastRow}-G${lastRow})`};
       
       const Income_Differences = worksheet.getRow(lastRow+1)
       Income_Differences.font = {bold: true}
       Income_Differences.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0F0F0' }
    };
        // Style totals row
        const totalsRow = worksheet.getRow(lastRow);
        totalsRow.font = { bold: true };
        totalsRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF0F0F0' }
        };

        return workbook;
    }

    /**
     * Escape CSV fields to handle special characters
     */
    escapeCsvField(field) {
        if (typeof field !== 'string') return field;
        if (field.includes(',') || field.includes('"') || field.includes('\n')) {
            return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
    }

    /**
     * Format currency values
     */
    formatCurrency(value) {
        return typeof value === 'number' 
            ? value.toLocaleString('en-GH', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
              })
            : value;
    }
}

// Export the enhanced report generator
module.exports = new ReportGenerator();
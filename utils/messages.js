const generatePaymentConfirmationMessage = (customer, sale, payment, product) => {
  const paymentDate = new Date(payment.paymentHistory[0].paymentDate).toDateString();
  const paymentStatus = payment.paymentHistory[0].paymentStatus;
  const totalAmount = payment.totalAmount;
  const paidAmount = payment.paidAmount;
  const balanceAmount = payment.balanceAmount;
  
  // Different header and message based on payment method
  let headerText = '';
  let statusMessage = '';
  let headerColor = '';
  
  switch(paymentStatus) {
    case 'paid':
      headerText = 'Payment Confirmation - Paid in Full';
      statusMessage = 'Your payment has been received in full';
      headerColor = '#4CAF50'; // Green
      break;
    case 'partially_paid':
      headerText = 'Partial Payment Confirmation';
      statusMessage = 'Your partial payment has been received';
      headerColor = '#FF9800'; // Orange
      break;
    case 'pending':
      headerText = 'Credit Purchase Confirmation';
      statusMessage = 'Your credit purchase has been recorded';
      headerColor = '#2196F3'; // Blue
      break;
  }

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${headerText}</title>
  </head>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: ${headerColor}; color: white; padding: 20px; text-align: center; border-radius: 5px;">
          <h1 style="margin: 0; font-size: 24px;">${headerText}</h1>
      </div>
      
      <div style="padding: 20px;">
          <p>Dear ${customer.name},</p>
          
          <p>${statusMessage} for your recent purchase.</p>
          
          <div style="background-color: #f8f9fa; border-left: 4px solid ${headerColor}; padding: 15px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Transaction Details:</h3>
              <p style="margin: 0; font-size: 16px; line-height: 1.5;">
                  <strong>Transaction Date:</strong> ${paymentDate}<br>
                  <strong>Product:</strong> ${product.name}<br>
                  <strong>Quantity:</strong> ${sale.quantitySold} ${product.unit}(s)<br>
                  <strong>Total Amount:</strong> Gh₵ ${totalAmount.toLocaleString()}<br>
                  <strong>Payment Method:</strong> ${paymentStatus.replace('_', ' ').toUpperCase()}<br>
                  ${paymentStatus === 'partially_paid' || paymentStatus === 'credit' ? 
                    `<strong>Amount Paid:</strong> Gh₵ ${paidAmount.toLocaleString()}<br>
                     <strong>Balance Due:</strong> Gh₵ ${balanceAmount.toLocaleString()}<br>` : ''}
              </p>
          </div>
          
          ${paymentStatus === 'partially_paid' || paymentStatus === 'pending' ? `
          <div style="background-color: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #ff9800;">Payment Notice:</h3>
              <p>Please note that there is a remaining balance of <strong>Gh₵ ${balanceAmount.toLocaleString()}</strong> to be paid.</p>
              <p>Kindly ensure to clear your balance within the agreed timeframe.</p>
          </div>
          ` : ''}
          
          <p>Thank you for your business! If you have any questions about this transaction, please don't hesitate to contact us.</p>
          
          <p>Best regards,<br>Frefat Ventures</p>
      </div>
      
      <footer style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center;">
          <p>This is an automated message. Please do not reply directly to this email.</p>
          <p>
              Frefat Ventures<br>
              Address Line 1<br>
              City, State, Country<br>
              Phone: +1234567890
          </p>
      </footer>
  </body>
  </html>
  `;
};
const generatePaymentInitializationMessage = (customer, sale, payment, product, initializePayment) => {
  const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString(); // 24 hours from now
  const paymentLink = initializePayment.authorization_url;
  const paymentMethod = payment.paymentHistory[0].paymentMethod;
  const totalAmount = payment.totalAmount;
  const paidAmount = payment.paidAmount || 0;
  const remainingAmount = paymentMethod === 'partially_paid' ? 
    payment.balanceAmount : 
    totalAmount;

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Required - Your Recent Purchase</title>
  </head>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 5px;">
          <h1 style="margin: 0; font-size: 24px;">Payment Required</h1>
      </div>
      
      <div style="padding: 20px;">
          <p>Dear ${customer.name},</p>
          
          <p>Thank you for your recent purchase. This email contains important payment information and instructions.</p>
          
          <div style="background-color: #f8f9fa; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Purchase Details:</h3>
              <p style="margin: 0; font-size: 16px; line-height: 1.5;">
                  <strong>Product:</strong> ${product.name}<br>
                  <strong>Quantity:</strong> ${sale.quantitySold} ${product.unit}(s)<br>
                  <strong>Total Amount:</strong> Gh₵ ${totalAmount.toLocaleString()}<br>
                  ${paymentMethod === 'partially_paid' ? 
                    `<strong>Amount Already Paid:</strong> Gh₵ ${paidAmount.toLocaleString()}<br>
                     <strong>Remaining Amount:</strong> Gh₵ ${remainingAmount.toLocaleString()}<br>` : ''}
                  <strong>Payment Due:</strong> ${dueDate}
              </p>
          </div>

          <div style="background-color: #e3f2fd; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Payment Instructions:</h3>
              <p style="margin-bottom: 15px;">To complete your payment, please click the secure payment link below:</p>
              
              <div style="text-align: center; margin: 20px 0;">
                  <a href="${paymentLink}" 
                     style="background-color: #2196F3; 
                            color: white; 
                            padding: 12px 25px; 
                            text-decoration: none; 
                            border-radius: 5px; 
                            font-weight: bold;
                            display: inline-block;">
                      Make Payment Now
                  </a>
              </div>
              
              <p style="font-size: 14px; color: #666; margin-top: 15px;">
                  Note: This payment link will expire in 24 hours. Please complete your payment before the due date.
              </p>
          </div>
          
          <div style="background-color: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #ff9800;">Important Information:</h3>
              <ul style="margin: 0; padding-left: 20px;">
                  <li>Payment should be completed before ${dueDate}</li>
                  <li>The payment link is unique to your purchase</li>
                  <li>For security reasons, the link will expire after 24 hours</li>
                  ${paymentMethod === 'partially_paid' ? 
                    `<li>This payment will complete your remaining balance of Gh₵ ${remainingAmount.toLocaleString()}</li>` : ''}
              </ul>
          </div>
          
          <p>If you experience any issues with the payment process or have questions, please don't hesitate to contact our support team.</p>
          
          <p>Best regards,<br>Frefat Ventures</p>
      </div>
      
      <footer style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center;">
          <p>This is an automated message. Please do not reply directly to this email.</p>
          <p>
              Frefat Ventures<br>
              Address Line 1<br>
              City, State, Country<br>
              Phone: +1234567890
          </p>
      </footer>
  </body>
  </html>
  `;
};

function generateBusinessPaymentNotification(payment, paymentData) {
  return `
      <h2>Payment Received</h2>
      <p><strong>Customer:</strong> ${payment.customer.name}</p>
      <p><strong>Amount:</strong> ${paymentData.amount / 100}</p>
      <p><strong>Reference:</strong> ${paymentData.reference}</p>
      <p><strong>Order ID:</strong> ${payment.sale._id}</p>
      <p><strong>Payment Status:</strong> ${payment.paymentStatus}</p>
      <p><strong>Balance Remaining:</strong> ${payment.balanceAmount}</p>
  `;
}

// Helper function for payment failure message
function generatePaymentFailureMessage(payment, paymentData) {
  return `
      <h2>Payment Failed</h2>
      <p><strong>Order ID:</strong> ${payment.sale._id}</p>
      <p><strong>Amount:</strong> ${paymentData.amount / 100}</p>
      <p><strong>Reference:</strong> ${paymentData.reference}</p>
      <p><strong>Reason:</strong> ${paymentData.gateway_response}</p>
      <p>Please try again or contact support if you need assistance.</p>
  `;
}

module.exports = { generatePaymentConfirmationMessage ,generatePaymentInitializationMessage,generatePaymentFailureMessage,generateBusinessPaymentNotification};
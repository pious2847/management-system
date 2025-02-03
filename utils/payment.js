const https = require('https');
const config = require("../../config");

/**
 * Initiates a payment transaction with Paystack.
 * 
 * This function sends a request to Paystack's API to initialize a payment transaction.
 * It uses the HTTPS module to make a secure POST request to Paystack's server.
 * 
 * @param {string} email - The email address of the user making the payment.
 * @param {number} amount - The amount to be paid in the smallest currency unit (e.g., kobo for Naira).
 * @param {Object} [metadata={}] - Additional information to be sent with the payment request.
 * @returns {Promise<Object>} A promise that resolves with the payment initialization data from Paystack.
 * @throws {Error} If the payment initialization fails or if there's an error parsing the response.
 */
function initiatePaystackPayment(email, amount, metadata = {}) {
  return new Promise((resolve, reject) => {
    // Prepare the request parameters
    const params = JSON.stringify({
      email: email,
      amount: amount, // Paystack expects amount in the smallest currency unit
      metadata: metadata
    });

    // Set up the options for the HTTPS request
    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: '/transaction/initialize',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_API_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    // Create and send the HTTPS request
    const req = https.request(options, res => {
      let data = '';

      // Collect the response data
      res.on('data', (chunk) => {
        data += chunk;
      });

      // Process the complete response
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          if (parsedData.status) {
            resolve(parsedData.data);
          } else {
            reject(new Error(parsedData.message || 'Payment initialization failed'));
          }
        } catch (error) {
          reject(new Error('Failed to parse Paystack response'));
        }
      });
    });

    // Handle any errors that occur during the request
    req.on('error', error => {
      reject(error);
    });

    // Send the request
    req.write(params);
    req.end();
  });
}

module.exports = initiatePaystackPayment;
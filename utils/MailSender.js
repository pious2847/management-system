const nodemailer = require("nodemailer");
const axios = require("axios");




const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.AUTH_EMAIL, pass: process.env.AUTH_PASS },
});



/**
 * Sends an email to a specified recipient .
 * @param {string} recipient - The email address of the recipient.
 * @param {string} subject - The subject of the email.
 * @param {string} message - The HTML content of the email.
 * @returns {Object} JSON response with status and message.
 */
const sendEmail = async (recipient, subject, message, ) => {
  const mailOptions = {
    from: `"Frefat Ventures" <${process.env.AUTH_EMAIL}>`,
    to: recipient,
    subject: subject,
    html: `${message}`,
  };

  try {
    transporter.verify(function (error, success) {
      if (error) {
        console.log(error);
      } else {
        console.log("Server is ready to take our messages");
      }
    });
    
    await transporter.sendMail(mailOptions);
    return {success: true, message: "Email has been sent successfully"};
  } catch (error) {
    console.error(error);
    return {success: false, message: "Error sending email" };
  }
};

/**
 * Sends a course approval email to instructor .
 * @param {string} recipient - The email address of the recipient.
 * @param {string} subject - The subject of the email.
 * @param {string} message - The HTML content of the email.
 * @returns {Object} JSON response with status and message.
 */
const sendApprovalEmail = async ( recipient, subject, message,) => {
  const mailOptions = {
    from: `"Frefat Ventures" <${process.env.AUTH_EMAIL}>`,
    to: recipient,
    subject: subject,
    html: `
    ${message}
    `,
  };

  try {
   const response = await transporter.sendMail(mailOptions);
    return response;
  } catch (error) {
    console.error("Error sending approval email:", error);
    throw error;
  }
};
/**
 * Sends an sms Mesage to user .
 * @param {string} sender - The name of the organization sending.
 * @param {string} message - The HTML content of the email.
 * @param {string} recipientsPhone - The response object.
 */

const sendSMS = async (sender, message, recipientsPhone) => {
  try {
    // SEND SMS
    const data = {
      sender,
      message,
      recipients : [recipientsPhone],
    };

    const config = {
      method: "post",
      url: "https://sms.arkesel.com/api/v2/sms/send",
      headers: {
        "api-key": process.env.ARKESEL_API,
      },
      data,
    };

    const response = await axios(config);
    console.log(response.data);
  } catch (error) {
    if (error.response) {
      // The request was made, and the server responded with a status code
      // that falls out of the range of 2xx
      console.error("SMS API Error:", error.response.data);
      console.error("SMS API Status:", error.response.status);
    } else if (error.request) {
      // The request was made, but no response was received
      console.error("SMS API Error:", error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error("SMS API Error:", error.message);
    }
  }
};

module.exports = {
  sendEmail,
  sendApprovalEmail,
  sendSMS
};
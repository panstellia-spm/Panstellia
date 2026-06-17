/**
 * Email Template Generator
 * Creates beautifully formatted HTML emails for order notifications
 * Compatible with EmailJS template variables
 */

/**
 * Format price in Indian Rupees
 */
const formatPrice = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
};

/**
 * Format date
 */
const formatDate = (date) => {
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

/**
 * Generate Admin Order Notification Email HTML
 * @param {object} orderData - Order information
 * @returns {string} - HTML email content
 */
export const generateAdminOrderHTML = (orderData) => {
  const {
    customerName,
    customerEmail,
    customerPhone,
    totalAmount,
    shippingAddress,
    shippingCity,
    shippingState,
    shippingPincode,
    paymentMethod,
    orderDate,
    orderId,
    items = [],
  } = orderData;

  const itemsHTML = items
    .map(
      (item) => `
    <tr style="border-bottom: 1px solid #e0e0e0;">
      <td style="padding: 12px; text-align: left;">${item.name}</td>
      <td style="padding: 12px; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; text-align: right;">${formatPrice(item.price)}</td>
      <td style="padding: 12px; text-align: right;">${formatPrice(
        item.price * item.quantity
      )}</td>
    </tr>
  `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <head>
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #db912d 0%, #c67f24 100%);
          color: white;
          padding: 30px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .content {
          padding: 30px 20px;
        }
        .section {
          margin-bottom: 25px;
        }
        .section-title {
          font-size: 16px;
          font-weight: 600;
          color: #333;
          margin-bottom: 12px;
          border-bottom: 2px solid #db912d;
          padding-bottom: 8px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 14px;
        }
        .info-label {
          color: #666;
          font-weight: 500;
        }
        .info-value {
          color: #333;
          font-weight: 600;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        table th {
          background-color: #f9f9f9;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: #333;
          border-bottom: 2px solid #db912d;
        }
        .total-row {
          background-color: #f0f0f0;
          font-weight: 600;
          font-size: 16px;
        }
        .footer {
          background-color: #f9f9f9;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #666;
          border-top: 1px solid #e0e0e0;
        }
        .alert {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 12px;
          margin: 15px 0;
          border-radius: 4px;
          font-size: 13px;
          color: #856404;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎁 New Order Received!</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">Order ID: ${orderId}</p>
        </div>

        <div class="content">
          <div class="section">
            <div class="section-title">📋 Order Information</div>
            <div class="info-row">
              <span class="info-label">Order ID:</span>
              <span class="info-value">${orderId}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Order Date:</span>
              <span class="info-value">${formatDate(orderDate)}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Payment Method:</span>
              <span class="info-value" style="text-transform: uppercase;">${paymentMethod}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">👤 Customer Details</div>
            <div class="info-row">
              <span class="info-label">Name:</span>
              <span class="info-value">${customerName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Email:</span>
              <span class="info-value">${customerEmail}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Phone:</span>
              <span class="info-value">${customerPhone}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">📦 Order Items</div>
            <table>
              <thead>
                <tr>
                  <th style="text-align: left;">Product</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Price</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHTML}
                <tr class="total-row">
                  <td colspan="3" style="padding: 12px; text-align: right;">Total Amount:</td>
                  <td style="padding: 12px; text-align: right; color: #db912d;">${formatPrice(
                    totalAmount
                  )}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">🏠 Shipping Address</div>
            <div style="background-color: #f9f9f9; padding: 12px; border-radius: 4px; line-height: 1.6; font-size: 14px;">
              <strong>${customerName}</strong><br>
              ${shippingAddress}<br>
              ${shippingCity}, ${shippingState} - ${shippingPincode}<br>
              Phone: ${customerPhone}
            </div>
          </div>

          <div class="alert">
            <strong>⚠️ Action Required:</strong> Please process this order and update the customer once it ships.
          </div>
        </div>

        <div class="footer">
          <p style="margin: 0 0 8px 0;">Panstellia - Order Management System</p>
          <p style="margin: 0;">This is an automated notification. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate Customer Order Confirmation Email HTML
 * @param {object} orderData - Order information
 * @returns {string} - HTML email content
 */
export const generateCustomerOrderHTML = (orderData) => {
  const {
    customerName,
    totalAmount,
    shippingAddress,
    shippingCity,
    shippingState,
    shippingPincode,
    paymentMethod,
    orderDate,
    orderId,
    items = [],
  } = orderData;

  const itemsHTML = items
    .map(
      (item) => `
    <tr style="border-bottom: 1px solid #e0e0e0;">
      <td style="padding: 12px; text-align: left;">${item.name}</td>
      <td style="padding: 12px; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; text-align: right;">${formatPrice(item.price)}</td>
      <td style="padding: 12px; text-align: right;">${formatPrice(
        item.price * item.quantity
      )}</td>
    </tr>
  `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <head>
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #db912d 0%, #c67f24 100%);
          color: white;
          padding: 30px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .header p {
          margin: 8px 0 0 0;
          font-size: 16px;
          opacity: 0.95;
        }
        .content {
          padding: 30px 20px;
        }
        .section {
          margin-bottom: 25px;
        }
        .section-title {
          font-size: 16px;
          font-weight: 600;
          color: #333;
          margin-bottom: 12px;
          border-bottom: 2px solid #db912d;
          padding-bottom: 8px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 14px;
        }
        .info-label {
          color: #666;
          font-weight: 500;
        }
        .info-value {
          color: #333;
          font-weight: 600;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        table th {
          background-color: #f9f9f9;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: #333;
          border-bottom: 2px solid #db912d;
        }
        .total-row {
          background-color: #f0f0f0;
          font-weight: 600;
          font-size: 16px;
        }
        .success-box {
          background-color: #d4edda;
          border-left: 4px solid #28a745;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
          color: #155724;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #db912d 0%, #c67f24 100%);
          color: white;
          padding: 12px 30px;
          border-radius: 4px;
          text-decoration: none;
          font-weight: 600;
          margin: 15px 0;
        }
        .footer {
          background-color: #f9f9f9;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #666;
          border-top: 1px solid #e0e0e0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✨ Thank You for Your Order!</h1>
          <p>Order Confirmation</p>
        </div>

        <div class="content">
          <p style="font-size: 16px; color: #333; margin: 0 0 20px 0;">
            Hi <strong>${customerName}</strong>,<br>
            We're excited to prepare your beautiful jewelry order!
          </p>

          <div class="success-box">
            <strong>✅ Your order has been confirmed!</strong><br>
            We'll send you a shipping update soon.
          </div>

          <div class="section">
            <div class="section-title">📦 Order Details</div>
            <div class="info-row">
              <span class="info-label">Order ID:</span>
              <span class="info-value">${orderId}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Order Date:</span>
              <span class="info-value">${formatDate(orderDate)}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Payment Method:</span>
              <span class="info-value" style="text-transform: uppercase;">${paymentMethod}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">🛍️ Your Items</div>
            <table>
              <thead>
                <tr>
                  <th style="text-align: left;">Product</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Price</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHTML}
                <tr class="total-row">
                  <td colspan="3" style="padding: 12px; text-align: right;">Order Total:</td>
                  <td style="padding: 12px; text-align: right; color: #db912d;">${formatPrice(
                    totalAmount
                  )}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">📍 Delivery Address</div>
            <div style="background-color: #f9f9f9; padding: 12px; border-radius: 4px; line-height: 1.6; font-size: 14px;">
              ${shippingAddress}<br>
              ${shippingCity}, ${shippingState} - ${shippingPincode}
            </div>
          </div>

          <div style="text-align: center;">
            <a href="https://panstellia.com/orders" class="cta-button">Track Your Order</a>
          </div>

          <div style="background-color: #f0f0f0; padding: 15px; margin: 20px 0; border-radius: 4px; font-size: 13px; color: #666;">
            <strong>Need Help?</strong><br>
            If you have any questions about your order, please don't hesitate to contact us at support@panstellia.com or call us.
          </div>
        </div>

        <div class="footer">
          <p style="margin: 0 0 8px 0;"><strong>Panstellia</strong> - Elegant Jewelry Collection</p>
          <p style="margin: 0;">Thank you for being part of our luxury jewelry family! ✨</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export default {
  generateAdminOrderHTML,
  generateCustomerOrderHTML,
  formatPrice,
  formatDate,
};

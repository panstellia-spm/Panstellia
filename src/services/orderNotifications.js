/**
 * Order Notifications Service
 * Handles sending order confirmation and admin notification emails
 * Uses EmailJS for reliable, free email delivery without backend
 */

import { sendEmail, validateEmailJSConfig } from './emailjs';
import {
  generateAdminOrderHTML,
  generateCustomerOrderHTML,
} from './emailTemplates';

/**
 * Send order confirmation email to customer
 * @param {object} orderData - Order information
 * @returns {Promise<object>} - Email send response
 * @throws {Error} - If email sending fails
 */
export const sendCustomerOrderConfirmation = async (orderData) => {
  try {
    if (!validateEmailJSConfig()) {
      console.warn('EmailJS not configured, skipping customer email');
      return null;
    }

    const {
      customerName,
      customerEmail,
      productName,
      quantity,
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

    // Validate required fields
    if (!customerEmail || !customerName || !orderId) {
      throw new Error('Missing required fields: email, name, or orderId');
    }

    // Prepare email template variables
    const emailVariables = {
      to_email: customerEmail,
      customer_name: customerName || 'Customer',
      order_id: orderId || 'N/A',
      order_date: orderData.orderDateFormatted || new Date(orderDate).toLocaleDateString('en-IN'),
      product_name: productName || items.map((i) => i.name).join(', ') || 'N/A',
      quantity: quantity || items.reduce((sum, i) => sum + i.quantity, 0) || '1',
      total_amount: totalAmount || '0',
      shipping_address: shippingAddress || 'N/A',
      shipping_city: shippingCity || 'N/A',
      shipping_state: shippingState || 'N/A',
      shipping_pincode: shippingPincode || 'N/A',
      payment_method: paymentMethod || 'N/A',
      // HTML content for email body
      email_html: generateCustomerOrderHTML(orderData),
    };

    console.log('📧 Sending customer email with variables:', {
      to_email: emailVariables.to_email,
      order_id: emailVariables.order_id,
      customer_name: emailVariables.customer_name,
    });

    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID_CUSTOMER;
    if (!templateId) {
      throw new Error('Customer template ID not configured');
    }

    const response = await sendEmail(templateId, emailVariables);

    console.log('✅ Customer confirmation email sent successfully:', response);
    return response;
  } catch (error) {
    console.error('❌ Failed to send customer confirmation email:', error);
    throw error;
  }
};

/**
 * Send order notification email to admin
 * @param {object} orderData - Order information
 * @param {string} adminEmail - Admin email address
 * @returns {Promise<object>} - Email send response
 * @throws {Error} - If email sending fails
 */
export const sendAdminOrderNotification = async (orderData, adminEmail) => {
  try {
    if (!validateEmailJSConfig()) {
      console.warn('EmailJS not configured, skipping admin email');
      return null;
    }

    if (!adminEmail) {
      throw new Error('Admin email is required');
    }

    const {
      customerName,
      customerEmail,
      customerPhone,
      productName,
      quantity,
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

    // Validate required fields
    if (!orderId) {
      throw new Error('Missing required field: orderId');
    }

    // Prepare email template variables
    const emailVariables = {
      to_email: adminEmail,
      order_id: orderId || 'N/A',
      order_date: orderData.orderDateFormatted || new Date(orderDate).toLocaleDateString('en-IN'),
      customer_name: customerName || 'N/A',
      customer_email: customerEmail || 'N/A',
      customer_phone: customerPhone || 'N/A',
      product_name: productName || items.map((i) => i.name).join(', ') || 'N/A',
      quantity: quantity || items.reduce((sum, i) => sum + i.quantity, 0) || '1',
      total_amount: totalAmount || '0',
      shipping_address: shippingAddress || 'N/A',
      shipping_city: shippingCity || 'N/A',
      shipping_state: shippingState || 'N/A',
      shipping_pincode: shippingPincode || 'N/A',
      payment_method: paymentMethod || 'N/A',
      // HTML content for email body
      email_html: generateAdminOrderHTML(orderData),
    };

    console.log('📧 Sending admin email with variables:', {
      to_email: emailVariables.to_email,
      order_id: emailVariables.order_id,
      customer_name: emailVariables.customer_name,
    });

    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID_ORDER;
    if (!templateId) {
      throw new Error('Admin template ID not configured');
    }

    const response = await sendEmail(templateId, emailVariables);

    console.log('✅ Admin notification email sent successfully:', response);
    return response;
  } catch (error) {
    console.error('❌ Failed to send admin notification email:', error);
    throw error;
  }
};

/**
 * Send both customer and admin emails for an order
 * Handles errors gracefully - failure of one email doesn't prevent the other
 * @param {object} orderData - Order information
 * @param {string} adminEmail - Admin email address
 * @returns {Promise<object>} - Result with customer and admin email status
 */
export const sendOrderNotifications = async (orderData, adminEmail) => {
  const results = {
    customerEmail: { sent: false, error: null },
    adminEmail: { sent: false, error: null },
  };

  // Send customer confirmation
  try {
    await sendCustomerOrderConfirmation(orderData);
    results.customerEmail.sent = true;
  } catch (error) {
    results.customerEmail.error = error.message;
    console.error('Customer email failed:', error);
  }

  // Send admin notification
  if (adminEmail) {
    try {
      await sendAdminOrderNotification(orderData, adminEmail);
      results.adminEmail.sent = true;
    } catch (error) {
      results.adminEmail.error = error.message;
      console.error('Admin email failed:', error);
    }
  }

  return results;
};

/**
 * Format order data for email sending
 * Transforms cart data into proper email format
 * @param {object} orderInfo - Raw order information
 * @returns {object} - Formatted order data
 */
export const formatOrderDataForEmail = (orderInfo) => {
  const {
    orderId,
    customerName,
    customerEmail,
    customerPhone,
    paymentMethod,
    shippingAddress,
    shippingCity,
    shippingState,
    shippingPincode,
    cartItems = [],
    total,
    tax,
    shipping: shippingCost,
    couponCode,
    couponDiscount,
  } = orderInfo;

  const now = new Date();

  return {
    orderId,
    orderDate: now.toISOString(),
    orderDateFormatted: now.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    customerName,
    customerEmail,
    customerPhone,
    paymentMethod,
    shippingAddress,
    shippingCity,
    shippingState,
    shippingPincode,
    items: cartItems.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
    })),
    subtotal: total - (tax || 0) - (shippingCost || 0) + (couponDiscount || 0),
    tax: tax || 0,
    shipping: shippingCost || 0,
    couponCode: couponCode || null,
    couponDiscount: couponDiscount || 0,
    totalAmount: total,
    productName: cartItems.map((item) => item.name).join(', '),
    quantity: cartItems.reduce((sum, item) => sum + item.quantity, 0),
  };
};

export default {
  sendCustomerOrderConfirmation,
  sendAdminOrderNotification,
  sendOrderNotifications,
  formatOrderDataForEmail,
};

import { collection, query, where, getDocs, addDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { sendEmail } from './emailjs';

/**
 * Subscribe a user to back in stock notifications for a specific product
 */
export const subscribeToRestock = async (productId, productName, email, userId = null) => {
  try {
    // Check if subscription already exists for this email and product to prevent duplicate notifications
    const q = query(
      collection(db, 'back_in_stock_notifications'),
      where('productId', '==', productId),
      where('email', '==', email.trim().toLowerCase()),
      where('status', '==', 'pending')
    );
    
    const snap = await getDocs(q);
    if (!snap.empty) {
      return { success: true, message: 'Already subscribed' };
    }

    await addDoc(collection(db, 'back_in_stock_notifications'), {
      productId,
      productName,
      email: email.trim().toLowerCase(),
      userId,
      createdAt: new Date().toISOString(),
      status: 'pending'
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error subscribing to back-in-stock notifications:', error);
    throw error;
  }
};

/**
 * Trigger restock notifications for a product
 * Automatically constructs a beautifully branded HTML email and sends it
 */
export const triggerRestockNotifications = async (productId, product) => {
  try {
    const q = query(
      collection(db, 'back_in_stock_notifications'),
      where('productId', '==', productId),
      where('status', '==', 'pending')
    );
    
    const snap = await getDocs(q);
    if (snap.empty) return;

    const notifications = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`Found ${notifications.length} pending stock notifications for product: ${product.name}`);

    // Create a batch to update statuses in Firestore
    const batch = writeBatch(db);

    // Send emails
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID_CUSTOMER;
    const origin = window.location.origin;
    const productUrl = `${origin}/product/${productId}`;

    for (const notif of notifications) {
      try {
        const emailHtml = `
          <!DOCTYPE html>
          <html style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <head>
            <style>
              body { margin: 0; padding: 0; background-color: #f5f5f5; }
              .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }
              .header { background: linear-gradient(135deg, #db912d 0%, #c67f24 100%); color: white; padding: 35px 20px; text-align: center; }
              .header h1 { margin: 0; font-size: 26px; font-weight: 600; }
              .content { padding: 30px 20px; text-align: center; }
              .product-box { background-color: #f9f9f9; padding: 25px; border-radius: 8px; margin: 20px 0; border: 1px solid #e0e0e0; }
              .product-name { font-size: 18px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px; }
              .product-price { font-size: 16px; font-weight: 600; color: #db912d; margin-bottom: 20px; }
              .cta-button { display: inline-block; background: linear-gradient(135deg, #db912d 0%, #c67f24 100%); color: white !important; padding: 12px 30px; border-radius: 4px; text-decoration: none; font-weight: 600; margin: 10px 0; box-shadow: 0 4px 6px rgba(219,145,45,0.2); }
              .footer { background-color: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #e0e0e0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✨ Back in Stock Alert!</h1>
                <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">An item you requested is now available</p>
              </div>
              <div class="content">
                <p style="font-size: 15px; color: #444; line-height: 1.6; margin: 0 0 15px 0;">
                  Great news! The elegant piece you've been waiting for is back in stock and ready to order.
                </p>
                <div class="product-box">
                  <div class="product-name">${product.name}</div>
                  <div class="product-price">Price: ₹${Number(product.price || 0).toLocaleString('en-IN')}</div>
                  <a href="${productUrl}" class="cta-button" style="color: white !important;">Buy Now</a>
                </div>
                <p style="font-size: 12px; color: #888; margin-top: 20px;">
                  Act fast! Stock is limited and this item may sell out again quickly.
                </p>
              </div>
              <div class="footer">
                <p style="margin: 0 0 8px 0;"><strong>Panstellia</strong> - Elegant Jewelry Collection</p>
                <p style="margin: 0;">You received this because you asked to be notified when this item is back in stock.</p>
              </div>
            </div>
          </body>
          </html>
        `;

        await sendEmail(templateId, {
          to_email: notif.email,
          customer_name: notif.email.split('@')[0],
          order_id: `RESTOCK-${Date.now()}`,
          order_date: new Date().toLocaleDateString('en-IN'),
          product_name: product.name,
          quantity: '1',
          total_amount: String(product.price || '0'),
          shipping_address: 'N/A',
          shipping_city: 'N/A',
          shipping_state: 'N/A',
          shipping_pincode: 'N/A',
          payment_method: 'N/A',
          email_html: emailHtml
        });

        // Mark as sent
        const notifDocRef = doc(db, 'back_in_stock_notifications', notif.id);
        batch.update(notifDocRef, {
          status: 'sent',
          notifiedAt: new Date().toISOString()
        });
      } catch (err) {
        console.error(`Failed to send email restock notification to ${notif.email}:`, err);
      }
    }

    await batch.commit();
    console.log(`Successfully triggered stock notifications for ${product.name}`);
  } catch (error) {
    console.error('Error triggering restock notifications:', error);
  }
};

import admin from 'firebase-admin';

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    // 1. Remove surrounding quotes if accidentally copied
    privateKey = privateKey.replace(/^"|"$/g, '');
    // 2. Replace literal '\n' strings with actual newlines
    privateKey = privateKey.replace(/\\n/g, '\n');
    
    // 3. If Vercel collapsed the multiline string into a single line with spaces, repair it:
    if (!privateKey.includes('\n')) {
      privateKey = privateKey.replace(/-----BEGIN PRIVATE KEY----- /g, '-----BEGIN PRIVATE KEY-----\n');
      privateKey = privateKey.replace(/ -----END PRIVATE KEY-----/g, '\n-----END PRIVATE KEY-----');
      privateKey = privateKey.replace(/ /g, '\n');
      privateKey = privateKey.replace(/-----\nBEGIN\nPRIVATE\nKEY-----/g, '-----BEGIN PRIVATE KEY-----');
      privateKey = privateKey.replace(/-----\nEND\nPRIVATE\nKEY-----/g, '-----END PRIVATE KEY-----');
    }
  }

  if (projectId && clientEmail && privateKey) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log('[Firebase Admin] Initialized with Service Account.');
    } catch (error) {
      console.error('[Firebase Admin] Initialization failed:', error);
      // Fallback
      admin.initializeApp();
    }
  } else {
    console.warn('[Firebase Admin] Missing service account env variables. Cannot connect securely.');
    const missing = [];
    if (!projectId) missing.push('FIREBASE_PROJECT_ID');
    if (!clientEmail) missing.push('FIREBASE_CLIENT_EMAIL');
    if (!privateKey) missing.push('FIREBASE_PRIVATE_KEY');
    
    // We throw an error so the API crashes with a clear message rather than failing later with 16 UNAUTHENTICATED
    throw new Error(`Firebase Admin SDK is missing required Vercel Environment Variables: ${missing.join(', ')}`);
  }
}

export default admin;

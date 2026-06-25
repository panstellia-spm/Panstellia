import admin from 'firebase-admin';

if (!admin.apps.length) {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      
      // Ensure private key handles newlines correctly
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('[Firebase Admin] Initialized with FIREBASE_SERVICE_ACCOUNT_JSON.');
    } catch (error) {
      console.error('[Firebase Admin] Initialization failed using FIREBASE_SERVICE_ACCOUNT_JSON:', error);
      throw new Error(`Firebase Admin SDK failed to initialize with FIREBASE_SERVICE_ACCOUNT_JSON: ${error.message}`);
    }
  } else {
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
        console.log('[Firebase Admin] Initialized with individual Service Account environment variables.');
      } catch (error) {
        console.error('[Firebase Admin] Initialization failed with individual variables:', error);
        throw new Error(`Firebase Admin SDK failed to initialize with individual variables: ${error.message}`);
      }
    } else {
      console.warn('[Firebase Admin] Missing service account env variables. Cannot connect securely.');
      const missing = [];
      if (!projectId) missing.push('FIREBASE_PROJECT_ID');
      if (!clientEmail) missing.push('FIREBASE_CLIENT_EMAIL');
      if (!privateKey) missing.push('FIREBASE_PRIVATE_KEY');
      
      throw new Error(
        `Firebase Admin SDK is missing required Vercel Environment Variables. ` +
        `Please set either FIREBASE_SERVICE_ACCOUNT_JSON (recommended) or the individual variables: ${missing.join(', ')}`
      );
    }
  }
}

export default admin;

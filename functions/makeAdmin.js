const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

// Initialize with service account
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function makeAdmin() {
  try {
    const uid = "P2zZdYnvBxQ0OmGBj8YgTdnGzcH2"; // replace with real UID
    await admin.auth().setCustomUserClaims(uid, { admin: true });
    console.log(`✅ Admin role assigned to UID: ${uid}`);
  } catch (error) {
    console.error("❌ Error setting admin role:", error);
  }
}

makeAdmin();

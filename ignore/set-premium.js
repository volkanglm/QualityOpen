const admin = require("firebase-admin");
const serviceAccount = require("./qualityopen-c1f97-firebase-adminsdk-fbsvc-f25ca63459.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// volkanglm@gmail.com hesabının UID'sini bul ve premium yap
async function setPremium() {
  try {
    const user = await admin.auth().getUserByEmail("volkanglm@gmail.com");
    console.log("User found:", user.uid);
    await admin.auth().setCustomUserClaims(user.uid, { premium: true });
    console.log("✓ premium: true set for", user.email);
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

setPremium();

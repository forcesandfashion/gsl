const { setGlobalOptions } = require("firebase-functions");
const functions = require("firebase-functions");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true }); 
admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({ maxInstances: 10 });

// Razorpay instance
const razorpay = new Razorpay({
  key_id: "YOUR_RAZORPAY_KEY_ID",
  key_secret: "YOUR_RAZORPAY_SECRET",
});

exports.adminDeleteUser = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      // 🔹 Verify token
      const idToken = req.headers.authorization?.split("Bearer ")[1];
      if (!idToken) return res.status(401).send("No auth token provided");
      
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      
      // 🔹 Check admin role in admins collection
      const db = admin.firestore();
      const adminDoc = await db.collection("admins").doc(decodedToken.uid).get();
      
      if (!adminDoc.exists || adminDoc.data()?.role !== "admin") {
        return res.status(403).send("Forbidden: Not an admin");
      }
      
      // 🔹 Parse body
      const body = JSON.parse(req.rawBody.toString());
      const { uid } = body;
      if (!uid) return res.status(400).send("Missing uid");
      
      // 🔹 Delete user
      await admin.auth().deleteUser(uid);
      await db.collection("users").doc(uid).delete();
      
      return res.status(200).send({ message: `Deleted user ${uid}` });
    } catch (err) {
      console.error("❌ Error deleting user:", err);
      return res.status(500).send("Internal server error");
    }
  });
});

// 1. Create order + store in Firestore
exports.createOrder = functions.https.onRequest(async (req, res) => {
  try {
    const { userId, amount, plan } = req.body; // 👈 frontend must send these

    const options = {
      amount: amount * 100, // convert to paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1,
    };

    const order = await razorpay.orders.create(options);

    // Store order as a bill in Firestore
    await db.collection("range-owner-subscriptions").doc(order.id).set({
      userId,
      orderId: order.id,
      receipt: order.receipt,
      plan: plan || "basic", // eg. "monthly", "yearly", "premium"
      amount,
      currency: order.currency,
      status: "created", // updated later after payment
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating order");
  }
});

// 2. Verify payment webhook (called by Razorpay after success)
exports.verifyPayment = functions.https.onRequest(async (req, res) => {
  const secret = "YOUR_RAZORPAY_WEBHOOK_SECRET";

  const shasum = crypto.createHmac("sha256", secret);
  shasum.update(JSON.stringify(req.body));
  const digest = shasum.digest("hex");

  if (digest === req.headers["x-razorpay-signature"]) {
    const paymentData = req.body;

    console.log("Payment verified:", paymentData);

    const orderId = paymentData.payload.payment.entity.order_id;
    const paymentId = paymentData.payload.payment.entity.id;
    const status = paymentData.payload.payment.entity.status;

    // 🔹 Update Firestore subscription bill
    await db.collection("range-owner-subscriptions").doc(orderId).update({
      paymentId,
      status,
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 🔹 Optional: also update user subscription
    // await db.collection("users").doc(userId).update({ subscription: "premium" });

    res.status(200).send("OK");
  } else {
    res.status(400).send("Invalid signature");
  }
});


exports.createManagerHttp = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      // Verify authentication manually
      const idToken = req.headers.authorization?.split("Bearer ")[1];
      if (!idToken) {
        return res.status(401).json({ error: "No auth token provided" });
      }
      
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const ownerId = decodedToken.uid;
      console.log("✅ Authenticated user:", ownerId);
      
      // Parse request body
      const { name, email, password } = req.body;
      if (!email || !password || !name) {
        return res.status(400).json({ error: "Name, email and password are required." });
      }
      
      // Create user in Firebase Auth with role in displayName (consistent with your signup)
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: `${name}|manager`, // Store role in displayName like your signup
      });
      
      // Create manager document in Firestore
      await db
        .collection("range-owners")
        .doc(ownerId)
        .collection("managers")
        .doc(userRecord.uid)
        .set({
          uid: userRecord.uid,
          name,
          email,
          role: "manager",
          ownerId,
          status: "active",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      
      // Also create in the main managers collection for consistency with your auth system
      await db
        .collection("managers")
        .doc(userRecord.uid)
        .set({
          uid: userRecord.uid,
          fullName: name,
          email,
          role: "manager",
          ownerId,
          status: "active",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      
      return res.status(200).json({
        message: "Manager created successfully",
        managerId: userRecord.uid,
      });
      
    } catch (err) {
      console.error("Error creating manager:", err);
      return res.status(500).json({ error: err.message });
    }
  });
});

exports.deleteManagerHttp = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      // Verify authentication manually
      const idToken = req.headers.authorization?.split("Bearer ")[1];
      if (!idToken) {
        return res.status(401).json({ error: "No auth token provided" });
      }
      
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const ownerId = decodedToken.uid;
      
      console.log("✅ Authenticated user:", ownerId);
      
      // Parse request body
      const { managerUid } = req.body;
      
      if (!managerUid) {
        return res.status(400).json({ error: "Manager UID is required." });
      }
      
      // Delete from Firebase Auth
      await admin.auth().deleteUser(managerUid);
      
      // Delete from Firestore
      await db
        .collection("range-owners")
        .doc(ownerId)
        .collection("managers")
        .doc(managerUid)
        .delete();
      
      return res.status(200).json({
        message: "Manager deleted successfully",
        managerId: managerUid,
      });
    } catch (err) {
      console.error("Error deleting manager:", err);
      return res.status(500).json({ error: err.message });
    }
  });
});


exports.createSubAdmin = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      // 🔹 Verify auth token
      const idToken = req.headers.authorization?.split("Bearer ")[1];
      if (!idToken) {
        return res.status(401).json({ error: "No auth token provided" });
      }

      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const callerUid = decodedToken.uid;

      // 🔹 Check if caller is admin
      const callerDoc = await admin.firestore().collection('admins').doc(callerUid).get();
      if (!callerDoc.exists) {
        return res.status(403).json({ error: "Only admins can create sub-admins" });
      }

      // 🔹 Parse request body
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ error: "Username, email, and password are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters long" });
      }

      // 🔹 Create user in Firebase Auth
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: username,
      });

      // 🔹 Set custom claims
      await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'sub_admin' });

      // 🔹 Add sub-admin document to Firestore
      await admin.firestore().collection('sub-admin').doc(userRecord.uid).set({
        username,
        email,
        uid: userRecord.uid,
        role: 'sub_admin',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: callerUid,
        active: true,
      });

      return res.status(200).json({
        success: true,
        message: "Sub-admin created successfully",
        subAdminId: userRecord.uid,
      });

    } catch (error) {
      console.error("Error creating sub-admin:", error);

      // Handle Firebase Auth errors
      if (error.code === 'auth/email-already-exists') {
        return res.status(409).json({ error: "A user with this email already exists" });
      }

      if (error.code === 'auth/invalid-email') {
        return res.status(400).json({ error: "Invalid email address" });
      }

      return res.status(500).json({ error: "Internal server error" });
    }
  });
});

// Delete Sub-Admin Function

exports.deleteSubAdmin = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      // 🔹 Verify auth token
      const idToken = req.headers.authorization?.split("Bearer ")[1];
      if (!idToken) {
        return res.status(401).json({ error: "No auth token provided" });
      }

      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const callerUid = decodedToken.uid;

      // 🔹 Check if caller is admin
      const callerDoc = await db.collection('admins').doc(callerUid).get();
      if (!callerDoc.exists) {
        return res.status(403).json({ error: "Only admins can delete sub-admins" });
      }

      // 🔹 Parse request body
      const { subAdminId } = req.body;
      if (!subAdminId) {
        return res.status(400).json({ error: "Sub-admin ID is required" });
      }

      // 🔹 Check if sub-admin exists in Firestore
      const subAdminDoc = await db.collection('sub-admin').doc(subAdminId).get();
      if (!subAdminDoc.exists) {
        return res.status(404).json({ error: "Sub-admin not found" });
      }

      // 🔹 Delete user from Firebase Auth
      await admin.auth().deleteUser(subAdminId);

      // 🔹 Delete sub-admin document from Firestore
      await db.collection('sub-admin').doc(subAdminId).delete();

      return res.status(200).json({
        success: true,
        message: "Sub-admin deleted successfully"
      });

    } catch (error) {
      console.error("Error deleting sub-admin:", error);

      // Handle auth/user errors
      if (error.code === 'auth/user-not-found') {
        try {
          await db.collection('sub-admin').doc(req.body.subAdminId).delete();
          return res.status(200).json({
            success: true,
            message: "Sub-admin deleted from database (user not found in auth)"
          });
        } catch (firestoreError) {
          return res.status(500).json({ error: "Error cleaning up sub-admin data" });
        }
      }

      return res.status(500).json({ error: "Internal server error" });
    }
  });
});
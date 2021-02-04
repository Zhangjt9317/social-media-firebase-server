const admin = require("firebase-admin");
admin.initializeApp() //already know app from config

const db = admin.firestore();

module.exports = {admin, db};

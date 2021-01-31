const functions = require("firebase-functions");
const admin = require("firebase-admin");
const app = require('express')();
admin.initializeApp() //already know app from config

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const config = {
    apiKey: "AIzaSyAMh1M3z3d5adKvEVGDT7dUqPhHv-PuTGA",
    authDomain: "social-media-abe85.firebaseapp.com",
    projectId: "social-media-abe85",
    storageBucket: "social-media-abe85.appspot.com",
    messagingSenderId: "327390299728",
    appId: "1:327390299728:web:d183955826b420a308b355",
    measurementId: "G-P656VPBNDW"
};

const firebase = require('firebase');
firebase.initializeApp(config);

const db = admin.firestore();

app.get('/screams', async (req, res) => {
    await db
        .collection('screams')
        .orderBy('createdAt', 'desc')
        .get()
        .then((data) => {
            let screams = [];
            data.forEach((doc) => {
                screams.push(
                    {
                        screamId: doc.id,
                        body: doc.data().body,
                        userHandle: doc.data().userHandle,
                        createdAt: doc.data().createdAt
                    }
                );
            });
            return res.json(screams);
        }).catch(err => {
            console.error(err);
        })
})

app.post('/scream', async (req, res) => {

    const newScream = {
        body: req.body.body,
        userHandle: req.body.userHandle,
        createdAt: new Date().toISOString()
    };

    await db
        .collection('screams')
        .add(newScream)
        .then((doc) => {
            res.json({ message: `Document ${doc.id} created successfully` })
        })
        .catch(err => {
            res.status(500).json({ error: 'something went wrong here' });
            console.error(err);
        })
});

//signup routes
app.post('/signup', (req, res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle,
    }

    //TODO: validate data
    // firebase.auth().createUserWithEmailAndPassword(email, password)
    let token, userId;
    db.doc(`/users/${newUser.handle}`).get().then(doc => {
        if (doc.exists) {
            return res.status(400).json({ handle: 'this handle already exists' })
        } else {
            return firebase
                .auth()
                .createUserWithEmailAndPassword(newUser.email, newUser.password)
        }
    }).then(data => {
        userId = data.user.uid;
        return data.user.getIdToken()
    }).then(idToken => {
        token = idToken;
        const userCredentials = {
            handle: newUser.handle,
            email: newUser.email,
            createdAt: new Date().toISOString(),
            userId,
        };
        return db.doc(`/users/${newUser.handle}`).set(userCredentials);
    }).then(() => {
        return res.status(201).json({ token });
    }).catch(err => {
        console.error(err);
        if (err.code === 'auth/email-already-in-use') {
            return res.status(400).json({ email: "Email is already in use" });
        } else {
            return res.status(500).json({ error: err.code });
        }
    })
});

exports.api = functions.region('us-west2').https.onRequest(app);
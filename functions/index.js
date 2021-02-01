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

const isEmpty = (string) => {
    if (string.trim() === '') {
        return true
    } else {
        return false
    }
}

const isEmail = (email) => {
    const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (email.match(regEx)) return true;
    else return false;
}

//signup routes
app.post('/signup', (req, res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle,
    }

    let errors = {};

    if (isEmpty(newUser.email)) {
        errors.email = 'Email must not be empty'
    } else if (!isEmail(newUser.email)) {
        errors.email = "Must be a valid email address"
    }

    if (isEmpty(newUser.password)) errors.password = 'Must not be empty'
    if (newUser.password !== newUser.confirmPassword) errors.confirmPassword = 'Password must match'
    if (isEmpty(newUser.handle)) errors.handle = 'Must not be empty'

    if (Object.keys(errors).length > 0) {
        return res.status(400).json(errors);
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


// login route
app.post('/login', (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password
    };

    let errors = {};
    if (isEmpty(user.email)) errors.email = 'Must not be empty';
    if (isEmpty(user.password)) errors.password = 'Must not be empty';
    if (Object.keys(errors).length > 0) return res.status(400).json(errors);

    firebase
        .auth()
        .signInWithEmailAndPassword(user.email, user.password)
        .then(data => {
            return data.user.getIdToken();
        })
        .then(token => {
            return res.json({ token });
        })
        .catch(err => {
            console.error(err);
            if (err.code === 'auth/wrong-password') {
                return res.status(403).json({ general: 'Wrong credentials, please try again' })
            } else {
                return res.status(500).json({ error: err.code })
            }
        });
})

exports.api = functions.region('us-west2').https.onRequest(app);
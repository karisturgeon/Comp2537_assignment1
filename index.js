require("./utils.js");

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const saltRounds = 12;

const port = process.env.PORT || 3000;

const app = express();

const Joi = require("joi");

const url = require("url");

const expireTime = 24 * 60 * 60 * 1000;

const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;

const node_session_secret = process.env.NODE_SESSION_SECRET;

var { database } = include('databaseConnection');

app.use(express.urlencoded({ extended: false }));

const userCollection = database.db(mongodb_database).collection('users');

app.set('view engine', 'ejs');

const navLinks = [
    { name: "Home", link: "/" },
    { name: "Log In", link: "/login" },
    { name: "Members", link: "/members" },
    { name: "404", link: "/404" },
    { name: "Log Out", link: "/logout" }

]


var mongoStore = MongoStore.create({
    mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/sessions`,
    crypto: {
        secret: mongodb_session_secret
    }
})

app.use(session({
    secret: node_session_secret,
    store: mongoStore,
    saveUninitialized: false,
    resave: true
}
));

function isValidSession(req) {
    if (req.session.authenticated) {
        return true;
    }
    return false;
}

function sessionValidation(req, res, next) {
    if (isValidSession(req)) {
        next();
    }
    else {
        res.redirect('/login');
    }
}

function isAdmin(req) {
    if (req.session.user_type == 'admin') {
        return true;
    }
    return false;
}

function adminAuthorization(req, res, next) {
    if (!isAdmin(req)) {
        res.status(403);
        res.render("errorMessage", { error: "Not Authorized", navLinks: navLinks, currentURL: url.parse(req.url).pathname });
        return;
    }
    else {
        next();
    }
}

app.get('/', (req, res) => {
    if (!isValidSession(req)) {
        res.render("index", { navLinks: navLinks, currentURL: url.parse(req.url).pathname });

    }
    else {
        var name = req.session.name;
        res.render("index-loggedin", { navLinks: navLinks, currentURL: url.parse(req.url).pathname, name: name });
    }
});

app.get('/signup', (req, res) => {
    res.render("signup", { navLinks: navLinks, currentURL: url.parse(req.url).pathname })
})



app.post('/signupSubmit', async (req, res) => {
    var name = req.body.name;
    var email = req.body.email;
    var password = req.body.password;
    if (name == "") {
        var html = `
        Name is required.
        <a href='/signup'>Try Again</a>
        `
        res.send(html);
    }
    else if (email == "") {
        var html = `
        Please provide an email address.
        <a href='/signup'>Try Again</a>
        `
        res.send(html);
    }
    else if (password == "") {
        var html = `
        Password is required.
        <a href='/signup'>Try Again</a>
        `
        res.send(html);
    }
    else {
        const schema = Joi.object(
            {
                name: Joi.string().alphanum().max(15).required(),
                password: Joi.string().max(30).required(),
                email: Joi.string().email().max(20).required()
            });



        const validationResult = schema.validate({ name, password, email });
        error = validationResult.error;
        if (validationResult.error != null) {
            console.log("error" + validationResult.error);
            var html = `
        Please provide valid input for all fields.
        <a href='/signup'>Try Again</a>
        `
            res.send(html);
            return;
        }

        var hashedPassword = await bcrypt.hash(password, saltRounds);

        await userCollection.insertOne({ name: name, password: hashedPassword, email: email, user_type: "user" });
        console.log("Inserted user");
        req.session.authenticated = true;
        req.session.email = email;
        req.session.name = name;
        req.session.cookie.maxAge = expireTime;
        res.redirect('/members');
    }


});


app.get('/login', (req, res) => {
    res.render("login", { navLinks: navLinks, currentURL: url.parse(req.url).pathname });
});

app.post('/loginSubmit', async (req, res) => {
    var email = req.body.email;
    var password = req.body.password;

    const schema = Joi.object(
        {
            email: Joi.string().max(20).required(),
            password: Joi.string().max(20).required()
        }
    );
    const validationResult = schema.validate({ email, password });
    if (validationResult.error != null) {
        console.log(validationResult.error);
        res.redirect("/login");
        return;
    }

    const result = await userCollection.find({ email: email }).project({ email: 1, password: 1, _id: 1, name: 1, user_type: 1 }).toArray();

    console.log(result);
    if (result.length != 1) {
        console.log("user not found");
        res.render("login-error", { navLinks: navLinks, currentURL: url.parse(req.url).pathname });
        return;
    }
    if (await bcrypt.compare(password, result[0].password)) {
        var name = result[0].name;
        console.log("correct password");
        req.session.authenticated = true;
        req.session.email = email;
        req.session.name = name;
        req.session.user_type = result[0].user_type;
        req.session.cookie.maxAge = expireTime;
        res.redirect('/members');
        return;
    }
    else {
        console.log("incorrect password");
        res.render("login-error");
        return;
    }
});


app.get('/members', sessionValidation, (req, res) => {
    res.render("members", { navLinks: navLinks, currentURL: url.parse(req.url).pathname });
})

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
})

app.post('/users', async (req, res) => {
    const { name, action } = req.body;
    if (action === 'promote') {
        await userCollection.updateOne({ name }, { $set: { user_type: 'admin' } });
    } else if (action === 'demote') {
        await userCollection.updateOne({ name }, { $set: { user_type: 'user' } });
    }
    res.redirect('/admin'); // Redirect to home page after update
});

app.get('/admin', sessionValidation, adminAuthorization, async (req, res) => {
    const result = await userCollection.find().project({ name: 1, _id: 1, user_type: 1 }).toArray();
    res.render('admin', { users: result, navLinks: navLinks, currentURL: url.parse(req.url).pathname });
})

app.use(express.static(__dirname + "/public"));

app.get("*", (req, res) => {
    res.status(404);
    res.render("404", { navLinks: navLinks, currentURL: url.parse(req.url).pathname });
})

app.listen(port, () => {
    console.log("Node application listening on port " + port);
}); 
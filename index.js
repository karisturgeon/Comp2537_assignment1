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

var error;

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


app.get('/', (req, res) => {
    if (!req.session.authenticated) {
        var html = `
        <h1>Welcome!</h1>
        <form action='/login' method='get'>
        <button>Log In</button>
        </form>
        <form action='/signup' method='get'>
        <button>Sign Up</button>
        </form>
        `;
        res.send(html);
    }
    else {
        var name = req.session.name;
        var html = `
        <h1>Welcome, ${name}!</h1>
        <form action='/members' method='get'>
        <button>Go to Members Area</button>
        </form>
        <form action='/logout' method='get'>
        <button>Logout</button>
        </form>
        `;
        res.send(html);
    }
});

app.get('/signup', (req, res) => {
    var html = `
    Create User
    <form action='/signupSubmit' method='post'>
    <input name='name' type='text' placeholder='name'>
    <br>
    <input name='email' type='email' placeholder='email'>
    <br>
    <input name='password' type='password' placeholder='password'>
    <br>
    <button>Submit</button>
    </form>
    `;
    res.send(html);

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
    else {const schema = Joi.object(
        {
            name: Joi.string().alphanum().max(15).required(),
            password: Joi.string().max(30).required(),
            email: Joi.string().email().max(20).required()
        });



    const validationResult = schema.validate({name, password, email});
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

    await userCollection.insertOne({ name: name, password: hashedPassword, email: email });
    console.log("Inserted user");
    req.session.authenticated = true;
    req.session.email = email;
    req.session.name = name;
    req.session.cookie.maxAge = expireTime;
    res.redirect('/members');
    }


});


app.get('/login', (req, res) => {
    var html = `
    Log In
    <form action='/loginSubmit' method='post'>
    <input name='email' type='text' placeholder='email'>
    <input name='password' type='password' placeholder='password'>
    <button>Submit</button>
    </form>
    `;
    res.send(html);
});

app.post('/loginSubmit', async (req,res) => {
    var email = req.body.email;
    var password = req.body.password;

	const schema = Joi.string().max(20).required();
	const validationResult = schema.validate(email);
	if (validationResult.error != null) {
	   console.log(validationResult.error);
	   res.redirect("/login");
	   return;
	}

	const result = await userCollection.find({email: email}).project({email: 1, password: 1, _id: 1, name: 1}).toArray();

	console.log(result);
	if (result.length != 1) {
		console.log("user not found");
        var html = `
        Invalid email/password combination.
        <br>
        <a href='/login'>Try Again</a>`;
        res.send(html);
		return;
	}
	if (await bcrypt.compare(password, result[0].password)) {
        var name = result[0].name;
		console.log("correct password");
		req.session.authenticated = true;
		req.session.email = email;
        req.session.name = name;
		req.session.cookie.maxAge = expireTime;
		res.redirect('/members');
		return;
	}
	else {
		console.log("incorrect password");
        var html = `
        Invalid email/password combination.
        <br>
        <a href='/login'>Try Again</a>`;
        res.send(html);
		return;
	}
});




app.get('/members', (req, res) => {
    if (!req.session.authenticated) {
        res.redirect('/');
    }
    var rand = Math.floor(Math.random() * 3);
    var pic;
    if (rand == 0) {
        pic = 'jim.gif';
    } else if (rand == 1) {
        pic = 'michael.gif';
    } else {
        pic = 'stanley.gif';
    }


    var html = `
    You are logged in!
    <br>
    <img src='/${pic}' style='width:250px;'>
    <form action='/logout' method='get'>
    <button>Sign Out</button>
    </form> 
    `;
    res.send(html);



})

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
})

app.use(express.static(__dirname + "/public"));

app.get("*", (req, res) => {
    res.status(404);
    var html = `
    Page Not Found - 404
    <br>
    <img src='/kevin.gif'>
    `;
    res.send(html);
})

app.listen(port, () => {
    console.log("Node application listening on port " + port);
}); 
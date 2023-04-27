// require("./utils.js");

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');

const port = process.env.PORT || 3000;

const app = express();

const expireTime = 24;

const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;

const node_session_secret = process.env.NODE_SESSION_SECRET;

const {database} = include('databaseConnection');

const userCollection = database.db(mongodb_database).collection('users');

var mongoStore = MongoStore.create({
	mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/sessions`,
	crypto: {
		secret: mongodb_session_secret
	}
})

app.get('/', (req,res) => {
    // if (!req.session.authenticated) {
        var html = `
        <form action='/login' method='post'>
        <button>Log In</button>
        </form>
        <form action='/signup' method='post'>
        <button>Sign Up</button>
        </form>
        `;
        res.send(html);
    // }
    // else {

    // }
});

app.get("*", (req,res) => {
	res.status(404);
	res.send("Page not found - 404");
})

app.listen(port, () => {
	console.log("Node application listening on port "+port);
}); 
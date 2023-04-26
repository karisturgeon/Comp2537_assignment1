// require("./utils.js");

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');

const port = process.env.PORT || 3000;

const app = express();

const Joi = require("joi");

const expireTime = 24;

const {database} = include('databaseConnection');

const userCollection = database.db(mongodb_database).collection('users');

app.get('/', (req,res) => {
    res.send("<h1>Hello World!</h1>");
});

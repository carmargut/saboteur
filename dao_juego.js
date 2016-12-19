"use strict";

var mysql = require("mysql");
var config = require('./config');
var pool = mysql.createPool({
	host: config.dbHost,
    user: config.dbUser,
    password: config.dbPassword,
    database: config.dbName
});
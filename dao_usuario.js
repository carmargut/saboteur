"use strict";

var mysql = require("mysql");
var config = require('./config');

var pool = mysql.createPool({
    host: config.dbHost,
    user: config.dbUser,
    password: config.dbPassword,
    database: config.dbName
});

module.exports.altaUsuario = function(usuario,callback){
    
    if(callback === undefined) callback = function(){};
    pool.getConnection(function(err,conexion) {
        if (err) {
            callback(err);
        } else {
            conexion.query("INSERT INTO `usuarios`(`nick`, `contrasena`, `nombre_completo`, `sexo`,`imagen`, `fecha_nacimiento`) " +
                            "VALUES (?,?,?,?,?,?)",
                            [usuario.nick,
                            usuario.contrasena,
                            usuario.nombre,
                            usuario.sexo,
                            usuario.foto,
                            usuario.fecha_nacimiento],
            function(err,result){
                if(err){
                    callback(err);
                }else{
                    conexion.release();
                    callback(null,usuario.nick);                    
                }
            });
        }
    });
};

module.exports.getUserByNick = function(nick,callback){
    
    if(callback === undefined) callback = function(){};
    pool.getConnection(function(err,conexion) {
        if (err) {
            callback(err);
        } else {
            conexion.query("SELECT * " +
                           "FROM usuarios u " +
                           "WHERE u.nick = ?", 
                           [nick],
            function(err, result) {
                if(typeof result[0] === "undefined"){
                    callback(err);
                }else if(err){
                    callback(err);
                }
                else{
                    conexion.release(); 
                    callback(null,result[0]);
                } 
            });
        }
    });
};

module.exports.existeNick = function(nick,callback){

    if(callback === undefined) callback = function(){};
    pool.getConnection(function(err,conexion) {
        if (err) {
            callback(err);
        } else {
            conexion.query("SELECT * " +
                           "FROM usuarios u " +
                           "WHERE u.nick = ?",
                           [nick],
            function(err, result) {
                if(err){
                    callback(err);
                }
                else{
                    if(typeof result[0] === "undefined"){
                        conexion.release();
                        callback(null,false);   
                    }else{
                        conexion.release();
                        callback(null, true);
                    }   
                } 
            });
        }
    });
};



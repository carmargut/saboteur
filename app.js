"use strict";

var path = require("path");
var express = require("express");
var cookieParser = require("cookie-parser");
var config = require('./config');
var app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());

// Routers
var router_usuario = require("./app_usuarios"),
    router_partida = require("./app_partida"),
    router_juego = require("./app_juego");
app.use("/usuario/", router_usuario);
app.use("/partida/", router_partida);
app.use("/juego/", router_juego);

app.get("/", function(request, response) {
    if (request.cookies.nick === undefined) {
        response.redirect("/index.html");
    } else {
        response.redirect("/partida/partidas.html");
    }
});

app.get("/index.html", function(request, response) {
    var mensaje_usuario = {
        tipo: "", // info, exito, warning, error
        texto: ""
    }
    if (request.cookies.tipo_mensaje_usuario !== undefined) { // comprobamos que no hay mensajes para el usuario
        mensaje_usuario.tipo = request.cookies.tipo_mensaje_usuario;
        mensaje_usuario.texto = request.cookies.texto_mensaje_usuario;
        response.clearCookie("tipo_mensaje_usuario");
        response.clearCookie("texto_mensaje_usuario");
    }

    response.render("index", {
        mensaje_usuario: mensaje_usuario
    });
});

app.listen(config.port, function() {
    console.log("Servidor corriendo en el puerto " + config.port);
});
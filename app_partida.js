"use strict";
var path = require("path");
var express = require("express");
var bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
var expressvalidator = require("express-validator");
var config = require('./config');
var multer = require("multer");
var upload = multer({ storage: multer.memoryStorage() });
var dao_juego = require("./dao_juego");
var dao_partida = require("./dao_partida");
var dao_usuario = require("./dao_usuario");
var router_partida = express.Router();

router_partida.use(express.static(path.join(__dirname, "public")));
router_partida.use(bodyParser.urlencoded({ extended: true }));
router_partida.use(cookieParser());
router_partida.use(expressvalidator());

router_partida.get("/partidas.html", function(request, response) {
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
    if (request.cookies.nick === undefined) {
        response.redirect("/index.html");
    } else {
        dao_partida.getPartidas(request.cookies.nick, function(err, abiertas, activas, terminadas) {
            if (err) {
                console.log(err.message);
            } else {
                response.render("partidas", {
                    nombre_usuario: request.cookies.nick,
                    nombre_completo: request.cookies.nombre_completo,
                    partidas_abiertas: abiertas,
                    partidas_activas: activas,
                    partidas_terminadas: terminadas,
                    mensaje_usuario: mensaje_usuario
                });
            }
        });
    }
});

router_partida.get("/cerrarPartida/:id", function(request, response) {
    if (request.cookies.nick === undefined) {
        response.redirect("/index.html");
    } else {
        dao_partida.cerrarPartida(request.params.id, function(err, mensaje) {
            if (err) {
                console.log(err.message);
            } else if (typeof mensaje === "undefined") {
                response.cookie("tipo_mensaje_usuario", "info");
                response.cookie("texto_mensaje_usuario", "Has cerrado la partida.");
                response.redirect("/partida/partidas.html");
            } else {
                response.cookie("tipo_mensaje_usuario", "error");
                response.cookie("texto_mensaje_usuario", mensaje);
                response.redirect("/partida/partidas.html");
            }
        });
    }
});

router_partida.get("/nueva_partida.html", function(request, response) {

    if (request.cookies.nick === undefined) {
        response.redirect("/index.html");
    } else {
        response.render("nueva_partida", {
            nombre_usuario: request.cookies.nick,
            errores: {
                nombre: "",
                players: ""
            },
            valores: {
                nombre: "",
                numero: ""
            },
            mensaje_usuario: {
                tipo: "", // info, exito, warning, error
                texto: ""
            }
        });
    }
});

router_partida.get("/unirse_partida.html", function(request, response) {
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
    if (request.cookies.nick === undefined) {
        response.redirect("/index.html");
    } else {
        dao_partida.getPartidasAbiertas(request.cookies.nick, function(err, abiertas) {
            if (err) {
                console.log(err.message);
            } else {
                response.render("unirse_partida", {
                    nombre_usuario: request.cookies.nick,
                    partidas_abiertas: abiertas,
                    mensaje_usuario: {
                        tipo: mensaje_usuario.tipo, // info, exito, warning, error
                        texto: mensaje_usuario.texto
                    }
                });
            }
        });
    }
});
router_partida.get("/unirsePartida/:id", function(request, response) {
    if (request.cookies.nick === undefined) {
        response.redirect("/index.html");
    } else {
        dao_partida.unirsePartida(request.params.id, request.cookies.nick, function(err, tipo_mensaje, texto_mensaje) {
            if (err) {
                console.log(err.message);
            } else if (typeof tipo_mensaje === "undefined") {
                response.cookie("tipo_mensaje_usuario", "info");
                response.cookie("texto_mensaje_usuario", "Te has unido a la partida.");
                response.redirect("/partida/partidas.html");
            } else { // hay algún tipo de error
                response.cookie("tipo_mensaje_usuario", tipo_mensaje);
                response.cookie("texto_mensaje_usuario", texto_mensaje);
                response.redirect("/partida/unirse_partida.html");
            }
        });
    }
});

router_partida.post("/procesarFormularioCrearPartida.html", function(request, response) {
    var valores = {
        nombre: request.body.nombre,
        numero: request.body.players
    };
    var error = {
        nombre: "Introduce un nombre.",
        players: "Introduce número entre 3 y 7."
    };
    request.checkBody("nombre", "").notEmpty(); //comprobamos el nombre de la partida
    request.checkBody("players", "").notEmpty(); //comprobamos el número máximo de jugadores
    request.getValidationResult().then(function(result) { //chequeamos errores
        if (result.isEmpty()) { //sin campos vacíos o con errores
            dao_partida.existeNombre(request.body.nombre, function(err, existe) {
                if (err) {
                    console.log(err.message);
                }
                if (existe) { // si el nombre ya está cogido
                    valores.nombre = "";
                    error.nombre = "Nombre no disponible.";
                    error.players = "";
                    response.render("nueva_partida", {
                        nombre_usuario: request.cookies.nick,
                        errores: error,
                        valores: valores,
                        mensaje_usuario: {
                            tipo: "error", // info, exito, warning, error
                            texto: "Ya existe una partida con este nombre."
                        }
                    });
                } else {
                    dao_partida.crearPartida(valores, request.cookies.nick, function(err) {
                        if (err) {
                            console.log(err.message);
                        } else {
                            response.cookie("tipo_mensaje_usuario", "exito");
                            response.cookie("texto_mensaje_usuario", "Partida creada");
                            response.redirect("/partida/partidas.html");
                        }
                    });
                }
            });
        } else { //ha habido errores o campos vacíos
            if (typeof result.mapped().nombre === "undefined") { // ha introducido un nick
                error.nombre = "";
            }
            if (typeof result.mapped().players === "undefined") {
                error.players = "";
            }
            response.render("nueva_partida", {
                nombre_usuario: request.cookies.nick,
                errores: error,
                valores: valores,
                mensaje_usuario: {
                    tipo: "warning", // info, exito, warning, error
                    texto: "Campos vacíos."
                }
            });
        }
    });
});

router_partida.get("/ponerComentario.html",function(request,response){
    var comentario = request.query.comentario,
        id_partida = request.query.id_partida;
    
    dao_partida.subirComentario(id_partida,request.cookies.nick,comentario,function(err){
        if(err)
            console.log(err.message);
        else{
            response.redirect("/juego/juego.html?id_partida=" + id_partida);
        }
    });
});

module.exports = router_partida;
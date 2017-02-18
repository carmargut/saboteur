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
var router_usuario = express.Router();

router_usuario.use(express.static(path.join(__dirname, "public")));
router_usuario.use(bodyParser.urlencoded({ extended: true }));
router_usuario.use(cookieParser());
router_usuario.use(expressvalidator({
    customValidators: {
        esFechaValida: function(fecha) {
            // si la fecha está vacía decimos que es válida, ya que es opcional
            if (fecha.length === 0 || !fecha.trim()) return true;
            // comprobamos que es una fecha y que no es posterior al día de hoy
            return (!isNaN(Date.parse(fecha)) && Date.parse(fecha) < Date.parse(new Date()));
        }
    }
}));


router_usuario.get("/login.html", function(request, response) {
    if (request.cookies.nick === undefined) {
        response.render("login", {
            mensaje_error_1: "",
            mensaje_error_2: "",
            usuario: "",
            mensaje_usuario: {
                tipo: "", // info, exito, warning, error
                texto: ""
            }
        });
    } else {
        response.redirect("/partida/partidas.html");
    }
});

router_usuario.get("/registro.html", function(request, response) {
    if (request.cookies.nick === undefined) {
        response.render("registro", {
            mensaje_error_user: "",
            mensaje_error_pass: "",
            mensaje_error_nombre: "",
            mensaje_error_date: "",
            usuario: {
                nick: "",
                nombre: "",
                sexo: "Hombre",
                fecha: ""
            },
            mensaje_usuario: {
                tipo: "", // info, exito, warning, error
                texto: ""
            }
        });
    } else {
        response.redirect("/partida/partidas.html");
    }
});

router_usuario.get("/desconectar.html", function(request, response) {
    response.clearCookie('nick');
    response.clearCookie('nombre_completo');
    response.redirect("/index.html");
});

router_usuario.get("/procesarFormularioLogin.html", function(request, response) {
    var mensaje_error_user = "Escribe el nombre de usuario.",
        mensaje_error_pass = "Por favor, introduce tu contraseña.",
        user = "";
    request.checkQuery("user", "").notEmpty(); //comprobamos usuario
    request.checkQuery("pass", "").notEmpty(); //comprobamos pass

    request.getValidationResult().then(function(result) { //chequeamos errores
        if (result.isEmpty()) { //sin errores del validator
            dao_usuario.getUserByNick(request.query.user, function(err, resultado) {
                if (err) { //error desconocido
                    console.log(err.message);
                    response.redirect("/login.html");
                } else if (typeof resultado === "undefined") { //el usuario no existe
                    response.render("login", {
                        mensaje_error_1: "Usuario incorrecto.",
                        mensaje_error_2: "",
                        usuario: "",
                        mensaje_usuario: {
                            tipo: "error", // info, exito, warning, error
                            texto: "Usuario incorrecto"
                        }
                    });
                } else if (resultado.contrasena != request.query.pass) { //password incorrecta
                    response.render("login", {
                        mensaje_error_1: "",
                        mensaje_error_2: "La contraseña es incorrecta.",
                        usuario: request.query.user,
                        mensaje_usuario: {
                            tipo: "error", // info, exito, warning, error
                            texto: "Contraseña incorrecta"
                        }
                    });
                } else { //login correcto
                    response.cookie("nick", request.query.user);
                    response.cookie("nombre_completo", resultado.nombre_completo);
                    response.redirect("/partida/partidas.html");
                }
            });
        } else {
            if (typeof result.mapped().user === "undefined") { //ha introducido un nick
                mensaje_error_user = "";
                user = request.query.user;

            } else if (typeof result.mapped().pass === "undefined") { //Ha introducido una contraseña
                mensaje_error_pass = "";
            }
            response.render("login", {
                mensaje_error_1: mensaje_error_user,
                mensaje_error_2: mensaje_error_pass,

                usuario: user,
                mensaje_usuario: {
                    tipo: "warning", // info, exito, warning, error
                    texto: "Campos vacíos."
                }
            });
        }
    });
});

router_usuario.post("/procesarFormulario.html", upload.single("file"), function(request, response) {
    var usuario_plantilla = {
        nick: request.body.user,
        nombre: request.body.nombre,
        sexo: request.body.sexo,
        fecha: request.body.fecha_nacimiento
    };
    request.checkBody("user", "").notEmpty(); //comprobamos usuario
    request.checkBody("pass", "").notEmpty(); //comprobamos pass
    request.checkBody("nombre", "").notEmpty(); //comprobamos nombre completo
    request.checkBody("fecha_nacimiento", "").esFechaValida(); //comprobamos fecha con un customValidator
    request.getValidationResult().then(function(result) { //chequeamos errores
        if (result.isEmpty()) { //sin campos vacíos
            dao_usuario.existeNick(request.body.user, function(err, existe) {
                if (err) {
                    console.error(err.message);
                } else {
                    if (!existe) { // el nick no está cogido todavía
                        var usuario = {
                            nick: request.body.user,
                            contrasena: request.body.pass,
                            nombre: request.body.nombre,
                            sexo: request.body.sexo,
                            foto: null,
                            fecha_nacimiento: new Date(request.body.fecha_nacimiento)
                        };
                        if (request.file) {
                            usuario.foto = request.file.buffer;
                        }
                        dao_usuario.altaUsuario(usuario, function(err, user) {
                            if (err) {
                                console.log(err.message);
                            } else {
                                response.cookie("nick", usuario.nick);
                                response.cookie("nombre_completo", usuario.nombre);
                                response.cookie("tipo_mensaje_usuario", "exito");
                                response.cookie("texto_mensaje_usuario", "¡Registrado con éxito!");
                                response.redirect("/partida/partidas.html");
                            }
                        });
                    } else { // si el nick ya está cogido
                        response.render("registro", {
                            mensaje_error_user: "Nick ya existente.",
                            mensaje_error_pass: "",
                            mensaje_error_nombre: "",
                            mensaje_error_date: "",
                            usuario: usuario_plantilla,
                            mensaje_usuario: {
                                tipo: "warning", // info, exito, warning, error
                                texto: "Ya existe alguien con este nick."
                            }
                        });
                    }
                }
            });
        } else { //hay campos sin rellenar
            var mensaje_error_user = "Introduce un nick.",
                mensaje_error_pass = "Introduce una contraseña.",
                mensaje_error_nombre = "Introduce un nombre.",
                mensaje_error_date = "Fecha de nacimiento errónea",
                mensaje_usuario = {
                    tipo: "warning", // info, exito, warning, error
                    texto: "Campos vacíos."
                };
            if (typeof result.mapped().user === "undefined") { // si ha introducido un nick
                mensaje_error_user = "";
            }
            if (typeof result.mapped().pass === "undefined") { // si ha introducido una contraseña
                mensaje_error_pass = "";
            }
            if (typeof result.mapped().nombre === "undefined") { //si ha introducido un nombre
                mensaje_error_nombre = "";
            }
            if (typeof result.mapped().fecha_nacimiento === "undefined") { // ha introducido una fecha válida
                mensaje_error_date = ""
            } else { //la fecha es errónea
                mensaje_error_date = ".";
                mensaje_usuario = {
                    tipo: "error", // info, exito, warning, error
                    texto: "La fecha es incorrecta."
                };
                usuario_plantilla.fecha = "";
            }
            response.render("registro", {
                mensaje_error_user: mensaje_error_user,
                mensaje_error_pass: mensaje_error_pass,
                mensaje_error_nombre: mensaje_error_nombre,
                mensaje_error_date: mensaje_error_date,
                usuario: usuario_plantilla,
                mensaje_usuario: mensaje_usuario
            });
        }
    });
});

module.exports = router_usuario;
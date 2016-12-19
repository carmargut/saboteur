"use strict";



var path = require("path");
var express = require("express");
var bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
var expressvalidator = require("express-validator");
var config = require('./config');
var multer = require("multer");
var upload = multer({storage: multer.memoryStorage()});
var app = express();

app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(expressvalidator({
    customValidators:{
        esFechaValida: function(fecha){
            // si la fecha está vacía decimos que es válida, ya que es opcional
            if(fecha.length === 0 || !fecha.trim()) return true;
            // comprobamos que es una fecha y que no es posterior al día de hoy
            return(!isNaN(Date.parse(fecha)) && Date.parse(fecha) < Date.parse(new Date()));
        }
    }
}));





app.get("/", function(request,response){

    if(request.cookies.nick === undefined){
        response.redirect("/index.html");
    }
    else{
        response.redirect("/partidas.html");
    }
});




app.get("/index.html", function(request, response) {
    var mensaje_usuario = {
        tipo: "",// info, exito, warning, error
        texto: ""
    }
    if(request.cookies.tipo_mensaje_usuario !== undefined){ // comprobamos que no hay mensajes para el usuario
        mensaje_usuario.tipo = request.cookies.tipo_mensaje_usuario;
        mensaje_usuario.texto = request.cookies.texto_mensaje_usuario;
        response.clearCookie("tipo_mensaje_usuario");
        response.clearCookie("texto_mensaje_usuario");
    }
    
    response.render("index",{
        mensaje_usuario: mensaje_usuario
    });
});



app.get("/login.html",function(request,response){
    
    if(request.cookies.nick === undefined){
        response.render("login",{
            mensaje_error_1: "",
            mensaje_error_2: "",
            usuario: "",
            mensaje_usuario: {
                tipo: "",// info, exito, warning, error
                texto: ""
            }
        });
    }
    else{
        response.redirect("/partidas.html");
    }
});



app.get("/registro.html",function(request,response){
    if(request.cookies.nick === undefined){
        response.render("registro",{
            mensaje_error_user : "",
            mensaje_error_pass : "",
            mensaje_error_nombre : "",
            mensaje_error_date: "",
            usuario: {
                nick: "",
                nombre: "",
                sexo: "Hombre",
                fecha: ""
            },
            mensaje_usuario: {
                tipo: "",// info, exito, warning, error
                texto: ""
            }
        });
    }
    else{
        response.redirect("/partidas.html");
    }
});



app.get("/desconectar.html",function(request,response){

    response.clearCookie('nick');
    response.clearCookie('nombre_completo');
    response.redirect("/index.html");
});



app.get("/procesarFormularioLogin.html",function(request,response){
    
    var mensaje_error_user = "Escribe el nombre de usuario.",
        mensaje_error_pass = "Por favor, introduce tu contraseña.",
        user = "";
    request.checkQuery("user","").notEmpty();//comprobamos usuario
    request.checkQuery("pass","").notEmpty();//comprobamos pass
    
    
    request.getValidationResult().then(function(result){ //chequeamos errores
        
        if(result.isEmpty()){ //sin errores del validator
            var dao = require("./dao_usuario");
            dao.getUserByNick(request.query.user,function(err,resultado){
                if(err){//error desconocido
                    console.log(err.message);
                    response.redirect("/login.html");
                }else if(typeof resultado === "undefined"){//el usuario no existe
                    response.render("login",{
                        mensaje_error_1: "Usuario incorrecto.",
                        mensaje_error_2: "",
                        usuario: "",
                        mensaje_usuario: {
                            tipo: "error",// info, exito, warning, error
                            texto: "Usuario incorrecto"
                        }
                    });
                }else if(resultado.contrasena != request.query.pass){//password incorrecta
                    response.render("login",{
                        mensaje_error_1: "",
                        mensaje_error_2: "La contraseña es incorrecta.",
                        usuario: request.query.user,
                        mensaje_usuario: {
                            tipo: "error",// info, exito, warning, error
                            texto: "Contraseña incorrecta"
                        }
                    });
                }
                else{//login correcto
                    response.cookie("nick",request.query.user);
                    response.cookie("nombre_completo",resultado.nombre_completo);
                    response.redirect("/partidas.html");
                }
             });
        }else{
            if(typeof result.mapped().user === "undefined"){//ha introducido un nick
                mensaje_error_user = "";
                user = request.query.user;
            
            }else if(typeof result.mapped().pass === "undefined"){ //Ha introducido una contraseña
                mensaje_error_pass  = "";
            }
            else if(typeof result.mapped().fecha_nacimiento === "undefined"){
                mensaje_error_date  = "";
            }
            response.render("login",{
                mensaje_error_1: mensaje_error_user,
                mensaje_error_2: mensaje_error_pass,
                
                usuario:user,
                mensaje_usuario: {
                    tipo: "warning",// info, exito, warning, error
                    texto: "Campos vacíos."
                }
            });
        }        
    });
});



app.post("/procesarFormulario.html",upload.single("file"), function(request, response) {

    var usuario_plantilla = {
        nick: request.body.user,
        nombre: request.body.nombre,
        sexo: request.body.sexo,
        fecha: request.body.fecha_nacimiento
    };
    request.checkBody("user","").notEmpty();//comprobamos usuario
    request.checkBody("pass","").notEmpty();//comprobamos pass
    request.checkBody("nombre","").notEmpty();//comprobamos nombre completo
    request.checkBody("fecha_nacimiento","").esFechaValida();//comprobamos fecha con un customValidator
    request.getValidationResult().then(function(result){ //chequeamos errores
        if(result.isEmpty()){ //sin campos vacíos
            var dao = require("./dao_usuario");
            dao.existeNick(request.body.user,function(err,existe){
                if(err){
                    console.error(err.message);
                }
                else{
                    if(!existe){ // el nick no está cogido todavía
                        var usuario = {
                            nick: request.body.user,
                            contrasena : request.body.pass, 
                            nombre: request.body.nombre,
                            sexo: request.body.sexo,
                            foto: null,
                            fecha_nacimiento: new Date(request.body.fecha_nacimiento)
                        };
                        if(request.file){
                            usuario.foto = request.file.buffer;
                        }
                        
                        dao.altaUsuario(usuario,function(err,user){
                            if(err){
                                console.log(err.message);
                            }else{
                                response.cookie("nick",usuario.nick);
                                response.cookie("nombre_completo",usuario.nombre);
                                response.cookie("tipo_mensaje_usuario","exito");
                                response.cookie("texto_mensaje_usuario","¡Registrado con éxito!");
                                response.redirect("partidas.html");
                            }
                        });
                    }else{ // si el nick ya está cogido
                        response.render("registro",{
                            mensaje_error_user : "Nick ya existente.",
                            mensaje_error_pass : "",
                            mensaje_error_nombre : "",
                            mensaje_error_date: "",
                            usuario: usuario_plantilla,
                            mensaje_usuario: {
                                tipo: "warning",// info, exito, warning, error
                                texto: "Ya existe alguien con este nick."
                            }
                        });
                    }
                }
            });
        } else{//hay campos sin rellenar
            var mensaje_error_user = "Introduce un nick.",
                mensaje_error_pass = "Introduce una contraseña.",
                mensaje_error_nombre = "Introduce un nombre.",
                mensaje_error_date = "Fecha de nacimiento errónea",
                mensaje_usuario = {
                    tipo: "warning",// info, exito, warning, error
                    texto: "Campos vacíos."
                };

            if(typeof result.mapped().user === "undefined"){// si ha introducido un nick
                mensaje_error_user = "";
            }
            if (typeof result.mapped().pass === "undefined"){// si ha introducido una contraseña
                mensaje_error_pass = "";
            }
            if (typeof  result.mapped().nombre === "undefined"){//si ha introducido un nombre
                mensaje_error_nombre = "";
            }
            if( typeof result.mapped().fecha_nacimiento === "undefined"){// ha introducido una fecha válida
                mensaje_error_date = ""
            }else{//la fecha es errónea
                mensaje_error_date = ".";
                mensaje_usuario = {
                    tipo: "error",// info, exito, warning, error
                    texto: "La fecha es incorrecta."
                };
                usuario_plantilla.fecha = "";
                
            }

            
            response.render("registro",{
                mensaje_error_user : mensaje_error_user,
                mensaje_error_pass : mensaje_error_pass,
                mensaje_error_nombre : mensaje_error_nombre,
                mensaje_error_date: mensaje_error_date,
                usuario: usuario_plantilla,
                mensaje_usuario: mensaje_usuario
            });
        }
    });    
});



//Partidas:

app.get("/partidas.html",function(request,response){
    var mensaje_usuario = {
        tipo: "",// info, exito, warning, error
        texto: ""
    }
    if(request.cookies.tipo_mensaje_usuario !== undefined){ // comprobamos que no hay mensajes para el usuario
        mensaje_usuario.tipo = request.cookies.tipo_mensaje_usuario;
        mensaje_usuario.texto = request.cookies.texto_mensaje_usuario;
        response.clearCookie("tipo_mensaje_usuario");
        response.clearCookie("texto_mensaje_usuario");
    }
    if(request.cookies.nick === undefined){
        response.redirect("/index.html");
    }
    else{
        var dao = require("./dao_partida");
        dao.getPartidas(request.cookies.nick,function(err,abiertas,activas,terminadas){
            if(err){
                console.log(err.message);
            }else{
                response.render("partidas",{
                    nombre_usuario:request.cookies.nick,
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

app.get("/cerrarPartida/:id",function(request,response){
     if(request.cookies.nick === undefined){
        response.redirect("/index.html");
    }
    else{
        var dao = require("./dao_partida");
        dao.cerrarPartida(request.params.id,function(err,mensaje){
            if(err){
                console.log(err.message);
            }else if(typeof mensaje === "undefined"){
                response.cookie("tipo_mensaje_usuario","info");
                response.cookie("texto_mensaje_usuario","Has cerrado la partida."); 
                response.redirect("/partidas.html");
            }
            else{
                response.cookie("tipo_mensaje_usuario","error");
                response.cookie("texto_mensaje_usuario",mensaje); 
                response.redirect("/partidas.html");
            }
        });
    }
});


app.get("/nueva_partida.html",function(request,response){

    if(request.cookies.nick === undefined){
        response.redirect("/index.html");
    }
    else{
        response.render("nueva_partida",{
            nombre_usuario:request.cookies.nick,
            errores: {
                nombre: "",
                players: ""
            },
            valores: {
                nombre: "",
                numero: ""
            },
            mensaje_usuario: {
                tipo: "",// info, exito, warning, error
                texto: ""
            }
        });
    }
});


app.get("/unirse_partida.html",function(request,response){
    var mensaje_usuario = {
        tipo: "",// info, exito, warning, error
        texto: ""
    }
    if(request.cookies.tipo_mensaje_usuario !== undefined){ // comprobamos que no hay mensajes para el usuario
        mensaje_usuario.tipo = request.cookies.tipo_mensaje_usuario;
        mensaje_usuario.texto = request.cookies.texto_mensaje_usuario;
        response.clearCookie("tipo_mensaje_usuario");
        response.clearCookie("texto_mensaje_usuario");
    }
    if(request.cookies.nick === undefined){
        response.redirect("/index.html");
    }
    else{
        var dao = require("./dao_partida");
        dao.getPartidasAbiertas(request.cookies.nick,function(err,abiertas){
            if(err){
                console.log(err.message);
            }else{
                response.render("unirse_partida",{
                    nombre_usuario: request.cookies.nick,
                    partidas_abiertas: abiertas,
                    mensaje_usuario: {
                        tipo: mensaje_usuario.tipo,// info, exito, warning, error
                        texto: mensaje_usuario.texto
                    }
                });
            }
        });  
    }
});
app.get("/unirsePartida/:id",function(request,response){
     if(request.cookies.nick === undefined){
        response.redirect("/index.html");
    }
    else{
        var dao = require("./dao_partida");
        dao.unirsePartida(request.params.id,request.cookies.nick,function(err,tipo_mensaje,texto_mensaje){
            if(err){
                console.log(err.message);
            }else if(typeof tipo_mensaje === "undefined"){
                response.cookie("tipo_mensaje_usuario","info");
                response.cookie("texto_mensaje_usuario","Te has unido a la partida."); 
                response.redirect("/partidas.html");
            }
            else{ // hay algún tipo de error
                response.cookie("tipo_mensaje_usuario",tipo_mensaje);
                response.cookie("texto_mensaje_usuario",texto_mensaje); 
                response.redirect("/unirse_partida.html");
            }
        });
    }
});


app.post("/procesarFormularioCrearPartida.html",function(request,response){
    var dao = require("./dao_partida");
    var valores = {
        nombre : request.body.nombre,
        numero : request.body.players
    };
    var error = {
        nombre : "Introduce un nombre.",
        players : "Introduce número entre 3 y 7."
    };
    request.checkBody("nombre","").notEmpty();//comprobamos el nombre de la partida
    request.checkBody("players","").notEmpty();//comprobamos el número máximo de jugadores
    request.getValidationResult().then(function(result){ //chequeamos errores
        if(result.isEmpty()){ //sin campos vacíos o con errores
            dao.existeNombre(request.body.nombre,function(err,existe){
                if(err){
                    console.log(err.message);
                }
                if(existe){// si el nombre ya está cogido
                    valores.nombre = "";
                    error.nombre = "Nombre no disponible.";
                    error.players = "";
                    response.render("nueva_partida",{
                        nombre_usuario:request.cookies.nick,
                        errores: error,
                        valores: valores,
                        mensaje_usuario: {
                            tipo: "error",// info, exito, warning, error
                            texto: "Ya existe una partida con este nombre."
                        }
                    });
                }else{
                    dao.crearPartida(valores,request.cookies.nick,function(err){
                        if(err){
                            console.log(err.message);
                        }else{
                            response.cookie("tipo_mensaje_usuario","exito");
                            response.cookie("texto_mensaje_usuario","Partida creada");
                            response.redirect("partidas.html");
                        }
                    });
                }
            });
        }else{//ha habido errores o campos vacíos
            if(typeof result.mapped().nombre === "undefined"){ // ha introducido un nick
                error.nombre = "";
            }
            if(typeof result.mapped().players === "undefined"){
                error.players = "";
            }
            response.render("nueva_partida",{
                nombre_usuario:request.cookies.nick,
                errores: error,
                valores: valores,
                mensaje_usuario: {
                    tipo: "warning",// info, exito, warning, error
                    texto: "Campos vacíos."
                }
            });
        }
    });
});




app.listen(config.port,function(){
    console.log("Servidor corriendo en el puerto 3000");
});
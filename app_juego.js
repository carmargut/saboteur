"use strict";
var path = require("path");
var express = require("express");
var cookieParser = require("cookie-parser");
var config = require('./config');
var dao_juego = require("./dao_juego");
var dao_partida = require("./dao_partida");
var dao_usuario = require("./dao_usuario");
var router_juego = express.Router();

router_juego.use(express.static(path.join(__dirname, "public")));
router_juego.use(cookieParser());





router_juego.get("/juego.html", function(request, response) {
    var id_partida = request.query.id_partida,
        id_carta_seleccionada = request.query.id_carta_seleccionada,
        id_carta_colocada = request.query.colocada,
        mensaje_usuario = {
            tipo: "", // info, exito, warning, error
            texto: ""
        },
        estado;
    if (request.cookies.nick === undefined) { // si no está logueado
        response.redirect("/index.html");
    } else {
        if (request.cookies.tipo_mensaje_usuario !== undefined) { // comprobamos que no hay mensajes para el usuario
            mensaje_usuario.tipo = request.cookies.tipo_mensaje_usuario;
            mensaje_usuario.texto = request.cookies.texto_mensaje_usuario;
            response.clearCookie("tipo_mensaje_usuario");
            response.clearCookie("texto_mensaje_usuario");
        }

        if (id_carta_seleccionada === undefined) {
            estado = "normal"
        } else if (id_carta_colocada === undefined) {
            estado = "ha_seleccionado_carta"
        }

        dao_partida.getPartida(id_partida, function(err, partida) { // conseguimos los datos de la partida
            if (err) {
                console.log(err.message);
            } else if (partida != null) {
                dao_partida.getComentarios(id_partida, function(err, comentarios) {
                    if (err)
                        console.log(err.message);
                    else {
                        dao_usuario.getUsuarioTurno(id_partida, function(err, turno) { // vemos quién tiene el turno
                            if (err) {
                                console.log(err.message);
                            } else {
                                dao_juego.getTablero(id_partida, function(err, tablero) { // conseguimos el tablero actual
                                    if (err) {
                                        console.log(err.message);
                                    } else {
                                        dao_juego.getCartas(id_partida, request.cookies.nick, function(err, cartas) { // conseguimos sus cartas
                                            if (err) {
                                                console.log(err.message);
                                            } else {
                                                dao_juego.getRol(id_partida, request.cookies.nick, function(err, rol) { // conseguimos su rol en partida
                                                    response.render("juego", {
                                                        nombre_usuario: request.cookies.nick,
                                                        mensaje_usuario: mensaje_usuario,
                                                        partida: partida,
                                                        turno: turno.nick,
                                                        tablero: tablero,
                                                        cartas: cartas,
                                                        estado: estado,
                                                        id_carta_seleccionada: id_carta_seleccionada,
                                                        rol: rol,
                                                        comentarios: comentarios
                                                    });
                                                });
                                            }

                                        });
                                    }

                                });
                            }
                        });
                    }
                });

            }
        })
    }
});


router_juego.get("/colocarCarta.html", function(request, response) {
    var carta = request.query.id_carta_colocada,
        fila = request.query.fila,
        columna = request.query.columna,
        partida = request.query.partida;
    var dao_juego = require("./dao_juego");
    dao_juego.getCarta(fila, columna, partida, function(err, carta2) {
        if (carta2.carta !== 1) { // la carta sobre la que quiere colocar la nueva no está vacía
            response.cookie("tipo_mensaje_usuario", "error");
            response.cookie("texto_mensaje_usuario", "No puedes colocar una carta sobre otra.");
            response.redirect("/juego/juego.html?id_carta_seleccionada=" + carta + "&id_partida=" + partida);
        } else { // la posición está vacía
            sePuedeColocar(carta, fila, columna, partida, function(se_puede_colocar, alzanza_premio, fila_premio, columna_premio) {
                if (se_puede_colocar) {
                    dao_juego.setCarta(fila, columna, carta, partida, request.cookies.nick, function(err) {
                        if (err)
                            console.log(err.message);
                        else if (alzanza_premio === 1) { // se llegó al oro
                            dao_juego.descubrirCartaConOro(fila_premio, columna_premio, partida, function(err) {
                                if (err)
                                    console.log(err.message);
                                else {
                                    dao_partida.setGanadores(partida, "buscador", function(err) {
                                        if (err) {
                                            console.log(err.message);
                                        } else {
                                            response.cookie("tipo_mensaje_usuario", "info");
                                            response.cookie("texto_mensaje_usuario", "¡Ganan los buscadores!.");
                                            response.redirect("/partida/partidas.html");
                                        }
                                    });
                                }
                            });

                        } else if (alzanza_premio === 2) {
                            dao_juego.descubrirCartaSinOro(fila_premio, columna_premio, partida, function(err) {
                                if (err)
                                    console.log(err.message);
                                else {
                                    dao_partida.pasarTurno(partida, function(err, estado) {
                                        if (estado === "terminada") {
                                            response.cookie("tipo_mensaje_usuario", "info");
                                            response.cookie("texto_mensaje_usuario", "La partida ha terminado.");
                                            response.redirect("/partida/partidas.html");
                                        } else {
                                            response.redirect("/juego/juego.html?id_partida=" + partida);
                                        }
                                    });
                                }
                            });
                        } else {
                            dao_partida.pasarTurno(partida, function(err, estado) {
                                if (estado === "terminada") {
                                    response.cookie("tipo_mensaje_usuario", "info");
                                    response.cookie("texto_mensaje_usuario", "La partida ha terminado.");
                                    response.redirect("/partida/partidas.html");
                                } else {
                                    response.redirect("/juego/juego.html?id_partida=" + partida);
                                }
                            });
                        }
                    });
                } else {
                    response.cookie("tipo_mensaje_usuario", "error");
                    response.cookie("texto_mensaje_usuario", "No puedes colocar una carta en esa posicion.");
                    response.redirect("/juego/juego.html?id_carta_seleccionada=" + carta + "&id_partida=" + partida);
                }
            });

        }
    });
});

router_juego.get("/descartar.html", function(request, response) {
    var nick = request.query.nick,
        id_partida = request.query.id_partida,
        carta = request.query.carta;
    var dao_juego = require("./dao_juego");
    dao_juego.reemplazar(nick, id_partida, carta, function(err) {
        if (err)
            console.log(err.message);
        else {
            dao_partida.pasarTurno(id_partida, function(err, estado) {
                if (estado === "terminada") {
                    response.cookie("tipo_mensaje_usuario", "info");
                    response.cookie("texto_mensaje_usuario", "La partida ha terminado.");
                    response.redirect("/partida/partidas.html");
                } else {
                    response.redirect("/juego/juego.html?id_partida=" + id_partida);
                }
            });
        }
    })
});


function sePuedeColocar(carta, fila, columna, partida, callback) {
    var se_puede = false,
        alcanza_premio = 0, // 0 si no alcanza premio, 1 si ese premio es oro y 2 si ese premio no tiene nada
        fila_premio = 0,
        columna_premio = 0;
    comprobarArriba(carta, fila, columna, partida, function(todo_correcto_arriba, conecta_con_salida_arriba, alcanza_premio_arriba, fila_premio_arriba, columna_premio_arriba) {
        comprobarAbajo(carta, fila, columna, partida, function(todo_correcto_abajo, conecta_con_salida_abajo, alcanza_premio_abajo, fila_premio_abajo, columna_premio_abajo) {
            comprobarDerecha(carta, fila, columna, partida, function(todo_correcto_derecha, conecta_con_salida_derecha, alcanza_premio_derecha, fila_premio_derecha, columna_premio_derecha) {
                comprobarIzquierda(carta, fila, columna, partida, function(todo_correcto_izquierda, conecta_con_salida_izquierda, alcanza_premio_izquierda, fila_premio_izquierda, columna_premio_izquierda) {
                    if (todo_correcto_izquierda && todo_correcto_derecha && todo_correcto_abajo && todo_correcto_arriba) {
                        if (conecta_con_salida_izquierda || conecta_con_salida_derecha || conecta_con_salida_abajo || conecta_con_salida_arriba) {
                            se_puede = true;
                            if (alcanza_premio_arriba !== 0) {
                                fila_premio = fila_premio_arriba;
                                columna_premio = columna_premio_arriba;
                                alcanza_premio = alcanza_premio_arriba;
                            } else if (alcanza_premio_abajo !== 0) {
                                fila_premio = fila_premio_abajo;
                                columna_premio = columna_premio_abajo;
                                alcanza_premio = alcanza_premio_abajo;
                            } else if (alcanza_premio_izquierda !== 0) {
                                fila_premio = fila_premio_izquierda;
                                columna_premio = columna_premio_izquierda;
                                alcanza_premio = alcanza_premio_izquierda;
                            } else if (alcanza_premio_derecha !== 0) {
                                fila_premio = fila_premio_derecha;
                                columna_premio = columna_premio_derecha;
                                alcanza_premio = alcanza_premio_derecha;
                            }
                        }
                    }
                    callback(se_puede, alcanza_premio, fila_premio, columna_premio);
                });
            });
        });
    });
}

function comprobarArriba(actual, fila, columna, partida, callback) {
    var conecta_con_salida = false;
    getCarta(Number(fila) - 1, columna, partida, function(arriba) {
        if (arriba === null || Number(arriba.carta) === 1) {
            callback(true, conecta_con_salida, 0);
        } else {
            if (arriba.unido_a_salida === '1')
                conecta_con_salida = true;
            if (tieneConexionEnLaParteDeAbajo(arriba.carta)) {
                if (tieneConexionEnLaParteDeArriba(actual)) { // los dos conectan, devolvemos si hay camino desde la salida
                    if (arriba.carta === 3) { // ha alcanzado una casilla de premio con oro
                        callback(true, conecta_con_salida, 1, Number(fila) - 1, columna);
                    } else if (arriba.carta === 4) { //ha alcanzado una casilla de premio sin oro
                        callback(true, conecta_con_salida, 2, Number(fila) - 1, columna);
                    } else { // no ha alcanzado una casilla de premio
                        callback(true, conecta_con_salida, 0);
                    }
                } else { // uno conecta pero el otro no
                    callback(false, false, 0);
                }
            } else {
                if (tieneConexionEnLaParteDeArriba(actual)) { // uno conecta pero el otro no
                    callback(false, false, 0);
                } else { // ninguno de los dos conecta
                    callback(true, false, 0);
                }
            }
        }
    });
}

function comprobarAbajo(actual, fila, columna, partida, callback) {
    var conecta_con_salida = false;
    getCarta(Number(fila) + 1, columna, partida, function(abajo) {
        if (abajo === null || Number(abajo.carta) === 1) {
            callback(true, conecta_con_salida, 0);
        } else {
            if (abajo.unido_a_salida === '1')
                conecta_con_salida = true;
            if (tieneConexionEnLaParteDeArriba(abajo.carta)) {
                if (tieneConexionEnLaParteDeAbajo(actual)) { // los dos conectan, devolvemos si hay camino desde la salida
                    if (abajo.carta === 3) { // ha alcanzado una casilla de premio con oro
                        callback(true, conecta_con_salida, 1, Number(fila) + 1, columna);
                    } else if (abajo.carta === 4) { //ha alcanzado una casilla de premio sin oro
                        callback(true, conecta_con_salida, 2, Number(fila) + 1, columna);
                    } else { // no ha alcanzado una casilla de premio
                        callback(true, conecta_con_salida, 0);
                    }
                } else { // uno conecta pero el otro no
                    callback(false, false, 0);
                }
            } else {
                if (tieneConexionEnLaParteDeAbajo(actual)) { // uno conecta pero el otro no
                    callback(false, false, 0);
                } else { // ninguno de los dos conecta
                    callback(true, false, 0);
                }
            }
        }
    });
}

function comprobarIzquierda(actual, fila, columna, partida, callback) {
    var conecta_con_salida = false;
    getCarta(fila, Number(columna) - 1, partida, function(izquierda) {
        if (izquierda === null || Number(izquierda.carta) === 1) {
            callback(true, conecta_con_salida, 0);
        } else {
            if (izquierda.unido_a_salida === '1')
                conecta_con_salida = true;
            if (tieneConexionALaDerecha(izquierda.carta)) {
                if (tieneConexionALaIzquierda(actual)) { // los dos conectan, devolvemos si hay camino desde la salida
                    if (izquierda.carta === 3) { // ha alcanzado una casilla de premio con oro
                        callback(true, conecta_con_salida, 1, fila, Number(columna) - 1);
                    } else if (izquierda.carta === 4) { //ha alcanzado una casilla de premio sin oro
                        callback(true, conecta_con_salida, 2, fila, Number(columna) - 1);
                    } else { // no ha alcanzado una casilla de premio
                        callback(true, conecta_con_salida, 0);
                    }
                } else { // uno conecta pero el otro no
                    callback(false, false, 0);
                }
            } else {
                if (tieneConexionALaIzquierda(actual)) { // uno conecta pero el otro no
                    callback(false, false, 0);
                } else { // ninguno de los dos conecta
                    callback(true, false, 0);
                }
            }
        }
    });
}

function comprobarDerecha(actual, fila, columna, partida, callback) {
    var conecta_con_salida = false;
    getCarta(fila, Number(columna) + 1, partida, function(derecha) {
        if (derecha === null || Number(derecha.carta) === 1) {
            callback(true, conecta_con_salida, 0);
        } else {
            if (derecha.unido_a_salida === '1')
                conecta_con_salida = true;
            if (tieneConexionALaIzquierda(derecha.carta)) {
                if (tieneConexionALaDerecha(actual)) { // los dos conectan, devolvemos si hay camino desde la salida

                    if (derecha.carta === 3) { // ha alcanzado una casilla de premio con oro
                        callback(true, conecta_con_salida, 1, fila, Number(columna) + 1);
                    } else if (derecha.carta === 4) { //ha alcanzado una casilla de premio sin oro
                        callback(true, conecta_con_salida, 2, fila, Number(columna) + 1);
                    } else { // no ha alcanzado una casilla de premio
                        callback(true, conecta_con_salida, 0);
                    }
                } else { // uno conecta pero el otro no
                    callback(false, false, 0);
                }
            } else {
                if (tieneConexionALaDerecha(actual)) { // uno conecta pero el otro no
                    callback(false, false, 0);
                } else { // ninguno de los dos conecta
                    callback(true, false, 0);
                }
            }
        }
    });
}

function tieneConexionEnLaParteDeArriba(carta) {
    carta = Number(carta);
    if (carta === 2 || carta === 3 || carta === 4 || carta === 5 || carta === 10 || carta === 11 || carta === 12 || carta === 13 || carta === 18 || carta === 19 || carta === 20 || carta === 21) {
        return true;
    } else {
        return false;
    }
}

function tieneConexionEnLaParteDeAbajo(carta) {
    carta = Number(carta);
    if (carta === 2 || carta === 3 || carta === 4 || carta === 5 || carta === 7 || carta === 9 || carta === 11 || carta === 13 || carta === 15 || carta === 17 || carta === 19 || carta === 21) {
        return true;
    } else {
        return false;
    }
}

function tieneConexionALaDerecha(carta) {
    carta = Number(carta);
    if (carta === 2 || carta === 3 || carta === 4 || carta === 5 || carta === 8 || carta === 9 || carta === 12 || carta === 13 || carta === 16 || carta === 17 || carta === 20 || carta === 21) {
        return true;
    } else {
        return false;
    }
}

function tieneConexionALaIzquierda(carta) {
    carta = Number(carta);
    if (carta === 2 || carta === 3 || carta === 4 || carta === 5 || carta === 14 || carta === 15 || carta === 16 || carta === 17 || carta === 18 || carta === 19 || carta === 20 || carta === 21) {
        return true;
    } else {
        return false;
    }
}


function getCarta(fila, columna, partida, callback) {
    if (fila < 0 || fila > 7 || columna < 0 || columna > 7)
        callback(null);
    else {
        dao_juego.getCarta(fila, columna, partida, function(err, carta) {
            callback(carta);
        });
    }
}


module.exports = router_juego;

"use strict";

var mysql = require("mysql");
var _ = require("underscore");
var config = require('./config');


var pool = mysql.createPool({
    host: config.dbHost,
    user: config.dbUser,
    password: config.dbPassword,
    database: config.dbName
});

function getPartidas(nick, callback) {

    getPartidasAbiertasUsuario(nick, function(err, abiertas) {
        if (err) {
            callback(err);
        } else {
            getPartidasActivas(function(err, activas) {
                if (err) {
                    callback(err);
                } else {
                    getPartidasTerminadas(nick, function(err, terminadas) {
                        if (err) {
                            callback(err);
                        } else {
                            callback(null, abiertas, activas, terminadas);
                        }
                    });
                }
            });
        }
    });
};

function getPartidasAbiertasUsuario(nick, callback) {
    if (callback === undefined) callback = function() {};
    pool.getConnection(function(err, conexion) {
        if (err) {
            callback(err);
        } else {
            conexion.query("SELECT *" +
                " from partida p " +
                " JOIN `juega_en` j " +
                " ON p.estado = 'abierta' AND p.id = j.partida " +
                " JOIN `usuarios` u " +
                " ON u.id = j.usuario AND u.nick = ? AND p.creador = ?" +
                " GROUP BY p.nombre" +
                " ORDER BY p.id", [nick, nick],
                function(err, abiertas) {
                    if (err) {
                        conexion.release();
                        callback(err);
                    } else {
                        conexion.release();
                        callback(null, abiertas);
                    }
                });
        }
    });
};

function getPartidasAbiertas(nick, callback) { // usada en unirse_partida
    if (callback === undefined) callback = function() {};
    pool.getConnection(function(err, conexion) {
        if (err) {
            callback(err);
        } else {
            conexion.query("SELECT * FROM `partida` WHERE `estado` = 'abierta' ",
                function(err, abiertas) {
                    if (err) {
                        conexion.release();
                        callback(err);
                    } else {
                        conexion.release();
                        callback(null, abiertas);
                    }
                });
        }
    });

};

function getPartidasActivas(callback) {
    if (callback === undefined) callback = function() {};
    pool.getConnection(function(err, conexion) {
        if (err) {
            callback(err);
        } else {
            conexion.query("SELECT p.id, p.nombre, p.creador, p.fecha, u.nick AS turno FROM `partida` p  " +
                "JOIN `juega_en` j ON p.estado = 'activa' AND j.partida = p.id AND p.contador_del_turno = j.turno  " +
                "JOIN `usuarios` u ON u.id = j.usuario " +
                "GROUP BY p.nombre",
                function(err, activas) {
                    conexion.release();
                    callback(null, activas);
                });
        }
    });
};

function getPartidasTerminadas(nick, callback) {
    if (callback === undefined) callback = function() {};
    var daoUsuario = require("./dao_usuario");
    daoUsuario.getUserByNick(nick, function(err, user) {
        pool.getConnection(function(err, conexion) {
            if (err) {
                callback(err);
            } else {
                conexion.query("SELECT * FROM `partida` WHERE `estado` = 'terminada'",
                    function(err, terminadas) {
                        conexion.release();
                        comprobarSiHaGanadoRecursiva(user.id, terminadas, 0, function(err, terminadas) {
                            if (err)
                                callback(err);
                            else
                                callback(null, terminadas);
                        });
                    });
            }
        });
    });
};


function comprobarSiHaGanadoRecursiva(id_usuario, terminadas, posicion, callback) {
    if (posicion === terminadas.length)
        callback(null, terminadas);
    else {
        pool.getConnection(function(err, conexion) {
            if (err) {
                callback(err);
            } else {
                conexion.query("SELECT ha_ganado FROM juega_en WHERE usuario = ? AND partida = ?", [id_usuario, terminadas[posicion].id],
                    function(err, ha_ganado) {
                        terminadas[posicion].ha_ganado = ha_ganado[0].ha_ganado === "1" ? "Sí" : "No";
                        comprobarSiHaGanadoRecursiva(id_usuario, terminadas, posicion + 1, callback);
                    });
            }
        });
    }
}


function existeNombre(nombre, callback) {

    if (callback === undefined) callback = function() {};
    pool.getConnection(function(err, conexion) {
        if (err) {
            callback(err);
        } else {
            conexion.query("SELECT * " +
                "FROM partida p " +
                "WHERE p.nombre = ?", [nombre],
                function(err, result) {
                    if (err) {
                        conexion.release();
                        callback(err);
                    } else {
                        if (typeof result[0] === "undefined") {
                            conexion.release();
                            callback(null, false);
                        } else {
                            conexion.release();
                            callback(null, true);
                        }
                    }
                });
        }
    });
};

function crearPartida(partida, nick, callback) {
    if (callback === undefined) callback = function() {};
    pool.getConnection(function(err, conexion) {
        if (err) {
            callback(err);
        } else { // se insertan los datos de la partida en la BBDD
            conexion.query("INSERT INTO `partida` (`id`, `nombre`, `numero_maximo_jugadores`, `fecha`,`creador`) " +
                "VALUES (NULL, ?, ?, ?, ?);", [partida.nombre, partida.numero, new Date(), nick],
                function(err, result) {
                    if (err) { // en caso de error
                        conexion.release();
                        callback(err);
                    } else {
                        var daoUsuario = require("./dao_usuario");
                        daoUsuario.getUserByNick(nick, function(err, user) { // conseguimos el id del usuario que acaba de crear la partida
                            if (err) {
                                conexion.release();
                                callback(err);
                            } else {
                                conexion.query("INSERT INTO `juega_en` (`usuario`, `partida`) " +
                                    "VALUES ('?', '?')", [user.id, result.insertId],
                                    function(err, result) {
                                        if (err) {
                                            conexion.release();
                                            callback(err);
                                        } else {
                                            conexion.release();
                                            callback(null);
                                        }
                                    }
                                );
                            }
                        });
                    }
                });
        }
    });
};

function cerrarPartida(id, callback) {
    if (callback === undefined) callback = function() {};
    pool.getConnection(function(err, conexion) {
        if (err) {
            callback(err);
        } else {
            conexion.query("SELECT * FROM `partida` WHERE id = ? AND numero_jugadores >= 3", [id],
                function(err, result) {
                    conexion.release();
                    if (result[0] === undefined) {
                        callback(null, "Hacen falta tres jugadores apuntados para cerrar la partida.");
                    } else {
                        asignarRoles(id, function(err) {
                            if (err) {
                                callback(err);
                            } else {
                                asignarTurnos(id, function(err, numero_jugadores) {
                                    if (err) {
                                        callback(err);
                                    } else {
                                        pool.getConnection(function(err, conexion) {
                                            if (err)
                                                callback(err);
                                            else {
                                                conexion.query("UPDATE `partida` SET `estado` = 'activa', `turnos_restantes` = ?, `contador_del_turno` = 1 WHERE `partida`.`id` = ?", [numeroTurnosTotales(numero_jugadores), id],
                                                    function(err, result) {
                                                        conexion.release();
                                                        if (err) {
                                                            callback(err);
                                                        } else {
                                                            var dao_juego = require("./dao_juego");
                                                            dao_juego.rellenarTableroInicial(id, callback);
                                                        }
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
    });
}

function aumentarJugadoresYTurno(id, callback) {
    pool.getConnection(function(err, conexion) {
        conexion.query("SELECT `numero_jugadores`,`numero_maximo_jugadores`,`contador_del_turno` FROM `partida` WHERE `id` = ?", [id],
            function(err, result) {
                var partida = result[0];
                conexion.query("UPDATE `partida`  " +
                    "SET `numero_jugadores` = ?,`contador_del_turno` = ?  " +
                    "WHERE `id` = ?", [result[0].numero_jugadores + 1, result[0].contador_del_turno + 1, id],
                    function(err, result) {
                        conexion.release();
                        if (partida.numero_jugadores + 1 === partida.numero_maximo_jugadores) {
                            callback(true);
                        } else {
                            callback(false);
                        }
                    });
            });
    });
}

function getTurno(id_partida, callback) {
    if (callback === undefined) callback = function() {};
    pool.getConnection(function(err, conexion) {
        if (err) {
            callback(err);
        } else {
            conexion.query("SELECT `contador_del_turno` FROM `partida` WHERE `id`= ?", [id_partida],
                function(err, result) {
                    if (err) {
                        conexion.release();
                        callback(err);
                    } else {
                        conexion.release();
                        callback(null, result[0].contador_del_turno);
                    }
                });
        }
    });
}

function unirsePartida(id, nick, callback) {
    if (callback === undefined) callback = function() {};
    pool.getConnection(function(err, conexion) {
        if (err) {
            callback(err);
        } else {
            var daoUsuario = require("./dao_usuario");
            daoUsuario.getUserByNick(nick, function(err, user) { // conseguimos el id del usuario que quiere unirse a la partida
                if (err) {
                    conexion.release();
                    callback(err);
                } else {
                    juegaEnPartida(nick, id, function(err, juega) {
                        if (err) {
                            conexion.release();
                            callback(err);
                        } else if (juega) {
                            conexion.release();
                            callback(null, "error", "Ya estás jugando en esta partida.");
                        } else {
                            getTurno(id, function(err, turno) {
                                conexion.query("INSERT INTO `juega_en` (`usuario`, `partida`,`turno`) " +
                                    "VALUES (?, ?, ?)", [user.id, id, turno],
                                    function(err, result) {
                                        if (err) {
                                            conexion.release();
                                            callback(err);
                                        } else {
                                            conexion.release();
                                            aumentarJugadoresYTurno(id, function(numero_maximo_jugadores_alcanzado) {
                                                if (numero_maximo_jugadores_alcanzado) {
                                                    cerrarPartida(id);
                                                }
                                                callback(null);
                                            });
                                        }
                                    });
                            });
                        }
                    });
                }
            });
        }
    });
}

function juegaEnPartida(nick, id_partida, callback) {
    if (callback === undefined) callback = function() {};
    pool.getConnection(function(err, conexion) {
        if (err) {
            callback(err);
        } else {
            var daoUsuario = require("./dao_usuario");
            daoUsuario.getUserByNick(nick, function(err, usuario) { // conseguimos el id del usuario que quiere unirse a la partida
                if (err) {
                    conexion.release();
                    callback(err);
                } else { //buscamos si juega en esa partida
                    conexion.query("select * FROM partida p " +
                        "JOIN juega_en j ON p.id = ? " +
                        "JOIN usuarios u ON u.nick = ? AND u.id = j.usuario and j.partida = p.id " +
                        "GROUP BY p.nombre", [id_partida, nick],
                        function(err, result) {
                            conexion.release();
                            if (err) {
                                callback(err);
                            } else {
                                if (result[0] === undefined) { // No juega
                                    callback(null, false);
                                } else { // ya juega en la partida
                                    callback(null, true);
                                }
                            }
                        });
                }
            });
        }
    });
}


function getJugadores(id_partida, callback) {
    if (callback === undefined) callback = function() {};
    pool.getConnection(function(err, conexion) {
        if (err) {
            callback(err);
        } else {
            conexion.query("SELECT * FROM `juega_en` j, `usuarios` u where j.partida = ? AND j.usuario = u.id GROUP BY usuario", [id_partida],
                function(err, result) {
                    if (err) {
                        conexion.release();
                        callback(err);
                    } else {
                        conexion.release();
                        callback(null, result);
                    }
                });
        }
    });
}

function asignarTurnos(id_partida, callback) {
    if (callback === undefined) callback = function() {};
    getJugadores(id_partida, function(err, jugadores) {
        if (err) {
            callback(err);
        } else {
            var turnos = _.shuffle(_.range(1, jugadores.length + 1));
            asignarTurnosRecursiva(id_partida, jugadores, turnos, 0, function(err) {
                callback(null);
            });
        }
    });
}

function asignarTurnosRecursiva(id_partida, jugadores, turnos, posicion, callback) {
    if (posicion >= jugadores.length)
        callback(null);
    else {
        asignarCartas(id_partida, jugadores[posicion].nick, 0, cartasPorJugador(jugadores.length));
        console.log("he asignado cartas a " + jugadores[posicion].nick)
        pool.getConnection(function(err, conexion) {
            if (err) {
                callback(err);
            } else {
                conexion.query("UPDATE `juega_en` SET `turno` = ? WHERE `juega_en`.`usuario` = ? AND `juega_en`.`partida` = ?", [turnos[posicion], jugadores[posicion].usuario, jugadores[posicion].partida],
                    function(err, result) {
                        conexion.release();
                        if (err)
                            callback(err)
                        else
                            asignarTurnosRecursiva(id_partida, jugadores, turnos, posicion + 1, callback);
                    });
            }
        });
    }
}


function asignarCartas(id_partida, nick, n_carta, maximo_cartas) {
    if (n_carta === maximo_cartas) {
        return;
    } else {
        var dao_juego = require("./dao_juego");
        var carta = dao_juego.cartaAleatoria();
        pool.getConnection(function(err, conexion) {
            if (err) {} else {
                conexion.query("INSERT INTO `turno` (`id`, `partida`, `carta`, `nick`) VALUES (NULL, ?, ?, ?);", [id_partida, carta, nick],
                    function(err, result) {
                        conexion.release();
                        asignarCartas(id_partida, nick, n_carta + 1, maximo_cartas);
                    });
            }
        });
    }
}

function getPartida(id, callback) {
    pool.getConnection(function(err, conexion) {
        if (err) {
            callback(err);
        } else {
            conexion.query("SELECT * FROM partida WHERE id = ?", [id],
                function(err, result) {
                    conexion.release();
                    if (err)
                        callback(err);
                    else if (result.length === 0)
                        callback(null, null);
                    else
                        callback(null, result[0]);

                });
        }
    });
}

function pasarTurno(id_partida, callback) {
    getPartida(id_partida, function(err, partida) {
        if (partida !== null) {
            var contador_del_turno = partida.contador_del_turno,
                turnos_restantes = partida.turnos_restantes;
            contador_del_turno = contador_del_turno === partida.numero_jugadores ? 1 : contador_del_turno + 1;
            turnos_restantes--;
            if (turnos_restantes === 0) { // la partida ya ha terminado, no quedan turnos
                pool.getConnection(function(err, conexion) {
                    if (err) {
                        callback(err);
                    } else {
                        conexion.query("UPDATE `partida` SET `estado` = 'terminada' WHERE `partida`.`id` = ?", [id_partida],
                            function(err, result) {
                                callback(null, "terminada");
                            });
                    }
                });
            } else { // se pasa turno sin más
                pool.getConnection(function(err, conexion) {
                    if (err) {
                        callback(err);
                    } else {
                        conexion.query("UPDATE `partida` SET `contador_del_turno` = ?, `turnos_restantes` = ? WHERE `partida`.`id` = ?", [contador_del_turno, turnos_restantes, id_partida],
                            function(err, result) {
                                callback(null, null);
                            });
                    }
                });
            }
        }
    });
}


function numeroTurnosTotales(numero_jugadores) {
    switch (numero_jugadores) {
        case 3:
            return 50;
            break;
        case 4:
            return 45;
            break;
        case 5:
            return 40;
            break;
        case 6:
            return 40;
            break;
        default:
            return 35;
    }
}

function cartasPorJugador(numero_jugadores) {
    if (numero_jugadores <= 5)
        return 6;
    else
        return 5;
}

function rolesDeLaPartida(numero_jugadores) {
    var saboteador = "saboteador",
        buscador = "buscador";
    switch (numero_jugadores) {
        case 3:
            return _.shuffle([saboteador, buscador, buscador]);
        case 4:
            return _.shuffle([saboteador, buscador, buscador, buscador]);
        case 5:
            return _.shuffle([saboteador, saboteador, buscador, buscador, buscador]);
        case 6:
            return _.shuffle([saboteador, saboteador, buscador, buscador, buscador, buscador]);
        case 7:
            return _.shuffle([saboteador, saboteador, buscador, buscador, buscador, buscador, buscador]);
    }
}

function asignarRoles(id_partida, callback) {
    getJugadores(id_partida, function(err, jugadores) {
        var roles = rolesDeLaPartida(jugadores.length);
        asignarRolesRecursiva(jugadores, 0, roles, function(err) {
            if (err)
                callback(err);
            else
                callback(null);
        })
    });
}

function asignarRolesRecursiva(jugadores, posicion, roles, callback) {
    if (posicion === jugadores.length)
        callback(null);
    else {
        pool.getConnection(function(err, conexion) {
            if (err) {
                callback(err);
            } else {
                conexion.query("UPDATE `juega_en` SET `rol` = ? WHERE `juega_en`.`usuario` = ? AND `juega_en`.`partida` = ?", [roles[posicion], jugadores[posicion].usuario, jugadores[posicion].partida],
                    function(err, result) {
                        asignarRolesRecursiva(jugadores, posicion + 1, roles, callback);
                    });
            }
        });
    }
}

function setGanadores(id_partida, rol, callback) {
    if (rol === "buscador" || rol === "saboteador") {
        pool.getConnection(function(err, conexion) {
            if (err) {
                callback(err);
            } else {
                conexion.query("UPDATE `partida` SET `estado` = 'terminada' WHERE `partida`.`id` = ?", [id_partida],
                    function(err, result) {
                        if (err) {
                            callback(err);
                        } else {
                            conexion.query("UPDATE `juega_en` SET `ha_ganado` = '1' WHERE `partida` = ? AND `rol` = ?", [id_partida, rol],
                                function(err, result) {
                                    conexion.release();
                                    if (err) {
                                        callback(err);
                                    } else {
                                        callback(null);
                                    }
                                });
                        }
                    });
            }
        });
    }

}


function subirComentario(id_partida, nick, comentario, callback) {
    pool.getConnection(function(err, conexion) {
        if (err) {
            callback(err);
        } else {
            conexion.query("INSERT INTO `comentarios` (`id`, `partida`, `nick`, `comentario`, `hora`)" +
                " VALUES (NULL, ?, ?, ?, ?);", [id_partida, nick, comentario, new Date()],
                function(err, result) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(null);
                    }
                });
        }
    });
}

function getComentarios(id_partida, callback) {
    pool.getConnection(function(err, conexion) {
        if (err) {
            callback(err);
        } else {
            conexion.query("SELECT * FROM `comentarios` WHERE partida = ?  ORDER BY hora ASC", 
                [id_partida],
                function(err, result) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(null,result);
                    }
                });
        }
    });
}

module.exports = {
    getPartidas: getPartidas,
    getPartidasAbiertas: getPartidasAbiertas,
    existeNombre: existeNombre,
    crearPartida: crearPartida,
    cerrarPartida: cerrarPartida,
    unirsePartida: unirsePartida,
    getPartida: getPartida,
    getTurno: getTurno,
    pasarTurno: pasarTurno,
    setGanadores: setGanadores,
    subirComentario: subirComentario,
    getComentarios: getComentarios
};

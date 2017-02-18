"use strict";

var mysql = require("mysql");
var config = require('./config');
var dao_partida = require("./dao_partida");
var dao_usuario = require("./dao_usuario");
var _ = require("underscore");

var pool = mysql.createPool({
    host: config.dbHost,
    user: config.dbUser,
    password: config.dbPassword,
    database: config.dbName
});


// function nombre(, callback) {
//     if (callback === undefined) callback = function() {};
//     pool.getConnection(function(err, conexion) {
//         if (err) {
//             callback(err);
//         } else {
//          var query = "",
//              parametros = [];
//             conexion.query(query, parametros,
//                 function(err, result) {
//                     conexion.release();
//                     if (err) {
//                         callback(err);
//                     } else {

//                     }
//                 });
//         }
//     });
// };




function rellenarTableroInicial(id_partida, callback) {
    if (callback === undefined) callback = function() {};
    var premios = _.shuffle([1, 0, 0]); // de tres cartas que hay de llegada, solo una tendrá premio
    rellenarTableroInicialRecursiva(id_partida, 0, 0, premios, 0, callback);
}

function rellenarTableroInicialRecursiva(id_partida, fila, columna, premios, pos_premios, callback) {
    var carta = 1,
        unido_a_salida = '0';

    if (columna === 7) { // pasamos de fila
        columna = 0;
        fila++;
    }
    if (columna === 0 && fila === 3) { // primera columna
        carta = 2; // carta de salida
        unido_a_salida = '1';
    } else if (columna === 6 && fila % 2 !== 0) { // última fila
        if (premios[pos_premios] === 1) // carta de llegada
            carta = 3; // tiene oro
        else
            carta = 4; // no tiene oro
        pos_premios++;
    }
    pool.getConnection(function(err, conexion) {
        if (err) {
            callback(err);
        } else {
            var query = "INSERT INTO tablero (`id`,`partida`,`carta`,`fila`,`columna`,`colocada_por`,`unido_a_salida`) VALUES (null,?,?,?,?,'sistema',?)",
                parametros = [id_partida, carta, fila, columna, unido_a_salida];
            conexion.query(query, parametros,
                function(err, result) {
                    conexion.release();
                    if (err) {
                        callback(err);
                    } else {
                        if (fila === 6 && columna === 6) { // hemos llegado al final
                            callback();
                        } else {
                            columna++;
                            rellenarTableroInicialRecursiva(id_partida, fila, columna, premios, pos_premios, callback);
                        }
                    }
                });
        }
    });
}

function getTablero(id_partida, callback) {
    if (callback === undefined) callback = function() {};
    var tablero = new Array();
    getTableroRecursiva(id_partida, 0, 0, tablero, callback);
}

function getTableroRecursiva(id_partida, fila, columna, tablero, callback) {
    if (columna === 7) {
        columna = 0;
        fila++;
    }
    pool.getConnection(function(err, conexion) {
        if (err) {
            callback(err);
        } else {
            var query = "SELECT * FROM `tablero` t, `carta` c WHERE t.carta = c.id AND t.partida = ? AND t.fila = ? and t.columna = ?",
                parametros = [id_partida, fila, columna];
            conexion.query(query, parametros,
                function(err, result) {
                    conexion.release();
                    if (err) {
                        callback(err);
                    } else {
                        tablero.push(result[0]);
                        if (fila === 6 && columna === 6) { // hemos llegado al final
                            callback(null, tablero);
                        } else {
                            columna++;
                            getTableroRecursiva(id_partida, fila, columna, tablero, callback);
                        }
                    }
                });
        }
    });
}

function getCartas(id_partida, nick_usuario, callback) {
    if (callback === undefined) callback = function() {};
    pool.getConnection(function(err, conexion) {
        if (err) {
            callback(err);
        } else {
            var query = "SELECT c.`id`,c.`ruta` FROM `turno` t, `carta` c WHERE t.`partida`= ? AND c.`id` = t.`carta` AND t.`nick` = ?",
                parametros = [id_partida, nick_usuario];
            conexion.query(query, parametros,
                function(err, result) {
                    conexion.release();
                    if (err) {
                        callback(err);
                    } else {
                        callback(null, result);
                    }
                });
        }
    });
};


function cartaAleatoria() {
    return _.random(7, 21);
}


function getCarta(fila, columna, partida, callback) {
    if (callback === undefined) callback = function() {};
    pool.getConnection(function(err, conexion) {
        if (err) {
            callback(err);
        } else {
            var query = "SELECT * FROM tablero WHERE fila = ? AND columna = ? AND partida = ?",
                parametros = [fila, columna, partida];
            conexion.query(query, parametros,
                function(err, result) {
                    if (err) {
                        callback(err);
                    } else {
                        conexion.release();
                        if (result.length === 0)
                            callback(null, null);
                        else {
                            callback(null, result[0]);
                        }
                    }
                });
        }
    });
};


function setCarta(fila, columna, carta, partida, nick, callback) {
    if (callback === undefined) callback = function() {};
    pool.getConnection(function(err, conexion) {
        if (err) {
            callback(err);
        } else {
            var query = "UPDATE `tablero` SET `carta` = ?, `colocada_por` = ?, unido_a_salida = '1' WHERE `partida` = ? AND `fila` = ? AND `columna` = ?",
                parametros = [carta, nick, partida, fila, columna];
            conexion.query(query, parametros,
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
};

function descubrirCartaConOro(fila, columna, partida, callback) {
    if (callback === undefined) callback = function() {};
    pool.getConnection(function(err, conexion) {
        if (err) {
            callback(err);
        } else {
            var query = "UPDATE `tablero` SET `carta` = 5, unido_a_salida = '1' WHERE `partida` = ? AND `fila` = ? AND `columna` = ?",
                parametros = [partida, fila, columna];
            conexion.query(query, parametros,
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
};

function descubrirCartaSinOro(fila, columna, partida, callback) {
    if (callback === undefined) callback = function() {};
    pool.getConnection(function(err, conexion) {
        if (err) {
            callback(err);
        } else {
            var query = "UPDATE `tablero` SET `carta` = 6, unido_a_salida = '1' WHERE `partida` = ? AND `fila` = ? AND `columna` = ?",
                parametros = [partida, fila, columna];
            conexion.query(query, parametros,
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
};

function reemplazar(nick, id_partida, carta, callback) {
    if (callback === undefined) callback = function() {};
    pool.getConnection(function(err, conexion) {
        if (err) {
            callback(err);
        } else {
            var query = "SELECT * FROM `turno` WHERE partida = ? and nick = ? AND carta = ?",
                parametros = [id_partida, nick, carta];
            conexion.query(query, parametros,
                function(err, result) {
                    if (err) {
                        callback(err);
                    } else {
                        query = "UPDATE `turno` SET `carta` = " + cartaAleatoria() + " WHERE `turno`.`id` = ?";
                        parametros = [result[0].id]
                        conexion.query(query, parametros,
                            function(err, result2) {
                                if (err)
                                    callback(err);
                                else {
                                    callback(null);
                                }
                            });
                    }
                });
        }
    });
}

function getRol(id_partida, nick_usuario, callback) {
    if (callback === undefined) callback = function() {};
    var dao_usuario = require("./dao_usuario");
    dao_usuario.getUserByNick(nick_usuario, function(err, usuario) {
        if (err) {
            callback(err);
        } else {
            pool.getConnection(function(err, conexion) {
                if (err) {
                    callback(err);
                } else {
                    var query = "SELECT rol FROM juega_en WHERE usuario = ? AND partida = ?",
                        parametros = [usuario.id, id_partida];
                    conexion.query(query, parametros,
                        function(err, result) {
                            if (err) {
                                callback(err);
                            } else {
                                callback(null,result[0].rol);
                            }
                        });
                }
            });
        }
    })

}



module.exports = {
    rellenarTableroInicial: rellenarTableroInicial,
    getTablero: getTablero,
    getCartas: getCartas,
    cartaAleatoria: cartaAleatoria,
    getCarta: getCarta,
    setCarta: setCarta,
    reemplazar: reemplazar,
    descubrirCartaConOro: descubrirCartaConOro,
    descubrirCartaSinOro: descubrirCartaSinOro,
    getRol: getRol
};

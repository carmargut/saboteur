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

function getPartidas(nick,callback){

	getPartidasAbiertasUsuario(nick,function(err,abiertas){
		if(err){
			callback(err);
		}
		else{
			getPartidasActivas(function(err,activas){
				if(err){
					callback(err);
				}
				else{
					getPartidasTerminadas(function(err,terminadas){
						if(err){
							callback(err);
						}else{
							callback(null,abiertas,activas,terminadas);
						}
					});
				}
			});
		}
	});
};

function getPartidasAbiertasUsuario(nick,callback){
	if(callback === undefined) callback = function(){};
    pool.getConnection(function(err,conexion) {
    	if(err){
            conexion.release();
    		callback(err);
    	}else{
    		conexion.query("SELECT *" + 
    						" from partida p " + 
    						" JOIN `juega_en` j " + 
    							" ON p.estado = 'abierta' AND p.id = j.partida " + 
    							" JOIN `usuarios` u " + 
    							" ON u.id = j.usuario AND u.nick = ? AND p.creador = ?" + 
    							" GROUP BY p.nombre" + 
                                " ORDER BY p.id",[nick,nick],
			function(err,abiertas){
				if(err){
                    conexion.release();
					callback(err);
				}else{
					conexion.release();
					callback(null,abiertas);
				}
			});
    	}
    });
};

function getPartidasAbiertas(nick,callback){ // usada en unirse_partida
	if(callback === undefined) callback = function(){};
    pool.getConnection(function(err,conexion) {
    	if(err){
            conexion.release();
    		callback(err);
    	}else{
    		conexion.query("SELECT * FROM `partida` WHERE `estado` = 'abierta' " ,
			function(err,abiertas){
				if(err){
                    conexion.release();
					callback(err);
				}else{
					conexion.release();
					callback(null,abiertas);
				}
			});
    	}
    });
    
};
function getPartidasActivas(callback){
	if(callback === undefined) callback = function(){};
    pool.getConnection(function(err,conexion) {
    	if(err){
            conexion.release();
    		callback(err);
    	}else{
    		conexion.query("SELECT p.nombre, p.creador, p.fecha, u.nick AS turno FROM `partida` p  " + 
                            "JOIN `juega_en` j ON p.estado = 'activa' AND j.partida = p.id AND p.contador_del_turno = j.turno  " + 
                            "JOIN `usuarios` u ON u.id = j.usuario  " + 
                            "GROUP BY p.nombre" ,
			function(err,activas){
				conexion.release();
				callback(null,activas);
			});
    	}
    });
};
function getPartidasTerminadas(callback){
	if(callback === undefined) callback = function(){};
    pool.getConnection(function(err,conexion) {
    	if(err){
            conexion.release();
    		callback(err);
    	}else{
    		conexion.query("SELECT * FROM `partida` WHERE `estado` = 'terminada'" ,
			function(err,terminadas){
				conexion.release();
				callback(null,terminadas);
			});
    	}
    });
};

function existeNombre(nombre,callback){

    if(callback === undefined) callback = function(){};
    pool.getConnection(function(err,conexion) {
        if (err) {
            conexion.release();
            callback(err);
        } else {
            conexion.query("SELECT * " +
                           "FROM partida p " +
                           "WHERE p.nombre = ?",
                           [nombre],
            function(err, result) {
                if(err){
                    conexion.release();
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

function crearPartida(partida,nick,callback){
    if(callback === undefined) callback = function(){};
    pool.getConnection(function(err,conexion) {
        if (err) {
            conexion.release();
            callback(err);
        } else { // se insertan los datos de la partida en la BBDD
            conexion.query("INSERT INTO `partida` (`id`, `nombre`, `numero_maximo_jugadores`, `fecha`,`creador`) " + 
                            "VALUES (NULL, ?, ?, ?, ?);",
                           [partida.nombre,partida.numero,new Date(),nick],
            function(err, result) {
                if(err){ // en caso de error
                    conexion.release();
                    callback(err);
                }
                else{
                	var daoUsuario = require("./dao_usuario");
                	daoUsuario.getUserByNick(nick,function(err,user){ // conseguimos el id del usuario que acaba de crear la partida
                		if(err){
                            conexion.release();
                			callback(err);
                		}else{
        					conexion.query("INSERT INTO `juega_en` (`usuario`, `partida`) " + 
        							"VALUES ('?', '?')",
        							[user.id,result.insertId],
        						function(err,result){
        							if(err){
                                        conexion.release();
        								callback(err);
        							}else{
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

function cerrarPartida(id,callback){
	if(callback === undefined) callback = function(){};
    asignarTurnos(id,function(err){
        if(err){
            callback(err);
        }else {
            pool.getConnection(function(err,conexion) {
                if (err) {
                    conexion.release();
                    callback(err);
                } else {
                    conexion.query("SELECT * FROM `partida` WHERE id = ? AND numero_jugadores >= 3",
                                [id],
                    function(err,result){
                        if(result[0] === undefined){
                            conexion.release();
                            callback(null,"No se puede cerrar la partida porque aún falta gente por apuntarse.");
                        }else{
                            conexion.query("UPDATE `partida` SET `estado` = 'activa',`contador_del_turno` = 1 WHERE `partida`.`id` = ?",
                                           [id],
                            function(err, result){
                                if(err){
                                    conexion.release();
                                    callback(err);
                                }else{
                                    conexion.release();
                                    callback();
                                }
                            });
                        }
                    });
                }
            });
        }
    });	
}

function aumentarJugadoresYTurno(id,callback){
    pool.getConnection(function(err,conexion) {
        conexion.query("SELECT `numero_jugadores`,`numero_maximo_jugadores`,`contador_del_turno` FROM `partida` WHERE `id` = ?",
            [id],
        function(err,result){
            var partida = result[0];
            conexion.query("UPDATE `partida`  " + 
                            "SET `numero_jugadores` = ?,`contador_del_turno` = ?  " + 
                            "WHERE `id` = ?",[result[0].numero_jugadores+1,result[0].contador_del_turno+1,id],
            function(err,result){
                conexion.release();
                if(partida.numero_jugadores+1 === partida.numero_maximo_jugadores){
                    callback(true);
                }else{
                    callback(false);
                }
            });
        });
    });
}
function getTurno(id_partida,callback){
    if(callback === undefined) callback = function(){};
    pool.getConnection(function(err,conexion) {
        if (err) {
            conexion.release();
            callback(err);
        }else{
            conexion.query("SELECT `contador_del_turno` FROM `partida` WHERE `id`= ?",[id_partida],
            function(err,result){
                if(err){
                    conexion.release();
                    callback(err);
                }else{
                    conexion.release();
                    callback(null,result[0].contador_del_turno);
                }
            });
        }
    });
}

function unirsePartida(id,nick,callback){
    if(callback === undefined) callback = function(){};
    pool.getConnection(function(err,conexion) {
        if (err) {
            conexion.release();
            callback(err);
        } else {
            var daoUsuario = require("./dao_usuario");
            daoUsuario.getUserByNick(nick,function(err,user){ // conseguimos el id del usuario que quiere unirse a la partida
                if(err){
                    conexion.release();
                    callback(err);
                }else{
                    juegaEnPartida(nick,id,function(err,juega){
                        if(err){
                            conexion.release();
                            callback(err);
                        }else if(juega){
                            conexion.release();
                            callback(null,"error","Ya estás jugando en esta partida.");
                        }else{
                            getTurno(id,function(err,turno){
                                conexion.query("INSERT INTO `juega_en` (`usuario`, `partida`,`turno`) " + 
                                        "VALUES (?, ?, ?)",[user.id,id,turno],
                                function(err,result){
                                    if(err){
                                        conexion.release();
                                        callback(err);
                                    }else{
                                        conexion.release();
                                        aumentarJugadoresYTurno(id,function(numero_maximo_jugadores_alcanzado){
                                            if(numero_maximo_jugadores_alcanzado){
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

function juegaEnPartida(nick,id_partida,callback){
    if(callback === undefined) callback = function(){};
    pool.getConnection(function(err,conexion) {
        if (err) {
            conexion.release();
            callback(err);
        } else {
            var daoUsuario = require("./dao_usuario");
            daoUsuario.getUserByNick(nick,function(err,usuario){ // conseguimos el id del usuario que quiere unirse a la partida
                if(err){
                    conexion.release();
                    callback(err);
                }else{  //buscamos si juega en esa partida
                    conexion.query("select * FROM partida p  " + 
                                    "JOIN juega_en j ON p.id = ? " + 
                                    "JOIN usuarios u ON u.nick = ? AND u.id = j.usuario and j.partida = p.id " + 
                                    "GROUP BY p.nombre",[id_partida,nick],
                    function(err,result){
                        conexion.release();
                        if(err){
                            callback(err);
                        }else{
                            if(result[0] === undefined){// No juega
                                callback(null,false);
                            }else{// ya juega en la partida
                                callback(null,true);
                            }
                        }
                    });
                }
            });
        }
    });
}


function getJugadores(id_partida,callback){
    if(callback === undefined) callback = function(){};
    pool.getConnection(function(err,conexion) {
        if (err) {
            conexion.release();
            callback(err);
        }else{
            conexion.query("SELECT * FROM `juega_en` where partida = ? GROUP BY usuario",[id_partida],
            function(err,result){
                if(err){
                    conexion.release();
                    callback(err);
                }else{
                    conexion.release();
                    callback(null,result);
                }
            });
        }
    });
}

function asignarTurnos(id_partida,callback){
    if(callback === undefined) callback = function(){};
    getJugadores(id_partida,function(err,jugadores){
        if(err){
            callback(err);
        }else{
            var nuevos_turnos = _.shuffle(_.range(1,jugadores.length+1));
            var contador = 1;
            jugadores.forEach(function(item){
                actualizarTurno(item.id,nuevos_turnos[contador-1]);
                contador += 1;
            });
            callback(null);
        }
    });
}

function actualizarTurno(id,nuevo_turno){
    pool.getConnection(function(err,conexion) {
        if (err) {
            conexion.release();
        }else{
            conexion.query("UPDATE `juega_en` SET `turno` = ? WHERE `juega_en`.`id` = ?",[nuevo_turno,id],
            function(err,result){
                conexion.release();
            });
        }
    });
}

module.exports = {
	getPartidas: getPartidas,
	getPartidasAbiertas:getPartidasAbiertas,
	existeNombre: existeNombre,
	crearPartida: crearPartida,
	cerrarPartida: cerrarPartida,
    unirsePartida: unirsePartida
};
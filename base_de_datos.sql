SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;


CREATE TABLE `carta` (
  `id` int(11) NOT NULL,
  `tiene_premio` tinyint(1) DEFAULT NULL,
  `ruta` varchar(30) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

INSERT INTO `carta` (`id`, `tiene_premio`, `ruta`) VALUES
(1, 0, 'RecursosGraficosP1/Vacia.png'),
(2, 0, 'RecursosGraficosP1/Start.png'),
(3, 1, 'RecursosGraficosP1/DNK.png'),
(4, 0, 'RecursosGraficosP1/DNK.png'),
(5, 1, 'RecursosGraficosP1/Gold.png'),
(6, 0, 'RecursosGraficosP1/NoGold.png'),
(7, 0, 'RecursosGraficosP1/T1.png'),
(8, 0, 'RecursosGraficosP1/T2.png'),
(9, 0, 'RecursosGraficosP1/T3.png'),
(10, 0, 'RecursosGraficosP1/T4.png'),
(11, 0, 'RecursosGraficosP1/T5.png'),
(12, 0, 'RecursosGraficosP1/T6.png'),
(13, 0, 'RecursosGraficosP1/T7.png'),
(14, 0, 'RecursosGraficosP1/T8.png'),
(15, 0, 'RecursosGraficosP1/T9.png'),
(16, 0, 'RecursosGraficosP1/T10.png'),
(17, 0, 'RecursosGraficosP1/T11.png'),
(18, 0, 'RecursosGraficosP1/T12.png'),
(19, 0, 'RecursosGraficosP1/T13.png'),
(20, 0, 'RecursosGraficosP1/T14.png'),
(21, 0, 'RecursosGraficosP1/T15.png');

CREATE TABLE `comentarios` (
  `id` int(11) NOT NULL,
  `partida` int(11) NOT NULL,
  `nick` varchar(20) NOT NULL,
  `comentario` varchar(140) NOT NULL,
  `hora` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `juega_en` (
  `id` int(11) NOT NULL,
  `usuario` int(11) NOT NULL,
  `partida` int(11) NOT NULL,
  `turno` int(11) NOT NULL DEFAULT '1',
  `rol` enum('saboteador','buscador','','') DEFAULT NULL,
  `ha_ganado` enum('1','0','','') DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `partida` (
  `id` int(11) NOT NULL,
  `nombre` varchar(20) NOT NULL,
  `numero_maximo_jugadores` int(11) NOT NULL,
  `numero_jugadores` int(11) NOT NULL DEFAULT '1',
  `fecha` date NOT NULL,
  `estado` enum('abierta','activa','terminada','') NOT NULL DEFAULT 'abierta',
  `creador` varchar(20) NOT NULL,
  `contador_del_turno` int(11) NOT NULL DEFAULT '2',
  `turnos_restantes` int(11) NOT NULL DEFAULT '50'
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tablero` (
  `id` int(11) NOT NULL,
  `partida` int(11) NOT NULL,
  `carta` int(11) NOT NULL,
  `fila` int(11) NOT NULL,
  `columna` int(11) NOT NULL,
  `colocada_por` varchar(20) NOT NULL,
  `unido_a_salida` enum('1','0','','') NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `turno` (
  `id` int(11) NOT NULL,
  `partida` int(11) NOT NULL,
  `carta` int(11) NOT NULL,
  `nick` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL,
  `nick` varchar(20) NOT NULL,
  `contrasena` varchar(20) NOT NULL,
  `nombre_completo` varchar(50) NOT NULL,
  `sexo` enum('hombre','mujer') NOT NULL,
  `imagen` blob,
  `fecha_nacimiento` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


ALTER TABLE `carta`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `comentarios`
  ADD PRIMARY KEY (`id`),
  ADD KEY `partida` (`partida`);

ALTER TABLE `juega_en`
  ADD PRIMARY KEY (`id`),
  ADD KEY `usuario` (`usuario`),
  ADD KEY `partidas` (`partida`);

ALTER TABLE `partida`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `tablero`
  ADD PRIMARY KEY (`id`),
  ADD KEY `carta` (`carta`),
  ADD KEY `partida` (`partida`);

ALTER TABLE `turno`
  ADD PRIMARY KEY (`id`),
  ADD KEY `partida` (`partida`),
  ADD KEY `cartas` (`carta`);

ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nick` (`nick`);


ALTER TABLE `carta`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;
ALTER TABLE `comentarios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;
ALTER TABLE `juega_en`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;
ALTER TABLE `partida`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;
ALTER TABLE `tablero`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=442;
ALTER TABLE `turno`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=175;
ALTER TABLE `usuarios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

ALTER TABLE `comentarios`
  ADD CONSTRAINT `comentarios_ibfk_1` FOREIGN KEY (`partida`) REFERENCES `partida` (`id`);

ALTER TABLE `juega_en`
  ADD CONSTRAINT `juega_en_ibfk_1` FOREIGN KEY (`usuario`) REFERENCES `usuarios` (`id`),
  ADD CONSTRAINT `juega_en_ibfk_2` FOREIGN KEY (`partida`) REFERENCES `partida` (`id`);

ALTER TABLE `tablero`
  ADD CONSTRAINT `tablero_ibfk_1` FOREIGN KEY (`partida`) REFERENCES `partida` (`id`),
  ADD CONSTRAINT `tablero_ibfk_2` FOREIGN KEY (`carta`) REFERENCES `carta` (`id`);

ALTER TABLE `turno`
  ADD CONSTRAINT `turno_ibfk_1` FOREIGN KEY (`carta`) REFERENCES `carta` (`id`),
  ADD CONSTRAINT `turno_ibfk_2` FOREIGN KEY (`partida`) REFERENCES `partida` (`id`);

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

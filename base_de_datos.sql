SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;


CREATE TABLE `carta` (
  `id` int(11) NOT NULL,
  `tipo` int(11) NOT NULL,
  `tiene_premio` tinyint(1) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `juega_en` (
  `id` int(11) NOT NULL,
  `usuario` int(11) NOT NULL,
  `partida` int(11) NOT NULL,
  `turno` int(11) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `partida` (
  `id` int(11) NOT NULL,
  `nombre` varchar(20) NOT NULL,
  `numero_maximo_jugadores` int(11) NOT NULL,
  `numero_jugadores` int(11) NOT NULL DEFAULT '1',
  `fecha` date NOT NULL,
  `estado` enum('abierta','activa','terminada','') NOT NULL DEFAULT 'abierta',
  `creador` varchar(20) NOT NULL,
  `ganador` varchar(20) DEFAULT NULL,
  `contador_del_turno` int(11) NOT NULL DEFAULT '2'
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tablero` (
  `id` int(11) NOT NULL,
  `partida` int(11) NOT NULL,
  `carta` int(11) NOT NULL,
  `fila` int(11) NOT NULL,
  `columna` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `turno` (
  `id` int(11) NOT NULL,
  `partida` int(11) NOT NULL,
  `carta` int(11) NOT NULL
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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `juega_en`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;
ALTER TABLE `partida`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;
ALTER TABLE `tablero`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `turno`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `usuarios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;

ALTER TABLE `carta`
  ADD CONSTRAINT `carta_ibfk_1` FOREIGN KEY (`id`) REFERENCES `tablero` (`carta`);

ALTER TABLE `juega_en`
  ADD CONSTRAINT `juega_en_ibfk_1` FOREIGN KEY (`usuario`) REFERENCES `usuarios` (`id`),
  ADD CONSTRAINT `juega_en_ibfk_2` FOREIGN KEY (`partida`) REFERENCES `partida` (`id`);

ALTER TABLE `tablero`
  ADD CONSTRAINT `tablero_ibfk_1` FOREIGN KEY (`partida`) REFERENCES `partida` (`id`);

ALTER TABLE `turno`
  ADD CONSTRAINT `turno_ibfk_1` FOREIGN KEY (`carta`) REFERENCES `carta` (`id`),
  ADD CONSTRAINT `turno_ibfk_2` FOREIGN KEY (`partida`) REFERENCES `juega_en` (`id`);

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

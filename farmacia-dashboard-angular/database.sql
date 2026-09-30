CREATE DATABASE IF NOT EXISTS farmacia_sistema CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE farmacia_sistema;

CREATE TABLE roles (
 id INT AUTO_INCREMENT PRIMARY KEY,
 nombre VARCHAR(60) NOT NULL UNIQUE,
 descripcion VARCHAR(180)
);

CREATE TABLE usuarios (
 id INT AUTO_INCREMENT PRIMARY KEY,
 nombre VARCHAR(120) NOT NULL,
 usuario VARCHAR(60) NOT NULL UNIQUE,
 password VARCHAR(255) NOT NULL,
 rol_id INT NOT NULL,
 activo TINYINT(1) NOT NULL DEFAULT 1,
 creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (rol_id) REFERENCES roles(id)
);

CREATE TABLE categorias (
 id INT AUTO_INCREMENT PRIMARY KEY,
 nombre VARCHAR(100) NOT NULL,
 parent_id INT NULL,
 activo TINYINT(1) NOT NULL DEFAULT 1,
 UNIQUE KEY uq_categoria_parent (nombre,parent_id),
 FOREIGN KEY (parent_id) REFERENCES categorias(id) ON DELETE RESTRICT
);

CREATE TABLE proveedores (
 id INT AUTO_INCREMENT PRIMARY KEY,
 nombre VARCHAR(140) NOT NULL,
 telefono VARCHAR(40),
 email VARCHAR(120),
 direccion VARCHAR(200),
 activo TINYINT(1) DEFAULT 1
);

CREATE TABLE medicamentos (
 id INT AUTO_INCREMENT PRIMARY KEY,
 nombre_comercial VARCHAR(150) NOT NULL,
 principio_activo VARCHAR(150) NOT NULL,
 laboratorio VARCHAR(120),
 categoria_id INT,
 presentacion VARCHAR(120),
 precio DECIMAL(10,2) NOT NULL DEFAULT 0,
 stock_minimo INT NOT NULL DEFAULT 5,
 requiere_receta TINYINT(1) NOT NULL DEFAULT 0,
 sintoma VARCHAR(180),
 accion_terapeutica VARCHAR(180),
 activo TINYINT(1) NOT NULL DEFAULT 1,
 creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(categoria_id) REFERENCES categorias(id) ON DELETE SET NULL,
 INDEX idx_medicamento_busqueda(nombre_comercial,principio_activo,laboratorio),
 INDEX idx_medicamento_sintoma(sintoma),
 INDEX idx_medicamento_accion(accion_terapeutica)
);

CREATE TABLE lotes (
 id INT AUTO_INCREMENT PRIMARY KEY,
 medicamento_id INT NOT NULL,
 proveedor_id INT,
 numero_lote VARCHAR(80) NOT NULL,
 fecha_ingreso DATE NOT NULL,
 fecha_vencimiento DATE NOT NULL,
 cantidad INT NOT NULL DEFAULT 0,
 costo_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
 FOREIGN KEY(medicamento_id) REFERENCES medicamentos(id) ON DELETE CASCADE,
 FOREIGN KEY(proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL,
 INDEX idx_fefo(fecha_vencimiento)
);

CREATE TABLE movimientos_inventario (
 id INT AUTO_INCREMENT PRIMARY KEY,
 lote_id INT NOT NULL,
 tipo ENUM('INGRESO','VENTA','DEVOLUCION') NOT NULL,
 cantidad INT NOT NULL,
 referencia VARCHAR(100),
 creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(lote_id) REFERENCES lotes(id) ON DELETE CASCADE
);

CREATE TABLE alertas (
 id INT AUTO_INCREMENT PRIMARY KEY,
 tipo ENUM('CADUCIDAD','STOCK') NOT NULL,
 medicamento_id INT NULL,
 lote_id INT NULL,
 nivel_dias INT NULL,
 mensaje VARCHAR(255) NOT NULL,
 estado ENUM('PENDIENTE','ATENDIDA') NOT NULL DEFAULT 'PENDIENTE',
 creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 atendida_en TIMESTAMP NULL,
 UNIQUE KEY uq_alerta (tipo, medicamento_id, lote_id, nivel_dias, estado),
 FOREIGN KEY(medicamento_id) REFERENCES medicamentos(id) ON DELETE SET NULL,
 FOREIGN KEY(lote_id) REFERENCES lotes(id) ON DELETE SET NULL,
 INDEX idx_alertas_estado(estado,creado_en)
);

CREATE TABLE ventas (
 id INT AUTO_INCREMENT PRIMARY KEY,
 usuario_id INT NOT NULL,
 total DECIMAL(10,2) NOT NULL DEFAULT 0,
 fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE venta_detalles (
 id INT AUTO_INCREMENT PRIMARY KEY,
 venta_id INT NOT NULL,
 medicamento_id INT NOT NULL,
 lote_id INT NOT NULL,
 cantidad INT NOT NULL,
 precio_unitario DECIMAL(10,2) NOT NULL,
 subtotal DECIMAL(10,2) NOT NULL,
 FOREIGN KEY(venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
 FOREIGN KEY(medicamento_id) REFERENCES medicamentos(id),
 FOREIGN KEY(lote_id) REFERENCES lotes(id)
);

INSERT INTO roles(nombre,descripcion) VALUES
('Administrador/Gerente','Acceso completo y administración'),
('Farmacéutico Regente','Gestión farmacéutica e inventario'),
('Cajero/Dependiente','Consulta de catálogo y ventas POS');

INSERT INTO categorias(nombre,parent_id) VALUES
('Analgésicos',NULL),('Antiinflamatorios',NULL),('Antibióticos',NULL),('Antihistamínicos',NULL),('Respiratorios',NULL),('Gastrointestinales',NULL),('Antidiabéticos',NULL),('Cardiovascular',NULL),('Corticosteroides',NULL),('Dermatológicos',NULL),('Antisépticos',NULL),('Vitaminas y minerales',NULL),('Antivirales',NULL),('Antifúngicos',NULL),('Sistema nervioso',NULL),('Endocrinología',NULL);

INSERT INTO categorias(nombre,parent_id) SELECT 'No opioides',id FROM categorias WHERE nombre='Analgésicos' AND parent_id IS NULL;
INSERT INTO categorias(nombre,parent_id) SELECT 'Penicilinas',id FROM categorias WHERE nombre='Antibióticos' AND parent_id IS NULL;
INSERT INTO categorias(nombre,parent_id) SELECT 'Macrólidos',id FROM categorias WHERE nombre='Antibióticos' AND parent_id IS NULL;
INSERT INTO categorias(nombre,parent_id) SELECT 'Cefalosporinas',id FROM categorias WHERE nombre='Antibióticos' AND parent_id IS NULL;
INSERT INTO categorias(nombre,parent_id) SELECT 'AINE',id FROM categorias WHERE nombre='Antiinflamatorios' AND parent_id IS NULL;
INSERT INTO categorias(nombre,parent_id) SELECT 'Antihipertensivos',id FROM categorias WHERE nombre='Cardiovascular' AND parent_id IS NULL;
INSERT INTO categorias(nombre,parent_id) SELECT 'Hipolipemiantes',id FROM categorias WHERE nombre='Cardiovascular' AND parent_id IS NULL;
INSERT INTO categorias(nombre,parent_id) SELECT 'Antiagregantes',id FROM categorias WHERE nombre='Cardiovascular' AND parent_id IS NULL;
INSERT INTO categorias(nombre,parent_id) SELECT 'Broncodilatadores',id FROM categorias WHERE nombre='Respiratorios' AND parent_id IS NULL;
INSERT INTO categorias(nombre,parent_id) SELECT 'Mucolíticos',id FROM categorias WHERE nombre='Respiratorios' AND parent_id IS NULL;
INSERT INTO categorias(nombre,parent_id) SELECT 'Antiácidos y antisecretores',id FROM categorias WHERE nombre='Gastrointestinales' AND parent_id IS NULL;
INSERT INTO categorias(nombre,parent_id) SELECT 'Antieméticos',id FROM categorias WHERE nombre='Gastrointestinales' AND parent_id IS NULL;
INSERT INTO categorias(nombre,parent_id) SELECT 'Biguanidas',id FROM categorias WHERE nombre='Antidiabéticos' AND parent_id IS NULL;
INSERT INTO categorias(nombre,parent_id) SELECT 'Insulinas',id FROM categorias WHERE nombre='Antidiabéticos' AND parent_id IS NULL;
INSERT INTO categorias(nombre,parent_id) SELECT 'Antifúngicos tópicos',id FROM categorias WHERE nombre='Dermatológicos' AND parent_id IS NULL;
INSERT INTO categorias(nombre,parent_id) SELECT 'Corticoides tópicos',id FROM categorias WHERE nombre='Dermatológicos' AND parent_id IS NULL;
INSERT INTO categorias(nombre,parent_id) SELECT 'Vitaminas',id FROM categorias WHERE nombre='Vitaminas y minerales' AND parent_id IS NULL;
INSERT INTO categorias(nombre,parent_id) SELECT 'Minerales',id FROM categorias WHERE nombre='Vitaminas y minerales' AND parent_id IS NULL;
INSERT INTO categorias(nombre,parent_id) SELECT 'Ansiolíticos',id FROM categorias WHERE nombre='Sistema nervioso' AND parent_id IS NULL;
INSERT INTO categorias(nombre,parent_id) SELECT 'Antidepresivos',id FROM categorias WHERE nombre='Sistema nervioso' AND parent_id IS NULL;
INSERT INTO categorias(nombre,parent_id) SELECT 'Anticonvulsivantes',id FROM categorias WHERE nombre='Sistema nervioso' AND parent_id IS NULL;

INSERT INTO proveedores(nombre,telefono,email,direccion) VALUES
('Distribuidora Farmacéutica Andina','2220000','ventas@andina.test','La Paz'),
('Importadora Salud Bolivia','2231111','contacto@saludbolivia.test','La Paz'),
('Medicamentos Nacionales Demo','2242222','pedidos@mednac.test','Cochabamba'),
('Distribuciones Vida','2253333','ventas@vida.test','Santa Cruz'),
('Proveedor Hospitalario Sur','2264444','contacto@hospitalariosur.test','La Paz'),
('Logística Farma Centro','2275555','pedidos@farmacentro.test','Cochabamba'),
('Suministros Médicos Altiplano','2286666','ventas@altiplano.test','Oruro'),
('Distribuciones Salud Integral','2297777','contacto@saludintegral.test','Sucre'),
('FarmaRed Bolivia','2308888','ventas@farmared.test','La Paz'),
('Distribuidora Médica Nacional','2319999','ventas@dmedica.test','Santa Cruz');

INSERT INTO usuarios(nombre,usuario,password,rol_id) VALUES
('Administrador Demo','admin','$2y$12$JYDrXjH4bIP.LrDGMc/yk.OLHga8XAwFmzey6ZemI/oD9BVVqkd.e',1),
('Farmacéutico Regente','farmaceutico','$2y$12$IIIIUM21GkncOy09SH022.BToXLvIUoAJyYxLLb7jzUxA3/az4T4i',2),
('Cajero Demo','cajero','$2y$12$zmS7JAO1AeWCPYO4Klk82uq/JH/U9vDD1y4JUxlicwrgnQMHOuy1m',3);

INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Paracetamol 500 mg','Paracetamol','Genérico',id,'Tableta x 20',12.5,10,0,'Dolor y fiebre','Analgésico y antipirético' FROM categorias WHERE nombre='Analgésicos' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Ibuprofeno 400 mg','Ibuprofeno','Genérico',id,'Tableta x 20',18.0,8,0,'Dolor e inflamación','Antiinflamatorio y analgésico' FROM categorias WHERE nombre='Antiinflamatorios' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Naproxeno 500 mg','Naproxeno','Genérico',id,'Tableta x 20',22.0,6,0,'Dolor e inflamación','Antiinflamatorio' FROM categorias WHERE nombre='Antiinflamatorios' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Diclofenaco 50 mg','Diclofenaco','Genérico',id,'Tableta x 20',16.5,8,0,'Dolor e inflamación','Antiinflamatorio' FROM categorias WHERE nombre='Antiinflamatorios' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Ácido acetilsalicílico 100 mg','Ácido acetilsalicílico','Genérico',id,'Tableta x 30',9.5,10,1,'Prevención cardiovascular','Antiagregante plaquetario' FROM categorias WHERE nombre='Cardiovascular' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Amoxicilina 500 mg','Amoxicilina','Genérico',id,'Cápsula x 21',32.0,6,1,'Infecciones bacterianas','Antibiótico' FROM categorias WHERE nombre='Antibióticos' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Azitromicina 500 mg','Azitromicina','Genérico',id,'Tableta x 3',28.0,5,1,'Infecciones bacterianas','Antibiótico macrólido' FROM categorias WHERE nombre='Antibióticos' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Cefalexina 500 mg','Cefalexina','Genérico',id,'Cápsula x 20',35.0,5,1,'Infecciones bacterianas','Antibiótico cefalosporínico' FROM categorias WHERE nombre='Antibióticos' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Metronidazol 500 mg','Metronidazol','Genérico',id,'Tableta x 20',20.0,6,1,'Infecciones bacterianas y parasitarias','Antimicrobiano' FROM categorias WHERE nombre='Antibióticos' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Doxiciclina 100 mg','Doxiciclina','Genérico',id,'Cápsula x 10',24.0,5,1,'Infecciones bacterianas','Antibiótico' FROM categorias WHERE nombre='Antibióticos' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Loratadina 10 mg','Loratadina','Genérico',id,'Tableta x 10',10.5,8,0,'Alergias','Antihistamínico' FROM categorias WHERE nombre='Antihistamínicos' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Cetirizina 10 mg','Cetirizina','Genérico',id,'Tableta x 10',11.5,8,0,'Alergias','Antihistamínico' FROM categorias WHERE nombre='Antihistamínicos' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Salbutamol 100 mcg','Salbutamol','Genérico',id,'Inhalador 200 dosis',42.0,5,1,'Broncoespasmo','Broncodilatador' FROM categorias WHERE nombre='Respiratorios' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Budesonida 200 mcg','Budesonida','Genérico',id,'Inhalador',58.0,4,1,'Asma y rinitis','Corticosteroide' FROM categorias WHERE nombre='Respiratorios' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Ambroxol 30 mg','Ambroxol','Genérico',id,'Tableta x 20',15.0,7,0,'Tos con flema','Mucolítico' FROM categorias WHERE nombre='Respiratorios' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Omeprazol 20 mg','Omeprazol','Genérico',id,'Cápsula x 14',14.0,10,0,'Acidez y reflujo','Inhibidor de bomba de protones' FROM categorias WHERE nombre='Gastrointestinales' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Famotidina 20 mg','Famotidina','Genérico',id,'Tableta x 20',16.0,7,0,'Acidez','Antagonista H2' FROM categorias WHERE nombre='Gastrointestinales' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Metoclopramida 10 mg','Metoclopramida','Genérico',id,'Tableta x 20',13.0,5,1,'Náuseas y vómitos','Antiemético' FROM categorias WHERE nombre='Gastrointestinales' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Ondansetrón 8 mg','Ondansetrón','Genérico',id,'Tableta x 10',38.0,4,1,'Náuseas y vómitos','Antiemético' FROM categorias WHERE nombre='Gastrointestinales' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Sales de rehidratación oral','Sales de rehidratación oral','Genérico',id,'Sobre x 10',8.0,12,0,'Deshidratación','Rehidratación oral' FROM categorias WHERE nombre='Gastrointestinales' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Metformina 500 mg','Metformina','Genérico',id,'Tableta x 30',19.0,10,1,'Diabetes tipo 2','Antidiabético' FROM categorias WHERE nombre='Antidiabéticos' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Glibenclamida 5 mg','Glibenclamida','Genérico',id,'Tableta x 30',12.0,6,1,'Diabetes tipo 2','Antidiabético' FROM categorias WHERE nombre='Antidiabéticos' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Insulina humana regular 100 UI/mL','Insulina humana','Genérico',id,'Frasco 10 mL',65.0,4,1,'Diabetes','Insulina' FROM categorias WHERE nombre='Antidiabéticos' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Losartán 50 mg','Losartán','Genérico',id,'Tableta x 30',21.0,10,1,'Hipertensión','Antagonista de receptores de angiotensina II' FROM categorias WHERE nombre='Cardiovascular' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Enalapril 10 mg','Enalapril','Genérico',id,'Tableta x 20',13.5,8,1,'Hipertensión','Inhibidor de la ECA' FROM categorias WHERE nombre='Cardiovascular' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Amlodipino 5 mg','Amlodipino','Genérico',id,'Tableta x 30',18.5,8,1,'Hipertensión','Bloqueador de canales de calcio' FROM categorias WHERE nombre='Cardiovascular' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Hidroclorotiazida 25 mg','Hidroclorotiazida','Genérico',id,'Tableta x 20',10.0,6,1,'Hipertensión','Diurético' FROM categorias WHERE nombre='Cardiovascular' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Atorvastatina 20 mg','Atorvastatina','Genérico',id,'Tableta x 30',27.0,7,1,'Colesterol elevado','Hipolipemiante' FROM categorias WHERE nombre='Cardiovascular' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Furosemida 40 mg','Furosemida','Genérico',id,'Tableta x 20',14.0,5,1,'Edema e hipertensión','Diurético' FROM categorias WHERE nombre='Cardiovascular' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Clopidogrel 75 mg','Clopidogrel','Genérico',id,'Tableta x 30',34.0,5,1,'Prevención cardiovascular','Antiagregante plaquetario' FROM categorias WHERE nombre='Cardiovascular' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Prednisona 20 mg','Prednisona','Genérico',id,'Tableta x 20',17.0,5,1,'Procesos inflamatorios','Corticosteroide' FROM categorias WHERE nombre='Corticosteroides' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Hidrocortisona 1%','Hidrocortisona','Genérico',id,'Crema 15 g',12.0,7,0,'Inflamación cutánea','Corticosteroide tópico' FROM categorias WHERE nombre='Dermatológicos' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Clotrimazol 1%','Clotrimazol','Genérico',id,'Crema 20 g',13.5,8,0,'Infecciones por hongos','Antifúngico tópico' FROM categorias WHERE nombre='Dermatológicos' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Miconazol 2%','Miconazol','Genérico',id,'Crema 20 g',15.0,6,0,'Infecciones por hongos','Antifúngico tópico' FROM categorias WHERE nombre='Dermatológicos' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Permetrina 5%','Permetrina','Genérico',id,'Crema 60 g',22.0,5,0,'Escabiosis','Antiparasitario tópico' FROM categorias WHERE nombre='Dermatológicos' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Povidona yodada 10%','Povidona yodada','Genérico',id,'Solución 120 mL',16.0,8,0,'Limpieza de heridas','Antiséptico' FROM categorias WHERE nombre='Antisépticos' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Clorhexidina 2%','Clorhexidina','Genérico',id,'Solución 120 mL',18.0,8,0,'Antisepsia','Antiséptico' FROM categorias WHERE nombre='Antisépticos' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Alcohol etílico 70%','Etanol','Genérico',id,'Solución 250 mL',10.0,12,0,'Desinfección','Antiséptico' FROM categorias WHERE nombre='Antisépticos' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Sulfato ferroso 300 mg','Sulfato ferroso','Genérico',id,'Tableta x 30',9.0,8,0,'Deficiencia de hierro','Suplemento de hierro' FROM categorias WHERE nombre='Vitaminas y minerales' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Ácido fólico 5 mg','Ácido fólico','Genérico',id,'Tableta x 30',7.5,8,0,'Deficiencia de folato','Suplemento vitamínico' FROM categorias WHERE nombre='Vitaminas y minerales' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Vitamina D3 1000 UI','Colecalciferol','Genérico',id,'Cápsula x 30',18.0,6,0,'Deficiencia de vitamina D','Suplemento vitamínico' FROM categorias WHERE nombre='Vitaminas y minerales' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Vitamina C 500 mg','Ácido ascórbico','Genérico',id,'Tableta x 30',15.0,8,0,'Deficiencia de vitamina C','Suplemento vitamínico' FROM categorias WHERE nombre='Vitaminas y minerales' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Aciclovir 400 mg','Aciclovir','Genérico',id,'Tableta x 25',29.0,5,1,'Infecciones por herpes','Antiviral' FROM categorias WHERE nombre='Antivirales' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Oseltamivir 75 mg','Oseltamivir','Genérico',id,'Cápsula x 10',48.0,4,1,'Influenza','Antiviral' FROM categorias WHERE nombre='Antivirales' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Fluconazol 150 mg','Fluconazol','Genérico',id,'Cápsula x 1',18.0,5,1,'Candidiasis','Antifúngico' FROM categorias WHERE nombre='Antifúngicos' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Nistatina 100000 UI/g','Nistatina','Genérico',id,'Crema 30 g',17.0,5,0,'Infecciones por hongos','Antifúngico' FROM categorias WHERE nombre='Antifúngicos' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Diazepam 5 mg','Diazepam','Genérico',id,'Tableta x 20',20.0,4,1,'Ansiedad y espasmos','Ansiolítico' FROM categorias WHERE nombre='Sistema nervioso' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Amitriptilina 25 mg','Amitriptilina','Genérico',id,'Tableta x 30',22.0,5,1,'Dolor neuropático y depresión','Antidepresivo tricíclico' FROM categorias WHERE nombre='Sistema nervioso' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Carbamazepina 200 mg','Carbamazepina','Genérico',id,'Tableta x 30',25.0,5,1,'Epilepsia','Anticonvulsivante' FROM categorias WHERE nombre='Sistema nervioso' AND parent_id IS NULL;
INSERT INTO medicamentos(nombre_comercial,principio_activo,laboratorio,categoria_id,presentacion,precio,stock_minimo,requiere_receta,sintoma,accion_terapeutica) SELECT 'Levotiroxina 50 mcg','Levotiroxina','Genérico',id,'Tableta x 30',16.0,6,1,'Hipotiroidismo','Hormona tiroidea' FROM categorias WHERE nombre='Endocrinología' AND parent_id IS NULL;

INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,2,'LOT-001-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 46 DAY),21,6.88 FROM medicamentos WHERE nombre_comercial='Paracetamol 500 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,3,'LOT-001-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 181 DAY),13,7.5 FROM medicamentos WHERE nombre_comercial='Paracetamol 500 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,3,'LOT-002-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 47 DAY),22,9.9 FROM medicamentos WHERE nombre_comercial='Ibuprofeno 400 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,4,'LOT-002-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 182 DAY),14,10.8 FROM medicamentos WHERE nombre_comercial='Ibuprofeno 400 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,4,'LOT-003-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 48 DAY),23,12.1 FROM medicamentos WHERE nombre_comercial='Naproxeno 500 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,5,'LOT-003-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 183 DAY),15,13.2 FROM medicamentos WHERE nombre_comercial='Naproxeno 500 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,5,'LOT-004-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 49 DAY),24,9.08 FROM medicamentos WHERE nombre_comercial='Diclofenaco 50 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,6,'LOT-004-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 184 DAY),16,9.9 FROM medicamentos WHERE nombre_comercial='Diclofenaco 50 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,6,'LOT-005-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 50 DAY),25,5.23 FROM medicamentos WHERE nombre_comercial='Ácido acetilsalicílico 100 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,7,'LOT-005-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 185 DAY),17,5.7 FROM medicamentos WHERE nombre_comercial='Ácido acetilsalicílico 100 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,7,'LOT-006-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 51 DAY),26,17.6 FROM medicamentos WHERE nombre_comercial='Amoxicilina 500 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,8,'LOT-006-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 186 DAY),18,19.2 FROM medicamentos WHERE nombre_comercial='Amoxicilina 500 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,8,'LOT-007-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 52 DAY),27,15.4 FROM medicamentos WHERE nombre_comercial='Azitromicina 500 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,9,'LOT-007-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 187 DAY),19,16.8 FROM medicamentos WHERE nombre_comercial='Azitromicina 500 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,9,'LOT-008-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 53 DAY),28,19.25 FROM medicamentos WHERE nombre_comercial='Cefalexina 500 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,10,'LOT-008-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 188 DAY),20,21.0 FROM medicamentos WHERE nombre_comercial='Cefalexina 500 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,10,'LOT-009-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 54 DAY),29,11.0 FROM medicamentos WHERE nombre_comercial='Metronidazol 500 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,1,'LOT-009-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 189 DAY),21,12.0 FROM medicamentos WHERE nombre_comercial='Metronidazol 500 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,1,'LOT-010-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 55 DAY),30,13.2 FROM medicamentos WHERE nombre_comercial='Doxiciclina 100 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,2,'LOT-010-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 190 DAY),22,14.4 FROM medicamentos WHERE nombre_comercial='Doxiciclina 100 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,2,'LOT-011-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 56 DAY),31,5.78 FROM medicamentos WHERE nombre_comercial='Loratadina 10 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,3,'LOT-011-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 191 DAY),23,6.3 FROM medicamentos WHERE nombre_comercial='Loratadina 10 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,3,'LOT-012-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 57 DAY),32,6.33 FROM medicamentos WHERE nombre_comercial='Cetirizina 10 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,4,'LOT-012-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 192 DAY),24,6.9 FROM medicamentos WHERE nombre_comercial='Cetirizina 10 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,4,'LOT-013-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 58 DAY),33,23.1 FROM medicamentos WHERE nombre_comercial='Salbutamol 100 mcg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,5,'LOT-013-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 193 DAY),25,25.2 FROM medicamentos WHERE nombre_comercial='Salbutamol 100 mcg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,5,'LOT-014-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 59 DAY),34,31.9 FROM medicamentos WHERE nombre_comercial='Budesonida 200 mcg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,6,'LOT-014-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 194 DAY),26,34.8 FROM medicamentos WHERE nombre_comercial='Budesonida 200 mcg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,6,'LOT-015-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 60 DAY),35,8.25 FROM medicamentos WHERE nombre_comercial='Ambroxol 30 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,7,'LOT-015-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 195 DAY),12,9.0 FROM medicamentos WHERE nombre_comercial='Ambroxol 30 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,7,'LOT-016-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 61 DAY),36,7.7 FROM medicamentos WHERE nombre_comercial='Omeprazol 20 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,8,'LOT-016-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 196 DAY),13,8.4 FROM medicamentos WHERE nombre_comercial='Omeprazol 20 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,8,'LOT-017-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 62 DAY),37,8.8 FROM medicamentos WHERE nombre_comercial='Famotidina 20 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,9,'LOT-017-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 197 DAY),14,9.6 FROM medicamentos WHERE nombre_comercial='Famotidina 20 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,9,'LOT-018-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 63 DAY),38,7.15 FROM medicamentos WHERE nombre_comercial='Metoclopramida 10 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,10,'LOT-018-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 198 DAY),15,7.8 FROM medicamentos WHERE nombre_comercial='Metoclopramida 10 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,10,'LOT-019-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 64 DAY),39,20.9 FROM medicamentos WHERE nombre_comercial='Ondansetrón 8 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,1,'LOT-019-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 199 DAY),16,22.8 FROM medicamentos WHERE nombre_comercial='Ondansetrón 8 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,1,'LOT-020-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 65 DAY),40,4.4 FROM medicamentos WHERE nombre_comercial='Sales de rehidratación oral';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,2,'LOT-020-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 200 DAY),17,4.8 FROM medicamentos WHERE nombre_comercial='Sales de rehidratación oral';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,2,'LOT-021-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 66 DAY),41,10.45 FROM medicamentos WHERE nombre_comercial='Metformina 500 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,3,'LOT-021-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 201 DAY),18,11.4 FROM medicamentos WHERE nombre_comercial='Metformina 500 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,3,'LOT-022-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 67 DAY),42,6.6 FROM medicamentos WHERE nombre_comercial='Glibenclamida 5 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,4,'LOT-022-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 202 DAY),19,7.2 FROM medicamentos WHERE nombre_comercial='Glibenclamida 5 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,4,'LOT-023-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 68 DAY),43,35.75 FROM medicamentos WHERE nombre_comercial='Insulina humana regular 100 UI/mL';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,5,'LOT-023-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 203 DAY),20,39.0 FROM medicamentos WHERE nombre_comercial='Insulina humana regular 100 UI/mL';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,5,'LOT-024-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 69 DAY),44,11.55 FROM medicamentos WHERE nombre_comercial='Losartán 50 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,6,'LOT-024-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 204 DAY),21,12.6 FROM medicamentos WHERE nombre_comercial='Losartán 50 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,6,'LOT-025-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 70 DAY),20,7.43 FROM medicamentos WHERE nombre_comercial='Enalapril 10 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,7,'LOT-025-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 205 DAY),22,8.1 FROM medicamentos WHERE nombre_comercial='Enalapril 10 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,7,'LOT-026-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 71 DAY),21,10.18 FROM medicamentos WHERE nombre_comercial='Amlodipino 5 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,8,'LOT-026-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 206 DAY),23,11.1 FROM medicamentos WHERE nombre_comercial='Amlodipino 5 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,8,'LOT-027-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 72 DAY),22,5.5 FROM medicamentos WHERE nombre_comercial='Hidroclorotiazida 25 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,9,'LOT-027-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 207 DAY),24,6.0 FROM medicamentos WHERE nombre_comercial='Hidroclorotiazida 25 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,9,'LOT-028-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 73 DAY),23,14.85 FROM medicamentos WHERE nombre_comercial='Atorvastatina 20 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,10,'LOT-028-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 208 DAY),25,16.2 FROM medicamentos WHERE nombre_comercial='Atorvastatina 20 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,10,'LOT-029-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 74 DAY),24,7.7 FROM medicamentos WHERE nombre_comercial='Furosemida 40 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,1,'LOT-029-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 209 DAY),26,8.4 FROM medicamentos WHERE nombre_comercial='Furosemida 40 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,1,'LOT-030-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 75 DAY),25,18.7 FROM medicamentos WHERE nombre_comercial='Clopidogrel 75 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,2,'LOT-030-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 210 DAY),12,20.4 FROM medicamentos WHERE nombre_comercial='Clopidogrel 75 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,2,'LOT-031-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 76 DAY),26,9.35 FROM medicamentos WHERE nombre_comercial='Prednisona 20 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,3,'LOT-031-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 211 DAY),13,10.2 FROM medicamentos WHERE nombre_comercial='Prednisona 20 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,3,'LOT-032-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 77 DAY),27,6.6 FROM medicamentos WHERE nombre_comercial='Hidrocortisona 1%';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,4,'LOT-032-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 212 DAY),14,7.2 FROM medicamentos WHERE nombre_comercial='Hidrocortisona 1%';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,4,'LOT-033-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 78 DAY),28,7.43 FROM medicamentos WHERE nombre_comercial='Clotrimazol 1%';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,5,'LOT-033-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 213 DAY),15,8.1 FROM medicamentos WHERE nombre_comercial='Clotrimazol 1%';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,5,'LOT-034-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 79 DAY),29,8.25 FROM medicamentos WHERE nombre_comercial='Miconazol 2%';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,6,'LOT-034-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 214 DAY),16,9.0 FROM medicamentos WHERE nombre_comercial='Miconazol 2%';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,6,'LOT-035-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 80 DAY),30,12.1 FROM medicamentos WHERE nombre_comercial='Permetrina 5%';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,7,'LOT-035-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 215 DAY),17,13.2 FROM medicamentos WHERE nombre_comercial='Permetrina 5%';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,7,'LOT-036-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 81 DAY),31,8.8 FROM medicamentos WHERE nombre_comercial='Povidona yodada 10%';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,8,'LOT-036-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 216 DAY),18,9.6 FROM medicamentos WHERE nombre_comercial='Povidona yodada 10%';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,8,'LOT-037-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 82 DAY),32,9.9 FROM medicamentos WHERE nombre_comercial='Clorhexidina 2%';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,9,'LOT-037-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 217 DAY),19,10.8 FROM medicamentos WHERE nombre_comercial='Clorhexidina 2%';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,9,'LOT-038-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 83 DAY),33,5.5 FROM medicamentos WHERE nombre_comercial='Alcohol etílico 70%';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,10,'LOT-038-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 218 DAY),20,6.0 FROM medicamentos WHERE nombre_comercial='Alcohol etílico 70%';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,10,'LOT-039-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 84 DAY),34,4.95 FROM medicamentos WHERE nombre_comercial='Sulfato ferroso 300 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,1,'LOT-039-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 219 DAY),21,5.4 FROM medicamentos WHERE nombre_comercial='Sulfato ferroso 300 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,1,'LOT-040-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 85 DAY),35,4.12 FROM medicamentos WHERE nombre_comercial='Ácido fólico 5 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,2,'LOT-040-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 220 DAY),22,4.5 FROM medicamentos WHERE nombre_comercial='Ácido fólico 5 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,2,'LOT-041-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 86 DAY),36,9.9 FROM medicamentos WHERE nombre_comercial='Vitamina D3 1000 UI';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,3,'LOT-041-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 221 DAY),23,10.8 FROM medicamentos WHERE nombre_comercial='Vitamina D3 1000 UI';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,3,'LOT-042-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 87 DAY),37,8.25 FROM medicamentos WHERE nombre_comercial='Vitamina C 500 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,4,'LOT-042-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 222 DAY),24,9.0 FROM medicamentos WHERE nombre_comercial='Vitamina C 500 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,4,'LOT-043-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 88 DAY),38,15.95 FROM medicamentos WHERE nombre_comercial='Aciclovir 400 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,5,'LOT-043-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 223 DAY),25,17.4 FROM medicamentos WHERE nombre_comercial='Aciclovir 400 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,5,'LOT-044-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 89 DAY),39,26.4 FROM medicamentos WHERE nombre_comercial='Oseltamivir 75 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,6,'LOT-044-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 224 DAY),26,28.8 FROM medicamentos WHERE nombre_comercial='Oseltamivir 75 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,6,'LOT-045-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 90 DAY),40,9.9 FROM medicamentos WHERE nombre_comercial='Fluconazol 150 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,7,'LOT-045-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 225 DAY),12,10.8 FROM medicamentos WHERE nombre_comercial='Fluconazol 150 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,7,'LOT-046-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 45 DAY),41,9.35 FROM medicamentos WHERE nombre_comercial='Nistatina 100000 UI/g';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,8,'LOT-046-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 226 DAY),13,10.2 FROM medicamentos WHERE nombre_comercial='Nistatina 100000 UI/g';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,8,'LOT-047-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 46 DAY),42,11.0 FROM medicamentos WHERE nombre_comercial='Diazepam 5 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,9,'LOT-047-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 227 DAY),14,12.0 FROM medicamentos WHERE nombre_comercial='Diazepam 5 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,9,'LOT-048-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 47 DAY),43,12.1 FROM medicamentos WHERE nombre_comercial='Amitriptilina 25 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,10,'LOT-048-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 228 DAY),15,13.2 FROM medicamentos WHERE nombre_comercial='Amitriptilina 25 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,10,'LOT-049-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 48 DAY),44,13.75 FROM medicamentos WHERE nombre_comercial='Carbamazepina 200 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,1,'LOT-049-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 229 DAY),16,15.0 FROM medicamentos WHERE nombre_comercial='Carbamazepina 200 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,1,'LOT-050-A',CURRENT_DATE,DATE_ADD(CURDATE(),INTERVAL 49 DAY),20,8.8 FROM medicamentos WHERE nombre_comercial='Levotiroxina 50 mcg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,2,'LOT-050-B',DATE_SUB(CURDATE(),INTERVAL 20 DAY),DATE_ADD(CURDATE(),INTERVAL 230 DAY),17,9.6 FROM medicamentos WHERE nombre_comercial='Levotiroxina 50 mcg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,1,'TEST-01-EXP',DATE_SUB(CURDATE(),INTERVAL 200 DAY),DATE_SUB(CURDATE(),INTERVAL 5 DAY),2,precio*0.5 FROM medicamentos WHERE nombre_comercial='Paracetamol 500 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,1,'TEST-02-EXP',DATE_SUB(CURDATE(),INTERVAL 200 DAY),DATE_SUB(CURDATE(),INTERVAL 10 DAY),2,precio*0.5 FROM medicamentos WHERE nombre_comercial='Ibuprofeno 400 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,1,'TEST-03-EXP',DATE_SUB(CURDATE(),INTERVAL 200 DAY),DATE_SUB(CURDATE(),INTERVAL 15 DAY),2,precio*0.5 FROM medicamentos WHERE nombre_comercial='Naproxeno 500 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,1,'TEST-04-EXP',DATE_SUB(CURDATE(),INTERVAL 200 DAY),DATE_SUB(CURDATE(),INTERVAL 20 DAY),2,precio*0.5 FROM medicamentos WHERE nombre_comercial='Diclofenaco 50 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,1,'TEST-05-EXP',DATE_SUB(CURDATE(),INTERVAL 200 DAY),DATE_SUB(CURDATE(),INTERVAL 25 DAY),2,precio*0.5 FROM medicamentos WHERE nombre_comercial='Ácido acetilsalicílico 100 mg';
INSERT INTO lotes(medicamento_id,proveedor_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) SELECT id,1,'TEST-06-EXP',DATE_SUB(CURDATE(),INTERVAL 200 DAY),DATE_SUB(CURDATE(),INTERVAL 30 DAY),2,precio*0.5 FROM medicamentos WHERE nombre_comercial='Amoxicilina 500 mg';

-- Registrar los ingresos iniciales en el historial de movimientos.
INSERT INTO movimientos_inventario(lote_id,tipo,cantidad,referencia)
SELECT id,'INGRESO',cantidad,'Carga inicial de demostración' FROM lotes;

-- NOTA: los nombres de medicamentos y principios activos corresponden a medicamentos reales.
-- Precios, existencias, lotes, proveedores y fechas son DATOS DE DEMOSTRACIÓN para pruebas académicas.

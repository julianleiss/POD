/////// GENERAL ///////

let puntos = []; // Array para almacenar los puntos de la esfera
let radio = 400; // Radio de la esfera
let totalPuntos = 3000; // Número total de puntos a generar
let datosGeoJSON, datosInfo; // Variables para almacenar los datos JSON
let colores = ['#C4B54E', '#FF6EF1', '#FF2900', '#364ED0', '#C3CFD8', '#55D75C', '#000000', '#7442C9', '#BA0100', '#148417', '#F2F211', '#520100'];
let tamaños = [0.5, 0.3, 0.7, 0.8, 0.4, 0.2, 0.6, 0.7, 0.5, 0.5, 1.5, 0.5];
let etiquetas = ['C. Conservación', 'B. Bosques', 'D. Desertificación', 'M. Montañas', 'N. Biodiversidad', 'R. Recursos Genéticos', 'F. Caza Furtiva', 'E. Especies Invasoras', 'I. Integración', 'Z. Finanzas', 'G. Gestión Forestal', 'A. Apoyo'];
let estadosColores = colores.map((color, i) => ({ color: color, tamaño: tamaños[i], escala: 1, escalaObjetivo: 1, velocidadInterpolación: 0.02, clave: etiquetas[i].charAt(0), activo: false }));
let metaActual = 0; // Índice de la meta actual
let sonidos = []; // Array para almacenar los objetos de sonido
let angulo = 0; // Ángulo para la rotación de la esfera

function preload() {
  datosGeoJSON = loadJSON('GeoJSON.json');
  datosInfo = loadJSON('info.json');
  for (let i = 1; i <= 12; i++) {
    sonidos.push(loadSound(`audio/Meta${i.toString().padStart(2, '0')}.mp3`));
  }
}

/////// SETUP ///////

function setup() {
  createCanvas(windowWidth, windowHeight);
  document.body.style.backgroundColor = '#E5E5E5';
  extraerCoordenadas(datosGeoJSON);
  generarPuntosInteriores(totalPuntos);

  for (let i = 0; i < puntos.length; i++) {
    let latitud = radians(puntos[i].latitud);
    let longitud = radians(puntos[i].longitud);
    let x = radio * cos(latitud) * cos(longitud);
    let y = radio * cos(latitud) * sin(longitud);
    let z = radio * sin(latitud);
    puntos[i].vector = createVector(x, y, z);
    puntos[i].indiceMeta = floor(random(colores.length));
  }

  crearEstructura();
  crearBotonesColores();
  crearColumnaInfo();
  actualizarColumnaInfo(0);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

/////// DRAW ///////

function draw() {
  clear();
  background('#E5E5E5');

  //  mapamundi en  centro de la pantalla

  let centerX = windowWidth / 2;
  let centerY = windowHeight / 2;
  translate(centerX, centerY);

  for (let v of puntos) {
    let estado = estadosColores[v.indiceMeta];
    estado.escala = lerp(estado.escala, estado.escalaObjetivo, estado.velocidadInterpolación);

    // actualizar la escala de los puntos de forma aleatoria

    if (estado.activo && frameCount % 30 === 0) { // verifica si esta prendido
      estado.escalaObjetivo = random(5, 15);
    }

    // proyectar las coordenadas 3D en el plano 2D utilizando trigonometría
    let x = v.vector.x * cos(angulo) - v.vector.z * sin(angulo);
    let z = v.vector.x * sin(angulo) + v.vector.z * cos(angulo);
    let y = v.vector.y;

    // ajustar el tamaño del punto según la profundidad para dar la idea de una esfera
    let profundidad = map(z, -radio, radio, 1, 0);

    // Dibujar una forma orgánica en lugar de un punto
    let tamañoForma = 5 * estado.tamaño * estado.escala * profundidad;
    dibujarFormaOrganica(x, y, tamañoForma, estado.color);
  }

  angulo += 0.01; // Rotación lenta
}

function dibujarFormaOrganica(x, y, tamaño, color) {
  push();
  translate(x, y);
  fill(color);
  noStroke();
  beginShape();
  let ruidoEscala = 0.1; // Escala del ruido
  for (let ang = 0; ang < TWO_PI; ang += 0.1) {
    let r = tamaño + map(noise(cos(ang) * ruidoEscala, sin(ang) * ruidoEscala), 0, 1, -tamaño * 0.5, tamaño * 0.5);
    let sx = r * cos(ang);
    let sy = r * sin(ang);
    vertex(sx, sy);
  }
  endShape(CLOSE);
  pop();
}

/////// MAPAMUNDI ///////

// fragmento de código tomado de nodalscapes.wordpress.com
// conecta la información de geoJSON.json
// datos importantes: longitud, latitud y coordenadas

function extraerCoordenadas(datosGeoJSON) { 
  let features = datosGeoJSON.geometries;
  for (let feature of features) {
    if (feature.type === 'Polygon' || feature.type === 'MultiPolygon') {
      let coords = feature.coordinates;
      if (feature.type === 'Polygon') coords = [coords];
      for (let polygon of coords) {
        for (let coord of polygon[0]) {
          let longitud = coord[0];
          let latitud = coord[1];
          puntos.push({ latitud, longitud });
        }
      }
    }
  }
}

// se dibujan los puntos de forma aleatoria en las latitudes 

function generarPuntosInteriores(totalPuntos) {
  let limites = calcularLimites(puntos);
  while (puntos.length < totalPuntos) {
    let latitud = random(limites.minLatitud, limites.maxLatitud);
    let longitud = random(limites.minLongitud, limites.maxLongitud);
    if (esPuntoEnPoligono(latitud, longitud, puntos)) puntos.push({ latitud, longitud });
  }
}

// se pregunta por los limites de las coordenadas

function calcularLimites(puntos) {
  let minLatitud = 90, maxLatitud = -90, minLongitud = 180, maxLongitud = -180;
  for (let p of puntos) {
    if (p.latitud < minLatitud) minLatitud = p.latitud;
    if (p.latitud > maxLatitud) maxLatitud = p.latitud;
    if (p.longitud < minLongitud) minLongitud = p.longitud;
    if (p.longitud > maxLongitud) maxLongitud = p.longitud;
  }
  return { minLatitud, maxLatitud, minLongitud, maxLongitud };
}

// el punto esta dentro de un poligono? (algún pais) -> entonces dibuja

function esPuntoEnPoligono(latitud, longitud, poligono) {
  let dentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    let xi = poligono[i].longitud, yi = poligono[i].latitud;
    let xj = poligono[j].longitud, yj = poligono[j].latitud;
    let intersect = ((yi > latitud) != (yj > latitud)) && (longitud < (xj - xi) * (latitud - yi) / (yj - yi) + xi);
    if (intersect) dentro = !dentro;
  }
  return dentro;
}

/////// INTERFAZ – FUNCIONES ///////

// body – elementos de la interfaz globales

function crearEstructura() {
  const contenedorMetas = createDiv().id('contenedor-metas').parent(document.body);
  contenedorMetas.style('position', 'absolute');
  contenedorMetas.style('left', '0');
  contenedorMetas.style('top', '0');
  contenedorMetas.style('width', '25%');
  contenedorMetas.style('height', '100%');
  contenedorMetas.style('padding', '40px'); 
  contenedorMetas.style('font-family', 'Courier New, monospace');
  contenedorMetas.style('font-size', '14px');
  contenedorMetas.style('display', 'flex'); // la mejor manera de generar una columna
  contenedorMetas.style('flex-direction', 'column');
  contenedorMetas.style('justify-content', 'center'); // Centrar el bloque de metas verticalmente
  contenedorMetas.style('box-sizing', 'border-box'); // Asegura que el padding no se sume al ancho

  // header
  const textoSuperior = createDiv('UTDT | LED | POD | 2024').parent(document.body);
  textoSuperior.style('position', 'absolute');
  textoSuperior.style('top', '20px');
  textoSuperior.style('left', '50%');
  textoSuperior.style('transform', 'translateX(-50%)');
  textoSuperior.style('font-weight', 'bold');
  textoSuperior.style('font-family', 'Courier New, monospace');
  textoSuperior.style('font-size', '16px');
  textoSuperior.style('color', '#520100');
  
  // footer
  const textoInferior = createDiv('JULIAN LEISS & PABLO LAKATOS').parent(document.body);
  textoInferior.style('position', 'absolute');
  textoInferior.style('bottom', '20px');
  textoInferior.style('left', '50%');
  textoInferior.style('transform', 'translateX(-50%)');
  textoInferior.style('font-weight', 'bold');
  textoInferior.style('font-family', 'Courier New, monospace');
  textoInferior.style('font-size', '16px');
  textoInferior.style('color', '#520100');

  // contenedor del mapamundi
  const contenedorMapamundi = createDiv().id('contenedor-mapamundi').parent(document.body);
  contenedorMapamundi.style('position', 'absolute');
  contenedorMapamundi.style('top', '0');
  contenedorMapamundi.style('left', '25%');
  contenedorMapamundi.style('width', '50%');
  contenedorMapamundi.style('height', '100%');
  contenedorMapamundi.style('display', 'flex');
  contenedorMapamundi.style('justify-content', 'center');
  contenedorMapamundi.style('align-items', 'center');
  contenedorMapamundi.style('overflow', 'hidden'); // Evita desbordamiento

  // contenedor del panel de info    
  const contenedorInfo = createDiv().id('contenedor-info').parent(document.body);
  contenedorInfo.style('position', 'absolute');
  contenedorInfo.style('top', '0');
  contenedorInfo.style('right', '0');
  contenedorInfo.style('width', '25%');
  contenedorInfo.style('height', '100%');
  contenedorInfo.style('padding', '20px');
  contenedorInfo.style('font-family', 'Courier New, monospace');
  contenedorInfo.style('font-size', '14px');
  contenedorInfo.style('color', '#520100');
  contenedorInfo.style('display', 'flex');
  contenedorInfo.style('flex-direction', 'column');
  contenedorInfo.style('justify-content', 'center');
  contenedorInfo.style('box-sizing', 'border-box'); // Asegura que el padding no se sume al ancho
}

// botones de metas
function crearBotonesColores() {
  const contenedorListaMetas = select('#contenedor-metas'); // trae el contenedor de las metas
  const tituloMetas = createDiv('M E T A S').parent(contenedorListaMetas); // estilo del titulo
  tituloMetas.style('font-weight', 'bold');
  tituloMetas.style('margin-bottom', '24px');
  tituloMetas.style('letter-spacing', '2px'); 
  tituloMetas.style('text-align', 'left');

  estadosColores.forEach((estado, indice) => {
    const boton = createDiv().parent(contenedorListaMetas); // estilo de los nombres
    boton.style('margin-bottom', '10px');
    boton.style('display', 'flex');
    boton.style('align-items', 'left');
    boton.style('justify-content', 'left');

    const circuloColor = createDiv().parent(boton); // circulos de colores de los nombres
    circuloColor.style('width', '12px');
    circuloColor.style('height', '12px');
    circuloColor.style('background-color', estado.color); // usa alguno de los colores declarados
    circuloColor.style('border-radius', '50%'); // para hacer que sea ciruclar
    circuloColor.style('display', 'inline-block');
    circuloColor.style('margin-right', '10px');

    const etiqueta = createSpan(`(${estado.clave}) ${etiquetas[indice].split('. ')[1]}`).parent(boton); // los tres elementos juntos
    etiqueta.style('font-family', 'Courier New, monospace');
    etiqueta.style('font-size', '16px');
    etiqueta.style('color', '#520100');
    etiqueta.style('display', 'inline-block');

    boton.mousePressed(() => { //  funcionalidad: checkea y asigna que color, que info y que sonido dependiendo la letra
      alternarColor(indice);
      actualizarColumnaInfo(indice + 1);
      alternarSonido(indice);
    });
  });
}

// contenedor de la info
function crearColumnaInfo() {
  const contenedorInfo = select('#contenedor-info');

  const imagenInfo = createImg('', 'imagen-info').parent(contenedorInfo).id('imagen-info'); // llamamos la imagen del JSON
  imagenInfo.style('width', '90%');
  imagenInfo.style('height', 'auto');
  imagenInfo.style('margin-bottom', '32px');
  imagenInfo.style('margin-right', '40px');

  const etiquetaInfo = createDiv('').parent(contenedorInfo).id('etiqueta-info'); // llamamos la etiqueta del JSON
  etiquetaInfo.style('font-size', '14px');
  etiquetaInfo.style('font-weight', 'bold');
  etiquetaInfo.style('margin-bottom', '20px');
  etiquetaInfo.style('margin-right', '40px');

  const tituloInfo = createDiv('').parent(contenedorInfo).id('titulo-info'); // llamamos el titulo del JSON
  tituloInfo.style('font-size', '24px');
  tituloInfo.style('font-weight', 'bold');
  tituloInfo.style('margin-bottom', '10px');
  tituloInfo.style('font-family', 'Georgia, serif');
  tituloInfo.style('letter-spacing', '2px');
  tituloInfo.style('margin-right', '40px');

  const descripcionInfo = createDiv('').parent(contenedorInfo).id('descripcion-info'); // llamamos la descripción del JSON
  descripcionInfo.style('font-family', 'Georgia, serif');
  descripcionInfo.style('font-size', '16px');
  descripcionInfo.style('line-height', '1.5');
  descripcionInfo.style('text-align', 'left');
  descripcionInfo.style('margin-right', '40px');
}

// actualizar la columna de info
function actualizarColumnaInfo(indice) {
  const info = indice === 0 ? datosInfo.general : datosInfo.metas[indice - 1];

  // verifica si los datos existen en el JSON antes de asignarlos
  if (info) {
    select('#imagen-info').attribute('src', info.image);
    select('#titulo-info').html(info.title);
    select('#descripcion-info').html(info.description);
    select('#etiqueta-info').html(info.etiqueta);
  } else {
    console.error('Datos no encontrados para el índice:', indice);
  }
}

/////// FUNCIONALIDADES ///////

// varía la escala de color
function alternarColor(indice) {
  let estado = estadosColores[indice];
  estado.escalaObjetivo = 5;
  estado.activo = true;
}

// verifica las teclas del teclado para disparar colores y sonidos
function keyPressed() {
  const indiceTecla = etiquetas.findIndex(etiqueta => etiqueta.charAt(0) === key.toUpperCase());
  if (indiceTecla !== -1) {
    alternarColor(indiceTecla);
    actualizarColumnaInfo(indiceTecla + 1);
    alternarSonido(indiceTecla); // alternar sonido cuando se presiona la tecla
  }
}

// sonido
function alternarSonido(indice) {
  if (sonidos[indice].isPlaying()) {
    sonidos[indice].stop();
  } else {
    sonidos[indice].play();
  }
}

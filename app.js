'use strict';

/* ==========================================================================
   1. DATOS
   ========================================================================== */
const WORD = 'WATTPAD'.split('');

const BOOKS_DATA = [
  { id: 0, cover: 'portadas/1', letter: 'W', title: 'Ecos del Alma', genre: 'Romance', color: 0xE11D48, totalPages: 3, revealPage: 2 },
  { id: 1, cover: 'portadas/2', letter: 'A', title: 'Runic Horizon', genre: 'Fantasía', color: 0x7C3AED, totalPages: 3, revealPage: 2 },
  { id: 2, cover: 'portadas/3', letter: 'T', title: 'Reloj de Arena', genre: 'Misterio', color: 0xD97706, totalPages: 4, revealPage: 3 },
  { id: 3, cover: 'portadas/4', letter: 'T', title: 'Nebula 09', genre: 'Sci-Fi', color: 0x0284C7, totalPages: 3, revealPage: 2 },
  { id: 4, cover: 'portadas/5', letter: 'P', title: 'La Cima Perdida', genre: 'Aventura', color: 0x059669, totalPages: 3, revealPage: 2 },
  { id: 5, cover: 'portadas/6', letter: 'A', title: 'El Gran Guion', genre: 'Drama', color: 0xEA580C, totalPages: 3, revealPage: 2 },
  { id: 6, cover: 'portadas/7', letter: 'D', title: 'Tinta & Verso', genre: 'Poesía', color: 0x0D9488, totalPages: 3, revealPage: 2 }
];

const SNIPPETS = [
  'Cada historia empieza con una sola palabra.',
  'Sigue leyendo: algo se esconde entre las líneas.',
  'Pasa la página, la letra está cerca.'
];

/* ==========================================================================
   TEXTOS CENTRALIZADOS DE LAS PÁGINAS (FÁCIL EDICIÓN)
   --------------------------------------------------------------------------
   Edita aquí los textos de cada libro y página:
   - leftPage:
       • chapter: Encabezado superior (por ej. 'Romance · Capítulo I')
       • title: Título en la página izquierda
       • lines: Arreglo de renglones del cuerpo de la página izquierda
   - rightPages:
       • [númeroDePágina]:
           - heading: Subtítulo ('Sigue leyendo')
           - text: Texto o arreglo de renglones para la página derecha
       (Nota: La página que coincide con 'revealPage' contiene la interacción/letra)
   ========================================================================== */
const DEFAULT_LEFT_PAGE_LINES = [
  'Las palabras escritas guardan el eco',
  'de mil voces que buscan conectar.',
  'Cada capítulo es una puerta abierta',
  'hacia una nueva perspectiva.',
  '',
  'Navega entre páginas para hallar',
  'la letra escondida en esta voz.'
];

const BOOK_TEXTS = {
  // Libro 0: 'W' · Romance
  0: {
    leftPage: {
      chapter: 'Romance · Capítulo I',
      title: ['La hipótesis del ',
        'amor',],
      lines: [
        'Olive Smith, una doctoranda que',
        'no cree en el amor duradero,',
        'finge tener una relación con Adam Carlsen,',
        'un profesor brillante pero de carácter difícil,',
        'para ayudar a su mejor amiga.',
        'Pero lo que comienza como un acuerdo, pronto se complica',
        'con citas inesperadas y una conexión que ninguno de ellos esperaba.'
      ]
    },
    rightPages: {
      1: {
        heading: 'Sigue leyendo',
        text: 'Cada historia empieza con una sola palabra.'
      },
      // Página 2: Revelación de la letra 'W' (Interacción: La hipótesis del amor / Une dos puntos)
      3: {
        heading: 'Sigue leyendo',
        text: 'Pasa la página, la letra está cerca.'
      }
    }
  },

  // Libro 1: 'A' · Fantasía
  1: {
    leftPage: {
      chapter: 'Fantasía · Capítulo I',
      title: 'El principe cruel',
      lines: [
        'Jude, una humana criada en la peligrosa',
        'Corte Feérica tras el asesinato de sus padres,',
        'desea demostrar que merece',
        'pertenecer a ese mundo.',
        '',
        'Cuando el príncipe cruel Cardan',
        'es nombrado heredero al trono,',
        'Jude se ve envuelta en una red',
        'de intrigas palaciegas y traiciones',
        'donde su ingenio y valentía serán',
        'su única defensa.'
      ]
    },
    rightPages: {
      1: {
        heading: 'Sigue leyendo',
        text: 'Cada historia empieza con una sola palabra.'
      },
      // Página 2: Revelación de la letra 'A' (Interacción: El príncipe cruel / Elige un sello)
      3: {
        heading: 'Sigue leyendo',
        text: 'Pasa la página, la letra está cerca.'
      }
    }
  },

  // Libro 2: 'T' · Misterio (4 páginas en total)
  2: {
    leftPage: {
      chapter: 'Misterio · Capítulo I',
      title: 'Damián',
      lines: [
        'Padme lleva una vida aparentemente normal',
        'en Asfil, pero siempre ha sentido',
        'curiosidad por su misterioso vecino.',
        'Damián. Cuando él desaparece y regresa meses',
        'después, Padme decide seguirlo y descubre',
        'los oscuros secretos que tanto él',
        'como el pueblo han intentado ocultar.',
      ]
    },
    rightPages: {
      1: {
        heading: 'Sigue leyendo',
        text: 'Cada historia empieza con una sola palabra.'
      },
      2: {
        heading: 'Sigue leyendo',
        text: 'Sigue leyendo: algo se esconde entre las líneas.'
      },
      // Página 3: Revelación de la letra 'T' (Interacción: Damián / Sombra)
      4: {
        heading: 'Sigue leyendo',
        text: 'Pasa la página, la letra está cerca.'
      }
    }
  },

  // Libro 3: 'T' · Sci-Fi
  3: {
    leftPage: {
      chapter: 'Sci-Fi · Capítulo I',
      title: ['La teoría de', 'Kim'],
      lines: [
        'Las palabras escritas guardan el eco',
        'de mil voces que buscan conectar.',
        'Cada capítulo es una puerta abierta',
        'hacia una nueva perspectiva.',
        '',
        'Navega entre páginas para hallar',
        'la letra escondida en esta voz.'
      ]
    },
    rightPages: {
      1: {
        heading: 'Sigue leyendo',
        text: 'Cada historia empieza con una sola palabra.'
      },
      // Página 2: Revelación de la letra 'T' (Interacción: La teoría de Kim / Línea de tiempo)
      3: {
        heading: 'Sigue leyendo',
        text: 'Pasa la página, la letra está cerca.'
      }
    }
  },

  // Libro 4: 'P' · Aventura
  4: {
    leftPage: {
      chapter: 'Aventura · Capítulo I',
      title: 'La Cima Perdida',
      lines: [
        'Las palabras escritas guardan el eco',
        'de mil voces que buscan conectar.',
        'Cada capítulo es una puerta abierta',
        'hacia una nueva perspectiva.',
        '',
        'Navega entre páginas para hallar',
        'la letra escondida en esta voz.'
      ]
    },
    rightPages: {
      1: {
        heading: 'Sigue leyendo',
        text: 'Cada historia empieza con una sola palabra.'
      },
      // Página 2: Revelación de la letra 'P' (Interacción: A oscuras / Halo de luz)
      3: {
        heading: 'Sigue leyendo',
        text: 'Pasa la página, la letra está cerca.'
      }
    }
  },

  // Libro 5: 'A' · Drama
  5: {
    leftPage: {
      chapter: 'Drama · Capítulo I',
      title: 'El Gran Guion',
      lines: [
        'Las palabras escritas guardan el eco',
        'de mil voces que buscan conectar.',
        'Cada capítulo es una puerta abierta',
        'hacia una nueva perspectiva.',
        '',
        'Navega entre páginas para hallar',
        'la letra escondida en esta voz.'
      ]
    },
    rightPages: {
      1: {
        heading: 'Sigue leyendo',
        text: 'Cada historia empieza con una sola palabra.'
      },
      // Página 2: Revelación de la letra 'A' (Interacción: Culpa mía / Tacómetro)
      3: {
        heading: 'Sigue leyendo',
        text: 'Pasa la página, la letra está cerca.'
      }
    }
  },

  // Libro 6: 'D' · Poesía
  6: {
    leftPage: {
      chapter: 'Poesía · Capítulo I',
      title: 'Tinta & Verso',
      lines: [
        'Las palabras escritas guardan el eco',
        'de mil voces que buscan conectar.',
        'Cada capítulo es una puerta abierta',
        'hacia una nueva perspectiva.',
        '',
        'Navega entre páginas para hallar',
        'la letra escondida en esta voz.'
      ]
    },
    rightPages: {
      1: {
        heading: 'Sigue leyendo',
        text: 'Cada historia empieza con una sola palabra.'
      },
      // Página 2: Revelación de la letra 'D' (Interacción: Fabricante de lágrimas / Lágrima)
      3: {
        heading: 'Sigue leyendo',
        text: 'Pasa la página, la letra está cerca.'
      }
    }
  }
};

const BW = 0.85, BH = 1.25, BT = 0.22;   // ancho, alto y grosor del libro
const PW = 512, PH = 712;                // tamaño de las texturas de página
const SERIF = 'Fraunces, Georgia, serif';
const SANS = 'Figtree, system-ui, sans-serif';

const CAM_DEFAULT = { x: 0, y: 3.4, z: 9 };
const ROW_D = 6, ROW_TILT = -0.28;        // fila superior: distancia a la cámara e inclinación
let rowLayout = { s: 0.4, slotW: 0.8 };
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (id) => document.getElementById(id);

/* ==========================================================================
   2. ESTADO
   ========================================================================== */
let scene, camera, renderer, raycaster, rowGroup, readerTarget = null;
const mouse = new THREE.Vector2();
const lookAt = new THREE.Vector3();
const booksGroup = [];
let hoveredBook = null;
let activeBookIndex = null;
let activeBookPage = 1;

const state = {
  discoveredLetters: new Array(7).fill(false),
  isReaderOpen: false,
  isAnimating: false
};

/* ==========================================================================
   3. TEXTURAS (canvas)
   ========================================================================== */
function makeCanvas() {
  const c = document.createElement('canvas');
  c.width = PW;
  c.height = PH;
  return c;
}

function coverTexture(d) {
  const c = makeCanvas(), x = c.getContext('2d');
  x.fillStyle = '#' + d.color.toString(16).padStart(6, '0');
  x.fillRect(0, 0, PW, PH);

  const g = x.createLinearGradient(0, 0, PW, PH);
  g.addColorStop(0, 'rgba(255,255,255,.18)');
  g.addColorStop(1, 'rgba(0,0,0,.30)');
  x.fillStyle = g;
  x.fillRect(0, 0, PW, PH);

  x.fillStyle = 'rgba(0,0,0,.22)';           // surco de la tapa
  x.fillRect(0, 0, 34, PH);
  x.strokeStyle = 'rgba(255,255,255,.4)';
  x.lineWidth = 3;
  x.strokeRect(64, 36, PW - 100, PH - 72);

  const cx = PW / 2 + 14;
  x.textAlign = 'center';
  x.fillStyle = 'rgba(255,255,255,.85)';
  x.font = `500 26px ${SANS}`;
  x.fillText(d.genre, cx, 112);

  x.fillStyle = '#fff';
  x.font = `800 58px ${SERIF}`;
  const words = d.title.split(' ');
  const top = PH / 2 - (words.length - 1) * 34;
  words.forEach((w, i) => x.fillText(w, cx, top + i * 68));

  x.fillStyle = 'rgba(255,255,255,.8)';
  x.font = `italic 400 24px ${SERIF}`;
  x.fillText('Wattpad', cx, PH - 76);

  return new THREE.CanvasTexture(c);
}

/* Portada desde la carpeta "portadas/": prueba jpg, png, webp y jpeg.
   Se recorta tipo "cover" para que no se deforme. Si no hay imagen, se queda la portada generada. */
function loadCover(d, mat) {
  const exts = ['jpg', 'png', 'webp', 'jpeg'];
  const tryExt = (i) => {
    if (i >= exts.length) return;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = PW * 2; c.height = PH * 2;
      const x = c.getContext('2d');
      const k = Math.max(c.width / img.width, c.height / img.height);
      const w = img.width * k, h = img.height * k;
      x.drawImage(img, (c.width - w) / 2, (c.height - h) / 2, w, h);
      const tex = new THREE.CanvasTexture(c);
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      mat.map = tex;
      mat.needsUpdate = true;
    };
    img.onerror = () => tryExt(i + 1);
    img.src = `${d.cover}.${exts[i]}`;
  };
  if (d.cover) tryExt(0);
}

/* Fondo de papel con sombra suave en el lomo. gutter: 'left' | 'right' */
function paintPaper(ctx, gutter) {
  ctx.fillStyle = '#fbf6ec';
  ctx.fillRect(0, 0, PW, PH);
  const x0 = gutter === 'left' ? 0 : PW, x1 = gutter === 'left' ? 90 : PW - 90;
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, 'rgba(110,70,30,.16)');
  g.addColorStop(1, 'rgba(110,70,30,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, PW, PH);
  ctx.strokeStyle = '#e6dccb';
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, PW - 48, PH - 48);
}

function paintLeftPage(ctx, data) {
  paintPaper(ctx, 'right');             // se verá por detrás, así que el lomo queda a la derecha del canvas
  const bookText = BOOK_TEXTS[data.id]?.leftPage;
  const chapterText = bookText?.chapter ?? `${data.genre} · Capítulo I`;
  const titleText = bookText?.title ?? data.title;
  const lines = bookText?.lines ?? DEFAULT_LEFT_PAGE_LINES;

  ctx.textAlign = 'left';
  ctx.fillStyle = '#b4540a';
  ctx.font = `italic 400 22px ${SERIF}`;
  ctx.fillText(chapterText, 60, 100);
  ctx.fillStyle = '#1e1a24';
  ctx.font = `800 44px ${SERIF}`;
  ctx.fillText(titleText, 60, 160);
  ctx.fillStyle = '#ff6600';
  ctx.fillRect(60, 188, 56, 4);
  ctx.fillStyle = '#4a4352';
  ctx.font = `400 21px ${SERIF}`;
  lines.forEach((l, i) => ctx.fillText(l, 60, 250 + i * 34));
}

function createPageMesh(data, side) {
  const canvas = makeCanvas(), ctx = canvas.getContext('2d');

  if (side === 'LEFT') paintLeftPage(ctx, data);
  else paintPaper(ctx, 'left');

  const texture = new THREE.CanvasTexture(canvas);
  if (side === 'LEFT') {                 // corrige el espejo al verla desde atrás
    texture.wrapS = THREE.RepeatWrapping;
    texture.repeat.x = -1;
  }
  const std = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9, side: THREE.DoubleSide });
  const flat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });   // iluminación constante en la fila superior
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(BW - 0.04, BH - 0.04), std);
  mesh.userData = { ctx, texture, std, flat };
  return mesh;
}

/* Letra grande y centrada; mismo tamaño para las 7 (calculado con la W, la más ancha) */
function drawBigLetter(ctx, letter) {
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff6600';
  ctx.font = `900 100px ${SERIF}`;
  const size = 100 * (PW * 0.74) / ctx.measureText('W').width;
  ctx.font = `900 ${size}px ${SERIF}`;
  const cap = ctx.measureText('H').actualBoundingBoxAscent;
  const m = ctx.measureText(letter);
  ctx.fillText(letter, PW / 2 + (m.actualBoundingBoxLeft - m.actualBoundingBoxRight) / 2, PH / 2 + cap / 2);
}

function updateRightPageTexture(bookPivot, pageNum) {
  const { rightPageMesh, leftPageMesh, data } = bookPivot.userData;
  const { ctx, texture } = rightPageMesh.userData;

  paintPaper(ctx, 'left');
  ctx.textAlign = 'center';

  if (pageNum === data.revealPage) {
    if (!Interactions.has(bookPivot)) drawBigLetter(ctx, data.letter);   // con interacción, es ella quien revela la letra
    paintPaper(leftPageMesh.userData.ctx, 'right');   // la página izquierda queda en blanco
    leftPageMesh.userData.texture.needsUpdate = true;
  } else {
    paintLeftPage(leftPageMesh.userData.ctx, data);   // al volver desde la página especial se recupera el texto
    leftPageMesh.userData.texture.needsUpdate = true;

    const pageText = BOOK_TEXTS[data.id]?.rightPages?.[pageNum];
    const heading = pageText?.heading ?? 'Sigue leyendo';
    const bodyContent = pageText?.text ?? SNIPPETS[(pageNum - 1) % SNIPPETS.length];

    ctx.textAlign = 'left';
    ctx.fillStyle = '#1e1a24';
    ctx.font = `600 30px ${SERIF}`;
    ctx.fillText(heading, 60, 120);
    ctx.fillStyle = '#4a4352';
    ctx.font = `400 21px ${SERIF}`;
    if (Array.isArray(bodyContent)) {
      bodyContent.forEach((l, i) => ctx.fillText(l, 60, 180 + i * 32));
    } else {
      ctx.fillText(bodyContent, 60, 180);
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = '#9a90a6';
    ctx.font = `500 18px ${SANS}`;
    ctx.fillText(`${pageNum} / ${data.totalPages}`, PW / 2, PH - 50);
  }
  texture.needsUpdate = true;
}

/* ==========================================================================
   4. ESCENA 3D
   ========================================================================== */
function initThreeScene() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(CAM_DEFAULT.x, CAM_DEFAULT.y, CAM_DEFAULT.z);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  $('stage').appendChild(renderer.domElement);

  // Luz de lámpara cálida desde arriba + relleno frío desde atrás
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd6cdc6, 0.75));
  const lamp = new THREE.SpotLight(0xfff1e0, 1.5, 0, 0.62, 0.85);
  lamp.position.set(0, 9, 4);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(2048, 2048);
  lamp.shadow.bias = -0.0002;
  scene.add(lamp);
  const rim = new THREE.DirectionalLight(0xdfe6ff, 0.25);
  rim.position.set(-6, 4, -6);
  scene.add(rim);

  rowGroup = new THREE.Group();          // fila superior: hija de la cámara, siempre arriba en pantalla
  camera.add(rowGroup);
  scene.add(camera);
  createFloor();
  createBooks();
  layoutRow();

  raycaster = new THREE.Raycaster();

  addEventListener('resize', onResize);
  addEventListener('pointermove', onPointerMove);
  addEventListener('click', onPointerClick);
  addEventListener('keydown', onKeyDown);

  animateLoop();
}

function createFloor() {
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.16 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.826;
  floor.receiveShadow = true;
  scene.add(floor);
}

function createBooks() {
  BOOKS_DATA.forEach((data, index) => {
    const pivot = new THREE.Group();

    const color = new THREE.MeshStandardMaterial({ color: data.color, roughness: 0.4 });
    const paper = new THREE.MeshStandardMaterial({ color: 0xfbf6ec, roughness: 0.8 });
    const front = new THREE.MeshStandardMaterial({ map: coverTexture(data), roughness: 0.4 });
    loadCover(data, front);

    // [derecha, izquierda (lomo), arriba, abajo, frente, atrás]
    const bookMesh = new THREE.Mesh(new THREE.BoxGeometry(BW, BH, BT), [paper, color, paper, paper, front, color]);
    bookMesh.castShadow = bookMesh.receiveShadow = true;
    pivot.add(bookMesh);

    // Libro abierto: tapa izquierda, página derecha y base, todos articulados en el lomo
    const hinge = new THREE.Vector3(-BW / 2, 0, BT / 2);

    const leftCoverPivot = new THREE.Group();
    leftCoverPivot.position.copy(hinge);
    const leftPageMesh = createPageMesh(data, 'LEFT');
    leftPageMesh.position.x = BW / 2;
    leftCoverPivot.add(leftPageMesh);

    const rightPagePivot = new THREE.Group();
    rightPagePivot.position.copy(hinge);
    const rightPageMesh = createPageMesh(data, 'RIGHT');
    rightPageMesh.position.x = BW / 2;
    rightPagePivot.add(rightPageMesh);

    const boardMat = new THREE.MeshStandardMaterial({ color: data.color, roughness: 0.4 });
    const board = new THREE.Mesh(new THREE.BoxGeometry(BW * 2 + 0.14, BH + 0.12, 0.03), boardMat);
    board.position.set(0, 0, BT / 2 - 0.03);
    board.position.x = -BW / 2;

    [leftCoverPivot, rightPagePivot, board].forEach((o) => { o.visible = false; pivot.add(o); });

    const x = (index - 3) * 1.25;
    const rotY = (Math.random() - 0.5) * 0.15;
    pivot.position.set(x, -0.2, 0);
    pivot.rotation.y = rotY;

    pivot.userData = {
      index, data, bookMesh, leftCoverPivot, rightPagePivot, leftPageMesh, rightPageMesh, board, boardMat, done: false, settled: false,
      home: { x, y: -0.2, z: 0, rotX: 0, rotY },
      base: { x, y: -0.2, z: 0, rotX: 0, rotY }
    };
    scene.add(pivot);
    booksGroup.push(pivot);
  });
}

/* ==========================================================================
   5. APERTURA, CIERRE Y PÁGINAS
   ========================================================================== */
function readerDistance() {
  const aspect = innerWidth / innerHeight;
  return Math.max(3, (BW * 2.3 / aspect) / (2 * Math.tan(THREE.MathUtils.degToRad(22.5))));
}

function openBook(index) {
  if (state.isAnimating || state.isReaderOpen) return;
  state.isAnimating = state.isReaderOpen = true;
  activeBookIndex = index;
  activeBookPage = 1;
  resetHover();
  readerTarget = new THREE.Vector3(booksGroup[index].position.x - BW / 2, 0.1, 1.2);

  const book = booksGroup[index];
  const { bookMesh, leftCoverPivot, rightPagePivot, board } = book.userData;
  document.body.classList.add('reading');

  gsap.to(camera.position, { x: book.position.x - BW / 2, y: 0.2, z: 1.2 + readerDistance(), duration: 1.2, ease: 'power3.inOut' });
  gsap.to(book.position, { y: 0.1, z: 1.2, duration: 1.2, ease: 'power3.inOut' });
  gsap.to(book.rotation, {
    x: 0, y: 0, z: 0, duration: 1.2, ease: 'power3.inOut',
    onComplete: () => {
      bookMesh.visible = false;
      [leftCoverPivot, rightPagePivot, board].forEach((o) => { o.visible = true; });
      leftCoverPivot.rotation.y = 0;
      rightPagePivot.rotation.y = 0;
      gsap.to(leftCoverPivot.rotation, { y: -Math.PI + 0.1, duration: 1.0, ease: 'power2.out' });
      updateRightPageTexture(book, 1);
      updateReaderNavButtons();
      state.isAnimating = false;
    }
  });
}

function closeBookReader() {
  if (state.isAnimating || !state.isReaderOpen) return;
  state.isAnimating = true;
  Interactions.stop();                   // sin animaciones ni eventos colgando

  const book = booksGroup[activeBookIndex];
  const { bookMesh, leftCoverPivot, rightPagePivot, board, base } = book.userData;
  document.body.classList.remove('reading');

  gsap.to(leftCoverPivot.rotation, {
    y: 0, duration: 0.6, ease: 'power2.in',
    onComplete: () => {
      [leftCoverPivot, rightPagePivot, board].forEach((o) => { o.visible = false; });
      bookMesh.visible = true;
      readerTarget = null;

      gsap.to(camera.position, { ...CAM_DEFAULT, duration: 1.0, ease: 'power3.inOut' });
      gsap.to(book.position, { x: base.x, y: base.y, z: base.z, duration: 1.0, ease: 'power3.inOut' });
      gsap.to(book.rotation, {
        x: base.rotX, y: base.rotY, duration: 1.0, ease: 'power3.inOut',
        onComplete: () => {
          state.isReaderOpen = state.isAnimating = false;
          activeBookIndex = null;
        }
      });
    }
  });
}

function nextBookPage() {
  if (state.isAnimating || activeBookIndex === null || Interactions.isActive()) return;
  const book = booksGroup[activeBookIndex];
  if (activeBookPage >= book.userData.data.totalPages) return;

  state.isAnimating = true;
  const { rightPagePivot } = book.userData;
  gsap.to(rightPagePivot.rotation, {
    y: -Math.PI + 0.1, duration: 0.6, ease: 'power2.inOut',
    onComplete: () => {
      activeBookPage++;
      updateRightPageTexture(book, activeBookPage);
      rightPagePivot.rotation.y = 0;
      if (activeBookPage === book.userData.data.revealPage) {
        if (Interactions.start(book)) {      // la letra se revela al completar la interacción del libro
          updateReaderNavButtons();
          state.isAnimating = false;
          return;
        }
        return revealLetter(book);   // sigue bloqueado
      }
      updateReaderNavButtons();
      state.isAnimating = false;
    }
  });
}

/* Muestra solo la letra y luego el libro abierto sube a su lugar en la fila superior */
function revealLetter(book) {
  document.body.classList.remove('reading');
  gsap.delayedCall(1.4, () => flyToRow(book));
}

function flyToRow(book) {
  const u = book.userData, i = u.index, d = 1.3, ease = 'power3.inOut';
  setFlat(book, true);
  rowGroup.attach(book);                 // pasa al espacio de la cámara conservando su posición en pantalla
  readerTarget = null;
  gsap.to(book.position, { x: rowX(i), y: 0, z: 0, duration: d, ease });
  gsap.to(book.rotation, { x: ROW_TILT, y: 0, z: 0, duration: d, ease });
  gsap.to(book.scale, { x: rowLayout.s, y: rowLayout.s, z: rowLayout.s, duration: d, ease });
  gsap.to(camera.position, {
    ...CAM_DEFAULT, duration: d, ease,
    onComplete: () => {
      u.done = u.settled = true;
      state.discoveredLetters[i] = true;
      state.isReaderOpen = state.isAnimating = false;
      activeBookIndex = null;
      if (state.discoveredLetters.every(Boolean)) setTimeout(showFinale, 900);
    }
  });
}

function setFlat(book, flat) {
  const u = book.userData;
  [u.leftPageMesh, u.rightPageMesh].forEach((m) => { m.material = flat ? m.userData.flat : m.userData.std; });
  u.boardMat.emissive.setHex(flat ? u.data.color : 0x000000);
  u.boardMat.emissiveIntensity = 0.35;
}

/* Fila superior: 7 huecos en orden W-A-T-T-P-A-D, se adapta al tamaño de pantalla */
function layoutRow() {
  const aspect = innerWidth / innerHeight;
  const narrow = aspect < 0.9 || innerWidth < 640;
  const visH = 2 * ROW_D * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const rowW = Math.min(visH * aspect * (narrow ? 0.94 : 0.56), 6.4);
  const slotW = rowW / 7, s = (slotW * 0.96) / (BW * 2 + 0.14);
  const topUnits = 26 * (visH / innerHeight);
  rowLayout = { s, slotW };
  rowGroup.position.set(0, visH / 2 - topUnits - ((BH + 0.12) * s) / 2, -ROW_D);
  booksGroup.forEach((b) => {
    if (!b.userData.settled) return;
    b.position.set(rowX(b.userData.index), 0, 0);
    b.scale.setScalar(s);
  });
}
function rowX(i) { return (i - 3) * rowLayout.slotW + (BW / 2) * rowLayout.s; }

function prevBookPage() {
  if (state.isAnimating || activeBookIndex === null || activeBookPage <= 1) return;

  Interactions.stop();                   // salir de la página especial cancela su interacción
  state.isAnimating = true;
  const book = booksGroup[activeBookIndex];
  const { rightPagePivot } = book.userData;
  rightPagePivot.rotation.y = -Math.PI + 0.1;
  activeBookPage--;
  updateRightPageTexture(book, activeBookPage);

  gsap.to(rightPagePivot.rotation, {
    y: 0, duration: 0.6, ease: 'power2.inOut',
    onComplete: () => {
      updateReaderNavButtons();
      state.isAnimating = false;
    }
  });
}

function updateReaderNavButtons() {
  const { data } = booksGroup[activeBookIndex].userData;
  $('btn-prev').disabled = activeBookPage === 1;
  $('btn-next').disabled = activeBookPage === data.totalPages || Interactions.isActive();
}

/* ==========================================================================
   6. PUNTERO Y TECLADO
   ========================================================================== */
function pick(e) {
  mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(mouse, camera);
  const hit = raycaster.intersectObjects(booksGroup.filter((b) => !b.userData.done).map((b) => b.userData.bookMesh))[0];
  return hit ? hit.object.parent : null;
}

function onPointerMove(e) {
  mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  if (state.isReaderOpen) return;

  const hit = pick(e);
  if (!hit) return resetHover();
  if (hit === hoveredBook) return;

  resetHover();
  hoveredBook = hit;
  document.body.style.cursor = 'pointer';
  gsap.to(hit.position, { y: hit.userData.base.y + 0.35, z: hit.userData.base.z + 0.3, duration: 0.3 });
  gsap.to(hit.rotation, { x: -0.1, duration: 0.3 });
}

function resetHover() {
  if (!hoveredBook) return;
  const { base } = hoveredBook.userData;
  document.body.style.cursor = 'default';
  gsap.to(hoveredBook.position, { y: base.y, z: base.z, duration: 0.3 });
  gsap.to(hoveredBook.rotation, { x: base.rotX, duration: 0.3 });
  hoveredBook = null;
}

function onPointerClick(e) {
  if (state.isReaderOpen || state.isAnimating) return;
  const hit = hoveredBook || pick(e);
  if (hit) openBook(hit.userData.index);
}

function onKeyDown(e) {
  if (!state.isReaderOpen) return;
  if (e.key === 'ArrowRight') nextBookPage();
  if (e.key === 'ArrowLeft') prevBookPage();
  if (e.key === 'Escape') closeBookReader();
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  layoutRow();
}

/* ==========================================================================
   7. FINAL
   ========================================================================== */
/* Gran final: las letras salen de los libros, se juntan y aparece el eslogan */
function showFinale() {
  const fin = $('finale'), btn = $('btn-reset'), slogan = fin.querySelector('.slogan');
  const letters = [...fin.querySelectorAll('.word span')];
  fin.classList.add('show');

  const visH = 2 * ROW_D * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const pageH = ((BH - 0.04) * rowLayout.s / visH) * innerHeight;
  const mats = booksGroup.flatMap((b) => [b.userData.leftPageMesh.userData.flat, b.userData.rightPageMesh.userData.flat, b.userData.boardMat]);
  mats.forEach((m) => { m.transparent = true; });

  const tl = gsap.timeline();
  letters.forEach((el, i) => {
    const v = booksGroup[i].getWorldPosition(new THREE.Vector3()).project(camera);   // centro de la página con la letra
    const r = el.getBoundingClientRect(), fs = parseFloat(getComputedStyle(el).fontSize);
    tl.fromTo(el,
      { x: ((v.x + 1) / 2) * innerWidth - (r.left + r.width / 2), y: ((1 - v.y) / 2) * innerHeight - (r.top + r.height / 2), scale: (pageH * 0.5) / (fs * 0.7), opacity: 1 },
      { x: 0, y: 0, scale: 1, duration: 1.7, ease: 'power3.inOut' }, 0.6 + i * 0.05);
  });
  tl.to(mats, { opacity: 0, duration: 0.7, onComplete: () => { rowGroup.visible = false; } }, 0.3);
  tl.to(letters, { scale: 1.06, duration: 0.25, yoyo: true, repeat: 1, ease: 'power2.inOut' }, '>-0.1');
  tl.fromTo(slogan, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 1 }, '>-0.1');
  tl.to(btn, { opacity: 1, pointerEvents: 'auto', duration: 0.6 }, '+=0.8');
}

function resetExperience() {
  Interactions.stop();
  state.discoveredLetters.fill(false);
  const fin = $('finale');
  fin.classList.remove('show');
  gsap.set([...fin.querySelectorAll('.word span'), fin.querySelector('.slogan'), $('btn-reset')], { clearProps: 'all' });
  rowGroup.visible = true;

  booksGroup.forEach((book) => {
    const u = book.userData, { home } = u;
    [u.leftPageMesh.userData.flat, u.rightPageMesh.userData.flat, u.boardMat].forEach((m) => { m.opacity = 1; m.transparent = false; });
    if (book.parent !== scene) scene.attach(book);   // baja de la fila superior sin saltos
    u.done = u.settled = false;
    setFlat(book, false);
    [u.leftCoverPivot, u.rightPagePivot, u.board].forEach((o) => { o.visible = false; });
    u.leftCoverPivot.rotation.y = u.rightPagePivot.rotation.y = 0;
    u.bookMesh.visible = true;
    paintLeftPage(u.leftPageMesh.userData.ctx, u.data);
    u.leftPageMesh.userData.texture.needsUpdate = true;
    gsap.to(book.position, { x: home.x, y: home.y, z: home.z, duration: 1.5, ease: 'power3.inOut' });
    gsap.to(book.rotation, { x: 0, y: home.rotY, z: 0, duration: 1.5, ease: 'power3.inOut' });
    gsap.to(book.scale, { x: 1, y: 1, z: 1, duration: 1.5, ease: 'power3.inOut' });
  });
  gsap.to(camera.position, { ...CAM_DEFAULT, duration: 1.5, ease: 'power3.inOut' });
}

/* ==========================================================================
   8. BUCLE DE RENDER
   ========================================================================== */
const lookTarget = new THREE.Vector3();

function animateLoop() {
  requestAnimationFrame(animateLoop);
  const t = performance.now() * 0.001;

  // La cámara mira al libro abierto, o al centro con un leve paralaje del puntero
  if (readerTarget) {
    lookTarget.copy(readerTarget);
  } else {
    lookTarget.set(reduceMotion ? 0 : mouse.x * 0.5, reduceMotion ? 0 : mouse.y * 0.2 - 0.2, 0);
  }
  lookAt.lerp(lookTarget, 0.08);
  camera.lookAt(lookAt);

  // Flotación suave en el mesh (no interfiere con las animaciones del grupo)
  if (!reduceMotion) {
    booksGroup.forEach((b, i) => { b.userData.bookMesh.position.y = Math.sin(t + i) * 0.02; });
  }

  renderer.render(scene, camera);
}

/* ==========================================================================
   9. ARRANQUE
   ========================================================================== */
async function start() {
  // Las texturas de canvas necesitan las tipografías ya cargadas
  try {
    await Promise.all([
      document.fonts.load(`800 40px Fraunces`), document.fonts.load(`italic 400 24px Fraunces`),
      document.fonts.load(`900 40px Fraunces`), document.fonts.load(`500 20px Figtree`)
    ]);
  } catch (_) { /* se usan las tipografías de respaldo */ }

  initThreeScene();

  $('btn-prev').addEventListener('click', prevBookPage);
  $('btn-next').addEventListener('click', nextBookPage);
  $('btn-close').addEventListener('click', closeBookReader);
  $('btn-reset').addEventListener('click', resetExperience);
}

start();
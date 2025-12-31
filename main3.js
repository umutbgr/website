/*
 * Ayarlar (Settings)
 */
let settings = {
  particles: {
    length:   600,   // Maksimum partikül sayısı (biraz artırıldı)
    duration:  2,    // Saniye cinsinden ömür
    velocity: 100,   // Hız (pixel/sn)
    effect:  -0.75,  // İvme etkisi
    size:      30,   // Partikül boyutu
  },
};

/*
 * RequestAnimationFrame Polyfill
 */
(function () {
  let b = 0;
  let c = ["ms", "moz", "webkit", "o"];
  for (let a = 0; a < c.length && !window.requestAnimationFrame; ++a) {
    window.requestAnimationFrame = window[c[a] + "RequestAnimationFrame"];
    window.cancelAnimationFrame = window[c[a] + "CancelAnimationFrame"] || window[c[a] + "CancelRequestAnimationFrame"];
  }
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function (h, e) {
      let d = new Date().getTime();
      let f = Math.max(0, 16 - (d - b));
      let g = window.setTimeout(function () { h(d + f); }, f);
      b = d + f;
      return g;
    };
  }
  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = function (d) { clearTimeout(d); };
  }
})();

/*
 * Point Sınıfı
 */
let Point = (function () {
  function Point(x, y) {
    this.x = (typeof x !== "undefined") ? x : 0;
    this.y = (typeof y !== "undefined") ? y : 0;
  }
  Point.prototype.clone = function () { return new Point(this.x, this.y); };
  Point.prototype.length = function (length) {
    if (typeof length == "undefined") return Math.sqrt(this.x * this.x + this.y * this.y);
    this.normalize();
    this.x *= length;
    this.y *= length;
    return this;
  };
  Point.prototype.normalize = function () {
    var length = this.length();
    this.x /= length;
    this.y /= length;
    return this;
  };
  return Point;
})();

/*
 * Particle Sınıfı
 */
let Particle = (function () {
  function Particle() {
    this.position = new Point();
    this.velocity = new Point();
    this.acceleration = new Point();
    this.age = 0;
  }
  Particle.prototype.initialize = function (x, y, dx, dy) {
    this.position.x = x;
    this.position.y = y;
    this.velocity.x = dx;
    this.velocity.y = dy;
    this.acceleration.x = dx * settings.particles.effect;
    this.acceleration.y = dy * settings.particles.effect;
    this.age = 0;
  };
  Particle.prototype.update = function (deltaTime) {
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;
    this.velocity.x += this.acceleration.x * deltaTime;
    this.velocity.y += this.acceleration.y * deltaTime;
    this.age += deltaTime;
  };
  Particle.prototype.draw = function (context, image) {
    function ease(t) { return (--t) * t * t + 1; }
    let size = image.width * ease(this.age / settings.particles.duration);
    context.globalAlpha = 1 - this.age / settings.particles.duration;
    context.drawImage(image, this.position.x - size / 2, this.position.y - size / 2, size, size);
  };
  return Particle;
})();

/*
 * ParticlePool Sınıfı
 */
let ParticlePool = (function () {
  let particles, firstActive = 0, firstFree = 0, duration = settings.particles.duration;

  function ParticlePool(length) {
    particles = new Array(length);
    for (let i = 0; i < particles.length; i++) particles[i] = new Particle();
  }
  ParticlePool.prototype.add = function (x, y, dx, dy) {
    particles[firstFree].initialize(x, y, dx, dy);
    firstFree++;
    if (firstFree == particles.length) firstFree = 0;
    if (firstActive == firstFree) firstActive++;
    if (firstActive == particles.length) firstActive = 0;
  };
  ParticlePool.prototype.update = function (deltaTime) {
    let i;
    if (firstActive < firstFree) {
      for (i = firstActive; i < firstFree; i++) particles[i].update(deltaTime);
    }
    if (firstFree < firstActive) {
      for (i = firstActive; i < particles.length; i++) particles[i].update(deltaTime);
      for (i = 0; i < firstFree; i++) particles[i].update(deltaTime);
    }
    while (particles[firstActive].age >= duration && firstActive != firstFree) {
      firstActive++;
      if (firstActive == particles.length) firstActive = 0;
    }
  };
  ParticlePool.prototype.draw = function (context, image) {
    let i;
    if (firstActive < firstFree) {
      for (i = firstActive; i < firstFree; i++) particles[i].draw(context, image);
    }
    if (firstFree < firstActive) {
      for (i = firstActive; i < particles.length; i++) particles[i].draw(context, image);
      for (i = 0; i < firstFree; i++) particles[i].draw(context, image);
    }
  };
  return ParticlePool;
})();

/*
 * Uygulama Başlangıcı
 */
(function (canvas) {
  let context = canvas.getContext("2d"),
    particles = new ParticlePool(settings.particles.length),
    particleRate = settings.particles.length / settings.particles.duration,
    time;

  /* --- GÜNCELLEME: Kalp biraz küçültüldü --- */
    function pointOnHeart(t) {
    return new Point(
        300 * Math.pow(Math.sin(t), 3), // 130'dan 180'e (Genişlik arttı)
        280 * Math.cos(t) - 60 * Math.cos(2 * t) - 25 * Math.cos(3 * t) - 10 * Math.cos(4 * t) + 25 // Dikey oranlar büyütüldü
    );
    }

  let image = (function () {
    let canvas = document.createElement("canvas"),
      context = canvas.getContext("2d");
    canvas.width = settings.particles.size;
    canvas.height = settings.particles.size;
    function to(t) {
      let point = pointOnHeart(t);
      point.x = settings.particles.size / 2 + (point.x * settings.particles.size) / 600;
      point.y = settings.particles.size / 2 - (point.y * settings.particles.size) / 600;
      return point;
    }
    context.beginPath();
    let t = -Math.PI;
    let point = to(t);
    context.moveTo(point.x, point.y);
    while (t < Math.PI) {
      t += 0.01;
      point = to(t);
      context.lineTo(point.x, point.y);
    }
    context.closePath();
    context.fillStyle = "#ea80b0";
    context.fill();
    let image = new Image();
    image.src = canvas.toDataURL();
    return image;
  })();

  /* --- GÜNCELLEME: Tıklama / Dokunma Etkileşimi --- */
  function createHeartsAt(x, y) {
    let rect = canvas.getBoundingClientRect();
    let canvasX = x - rect.left;
    let canvasY = y - rect.top;

    for (let i = 0; i < 15; i++) { 
      // Rastgele yönler, ancak genel olarak yukarı (negatif dy) süzülen kalpler
      let dir = new Point(Math.random() * 160 - 80, -(Math.random() * 100 + 100));
      particles.add(canvasX, canvasY, dir.x, dir.y);
    }
  }

  canvas.addEventListener('mousedown', (e) => createHeartsAt(e.clientX, e.clientY));
  canvas.addEventListener('touchstart', (e) => {
    // Mobilde varsayılan kaydırma hareketini engellemek istersen: e.preventDefault();
    createHeartsAt(e.touches[0].clientX, e.touches[0].clientY);
  });

  function render() {
    requestAnimationFrame(render);
    let newTime = new Date().getTime() / 1000,
      deltaTime = newTime - (time || newTime);
    time = newTime;

    context.clearRect(0, 0, canvas.width, canvas.height);

    let amount = particleRate * deltaTime;
    for (let i = 0; i < amount; i++) {
      let pos = pointOnHeart(Math.PI - 2 * Math.PI * Math.random());
      let dir = pos.clone().length(settings.particles.velocity);
      particles.add(canvas.width / 2 + pos.x, canvas.height / 2 - pos.y, dir.x, -dir.y);
    }

    particles.update(deltaTime);
    particles.draw(context, image);
  }

  function onResize() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
  }
  window.onresize = onResize;

  setTimeout(function () {
    onResize();
    render();
  }, 10);
})(document.getElementById("pinkboard"));

document.addEventListener("DOMContentLoaded", () => {

  const klasorYolu = "./fotograflar/";
  const photos = [
    "2.jpg","3.jpg","4.jpg","5.jpg","6.jpg",
    "7.jpg","8.jpg","9.jpg","10.jpg","11.jpg",
    "12.jpg","13.jpg","14.jpg","15.jpg","16.jpg"
  ];

  let currentPhotoIndex = 0;
  const photoElement = document.getElementById("main-photo");
  const photoContainer = document.getElementById("photo-container");

  if (!photoElement || !photoContainer) {
    console.error("Fotoğraf elemanları bulunamadı");
    return;
  }

  photoContainer.addEventListener("click", () => {
    currentPhotoIndex = (currentPhotoIndex + 1) % photos.length;

    photoElement.style.opacity = 0;

    setTimeout(() => {
      photoElement.src = klasorYolu + photos[currentPhotoIndex];
    }, 150);

    setTimeout(() => {
      photoElement.style.opacity = 1;
    }, 300);
  });

});





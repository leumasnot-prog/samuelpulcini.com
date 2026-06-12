/* ===================================================================
   ESTUDO — interações e renderizações do scrollytelling
   =================================================================== */
(function () {
    'use strict';

    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- Parâmetros do TCC (Pradópolis, ano-base 2024) ---------- */
    var R_RISCO = 24655746.26;          // receita de origem sob risco de migração
    var MASSA_SALARIAL = 513712915.20;  // RAIS/MTE 2024
    var BENEFICIOS = 107536530.07;      // INSS + Bolsa Família
    var RENDA = MASSA_SALARIAL + BENEFICIOS;
    var C_PROP = 0.65;                  // propensão ao consumo tributável (POF/IBGE)
    var T_IBS_BASE = 0.177;             // alíquota de referência do IBS

    /* =========================================================
       1. Barra de progresso + header + nav de capítulos
       ========================================================= */
    var progressBar = document.getElementById('progress-bar');
    var header = document.getElementById('site-header');
    var navLinks = document.querySelectorAll('#chapter-nav a');
    navLinks.forEach(function (a) { a.setAttribute('aria-label', a.dataset.label || 'Capítulo'); });
    var sections = Array.prototype.map.call(navLinks, function (a) {
        return document.querySelector(a.getAttribute('href'));
    });

    function onScroll() {
        var doc = document.documentElement;
        var max = doc.scrollHeight - window.innerHeight;
        progressBar.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + '%';
        header.classList.toggle('scrolled', window.scrollY > 40);

        var current = 0;
        for (var i = 0; i < sections.length; i++) {
            if (sections[i] && sections[i].getBoundingClientRect().top <= window.innerHeight * 0.45) {
                current = i;
            }
        }
        navLinks.forEach(function (a, i) { a.classList.toggle('active', i === current); });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* =========================================================
       2. Reveal on scroll + gatilhos de animação por seção
       ========================================================= */
    var revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    document.querySelectorAll('.reveal').forEach(function (el) { revealObserver.observe(el); });

    function onceVisible(el, cb, threshold) {
        if (!el) return;
        var obs = new IntersectionObserver(function (entries) {
            if (entries[0].isIntersecting) { cb(); obs.disconnect(); }
        }, { threshold: threshold || 0.35 });
        obs.observe(el);
    }

    /* =========================================================
       3. Contadores animados
       ========================================================= */
    function animateCounter(el) {
        var target = parseFloat(el.dataset.target);
        var decimals = parseInt(el.dataset.decimals || '0', 10);
        var isInt = el.dataset.format === 'int';
        var duration = 1800;
        var start = null;

        function fmt(v) {
            if (isInt) return Math.round(v).toLocaleString('pt-BR');
            return v.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
        }

        if (reducedMotion) { el.textContent = fmt(target); return; }

        function step(ts) {
            if (!start) start = ts;
            var p = Math.min((ts - start) / duration, 1);
            var eased = 1 - Math.pow(1 - p, 3);
            el.textContent = fmt(target * eased);
            if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    document.querySelectorAll('.counter').forEach(function (el) {
        onceVisible(el, function () { animateCounter(el); }, 0.6);
    });

    /* =========================================================
       4. Hero — campo de partículas (fluxo origem → destino)
       ========================================================= */
    (function heroCanvas() {
        var canvas = document.getElementById('hero-canvas');
        if (!canvas || reducedMotion) return;
        var ctx = canvas.getContext('2d');
        var particles = [];
        var W, H, dpr;

        function resize() {
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            W = canvas.clientWidth;
            H = canvas.clientHeight;
            canvas.width = W * dpr;
            canvas.height = H * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        function spawn(initial) {
            var stays = Math.random() < 0.195; // fração que "fica" — alusão ao k = 0,195
            return {
                x: initial ? Math.random() * W : -10,
                y: Math.random() * H,
                speed: 0.25 + Math.random() * 0.7,
                amp: 14 + Math.random() * 30,
                phase: Math.random() * Math.PI * 2,
                freq: 0.002 + Math.random() * 0.004,
                r: 0.8 + Math.random() * 1.7,
                stays: stays,
                alpha: 0.25 + Math.random() * 0.5
            };
        }

        function init() {
            resize();
            particles = [];
            var count = Math.min(Math.floor(W * H / 11000), 160);
            for (var i = 0; i < count; i++) particles.push(spawn(true));
        }

        var t = 0;
        var heroRunning = true;
        var heroVisible = true;

        function frame() {
            if (!heroRunning) return;
            ctx.clearRect(0, 0, W, H);
            t++;

            for (var i = 0; i < particles.length; i++) {
                var p = particles[i];
                if (p.stays) {
                    // partículas verdes orbitam suavemente (consumo retido)
                    p.x += Math.sin(t * p.freq + p.phase) * 0.3;
                    p.y += Math.cos(t * p.freq * 1.3 + p.phase) * 0.3;
                } else {
                    // partículas índigo escoam para a direita (receita que migra)
                    p.x += p.speed;
                    p.y += Math.sin(t * p.freq + p.phase) * 0.25;
                    if (p.x > W + 12) particles[i] = spawn(false);
                }

                var fade = Math.min(p.x / 80, 1, (W - p.x) / 80 + 1);
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = p.stays
                    ? 'rgba(219, 230, 76,' + p.alpha * 0.8 + ')'
                    : 'rgba(91, 141, 239,' + p.alpha * fade + ')';
                ctx.fill();
            }

            // linhas de constelação sutis
            ctx.lineWidth = 0.5;
            for (var a = 0; a < particles.length; a += 3) {
                for (var b = a + 3; b < particles.length; b += 7) {
                    var dx = particles[a].x - particles[b].x;
                    var dy = particles[a].y - particles[b].y;
                    var d2 = dx * dx + dy * dy;
                    if (d2 < 7000) {
                        ctx.strokeStyle = 'rgba(91, 141, 239,' + (0.10 * (1 - d2 / 7000)) + ')';
                        ctx.beginPath();
                        ctx.moveTo(particles[a].x, particles[a].y);
                        ctx.lineTo(particles[b].x, particles[b].y);
                        ctx.stroke();
                    }
                }
            }
            requestAnimationFrame(frame);
        }

        function setRunning(on) {
            if (on && !heroRunning) { heroRunning = true; requestAnimationFrame(frame); }
            else if (!on) { heroRunning = false; }
        }

        // pausa quando o hero sai da tela ou a aba fica oculta (economia de bateria/CPU)
        new IntersectionObserver(function (entries) {
            heroVisible = entries[0].isIntersecting;
            setRunning(heroVisible && !document.hidden);
        }, { threshold: 0 }).observe(canvas);

        document.addEventListener('visibilitychange', function () {
            setRunning(heroVisible && !document.hidden);
        });

        window.addEventListener('resize', init);
        init();
        requestAnimationFrame(frame);
    })();

    /* =========================================================
       5. Barras de largura animada (dualidade, VAF, R$100)
       ========================================================= */
    document.querySelectorAll('[data-width]').forEach(function (el) {
        onceVisible(el, function () {
            requestAnimationFrame(function () { el.style.width = el.dataset.width + '%'; });
        }, 0.4);
    });

    /* =========================================================
       6. Anéis de risco (ISS / ICMS)
       ========================================================= */
    document.querySelectorAll('.risk-ring').forEach(function (ring) {
        onceVisible(ring, function () {
            var pct = parseFloat(ring.dataset.pct);
            var circ = 2 * Math.PI * 52; // r=52
            var val = ring.querySelector('.ring-val');
            val.style.strokeDasharray = circ;
            val.style.strokeDashoffset = circ;
            requestAnimationFrame(function () {
                val.style.strokeDashoffset = circ * (1 - pct / 100);
            });
        }, 0.5);
    });

    /* =========================================================
       7. Medidor do IVT
       ========================================================= */
    onceVisible(document.getElementById('ivt-gauge'), function () {
        var gauge = document.getElementById('ivt-gauge');
        var arc = 282.7; // comprimento do arco do semicírculo (r=90)
        var pct = 0.616;
        var val = gauge.querySelector('.gauge-val');
        var needle = gauge.querySelector('.gauge-needle');
        requestAnimationFrame(function () {
            val.style.strokeDasharray = (arc * pct) + ' ' + arc;
            needle.style.transform = 'rotate(' + (-90 + 180 * pct) + 'deg)';
        });
    }, 0.5);

    /* =========================================================
       8. Mapa de Huff — partículas de consumidores
       ========================================================= */
    (function huffMap() {
        var svg = document.getElementById('huff-map');
        var layer = document.getElementById('huff-particles');
        if (!svg || !layer) return;

        var ORIGIN = { x: 240, y: 300 };
        var TARGETS = [
            { x: 700, y: 330, w: 0.42 },  // Ribeirão Preto
            { x: 560, y: 120, w: 0.28 },  // Sertãozinho
            { x: 240, y: 300, w: 0.30, stay: true } // retém em Pradópolis
        ];
        var dots = [];
        var running = false;

        function pickTarget() {
            var r = Math.random();
            var acc = 0;
            for (var i = 0; i < TARGETS.length; i++) {
                acc += TARGETS[i].w;
                if (r <= acc) return TARGETS[i];
            }
            return TARGETS[0];
        }

        function spawnDot() {
            var tgt = pickTarget();
            var el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            el.setAttribute('r', tgt.stay ? 3 : 2.6);
            el.setAttribute('class', 'huff-particle');
            el.setAttribute('fill', tgt.stay ? '#74C365' : '#FF8A7A');
            el.setAttribute('opacity', '0');
            layer.appendChild(el);
            return {
                el: el, tgt: tgt, t: 0,
                dur: tgt.stay ? 140 + Math.random() * 80 : 150 + Math.random() * 110,
                angle: Math.random() * Math.PI * 2,
                orbit: 10 + Math.random() * 26,
                curve: (Math.random() - 0.5) * 90
            };
        }

        function frame() {
            if (!running) return;

            if (dots.length < 46 && Math.random() < 0.35) dots.push(spawnDot());

            for (var i = dots.length - 1; i >= 0; i--) {
                var d = dots[i];
                d.t++;
                var p = d.t / d.dur;

                if (p >= 1) {
                    layer.removeChild(d.el);
                    dots.splice(i, 1);
                    continue;
                }

                var alpha = p < 0.12 ? p / 0.12 : (p > 0.85 ? (1 - p) / 0.15 : 1);
                var x, y;

                if (d.tgt.stay) {
                    // órbita ao redor de Pradópolis: consumo que fica
                    var ang = d.angle + p * Math.PI * 2;
                    x = ORIGIN.x + Math.cos(ang) * d.orbit;
                    y = ORIGIN.y + Math.sin(ang) * d.orbit * 0.8;
                } else {
                    // trajetória curva até o polo concorrente
                    var ease = p * p * (3 - 2 * p);
                    var mx = (ORIGIN.x + d.tgt.x) / 2 - d.curve * 0.4;
                    var my = (ORIGIN.y + d.tgt.y) / 2 + d.curve;
                    var u = 1 - ease;
                    x = u * u * ORIGIN.x + 2 * u * ease * mx + ease * ease * d.tgt.x;
                    y = u * u * ORIGIN.y + 2 * u * ease * my + ease * ease * d.tgt.y;
                }

                d.el.setAttribute('cx', x);
                d.el.setAttribute('cy', y);
                d.el.setAttribute('opacity', alpha * 0.9);
            }
            requestAnimationFrame(frame);
        }

        if (reducedMotion) return;

        var obs = new IntersectionObserver(function (entries) {
            var visible = entries[0].isIntersecting;
            if (visible && !running) { running = true; requestAnimationFrame(frame); }
            if (!visible) running = false;
        }, { threshold: 0.25 });
        obs.observe(svg);
    })();

    /* =========================================================
       9. Monte Carlo ao vivo
       ========================================================= */
    (function monteCarlo() {
        var canvas = document.getElementById('mc-canvas');
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        var counterEl = document.getElementById('mc-counter');
        var TOTAL = 10000;
        var BINS = 48;
        var running = false;
        var started = false;

        function triangular(min, mode, max) {
            var u = Math.random();
            var f = (mode - min) / (max - min);
            return u < f
                ? min + Math.sqrt(u * (max - min) * (mode - min))
                : max - Math.sqrt((1 - u) * (max - min) * (max - mode));
        }

        function uniform(a, b) { return a + Math.random() * (b - a); }

        function sampleEPL() {
            var t = triangular(0.14, T_IBS_BASE, 0.265);
            var k = triangular(0.15, 0.195, 0.30);
            var rRisco = uniform(0.90 * R_RISCO, 1.10 * R_RISCO);
            var ms = MASSA_SALARIAL * (1 + uniform(-0.02, 0.03));
            var bs = BENEFICIOS * (1 + uniform(0, 0.04));
            return rRisco - (ms + bs) * k * t;
        }

        function fmtMi(v) {
            return (v < 0 ? '−' : '+') + ' R$ ' +
                Math.abs(v / 1e6).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' mi';
        }

        function run() {
            if (running) return;
            running = true;

            var samples = [];
            var lo = -32e6, hi = 18e6; // janela fixa da distribuição (em R$)
            var bins = new Array(BINS).fill(0);
            var done = 0;
            var dpr = Math.min(window.devicePixelRatio || 1, 2);

            function draw() {
                var W = canvas.clientWidth;
                var H = 340;
                canvas.width = W * dpr;
                canvas.height = H * dpr;
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                ctx.clearRect(0, 0, W, H);

                var maxBin = Math.max.apply(null, bins) || 1;
                var bw = W / BINS;
                var zeroX = ((0 - lo) / (hi - lo)) * W;

                // grade horizontal sutil
                ctx.strokeStyle = 'rgba(255,255,255,0.05)';
                ctx.lineWidth = 1;
                for (var g = 1; g < 4; g++) {
                    ctx.beginPath();
                    ctx.moveTo(0, (H - 24) * g / 4);
                    ctx.lineTo(W, (H - 24) * g / 4);
                    ctx.stroke();
                }

                for (var i = 0; i < BINS; i++) {
                    var h = (bins[i] / maxBin) * (H - 40);
                    var x = i * bw;
                    var binCenter = lo + (i + 0.5) * (hi - lo) / BINS;
                    var isDeficit = binCenter > 0;

                    var grad = ctx.createLinearGradient(0, H - 24 - h, 0, H - 24);
                    if (isDeficit) {
                        grad.addColorStop(0, 'rgba(255, 138, 122, 0.95)');
                        grad.addColorStop(1, 'rgba(255, 110, 97, 0.22)');
                    } else {
                        grad.addColorStop(0, 'rgba(116, 195, 101, 0.95)');
                        grad.addColorStop(1, 'rgba(0, 128, 76, 0.25)');
                    }
                    ctx.fillStyle = grad;

                    var bx = x + 1.5, bwReal = bw - 3, by = H - 24 - h;
                    ctx.beginPath();
                    if (ctx.roundRect) ctx.roundRect(bx, by, bwReal, h, [3, 3, 0, 0]);
                    else ctx.rect(bx, by, bwReal, h);
                    ctx.fill();
                }

                // linha do zero
                ctx.strokeStyle = 'rgba(255,255,255,0.55)';
                ctx.setLineDash([5, 5]);
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(zeroX, 8);
                ctx.lineTo(zeroX, H - 24);
                ctx.stroke();
                ctx.setLineDash([]);

                ctx.fillStyle = 'rgba(255,255,255,0.7)';
                ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('R$ 0 (equilíbrio)', zeroX, H - 8);

                // eixos em milhões
                ctx.fillStyle = 'rgba(148,163,184,0.7)';
                ctx.font = '11px "Plus Jakarta Sans", sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText('−R$ 30 mi', 6, H - 8);
                ctx.textAlign = 'right';
                ctx.fillText('+R$ 15 mi', W - 6, H - 8);
            }

            function finish() {
                samples.sort(function (a, b) { return a - b; });
                var n = samples.length;
                var sum = samples.reduce(function (a, b) { return a + b; }, 0);
                var mean = sum / n;
                var p5 = samples[Math.floor(n * 0.05)];
                var p95 = samples[Math.floor(n * 0.95)];
                var deficits = samples.filter(function (v) { return v > 0; }).length;
                var probDef = deficits / n * 100;

                document.getElementById('mc-prob-surplus').textContent =
                    (100 - probDef).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%';
                document.getElementById('mc-prob-deficit').textContent =
                    probDef.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%';
                document.getElementById('mc-mean').textContent = fmtMi(mean);
                document.getElementById('mc-interval').textContent = fmtMi(p5) + ' a ' + fmtMi(p95);
                running = false;
            }

            var BATCH = reducedMotion ? TOTAL : 120;

            function step() {
                var todo = Math.min(BATCH, TOTAL - done);
                for (var i = 0; i < todo; i++) {
                    var v = sampleEPL();
                    samples.push(v);
                    var bi = Math.floor(((v - lo) / (hi - lo)) * BINS);
                    if (bi >= 0 && bi < BINS) bins[bi]++;
                }
                done += todo;
                counterEl.textContent = done.toLocaleString('pt-BR');
                draw();
                if (done < TOTAL) requestAnimationFrame(step);
                else finish();
            }
            requestAnimationFrame(step);
        }

        onceVisible(canvas, function () { started = true; run(); }, 0.35);

        document.getElementById('mc-replay').addEventListener('click', function () {
            if (started) run();
        });

        window.addEventListener('resize', function () {
            // redesenho simples ao redimensionar quando parado
        });
    })();

    /* =========================================================
       10. Ponto de virada — slider de retenção (θ ret)
       ========================================================= */
    (function tippingPoint() {
        var slider = document.getElementById('theta-slider');
        if (!slider) return;
        var valueEl = document.getElementById('theta-value');
        var bar = document.getElementById('tipping-bar');
        var eplEl = document.getElementById('tipping-epl');
        var labelEl = document.getElementById('tipping-label');
        var noteEl = document.getElementById('tipping-note');
        var MAX_ABS = 16e6; // escala da barra (R$ ±16 mi)

        // convite ao toque: pulso no handle até a primeira interação
        slider.classList.add('nudge');
        slider.addEventListener('input', function removeNudge() {
            slider.classList.remove('nudge');
            slider.removeEventListener('input', removeNudge);
        });

        function update() {
            var theta = parseFloat(slider.value) / 100;
            var k = C_PROP * theta;
            var dCLocal = RENDA * k * T_IBS_BASE;
            var epl = R_RISCO - dCLocal; // >0 déficit, <0 superávit
            var isDeficit = epl > 0;

            valueEl.textContent = parseFloat(slider.value).toLocaleString('pt-BR') + '%';

            var frac = Math.min(Math.abs(epl) / MAX_ABS, 1) * 50; // % da metade
            if (isDeficit) {
                bar.style.left = '50%';
                bar.style.width = frac + '%';
                bar.style.background = 'linear-gradient(90deg, rgba(255,110,97,0.5), #FF6E61)';
                bar.style.boxShadow = '0 0 22px rgba(255,110,97,0.4)';
            } else {
                bar.style.left = (50 - frac) + '%';
                bar.style.width = frac + '%';
                bar.style.background = 'linear-gradient(90deg, #74C365, rgba(116,195,101,0.5))';
                bar.style.boxShadow = '0 0 22px rgba(116,195,101,0.4)';
            }

            var mi = Math.abs(epl / 1e6).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            eplEl.textContent = (isDeficit ? '− R$ ' : '+ R$ ') + mi + ' mi/ano';
            eplEl.style.color = isDeficit ? '#FFA396' : '#9BD98F';
            labelEl.textContent = isDeficit ? 'déficit' : 'superávit';
            labelEl.style.color = isDeficit ? '#FF8A7A' : '#74C365';

            if (theta < 0.30) {
                noteEl.textContent = 'Abaixo da retenção atual (30%): a fuga de consumo aumenta e o rombo cresce.';
            } else if (theta < 0.345) {
                noteEl.textContent = 'Situação atual de Pradópolis: o consumo local não cobre a perda industrial. O Seguro-Receita precisa completar a diferença.';
            } else if (theta < 0.40) {
                noteEl.textContent = 'Você cruzou o ponto de equilíbrio (θ ≈ 34,5%)! A partir daqui a cidade se sustenta sem depender da compensação federal.';
            } else {
                noteEl.textContent = 'Cenário de fomento comercial forte: cada ponto de retenção acima do equilíbrio vira superávit direto no caixa municipal.';
            }
        }

        slider.addEventListener('input', update);
        update();
    })();

    /* =========================================================
       11. Mapa real da região (MapLibre GL, lazy-loaded)
       ========================================================= */
    (function regionMap() {
        var container = document.getElementById('region-map');
        if (!container) return;

        var CITIES = [
            { name: 'Pradópolis', lng: -48.0655, lat: -21.3597, kind: 'foco',
              info: '<b>O município do estudo.</b> 17.078 habitantes, PIB de R$ 1,1 bi e IVT de 61,6% — polo produtor de alta vulnerabilidade.' },
            { name: 'Ribeirão Preto', lng: -47.8103, lat: -21.1775, kind: 'polo',
              info: '<b>Capital Regional A</b> (REGIC/IBGE), a 40 km. Principal destino das compras que "vazam" de Pradópolis.' },
            { name: 'Sertãozinho', lng: -47.9903, lat: -21.1389, kind: 'polo',
              info: '<b>Polo industrial e comercial</b> a 30 km. Segundo destino do vazamento de consumo no Modelo de Huff.' },
            { name: 'Barrinha', lng: -48.1639, lat: -21.1936, kind: 'viz',
              info: 'Município vizinho de perfil industrial — candidato à replicação do modelo IVT/EPL.' },
            { name: 'Dumont', lng: -47.9742, lat: -21.2325, kind: 'viz',
              info: 'Município vizinho de perfil consumidor — tende a ganhar com o princípio do destino.' }
        ];

        function loadAsset(tag, attrs) {
            return new Promise(function (resolve, reject) {
                var el = document.createElement(tag);
                for (var k in attrs) el[k] = attrs[k];
                el.onload = resolve;
                el.onerror = reject;
                document.head.appendChild(el);
            });
        }

        function initMap() {
            var map = new maplibregl.Map({
                container: container,
                style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
                center: [-47.96, -21.25],
                zoom: 9.6,
                attributionControl: { compact: true },
                cooperativeGestures: true,
                dragRotate: false,
                pitchWithRotate: false,
                renderWorldCopies: false
            });

            map.touchZoomRotate.disableRotation();
            map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

            // botão de recentralizar no território do estudo
            var homeCtrl = {
                onAdd: function () {
                    var div = document.createElement('div');
                    div.className = 'maplibregl-ctrl maplibregl-ctrl-group';
                    div.innerHTML = '<button type="button" class="map-home-btn" aria-label="Recentralizar mapa" title="Recentralizar">⌖</button>';
                    div.querySelector('button').addEventListener('click', fitRegion);
                    return div;
                },
                onRemove: function () {}
            };
            map.addControl(homeCtrl, 'top-right');

            function fitRegion() {
                var bounds = new maplibregl.LngLatBounds();
                CITIES.forEach(function (c) { bounds.extend([c.lng, c.lat]); });
                map.fitBounds(bounds, { padding: { top: 60, bottom: 70, left: 60, right: 60 }, duration: 1200 });
            }

            CITIES.forEach(function (c) {
                var el = document.createElement('div');
                el.className = 'map-marker ' + c.kind;
                el.innerHTML = '<div class="map-dot"></div><span class="map-label">' + c.name + '</span>';

                var popup = new maplibregl.Popup({ offset: 18, closeButton: false, closeOnClick: true })
                    .setHTML(c.info);

                new maplibregl.Marker({ element: el }).setLngLat([c.lng, c.lat]).setPopup(popup).addTo(map);

                el.addEventListener('mouseenter', function () { if (!popup.isOpen()) popup.setLngLat([c.lng, c.lat]).addTo(map); });
                el.addEventListener('mouseleave', function () { popup.remove(); });
            });

            map.on('load', function () {
                // linhas de vazamento: Pradópolis → polos concorrentes
                map.addSource('leak', {
                    type: 'geojson',
                    data: {
                        type: 'FeatureCollection',
                        features: [
                            { type: 'Feature', geometry: { type: 'LineString', coordinates: [[-48.0655, -21.3597], [-47.8103, -21.1775]] } },
                            { type: 'Feature', geometry: { type: 'LineString', coordinates: [[-48.0655, -21.3597], [-47.9903, -21.1389]] } }
                        ]
                    }
                });
                map.addLayer({
                    id: 'leak-lines',
                    type: 'line',
                    source: 'leak',
                    paint: {
                        'line-color': '#FF8A7A',
                        'line-width': 1.6,
                        'line-opacity': 0.55,
                        'line-dasharray': [2, 3]
                    }
                });

                var bounds = new maplibregl.LngLatBounds();
                CITIES.forEach(function (c) { bounds.extend([c.lng, c.lat]); });
                map.fitBounds(bounds, { padding: { top: 60, bottom: 70, left: 60, right: 60 }, duration: 1200 });
            });
        }

        onceVisible(container, function () {
            Promise.all([
                loadAsset('link', { rel: 'stylesheet', href: 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css' }),
                loadAsset('script', { src: 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js' })
            ]).then(initMap).catch(function () {
                container.closest('.region-map-block').style.display = 'none';
            });
        }, 0.05);
    })();

    /* =========================================================
       12. Botão magnético (CTA do simulador)
       ========================================================= */
    (function magnetize() {
        var btn = document.getElementById('btn-magnetize');
        if (!btn) return;

        var COUNT = 16;
        for (var i = 0; i < COUNT; i++) {
            var p = document.createElement('span');
            p.className = 'm-particle';
            var ang = (i / COUNT) * Math.PI * 2 + Math.random() * 0.5;
            var dist = 80 + Math.random() * 100;
            p.style.setProperty('--px', Math.round(Math.cos(ang) * dist * 1.6) + 'px');
            p.style.setProperty('--py', Math.round(Math.sin(ang) * dist * 0.6) + 'px');
            p.style.setProperty('--pd', (Math.random() * 1.3).toFixed(2) + 's');
            btn.appendChild(p);
        }

        function attract() { btn.classList.add('attracting'); }
        function release() { btn.classList.remove('attracting'); }

        btn.addEventListener('mouseenter', attract);
        btn.addEventListener('mouseleave', release);
        btn.addEventListener('touchstart', attract, { passive: true });
        btn.addEventListener('touchend', release, { passive: true });
        btn.addEventListener('touchcancel', release, { passive: true });
    })();

    /* =========================================================
       13. Carrossel de créditos
       ========================================================= */
    (function credits() {
        var root = document.getElementById('credits');
        if (!root) return;

        var ITEMS = [
            {
                name: 'Samuel Pulcini dos Santos',
                role: 'Autor · Servidor Público · Ciências Contábeis · FEA-RP/USP',
                desc: 'Servidor público e estudante de Ciências Contábeis na USP de Ribeirão Preto, com experiência em Contabilidade Pública e nos ciclos de Planejamento e Orçamento. Aplica tecnologia e análise de dados com a missão de modernizar a gestão e transformar realidades na administração pública.',
                img: 'static/samuel.jpg'
            },
            {
                name: 'Sílvio Hiroshi Nakao, Prof. Dr.',
                role: 'Orientador · Professor Associado · Depto. de Contabilidade · FEA-RP/USP',
                desc: 'Editor-Chefe da Revista de Contabilidade e Organizações (RCO) e colíder do Grupo de Pesquisas em Informações Contábeis. Responsável pela orientação científica e metodológica desta pesquisa.',
                img: 'static/nakao.jpg'
            },
            {
                name: 'Programa PUB-USP',
                role: 'Fomento · Universidade de São Paulo',
                desc: 'Pesquisa desenvolvida no Programa Unificado de Bolsas de Estudo para Apoio e Formação de Estudantes de Graduação da USP.',
                img: 'static/usp-logo.png',
                logo: true
            }
        ];

        var avatarEl = document.getElementById('credits-avatar');
        var nameEl = document.getElementById('credits-name');
        var roleEl = document.getElementById('credits-role');
        var descEl = document.getElementById('credits-desc');
        var dotsEl = document.getElementById('credits-dots');
        var idx = 0;
        var timer = null;

        ITEMS.forEach(function (_, i) {
            var d = document.createElement('i');
            d.addEventListener('click', function () { show(i); restart(); });
            dotsEl.appendChild(d);
        });

        function show(i) {
            idx = (i + ITEMS.length) % ITEMS.length;
            var item = ITEMS[idx];

            avatarEl.innerHTML = item.img
                ? '<img' + (item.logo ? ' class="logo"' : '') + ' src="' + item.img + '" alt="' + item.name + '">'
                : item.initials;

            nameEl.textContent = item.name;
            roleEl.textContent = item.role;

            // blur-in palavra por palavra
            descEl.innerHTML = item.desc.split(' ').map(function (w, wi) {
                return '<span class="w" style="--wd:' + (wi * 28) + 'ms">' + w + '</span>';
            }).join(' ');

            Array.prototype.forEach.call(dotsEl.children, function (d, di) {
                d.classList.toggle('on', di === idx);
            });
        }

        function restart() {
            clearInterval(timer);
            if (!reducedMotion) timer = setInterval(function () { show(idx + 1); }, 6500);
        }

        document.getElementById('credits-prev').addEventListener('click', function () { show(idx - 1); restart(); });
        document.getElementById('credits-next').addEventListener('click', function () { show(idx + 1); restart(); });

        show(0);
        onceVisible(root, restart, 0.3);
    })();

    /* =========================================================
       14. Spotlight hover nos cards (desktop)
       ========================================================= */
    (function spotlight() {
        if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

        document.querySelectorAll(
            '.stat-card, .scenario-card, .policy-card, .risk-card, .flow-card, .k-step, .mc-kpi, .artifact, .credits-card'
        ).forEach(function (el) { el.classList.add('spot'); });

        document.addEventListener('pointermove', function (e) {
            var card = e.target.closest && e.target.closest('.spot');
            if (!card) return;
            var r = card.getBoundingClientRect();
            card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
            card.style.setProperty('--my', (e.clientY - r.top) + 'px');
        }, { passive: true });
    })();

    /* =========================================================
       15. Carrossel de referências
       ========================================================= */
    (function refsCarousel() {
        var track = document.getElementById('refs-track');
        var prev = document.getElementById('refs-prev');
        var next = document.getElementById('refs-next');
        if (!track || !prev || !next) return;

        function update() {
            var max = track.scrollWidth - track.clientWidth;
            prev.disabled = track.scrollLeft <= 4;
            next.disabled = track.scrollLeft >= max - 4;
        }

        function slide(dir) {
            track.scrollBy({
                left: dir * Math.max(track.clientWidth - 60, 260),
                behavior: reducedMotion ? 'auto' : 'smooth'
            });
        }

        prev.addEventListener('click', function () { slide(-1); });
        next.addEventListener('click', function () { slide(1); });
        track.addEventListener('scroll', update, { passive: true });
        track.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowRight') { slide(1); e.preventDefault(); }
            if (e.key === 'ArrowLeft') { slide(-1); e.preventDefault(); }
        });
        window.addEventListener('resize', update);
        update();
    })();

})();

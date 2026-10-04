/* ===================================
   GORRAS MAYA — JAVASCRIPT PRINCIPAL (v2)
   =================================== */

document.addEventListener('DOMContentLoaded', () => {
    const $ = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const hasGsap = !!(window.gsap && window.ScrollTrigger);
    if (hasGsap) gsap.registerPlugin(ScrollTrigger);

    /* ---------------------------------
       0. PREPARACIÓN: split de palabras y estados iniciales
    --------------------------------- */
    function makeMask(child) {
        const mask = document.createElement('span');
        mask.className = 'word-mask';
        const inner = document.createElement('span');
        inner.className = 'word-inner';
        inner.appendChild(child);
        mask.appendChild(inner);
        return mask;
    }

    function splitWords(el) {
        const nodes = Array.from(el.childNodes);
        el.textContent = '';
        nodes.forEach(node => {
            if (node.nodeType === 3) {
                node.textContent.split(/(\s+)/).forEach(tok => {
                    if (!tok) return;
                    if (/^\s+$/.test(tok)) el.appendChild(document.createTextNode(' '));
                    else el.appendChild(makeMask(document.createTextNode(tok)));
                });
            } else if (node.nodeType === 1) {
                node.textContent.split(/\s+/).filter(Boolean).forEach(w => {
                    const clone = node.cloneNode(false);
                    clone.textContent = w;
                    el.appendChild(makeMask(clone));
                    el.appendChild(document.createTextNode(' '));
                });
            }
        });
    }

    function splitScrub(el) {
        const words = el.textContent.trim().split(/\s+/);
        el.textContent = '';
        words.forEach((w, i) => {
            const span = document.createElement('span');
            span.className = 'scrub-word';
            span.textContent = w;
            el.appendChild(span);
            if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
        });
        return $$('.scrub-word', el);
    }

    const heroTitle = $('[data-hero="title"]');
    if (heroTitle && !reduced) splitWords(heroTitle);

    const heroKicker = $('[data-hero="kicker"]');
    const heroText = $('[data-hero="text"]');
    const heroCta = $('[data-hero="cta"]');
    const heroVisual = $('[data-hero="visual"]');

    const heroWords = heroTitle ? $$('.word-inner', heroTitle) : [];

    if (hasGsap && !reduced) {
        gsap.set(heroWords, { yPercent: 115 });
        gsap.set([heroKicker, heroText, heroCta], { opacity: 0, y: 24 });
        gsap.set(heroVisual, { opacity: 0, y: 60, scale: 0.94 });
    }

    function runHeroIntro() {
        if (!hasGsap || reduced) return;
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        tl.to(heroKicker, { opacity: 1, y: 0, duration: 0.8 })
          .to(heroWords, { yPercent: 0, duration: 1.1, stagger: 0.07, ease: 'power4.out' }, '-=0.5')
          .to(heroText, { opacity: 1, y: 0, duration: 0.9 }, '-=0.7')
          .to(heroCta, { opacity: 1, y: 0, duration: 0.9 }, '-=0.7')
          .to(heroVisual, { opacity: 1, y: 0, scale: 1, duration: 1.4, ease: 'power4.out' }, '-=1.4');
    }

    /* ---------------------------------
       1. REVEAL EN SCROLL (IntersectionObserver)
    --------------------------------- */
    // Titulares de sección: reveal por palabras con máscara
    const headings = [];
    if (!reduced) {
        $$('main h2[data-reveal]').forEach(h => {
            h.removeAttribute('data-reveal');
            h.setAttribute('data-heading', '');
            splitWords(h);
            $$('.word-inner', h).forEach((w, i) => w.style.setProperty('--i', i));
            headings.push(h);
        });
    }

    $$('.gallery-item').forEach(el => el.setAttribute('data-reveal-scale', ''));
    const revealEls = $$('[data-reveal], [data-reveal-scale]');
    const isRevealable = c => c.hasAttribute('data-reveal') || c.hasAttribute('data-reveal-scale');

    revealEls.forEach(el => {
        const siblings = Array.from(el.parentElement.children).filter(isRevealable);
        const idx = siblings.indexOf(el);
        el.style.transitionDelay = reduced ? '0ms' : `${Math.min(idx * 90, 450)}ms`;
    });

    let revealObserver = null;
    function startRevealObserver() {
        if (revealObserver) return;
        revealObserver = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
        revealEls.concat(headings).forEach(el => revealObserver.observe(el));
    }

    /* ---------------------------------
       2. PRELOADER (contador 0-100)
    --------------------------------- */
    const preloader = $('#preloader');
    const pctEl = $('#preloader-pct');
    const arc = $('#preloader-arc');
    const CIRC = 540;
    let pageLoaded = false;
    let preloaderHidden = false;
    const t0 = performance.now();

    function hidePreloader() {
        if (preloaderHidden) return;
        preloaderHidden = true;
        preloader.classList.add('is-hidden');
        startRevealObserver();
        runHeroIntro();
        if (hasGsap) setTimeout(() => ScrollTrigger.refresh(), 800);
    }

    function preloaderTick(now) {
        if (preloaderHidden) return;
        let p = Math.min((now - t0) / 1600, 1);
        if (!pageLoaded) p = Math.min(p, 0.92);
        pctEl.textContent = Math.round(p * 100) + '%';
        arc.style.strokeDashoffset = CIRC * (1 - p);
        if (p >= 1) setTimeout(hidePreloader, 250);
        else requestAnimationFrame(preloaderTick);
    }
    requestAnimationFrame(preloaderTick);

    window.addEventListener('load', () => {
        pageLoaded = true;
        if (hasGsap) ScrollTrigger.refresh();
    });
    setTimeout(hidePreloader, 5000);

    /* ---------------------------------
       3. NAVBAR scrolled (IntersectionObserver sobre el hero)
    --------------------------------- */
    const navbar = $('#navbar');
    const hero = $('#inicio');
    if (navbar && hero) {
        new IntersectionObserver(([entry]) => {
            navbar.classList.toggle('scrolled', !entry.isIntersecting || entry.intersectionRatio < 0.6);
        }, { threshold: [0, 0.6], rootMargin: '-80px 0px 0px 0px' }).observe(hero);
    }

    /* ---------------------------------
       4. MENÚ MÓVIL
    --------------------------------- */
    const menuBtn = $('#menu-btn');
    const mobileMenu = $('#mobile-menu');

    function closeMobileMenu() {
        mobileMenu.classList.remove('is-open');
        mobileMenu.setAttribute('aria-hidden', 'true');
        menuBtn.setAttribute('aria-expanded', 'false');
        menuBtn.innerHTML = '<i class="ph ph-list" aria-hidden="true"></i>';
        document.documentElement.style.overflow = '';
    }
    function openMobileMenu() {
        mobileMenu.classList.add('is-open');
        mobileMenu.setAttribute('aria-hidden', 'false');
        menuBtn.setAttribute('aria-expanded', 'true');
        menuBtn.innerHTML = '<i class="ph ph-x" aria-hidden="true"></i>';
        document.documentElement.style.overflow = 'hidden';
    }
    if (menuBtn) menuBtn.addEventListener('click', () => mobileMenu.classList.contains('is-open') ? closeMobileMenu() : openMobileMenu());
    $$('.mobile-link').forEach(l => l.addEventListener('click', closeMobileMenu));

    /* ---------------------------------
       5. CONTADORES
    --------------------------------- */
    const counters = $$('.stat-counter');
    if (counters.length) {
        const counterObserver = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const el = entry.target;
                const target = parseFloat(el.getAttribute('data-target'));
                const suffix = el.getAttribute('data-suffix') || '';
                if (reduced) {
                    el.textContent = target + suffix;
                } else {
                    const duration = 1800;
                    const start = performance.now();
                    const tick = now => {
                        const p = Math.min((now - start) / duration, 1);
                        el.textContent = Math.floor((1 - Math.pow(1 - p, 4)) * target) + suffix;
                        if (p < 1) requestAnimationFrame(tick);
                        else el.textContent = target + suffix;
                    };
                    requestAnimationFrame(tick);
                }
                obs.unobserve(el);
            });
        }, { threshold: 0.6 });
        counters.forEach(el => counterObserver.observe(el));
    }

    /* ---------------------------------
       6. GSAP: parallax, manifiesto, fabricación
    --------------------------------- */
    if (hasGsap && !reduced) {
        // Parallax ligado al scroll (solo transform)
        $$('[data-parallax]').forEach(el => {
            const dist = parseFloat(el.getAttribute('data-parallax'));
            const section = el.closest('section');
            const inHero = section && section.id === 'inicio';
            gsap.to(el, {
                y: dist,
                ease: 'none',
                scrollTrigger: {
                    trigger: section || el,
                    start: inHero ? 'top top' : 'top bottom',
                    end: 'bottom top',
                    scrub: 0.6
                }
            });
        });

        // Manifiesto: palabras que se encienden con el scroll
        const manifesto = $('[data-scrub]');
        if (manifesto) {
            const words = splitScrub(manifesto);
            gsap.to(words, {
                opacity: 1,
                ease: 'none',
                stagger: 0.08,
                scrollTrigger: { trigger: manifesto, start: 'top 78%', end: 'bottom 48%', scrub: 0.5 }
            });
        }

        // Fabricación: sticky stack
        const cards = gsap.utils.toArray('.process-card');
        cards.forEach((card, i) => {
            if (i === cards.length - 1) return;
            ScrollTrigger.create({
                trigger: card, start: 'top top',
                endTrigger: cards[cards.length - 1], end: 'top top',
                pin: true, pinSpacing: false
            });
            gsap.to(card, {
                scale: 0.92, opacity: 0.45, ease: 'none',
                scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: 'top top', scrub: true }
            });
        });
    } else {
        const manifesto = $('[data-scrub]');
        if (manifesto) manifesto.style.opacity = '1';
    }

    // Riel de pasos de fabricación
    const rail = $('#process-rail');
    const railDots = $$('.process-rail-dot');
    const stack = $('#process-stack');
    const stackCards = $$('.process-card');
    if (rail && stack) {
        new IntersectionObserver(([e]) => rail.classList.toggle('is-on', e.isIntersecting),
            { rootMargin: '-35% 0px -35% 0px' }).observe(stack);

        const activeSet = new Set();
        const cardObserver = new IntersectionObserver(entries => {
            entries.forEach(en => {
                const i = stackCards.indexOf(en.target);
                if (en.intersectionRatio >= 0.55) activeSet.add(i); else activeSet.delete(i);
            });
            const cur = activeSet.size ? Math.max(...activeSet) : -1;
            railDots.forEach((d, i) => d.classList.toggle('is-active', i === cur));
        }, { threshold: [0, 0.55, 1] });
        stackCards.forEach(c => cardObserver.observe(c));
    }

    /* ---------------------------------
       7. CURSOR GLOW
    --------------------------------- */
    const glow = $('#cursor-glow');
    if (glow && finePointer && !reduced) {
        let tx = -999, ty = -999, cx = tx, cy = ty;
        window.addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; }, { passive: true });
        const loop = () => {
            cx += (tx - cx) * 0.12;
            cy += (ty - cy) * 0.12;
            glow.style.transform = `translate(${cx - 230}px, ${cy - 230}px)`;
            requestAnimationFrame(loop);
        };
        loop();
    }

    /* ---------------------------------
       8. BOTONES MAGNÉTICOS
    --------------------------------- */
    if (finePointer && !reduced) {
        $$('.magnetic').forEach(btn => {
            btn.addEventListener('mousemove', e => {
                const r = btn.getBoundingClientRect();
                const dx = (e.clientX - (r.left + r.width / 2)) * 0.25;
                const dy = (e.clientY - (r.top + r.height / 2)) * 0.35;
                btn.style.transform = `translate(${dx}px, ${dy}px)`;
            });
            btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
        });
    }

    /* ---------------------------------
       9. TARJETAS CON TILT 3D
    --------------------------------- */
    if (finePointer && !reduced) {
        $$('.tilt').forEach(card => {
            card.addEventListener('mousemove', e => {
                if (!card.classList.contains('is-visible')) return;
                const r = card.getBoundingClientRect();
                const px = (e.clientX - r.left) / r.width - 0.5;
                const py = (e.clientY - r.top) / r.height - 0.5;
                card.style.transition = 'transform 0.12s ease-out';
                card.style.transform = `perspective(900px) rotateY(${px * 8}deg) rotateX(${-py * 8}deg) scale(1.015)`;
            });
            card.addEventListener('mouseleave', () => {
                card.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
                card.style.transform = '';
                setTimeout(() => { card.style.transition = ''; }, 650);
            });
        });
    }

    /* ---------------------------------
       10. HERO: partículas doradas
    --------------------------------- */
    const canvas = $('#hero-particles');
    if (canvas && !reduced) {
        const ctx = canvas.getContext('2d');
        let w = 0, h = 0, dpr = 1, particles = [], running = true;
        let mx = -999, my = -999;

        const resize = () => {
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            w = hero.offsetWidth; h = hero.offsetHeight;
            canvas.width = w * dpr; canvas.height = h * dpr;
            canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const n = w < 768 ? 36 : 80;
            particles = Array.from({ length: n }, () => ({
                x: Math.random() * w, y: Math.random() * h,
                r: Math.random() * 1.8 + 0.4,
                vx: (Math.random() - 0.5) * 0.18, vy: -(Math.random() * 0.28 + 0.05),
                a: Math.random() * 0.5 + 0.15, ph: Math.random() * Math.PI * 2
            }));
        };
        resize();
        window.addEventListener('resize', resize);
        if (finePointer) hero.addEventListener('mousemove', e => {
            const r = hero.getBoundingClientRect();
            mx = e.clientX - r.left; my = e.clientY - r.top;
        }, { passive: true });

        new IntersectionObserver(([e]) => { running = e.isIntersecting; }, { threshold: 0 }).observe(hero);

        const frame = t => {
            if (running) {
                ctx.clearRect(0, 0, w, h);
                for (const p of particles) {
                    const dx = p.x - mx, dy = p.y - my, d = Math.hypot(dx, dy);
                    if (d < 110) { p.x += (dx / d) * 0.9; p.y += (dy / d) * 0.9; }
                    p.x += p.vx; p.y += p.vy;
                    if (p.y < -5) { p.y = h + 5; p.x = Math.random() * w; }
                    if (p.x < -5) p.x = w + 5; if (p.x > w + 5) p.x = -5;
                    const tw = 0.6 + 0.4 * Math.sin(t * 0.0015 + p.ph);
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(227,189,84,${p.a * tw})`;
                    ctx.fill();
                }
                for (let i = 0; i < particles.length; i++) {
                    for (let j = i + 1; j < particles.length; j++) {
                        const a = particles[i], b = particles[j];
                        const d = Math.hypot(a.x - b.x, a.y - b.y);
                        if (d < 95) {
                            ctx.strokeStyle = `rgba(201,162,39,${(1 - d / 95) * 0.14})`;
                            ctx.lineWidth = 0.7;
                            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
                        }
                    }
                }
            }
            requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
    }

    /* ---------------------------------
       11. SELECTOR DE COLOR
    --------------------------------- */
    const colorImg = $('#color-img');
    const colorLabel = $('#color-label');
    const colorDesc = $('#color-desc');
    const swatches = $$('.swatch-btn');

    swatches.forEach(btn => { const pre = new Image(); pre.src = btn.dataset.src; });

    function retrigger(el) {
        el.classList.remove('swap-in');
        void el.offsetWidth;
        el.classList.add('swap-in');
    }

    swatches.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.classList.contains('is-active')) return;
            swatches.forEach(s => { s.classList.remove('is-active'); s.setAttribute('aria-checked', 'false'); });
            btn.classList.add('is-active');
            btn.setAttribute('aria-checked', 'true');
            colorImg.classList.add('is-fading');
            setTimeout(() => {
                colorImg.src = btn.dataset.src;
                colorImg.alt = btn.dataset.alt;
                colorLabel.textContent = btn.dataset.label;
                colorDesc.textContent = btn.dataset.desc;
                retrigger(colorLabel);
                retrigger(colorDesc);
                colorImg.classList.remove('is-fading');
            }, 300);
        });
    });

    /* ---------------------------------
       12. FAQ
    --------------------------------- */
    $$('.faq-item').forEach(item => {
        const trigger = $('.faq-trigger', item);
        const content = $('.faq-content', item);
        trigger.addEventListener('click', () => {
            const isOpen = item.classList.contains('is-open');
            $$('.faq-item').forEach(o => {
                o.classList.remove('is-open');
                $('.faq-trigger', o).setAttribute('aria-expanded', 'false');
                $('.faq-content', o).style.maxHeight = null;
            });
            if (!isOpen) {
                item.classList.add('is-open');
                trigger.setAttribute('aria-expanded', 'true');
                content.style.maxHeight = content.scrollHeight + 'px';
            }
        });
    });

    /* ---------------------------------
       13. GALERÍA: filtros + lightbox
    --------------------------------- */
    const galleryItems = $$('.gallery-item');
    $$('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('.filter-btn').forEach(b => b.classList.remove('is-active'));
            btn.classList.add('is-active');
            const f = btn.dataset.filter;
            galleryItems.forEach(item => {
                const match = f === 'all' || item.dataset.cat === f;
                item.classList.toggle('is-hidden', !match);
                item.classList.remove('is-visible');
                if (match) {
                    item.classList.add('is-visible');
                    item.classList.remove('pop-in');
                    void item.offsetWidth;
                    item.classList.add('pop-in');
                }
            });
            if (hasGsap) ScrollTrigger.refresh();
        });
    });

    const lightbox = $('#lightbox');
    const lightboxImg = $('#lightbox-img');
    const lightboxCaption = $('#lightbox-caption');
    const lightboxClose = $('#lightbox-close');

    function closeLightbox() {
        lightbox.classList.remove('is-open');
        lightbox.setAttribute('aria-hidden', 'true');
        document.documentElement.style.overflow = '';
    }
    galleryItems.forEach(btn => {
        btn.addEventListener('click', () => {
            const img = $('img', btn);
            lightboxImg.src = btn.dataset.full;
            lightboxImg.alt = img.alt;
            lightboxCaption.textContent = btn.dataset.caption;
            lightbox.classList.add('is-open');
            lightbox.setAttribute('aria-hidden', 'false');
            lightboxClose.focus();
            document.documentElement.style.overflow = 'hidden';
        });
    });
    lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

    /* ---------------------------------
       14. SIDE DOTS (progreso de página)
    --------------------------------- */
    const dots = $$('.side-dot');
    if (dots.length) {
        const map = new Map();
        dots.forEach(d => {
            const target = document.getElementById(d.dataset.target);
            if (target) map.set(target, d);
            d.addEventListener('click', () => target && target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }));
        });
        const dotObserver = new IntersectionObserver(entries => {
            entries.forEach(en => {
                if (en.isIntersecting) {
                    dots.forEach(d => d.classList.remove('is-active'));
                    map.get(en.target).classList.add('is-active');
                }
            });
        }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
        map.forEach((_, section) => dotObserver.observe(section));
    }

    /* ---------------------------------
       15. FORMULARIO A WHATSAPP
    --------------------------------- */
    const waForm = $('#wa-form');
    if (waForm) {
        waForm.addEventListener('submit', e => {
            e.preventDefault();
            const nombre = $('#wa-nombre').value.trim();
            const institucion = $('#wa-institucion').value.trim();
            const producto = $('#wa-producto').value;
            const cantidad = $('#wa-cantidad').value.trim();
            const mensaje = $('#wa-mensaje').value.trim();

            let text = `Hola, mi nombre es *${nombre}*, de *${institucion}*.\n\n`;
            text += `Me interesa cotizar: *${producto}*.\n`;
            if (cantidad) text += `Cantidad estimada: ${cantidad}.\n`;
            if (mensaje) text += `\nMensaje adicional: "${mensaje}"\n`;
            text += `\n¿Me pueden apoyar con precios y tiempos de entrega?`;

            window.open(`https://wa.me/525516869110?text=${encodeURIComponent(text)}`, '_blank');
        });
    }
});

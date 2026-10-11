(() => {
  'use strict';
  const section = document.querySelector('#games');
  const experience = section?.querySelector('[data-road]');
  const geometry = globalThis.PuddleRoadGeometry;
  const dialog = document.querySelector('#game-preview');
  // The original articles remain visible if this browser cannot show the preview.
  if (!experience || !geometry || !dialog || typeof dialog.showModal !== 'function') return;
  const cards = [...section.querySelectorAll('.game-card')];
  if (cards.length !== 3) return;
  const games = cards.map(card => ({
    title:card.querySelector('h3').textContent,
    genre:card.querySelector('.game-genre').textContent,
    description:card.querySelector('.game-card-description').textContent,
    status:card.querySelector('.game-status').textContent,
    image:card.querySelector('img').getAttribute('src'),
    alt:card.querySelector('img').alt,
    link:card.querySelector('a')?.getAttribute('href') || null,
    planned:card.classList.contains('game-card--planned')
  }));
  const viewport = experience.querySelector('.road-viewport');
  const waypoints = experience.querySelector('.road-waypoints');
  const itinerary = section.querySelector('.road-itinerary');
  const previous = experience.querySelector('[data-road-previous]');
  const next = experience.querySelector('[data-road-next]');
  const count = experience.querySelector('[data-road-count]');
  const announcement = section.querySelector('[data-road-announcement]');
  const pinGroup = experience.querySelector('[data-road-pins]');
  const moteGroup = experience.querySelector('[data-road-motes]');
  const fill = experience.querySelector('.road-fill');
  const outline = experience.querySelector('.road-outline');
  const centre = experience.querySelector('.road-centre');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0, camera = 0, frame = 0, travelID = 0;
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = (name, className) => {
    const el = document.createElementNS(svgNS, name);
    el.setAttribute('class', className);
    return el;
  };
  const stops = games.map((game, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `road-stop${game.planned ? ' is-planned' : ''}`;
    button.setAttribute('aria-label', `${game.title}. ${game.status}. Open preview`);
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-controls', 'game-preview');
    button.innerHTML = '<span class="road-stop-art"><img alt=""><span class="road-stop-state"></span></span><span class="road-stop-copy"><span class="road-stop-title"></span><span class="road-stop-invite"><span>Open preview</span><span aria-hidden="true">↗</span></span></span>';
    button.querySelector('img').src = game.image;
    button.querySelector('.road-stop-state').textContent = game.status;
    button.querySelector('.road-stop-title').textContent = game.title;
    button.addEventListener('click', () => navigate(index, {preview:true}));
    waypoints.append(button);
    const row = document.createElement('li');
    const travelButton = document.createElement('button');
    travelButton.type = 'button';
    travelButton.innerHTML = '<span class="stop-number" aria-hidden="true"></span><span><strong></strong><small></small></span>';
    travelButton.querySelector('.stop-number').textContent = `0${index + 1}`;
    travelButton.querySelector('strong').textContent = game.title;
    travelButton.querySelector('small').textContent = game.status;
    travelButton.setAttribute('aria-label', `Go to ${game.title}. ${game.status}`);
    travelButton.addEventListener('click', () => navigate(index));
    row.append(travelButton); itinerary.append(row);
    const group = svg('g', 'road-pin');
    const line = svg('line', 'road-pin-line');
    const base = svg('ellipse', 'road-pin-base');
    const core = svg('ellipse', 'road-pin-core');
    group.append(line, base, core); pinGroup.append(group);
    return {button, travelButton, group, line, base, core};
  });
  const motes = Array.from({length:44}, (_, index) => {
    const node = svg('circle', 'road-mote');
    moteGroup.append(node);
    return {node, z:index * 125 - 70, side:index % 2 ? 1 : -1, offset:130 + (index * 71 % 310)};
  });
  function render() {
    const path = geometry.road(camera);
    fill.setAttribute('d', path.fill); outline.setAttribute('d', path.fill); centre.setAttribute('d', path.centre);
    stops.forEach((stop, index) => {
      const pos = geometry.stop(index, camera);
      stop.button.hidden = !pos.visible;
      stop.button.style.left = `${pos.x / 10}%`;
      stop.button.style.top = `${pos.y / 6.8}%`;
      stop.button.style.transform = `translate(-50%,-100%) scale(${pos.cardScale})`;
      stop.button.style.opacity = String(pos.opacity);
      stop.button.style.zIndex = String(Math.round(100 * pos.scale));
      stop.group.style.display = pos.visible ? '' : 'none';
      const z = geometry.stopDepth(index);
      const ground = geometry.project(geometry.roadX(z), z, camera);
      stop.line.setAttribute('x1', ground.x); stop.line.setAttribute('y1', ground.y);
      stop.line.setAttribute('x2', pos.x); stop.line.setAttribute('y2', pos.y + 3);
      for (const [el, rx, ry] of [[stop.base,21,7],[stop.core,6,2.4]]) {
        el.setAttribute('cx', ground.x); el.setAttribute('cy', ground.y);
        el.setAttribute('rx', rx * ground.scale); el.setAttribute('ry', ry * ground.scale);
      }
    });
    motes.forEach(mote => {
      const pos = geometry.project(geometry.roadX(mote.z) + mote.side * mote.offset, mote.z, camera);
      mote.node.style.display = pos.depth < -150 ? 'none' : '';
      mote.node.setAttribute('cx', pos.x); mote.node.setAttribute('cy', pos.y);
      mote.node.setAttribute('r', Math.min(4, 2 * pos.scale));
    });
  }
  function updateControls() {
    stops.forEach((stop, index) => {
      for (const el of [stop.button, stop.travelButton]) {
        if (index === current) el.setAttribute('aria-current', 'step');
        else el.removeAttribute('aria-current');
      }
    });
    previous.disabled = current === 0;
    next.disabled = current === games.length - 1;
    previous.textContent = current === 0 ? '← The beginning' : '← Back a little';
    next.textContent = current === games.length - 1 ? 'More to imagine' : 'Further down the road →';
    if (current > 0) previous.setAttribute('aria-label', `Back a little: ${games[current - 1].title}`);
    else previous.removeAttribute('aria-label');
    if (current < games.length - 1) next.setAttribute('aria-label', `Further down the road to ${games[current + 1].title}`);
    else next.removeAttribute('aria-label');
    count.textContent = `0${current + 1} / 0${games.length}`;
  }
  function navigate(index, {preview = false, focus = false} = {}) {
    if (!Number.isInteger(index) || index < 0 || index >= games.length) return;
    if (dialog.open) dialog.close();
    current = index;
    updateControls();
    cancelAnimationFrame(frame);
    const journey = ++travelID;
    const from = camera, to = geometry.stopDepth(current);
    const start = performance.now();
    const duration = reducedMotion.matches || Math.abs(from - to) < 1 ? 0 : Math.min(1150, 760 + Math.abs(to - from) * .1);
    function step(time) {
      if (journey !== travelID) return;
      const progress = duration && !reducedMotion.matches ? Math.min(1, (time - start) / duration) : 1;
      const eased = progress < .5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
      camera = from + (to - from) * eased;
      render();
      if (progress < 1) frame = requestAnimationFrame(step);
      else {
        announcement.textContent = `${games[current].title}. ${games[current].status}. Select its preview to take a closer look.`;
        if (focus) stops[current].button.focus({preventScroll:true});
        if (preview) showPreview();
      }
    }
    frame = requestAnimationFrame(step);
  }
  function showPreview() {
    const game = games[current];
    const photo = dialog.querySelector('[data-preview-image]');
    photo.src = game.image; photo.alt = game.alt;
    dialog.querySelector('[data-preview-genre]').textContent = game.genre;
    dialog.querySelector('#preview-title').textContent = game.title;
    dialog.querySelector('[data-preview-status]').textContent = game.status;
    dialog.querySelector('[data-preview-description]').textContent = game.description;
    dialog.querySelector('[data-preview-caption]').textContent = game.planned ? 'Exploratory concept artwork' : 'A glimpse into Project Sprawl';
    const planned = dialog.querySelector('[data-preview-planned]');
    planned.hidden = !game.planned;
    planned.textContent = current === 2 ? 'A little further down the road. Planned for the future; the character style is still being explored.' : 'A little further down the road. Planned for the future, while we focus on bringing Sprawl to life.';
    const link = dialog.querySelector('[data-preview-link]');
    link.hidden = !game.link;
    if (game.link) {link.href = game.link; link.textContent = `Visit the ${game.title} website ↗`;}
    else link.removeAttribute('href');
    const further = dialog.querySelector('[data-preview-next]');
    further.disabled = current === games.length - 1;
    further.textContent = current < games.length - 1 ? `Further down the road: ${games[current + 1].title.replace('Project ', '')} →` : '';
    dialog.querySelector('[data-preview-back]').hidden = !!game.link;
    document.body.classList.add('road-is-open');
    if (!dialog.open) dialog.showModal();
  }
  function closePreview() { dialog.close(); }
  previous.addEventListener('click', () => navigate(current - 1));
  next.addEventListener('click', () => navigate(current + 1));
  viewport.addEventListener('keydown', event => {
    const target = {ArrowRight:current + 1, ArrowDown:current + 1, ArrowLeft:current - 1, ArrowUp:current - 1, Home:0, End:games.length - 1}[event.key];
    if (target === undefined) return;
    event.preventDefault(); navigate(target, {focus:true});
  });
  dialog.querySelector('[data-preview-close]').addEventListener('click', closePreview);
  dialog.querySelector('[data-preview-back]').addEventListener('click', closePreview);
  dialog.querySelector('[data-preview-next]').addEventListener('click', () => navigate(current + 1, {preview:true}));
  dialog.addEventListener('close', () => {
    if (dialog.open) return;
    document.body.classList.remove('road-is-open');
    stops[current].button.focus({preventScroll:true});
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closePreview();
  });
  updateControls(); render();
  experience.hidden = false; itinerary.hidden = false;
  section.querySelector('.games-grid').hidden = true;
  section.querySelector('.road-help').hidden = false;
})();

/* Perspective on a winding ground-plane path. Shared by the renderer and checks. */
(() => {
  const spacing = 1050;
  const focal = 900;
  const stopDepth = index => index * spacing;
  const roadX = z => -240 * Math.cos(Math.PI * z / spacing);
  const project = (x, z, camera) => {
    const depth = z - camera;
    const scale = focal / Math.max(150, focal + depth);
    return {x:500 + (x - roadX(camera)) * scale, y:100 + 470 * scale, scale, depth};
  };
  const stop = (index, camera) => {
    const z = stopDepth(index);
    const side = index % 2 ? 1 : -1;
    const point = project(roadX(z) + side * 160, z, camera);
    return {...point, y:point.y - 16 * Math.min(point.scale, 1.2),
      cardScale:Math.min(1.13, Math.max(.46, Math.sqrt(point.scale))),
      visible:point.depth > -190 && point.y < 695,
      opacity:Math.max(0, Math.min(1, (point.depth + 190) / 150))};
  };
  const road = camera => {
    const left = [], right = [], centre = [];
    for (let depth = -160; depth <= 8000; depth += 45) {
      const z = camera + depth;
      left.push(project(roadX(z) - 92, z, camera));
      right.push(project(roadX(z) + 92, z, camera));
      centre.push(project(roadX(z), z, camera));
    }
    const points = values => values.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' L ');
    return {fill:`M ${points(left)} L ${points(right.reverse())} Z`, centre:`M ${points(centre)}`};
  };
  globalThis.PuddleRoadGeometry = Object.freeze({spacing, focal, stopDepth, roadX, project, stop, road});
})();

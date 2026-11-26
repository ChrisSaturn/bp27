(() => {
  const dialog = document.querySelector('.reveal-dialog');
  const flight = dialog.querySelector('.ticket-flight');
  const ticket = flight.querySelector('.ticket');
  const canvas = flight.querySelector('.ticket-flight-canvas');
  const face = ticket.querySelector('.ticket-face');
  const stub = ticket.querySelector('.ticket-stub-paper');
  const marks = [...ticket.querySelectorAll('.ticket-brand img')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const paperDuration = 220;
  let renderer;
  let layout;
  let assetsReady = false;
  let unavailable = false;
  let queued;
  let frame;

  const paintTicket = (width, height, ratio) => {
    const print = document.createElement('canvas');
    print.width = Math.round(width * ratio);
    print.height = Math.round(height * ratio);
    const ink = print.getContext('2d');
    ink.scale(print.width / width, print.height / height);
    const origin = ticket.getBoundingClientRect();
    const box = node => {
      const rect = node.getBoundingClientRect();
      return { x: rect.left - origin.left, y: rect.top - origin.top, w: rect.width, h: rect.height };
    };
    const gradient = (x, y, stops) => {
      const colors = ink.createLinearGradient(0, 0, x, y);
      for (const [stop, color] of stops) colors.addColorStop(stop, color);
      return colors;
    };
    const paper = (node, corners, paint) => {
      const { x, y, w, h } = box(node);
      const rounded = new Path2D();
      rounded.roundRect(0, 0, w, h, corners);
      const outline = getComputedStyle(node).clipPath.match(/^path\(["'](.+)["']\)$/);
      ink.save();
      ink.translate(x, y);
      ink.clip(rounded);
      if (outline) ink.clip(new Path2D(outline[1]));
      paint(w, h);
      ink.strokeStyle = node === face ? '#c5a6ef72' : '#f2d9ff';
      ink.lineWidth = 1.5;
      ink.stroke(rounded);
      ink.restore();
    };

    paper(face, [17, 0, 0, 17], (w, h) => {
      ink.fillStyle = gradient(w, h * .38, [[0, '#0b0515'], [.58, '#1e0d36'], [1, '#362057']]);
      ink.fillRect(0, 0, w, h);
      ink.globalCompositeOperation = 'screen';
      ink.fillStyle = gradient(w, h * .53, [
        [0, '#3f206f1a'], [.23, '#76d9ef6a'], [.38, '#e8fda140'],
        [.61, '#e3a5f951'], [.85, '#a875fc50'], [1, '#48377226']
      ]);
      ink.fillRect(0, 0, w, h);
      const x = w * .745;
      const y = h / 2;
      const radius = w * .345;
      const rays = ink.createRadialGradient(x, y, radius * .13, x, y, radius * 1.05);
      rays.addColorStop(0, '#f1d6ff9e');
      rays.addColorStop(.7, '#edd3ff9e');
      rays.addColorStop(1, '#edd3ff00');
      ink.strokeStyle = rays;
      ink.lineWidth = Math.max(2, radius * .036);
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4 + Math.PI / 15;
        ink.beginPath();
        ink.moveTo(x + Math.cos(a) * radius * .14, y + Math.sin(a) * radius * .14);
        ink.lineTo(x + Math.cos(a) * radius * 1.05, y + Math.sin(a) * radius * 1.05);
        ink.stroke();
      }
      ink.strokeStyle = '#e9c0ff29';
      ink.lineWidth = 1;
      for (let r = radius * .18; r < radius; r += 22) {
        ink.beginPath();
        ink.arc(x, y, r, 0, Math.PI * 2);
        ink.stroke();
      }
    });
    paper(stub, [0, 17, 17, 0], (w, h) => {
      ink.fillStyle = gradient(w, h * .72, [
        [0, '#eee4ff'], [.45, '#dec6fc'], [.6, '#d2edf8'], [.78, '#cbb5ef'], [1, '#ebd0ff']
      ]);
      ink.fillRect(0, 0, w, h);
    });

    for (const mark of marks) {
      if (!mark.naturalWidth) continue;
      const { x, y, w, h } = box(mark);
      ink.drawImage(mark, x, y, w, h);
    }
    for (const node of ticket.querySelectorAll('h2 span, .ticket-details span')) {
      const { x, y, h } = box(node);
      const style = getComputedStyle(node);
      ink.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      if ('letterSpacing' in ink) ink.letterSpacing = style.letterSpacing === 'normal' ? '0px' : style.letterSpacing;
      ink.fillStyle = style.color;
      const metrics = ink.measureText(node.textContent);
      const ascent = metrics.fontBoundingBoxAscent ?? metrics.actualBoundingBoxAscent;
      const descent = metrics.fontBoundingBoxDescent ?? metrics.actualBoundingBoxDescent;
      const baseline = y + (h + ascent - descent) / 2;
      ink.fillText(node.textContent, x, baseline);
    }
    return print;
  };

  const createRenderer = () => {
    const gl = canvas.getContext('webgl', { alpha: true, antialias: false, powerPreference: 'low-power' });
    if (!gl) return;
    const shader = (type, source) => {
      const object = gl.createShader(type);
      gl.shaderSource(object, source);
      gl.compileShader(object);
      return object;
    };
    const vertex = shader(gl.VERTEX_SHADER, `
      precision mediump float;
      attribute vec2 aUv;
      uniform float uBend;
      varying vec2 vUv;
      void main() {
        vUv = aUv;
        float x = aUv.x * 2.0 - 1.0;
        float y = aUv.y + uBend * (x*x - 0.69 + 0.17*x);
        float z = uBend * (1.0 - x*x);
        gl_Position = vec4(x * (1.0 - 0.16 * abs(uBend)), (1.0 - 2.0*y) / 1.5, 0.0, 1.0 - 0.12*z);
      }`);
    const fragment = shader(gl.FRAGMENT_SHADER, `
      precision mediump float;
      uniform sampler2D uPrint;
      uniform float uBend;
      varying vec2 vUv;
      void main() {
        vec4 ink = texture2D(uPrint, vUv);
        float light = 1.0 + uBend * (0.22 - abs(vUv.x - 0.56));
        gl_FragColor = vec4(ink.rgb * light, ink.a);
      }`);
    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.bindAttribLocation(program, 0, 'aUv');
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return;
    }
    const vertices = new Float32Array(25 * 4);
    for (let i = 0; i <= 24; i++) vertices.set([i / 24, 0, i / 24, 1], i * 4);
    const mesh = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.useProgram(program);
    const bend = gl.getUniformLocation(program, 'uBend');
    gl.uniform1i(gl.getUniformLocation(program, 'uPrint'), 0);
    return {
      upload(print) {
        canvas.width = print.width;
        canvas.height = Math.round(print.height * 1.5);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, print);
      },
      draw(curve) {
        gl.uniform1f(bend, curve);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertices.length / 2);
      },
      dispose() {
        gl.deleteTexture(texture);
        gl.deleteBuffer(mesh);
        gl.deleteProgram(program);
      }
    };
  };

  const bake = () => {
    queued = undefined;
    if (dialog.open || unavailable || reduced.matches) return;
    const width = ticket.offsetWidth;
    const height = ticket.offsetHeight;
    const ratio = Math.min(devicePixelRatio || 1, 1.25);
    if (!width || !height || (layout?.width === width && layout.height === height && layout.ratio === ratio)) return;
    try {
      renderer ||= createRenderer();
      if (!renderer) {
        unavailable = true;
        return;
      }
      renderer.upload(paintTicket(width, height, ratio));
      renderer.draw(0);
      layout = { width, height, ratio };
    } catch {
      unavailable = true;
      layout = undefined;
    }
  };
  const queueBake = () => {
    if (!assetsReady || dialog.open || queued !== undefined || unavailable || reduced.matches) return;
    queued = window.requestIdleCallback ? window.requestIdleCallback(bake) : setTimeout(bake, 0);
  };
  const resize = new ResizeObserver(queueBake);
  document.addEventListener('pack:prepare', async () => {
    await Promise.allSettled([document.fonts.ready, ...marks.map(mark => mark.decode?.())]);
    if (unavailable) return;
    assetsReady = true;
    resize.observe(ticket);
    queueBake();
  }, { once: true });

  const stop = () => {
    cancelAnimationFrame(frame);
    dialog.classList.remove('has-flight-mesh');
  };
  flight.addEventListener('ticket:launch', () => {
    if (unavailable || layout?.width !== ticket.offsetWidth || layout.height !== ticket.offsetHeight) return;
    renderer.draw(.04);
    dialog.classList.add('has-flight-mesh');
  });
  flight.addEventListener('ticket:enter', ({ detail: motion }) => {
    if (!dialog.classList.contains('has-flight-mesh')) return;
    flight.style.setProperty('--ticket-paper-duration', `${paperDuration}ms`);
    const draw = () => {
      const time = (motion.currentTime ?? 0) / paperDuration;
      if (time >= 1 || !dialog.classList.contains('is-launching')) { stop(); return; }
      renderer.draw(.04 * (1 - time) + .18 * Math.sin(time * Math.PI));
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
  });
  dialog.addEventListener('close', () => {
    stop();
    queueBake();
  });
  reduced.addEventListener('change', () => reduced.matches ? stop() : queueBake());
  canvas.addEventListener('webglcontextlost', () => {
    unavailable = true;
    stop();
  });
  window.addEventListener('pagehide', () => {
    unavailable = true;
    stop();
    if (queued !== undefined) {
      if (window.cancelIdleCallback) window.cancelIdleCallback(queued);
      else clearTimeout(queued);
    }
    resize.disconnect();
    renderer?.dispose();
  }, { once: true });
})();

const toc = document.getElementById("toc");
const toggle = document.querySelector(".toc-toggle");
const links = [...document.querySelectorAll(".toc a[href^='#']")];

const targets = links
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

function setOpen(open) {
  if (!toggle || !toc) return;
  toc.classList.toggle("is-open", open);
  toggle.setAttribute("aria-expanded", String(open));
}

toggle?.addEventListener("click", () => {
  setOpen(!toc.classList.contains("is-open"));
});

toc?.addEventListener("click", (event) => {
  if (event.target.closest("a") && window.matchMedia("(max-width: 920px)").matches) {
    setOpen(false);
  }
});

function setCurrent(id) {
  for (const link of links) {
    const active = link.getAttribute("href") === `#${id}`;
    if (active) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  }
}

const observer = new IntersectionObserver(
  (entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible?.target.id) setCurrent(visible.target.id);
  },
  {
    rootMargin: "-20% 0px -65% 0px",
    threshold: [0.1, 0.25, 0.5],
  }
);

for (const section of targets) observer.observe(section);

const POINTS = [
  { t: 3, y: 70, c: "bus" },
  { t: 5, y: 25, c: "bus" },
  { t: 7, y: 55, c: "bus" },
  { t: 9, y: 40, c: "bus" },
  { t: 11, y: 80, c: "bus" },
  { t: 13, y: 30, c: "bike" },
  { t: 15, y: 65, c: "bike" },
  { t: 16, y: 20, c: "bike" },
  { t: 18, y: 75, c: "bike" },
  { t: 20, y: 45, c: "bike" },
  { t: 22, y: 28, c: "bike" },
  { t: 24, y: 82, c: "bike" },
  { t: 26, y: 50, c: "bike" },
  { t: 31, y: 35, c: "bus" },
];

const T_MIN = 0;
const T_MAX = 36;
const SVG_W = 640;
const SVG_H = 240;
const PAD_L = 48;
const PAD_R = 24;
const PAD_T = 18;
const PAD_B = 36;

const svg = document.getElementById("split-svg");
const range = document.getElementById("split-range");
const statT = document.getElementById("stat-t");
const statGL = document.getElementById("stat-gl");
const statGR = document.getElementById("stat-gr");
const statW = document.getElementById("stat-w");
const statBest = document.getElementById("stat-best");

function xOf(t) {
  return PAD_L + ((t - T_MIN) / (T_MAX - T_MIN)) * (SVG_W - PAD_L - PAD_R);
}

function yOf(y) {
  return PAD_T + (y / 100) * (SVG_H - PAD_T - PAD_B - 10);
}

function tOfX(x) {
  const t = T_MIN + ((x - PAD_L) / (SVG_W - PAD_L - PAD_R)) * (T_MAX - T_MIN);
  return Math.min(T_MAX - 1, Math.max(T_MIN + 1, t));
}

function gini(points) {
  const n = points.length;
  if (!n) return 0;
  const bike = points.filter((p) => p.c === "bike").length;
  const p = bike / n;
  return 1 - p * p - (1 - p) * (1 - p);
}

function score(threshold) {
  const left = POINTS.filter((p) => p.t <= threshold);
  const right = POINTS.filter((p) => p.t > threshold);
  const n = POINTS.length;
  const gL = gini(left);
  const gR = gini(right);
  const w = (left.length * gL + right.length * gR) / n;
  return { gL, gR, w };
}

function bestSplit() {
  const temps = [...new Set(POINTS.map((p) => p.t))].sort((a, b) => a - b);
  let best = { w: Infinity, t: temps[0] };
  for (let i = 0; i < temps.length - 1; i += 1) {
    const t = (temps[i] + temps[i + 1]) / 2;
    const { w } = score(t);
    if (w < best.w) best = { w, t };
  }
  return best;
}

function fmt(n) {
  return n.toFixed(3);
}

function ns(name, attrs) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", name);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  return el;
}

function draw(threshold) {
  if (!svg) return;
  const { gL, gR, w } = score(threshold);
  const splitX = xOf(threshold);
  const axisY = SVG_H - PAD_B;

  svg.replaceChildren();

  svg.appendChild(
    ns("rect", {
      x: String(PAD_L),
      y: String(PAD_T),
      width: String(splitX - PAD_L),
      height: String(axisY - PAD_T),
      fill: "#b8431f",
      opacity: "0.06",
    })
  );
  svg.appendChild(
    ns("rect", {
      x: String(splitX),
      y: String(PAD_T),
      width: String(SVG_W - PAD_R - splitX),
      height: String(axisY - PAD_T),
      fill: "#2a3d2e",
      opacity: "0.07",
    })
  );

  svg.appendChild(
    ns("line", {
      x1: String(PAD_L),
      y1: String(axisY),
      x2: String(SVG_W - PAD_R),
      y2: String(axisY),
      stroke: "#2a3d2e",
      "stroke-width": "1.2",
    })
  );

  for (const tick of [0, 12, 24, 36]) {
    const x = xOf(tick);
    svg.appendChild(
      ns("line", {
        x1: String(x),
        y1: String(axisY),
        x2: String(x),
        y2: String(axisY + 6),
        stroke: "#2a3d2e",
        "stroke-width": "1",
      })
    );
    const label = ns("text", {
      x: String(x),
      y: String(axisY + 20),
      "text-anchor": "middle",
      fill: "#3d4a38",
      "font-family": "IBM Plex Mono, ui-monospace, monospace",
      "font-size": "11",
    });
    label.textContent = `${tick} C`;
    svg.appendChild(label);
  }

  const best = bestSplit();
  svg.appendChild(
    ns("line", {
      x1: String(xOf(best.t)),
      y1: String(PAD_T),
      x2: String(xOf(best.t)),
      y2: String(axisY),
      stroke: "#5c6f55",
      "stroke-width": "1",
      "stroke-dasharray": "4 4",
      opacity: "0.7",
    })
  );

  svg.appendChild(
    ns("line", {
      x1: String(splitX),
      y1: String(PAD_T),
      x2: String(splitX),
      y2: String(axisY),
      stroke: "#b8431f",
      "stroke-width": "2",
    })
  );

  const handle = ns("rect", {
    x: String(splitX - 6),
    y: String(PAD_T - 4),
    width: "12",
    height: String(axisY - PAD_T + 8),
    fill: "transparent",
  });
  svg.appendChild(handle);

  for (const point of POINTS) {
    svg.appendChild(
      ns("circle", {
        cx: String(xOf(point.t)),
        cy: String(yOf(point.y)),
        r: "6.5",
        fill: point.c === "bike" ? "#2a3d2e" : "#b8431f",
        stroke: "#1c2418",
        "stroke-width": "0.6",
      })
    );
  }

  if (statT) statT.textContent = `${threshold.toFixed(1)} C`;
  if (statGL) statGL.textContent = fmt(gL);
  if (statGR) statGR.textContent = fmt(gR);
  if (statW) statW.textContent = fmt(w);
  if (statBest) {
    statBest.textContent = `${best.t.toFixed(1)} C, weighted Gini ${fmt(best.w)}`;
  }
}

function setThreshold(t) {
  const snapped = Math.round(t * 2) / 2;
  if (range) range.value = String(snapped);
  draw(snapped);
}

if (range && svg) {
  const best = bestSplit();
  if (statBest) {
    statBest.textContent = `${best.t.toFixed(1)} C, weighted Gini ${fmt(best.w)}`;
  }

  setThreshold(Number(range.value));
  range.addEventListener("input", () => setThreshold(Number(range.value)));

  let dragging = false;

  function pointerToT(event) {
    const box = svg.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * SVG_W;
    return tOfX(x);
  }

  svg.addEventListener("pointerdown", (event) => {
    dragging = true;
    svg.setPointerCapture(event.pointerId);
    setThreshold(pointerToT(event));
  });

  svg.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    setThreshold(pointerToT(event));
  });

  svg.addEventListener("pointerup", () => {
    dragging = false;
  });

  svg.addEventListener("pointercancel", () => {
    dragging = false;
  });
}

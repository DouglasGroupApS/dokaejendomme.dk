// Hovedgaden 70 i 3D, tegnet med flader og streger. Drejer langsomt frem og tilbage og kan trækkes rundt.
// Mål i meter, skønnet ud fra Benjamins ni Street View-billeder 21-10-2026. Virker det ikke, bliver stregtegningen (SVG) stående.
import * as THREE from "three";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";

const boks = document.getElementById("hus3d");
const tegning = boks && boks.closest(".tegning");

// x langs forsiden (0 = vestgavlen med den runde rude, W = østgavlen med den franske altan), y op, z ind i huset (0 = forsiden)
const W = 12, D = 11, H = 5.6, R = 5.2, OV = 0.45;
const V = (x, y, z) => new THREE.Vector3(x - W / 2, y, D / 2 - z);
const tagFor = z => H + (z + OV) / (D / 2 + OV) * R;          // højden på forreste tagflade i dybden z
const tagBag = z => H + (D + OV - z) / (D / 2 + OV) * R;      // højden på bagerste tagflade
const tagGavl = z => (z <= D / 2 ? tagFor(z) : tagBag(z));
// butikkerne: facaden mod Drosselvej ligger 5,5 m inde fra gavlen, så der er plads til p-pladser (Street View 10)
const BX0 = -1.2, BFX = W - 5.5, BZ2 = D + 15.4;   // facaden er ca. 15,4 m lang (Street View 14)

const F = {
  murFront: 0xf3d5c4, murGavl: 0xe9c2ae, murBag: 0xe6bfab, tag: 0xc9c3ba, tagKant: 0x8f8a84, hvid: 0xffffff,
  glas: 0xcfdde3, glasMoerk: 0x9fb1b9, grund: 0xf1e9dd, staal: 0xa7a39d, beton: 0xc9c4bc, gulv: 0xe6e1d9,
  skorsten: 0xd9ad98, halvtag: 0xb9b3aa, rende: 0x8d9296, postkasse: 0x2b2b2b, skilt: 0x3d7f55,
};

const scene = new THREE.Scene();
const streger = { tyk: [], tynd: [], graa: [] };

function flade(punkter, farve, { glas = null, kant = "tynd" } = {}) {
  const p = punkter.map(a => V(...a));
  const pos = [];
  for (let i = 1; i < p.length - 1; i++) pos.push(...p[0].toArray(), ...p[i].toArray(), ...p[i + 1].toArray());
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  const m = new THREE.MeshBasicMaterial({
    color: farve, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
    transparent: glas !== null, opacity: glas === null ? 1 : glas, depthWrite: glas === null,
  });
  const mesh = new THREE.Mesh(g, m);
  if (glas !== null) mesh.renderOrder = 2;
  scene.add(mesh);
  if (kant) for (let i = 0; i < p.length; i++) streger[kant].push(p[i], p[(i + 1) % p.length]);
}
function streg(punkter, kant = "tynd") {
  const p = punkter.map(a => V(...a));
  for (let i = 0; i < p.length - 1; i++) streger[kant].push(p[i], p[i + 1]);
}
function kasse(x1, x2, y1, y2, z1, z2, farve, kant = "tynd") {
  flade([[x1, y1, z1], [x2, y1, z1], [x2, y2, z1], [x1, y2, z1]], farve, { kant });
  flade([[x1, y1, z2], [x2, y1, z2], [x2, y2, z2], [x1, y2, z2]], farve, { kant });
  flade([[x1, y1, z1], [x1, y1, z2], [x1, y2, z2], [x1, y2, z1]], farve, { kant });
  flade([[x2, y1, z1], [x2, y1, z2], [x2, y2, z2], [x2, y2, z1]], farve, { kant });
  flade([[x1, y2, z1], [x2, y2, z1], [x2, y2, z2], [x1, y2, z2]], farve, { kant });
  flade([[x1, y1, z1], [x2, y1, z1], [x2, y1, z2], [x1, y1, z2]], farve, { kant });
}

// En facade er et plan: (a, y, ud) -> punkt. "ud" er afstanden ud fra muren, så ramme og glas ligger foran muren
const facadeZ = (z, retning) => (a, y, ud = 0) => [a, y, z + retning * ud];   // forside (-1) og bagside (+1)
const facadeX = (x, retning) => (a, y, ud = 0) => [x + retning * ud, y, a];   // gavle og butiksfacaden

// Vindue med hvid ramme, sprosser og glas. fag = antal ruder i bredden, tvaer = hvor den vandrette sprosse sidder (0..1)
// dele = rudernes bredder i forhold til hinanden, fx [1, 2, 1] for smal, bred, smal
function vindue(f, a1, a2, y1, y2, { fag = 2, tvaer = null, ramme = 0.07, sprosse = 0.06, glas = F.glas, dele = null } = {}) {
  const q = (a, y, u) => f(a, y, u);
  flade([q(a1, y1, 0.02), q(a2, y1, 0.02), q(a2, y2, 0.02), q(a1, y2, 0.02)], F.hvid);
  const ia1 = a1 + ramme, ia2 = a2 - ramme, iy1 = y1 + ramme, iy2 = y2 - ramme;
  const andele = dele || Array(fag).fill(1), sum = andele.reduce((a, b) => a + b, 0);
  const fri = ia2 - ia1 - sprosse * (andele.length - 1);
  const raekker = tvaer === null ? [[iy1, iy2]] : [[iy1, iy1 + (iy2 - iy1) * tvaer - sprosse / 2], [iy1 + (iy2 - iy1) * tvaer + sprosse / 2, iy2]];
  let b1 = ia1;
  for (const andel of andele) {
    const b2 = b1 + fri * andel / sum;
    for (const [r1, r2] of raekker) flade([q(b1, r1, 0.035), q(b2, r1, 0.035), q(b2, r2, 0.035), q(b1, r2, 0.035)], glas);
    b1 = b2 + sprosse;
  }
}
// Muret sålbænk under et vindue
function saalbaenk(f, a1, a2, y) {
  flade([f(a1 - 0.06, y - 0.07, 0), f(a2 + 0.06, y - 0.07, 0), f(a2 + 0.06, y - 0.07, 0.09), f(a1 - 0.06, y - 0.07, 0.09)], 0xc98f78);
  flade([f(a1 - 0.06, y - 0.07, 0.09), f(a2 + 0.06, y - 0.07, 0.09), f(a2 + 0.06, y, 0.06), f(a1 - 0.06, y, 0.06)], 0xc98f78);
}
// Dør med hvid ramme og en glasrude foroven
function doer(f, a1, a2, y2, { glasTil = 0.55, y1 = 0 } = {}) {
  flade([f(a1, y1, 0.02), f(a2, y1, 0.02), f(a2, y2, 0.02), f(a1, y2, 0.02)], F.hvid);
  const r = 0.09, yg = y1 + (y2 - y1) * glasTil;
  flade([f(a1 + r, yg, 0.035), f(a2 - r, yg, 0.035), f(a2 - r, y2 - r, 0.035), f(a1 + r, y2 - r, 0.035)], F.glas);
}

// Rund trækrone eller busk med streger på kanterne
function rundt(x, y, z, r, farve) {
  const geo = new THREE.IcosahedronGeometry(r, 1);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: farve, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
  const c = V(x, y, z);
  m.position.copy(c);
  scene.add(m);
  const e = new THREE.EdgesGeometry(geo, 25).attributes.position;
  for (let i = 0; i < e.count; i++) streger.tynd.push(new THREE.Vector3(e.getX(i), e.getY(i), e.getZ(i)).add(c));
}

// ---------- Omgivelserne (Street View 10, 11 og 12): fortov foran og langs gavlen med rundt hjørne, grusplads foran,
// asfaltparkering foran butikkerne, have bag hegnet. Ingen vej, og intet vest for trappen ----------
(() => {
  const L = (x1, x2, z1, z2, farve, y = 0, kant = null) => flade([[x1, y, z1], [x2, y, z1], [x2, y, z2], [x1, y, z2]], farve, { kant });
  const FORTOV = 0xe7e2d9, GRUS = 0xddd5c6, ASFALT = 0x8f8d89, GRAES = 0xcddbb6, STI = 0xe2ddd4;
  const xw = -1.5, fb = 2.6, zf = -9, zs = zf - fb, zn = D + 23, r = fb;
  // fortov foran og langs gavlen, med rundt hjørne
  L(xw, W, zs, zf, FORTOV);
  L(W, W + fb, zf, zn, FORTOV);
  const hj = [[W, 0, zf]];
  for (let i = 0; i <= 12; i++) { const v = Math.PI / 2 * i / 12; hj.push([W + Math.sin(v) * r, 0, zf - Math.cos(v) * r]); }
  flade(hj, FORTOV, { kant: null });
  for (let x = xw + 1.2; x < W; x += 1.2) streg([[x, 0.01, zs], [x, 0.01, zf]], "graa");            // fliser
  for (let z = zf + 1.2; z < zn; z += 1.2) streg([[W, 0.01, z], [W + fb, 0.01, z]], "graa");
  const kantsten = [[xw, 0.01, zs], [W, 0.01, zs]];
  for (let i = 0; i <= 12; i++) { const v = Math.PI / 2 * i / 12; kantsten.push([W + Math.sin(v) * r, 0.01, zf - Math.cos(v) * r]); }
  kantsten.push([W + fb, 0.01, zn]);
  streg(kantsten, "tyk");
  // gruspladsen foran huset, med lidt prikker, så den ligner grus
  L(xw, W, zf, 0, GRUS);
  for (let i = 0; i < 260; i++) {
    const t = n => { const v = Math.sin(n) * 43758.5453; return v - Math.floor(v); };
    const x = xw + 0.2 + t(i * 12.9898) * (W - xw - 0.4), z = zf + 0.2 + t(i * 78.233 + 1.7) * (-zf - 0.4);
    streg([[x, 0.01, z], [x + 0.08, 0.01, z + 0.03]], "graa");
  }
  streg([[xw, 0.01, zf], [W, 0.01, zf]]);
  L(xw, 0, 0, D, STI);                                         // smal sti langs vestgavlen, som slutter ved trappen
  // asfaltparkering foran butikkerne og ved husets bagside: pæn, mørk asfalt med hvide striber og lys kant
  L(BFX, W, D, BZ2, ASFALT, 0, "tynd");
  L(BFX, W, D - 0.0001, D, ASFALT);
  const hvidStribe = (x1, z1, x2, z2) => flade([[x1, 0.012, z1], [x2, 0.012, z1], [x2, 0.012, z2], [x1, 0.012, z2]], 0xffffff, { kant: null });
  for (let z = D + 1.4; z <= BZ2 - 0.6; z += 2.6) hvidStribe(BFX + 0.6, z - 0.06, W - 0.3, z + 0.06);   // p-pladser
  for (let z = D + 2.7; z < BZ2 - 0.6; z += 2.6) {                                                      // P-tegn i hver bås
    const x = W - 1.2;
    streg([[x, 0.015, z - 0.3], [x, 0.015, z + 0.3]], "tyk");
    streg([[x, 0.015, z + 0.3], [x + 0.35, 0.015, z + 0.3], [x + 0.35, 0.015, z], [x, 0.015, z]], "tyk");
  }
  kasse(BFX, BFX + 0.3, 0, 0.12, D + 0.2, BZ2 - 0.2, 0xd9d4cb, "tynd");                               // lav kantsten langs facaden
  // haven bag hegnet: græs, træer og buske
  L(xw, W, BZ2, zn, GRAES);
  for (const [x, z, rk] of [[1.5, D + 18.5, 2.3], [6.5, D + 20.5, 2.7], [10.0, D + 17.5, 1.9]]) {
    kasse(x - 0.15, x + 0.15, 0, 2.3, z - 0.15, z + 0.15, 0xb9a48c);
    rundt(x, 2.3 + rk * 0.85, z, rk, 0xa6c199);
  }
  for (const [x, z, rk] of [[11.0, BZ2 + 1.2, 0.9], [9.3, BZ2 + 1.0, 0.8], [3.5, BZ2 + 1.1, 0.9], [-0.6, D + 21.5, 1.0]]) rundt(x, rk * 0.8, z, rk, 0xb7cfa6);
  // hegnet: brædder på en lav mur med en murpille ved fortovet (Street View 10)
  const hx = W - 0.15;
  kasse(BFX, W, 0, 0.45, BZ2 + 0.05, BZ2 + 0.35, 0xd9b3a0);
  kasse(hx - 0.15, hx + 0.15, 0, 0.45, BZ2 + 0.05, zn, 0xd9b3a0);
  kasse(hx - 0.3, hx + 0.3, 0, 1.3, BZ2 - 0.25, BZ2 + 0.35, 0xc98f78);                                   // murpillen
  flade([[BFX, 0.45, BZ2 + 0.2], [hx - 0.3, 0.45, BZ2 + 0.2], [hx - 0.3, 1.9, BZ2 + 0.2], [BFX, 1.9, BZ2 + 0.2]], 0xd8c9b0);
  flade([[hx, 0.45, BZ2 + 0.35], [hx, 0.45, zn], [hx, 1.9, zn], [hx, 1.9, BZ2 + 0.35]], 0xd8c9b0);
  for (let x = BFX + 0.3; x < hx - 0.3; x += 0.3) streg([[x, 0.45, BZ2 + 0.19], [x, 1.9, BZ2 + 0.19]]);
  for (let z = BZ2 + 0.65; z < zn; z += 0.3) streg([[hx + 0.01, 0.45, z], [hx + 0.01, 1.9, z]]);
})();

// ---------- Murene ----------
flade([[0, 0, 0], [W, 0, 0], [W, H, 0], [0, H, 0]], F.murFront);
flade([[0, 0, D], [W, 0, D], [W, H, D], [0, H, D]], F.murBag);
flade([[W, 0, 0], [W, 0, D], [W, H, D], [W, H + R, D / 2], [W, H, 0]], F.murGavl);
flade([[0, 0, 0], [0, 0, D], [0, H, D], [0, H + R, D / 2], [0, H, 0]], F.murGavl);
streg([[0, 0.35, -0.01], [W, 0.35, -0.01]]);                     // sokkel

// ---------- Tag: flader, tagrand, tagrende, underside, knægte og hvide vindskeder ----------
flade([[-OV, H, -OV], [W + OV, H, -OV], [W + OV, H + R, D / 2], [-OV, H + R, D / 2]], F.tag, { kant: "tyk" });
flade([[-OV, H, D + OV], [W + OV, H, D + OV], [W + OV, H + R, D / 2], [-OV, H + R, D / 2]], F.tag, { kant: "tyk" });
for (let z = 0.6; z < D / 2; z += 0.6) streg([[-OV, tagFor(z), z], [W + OV, tagFor(z), z]]);          // tagstensrækker
for (let z = D - 0.6; z > D / 2; z -= 0.6) streg([[-OV, tagBag(z), z], [W + OV, tagBag(z), z]]);
for (const [z, ud] of [[-OV, -1], [D + OV, 1]]) {
  flade([[-OV, H - 0.18, z], [W + OV, H - 0.18, z], [W + OV, H, z], [-OV, H, z]], F.tagKant);          // tagrand
  flade([[-OV, H - 0.18, z], [W + OV, H - 0.18, z], [W + OV, H - 0.18, z - ud * OV], [-OV, H - 0.18, z - ud * OV]], F.hvid); // underside
  kasse(-OV, W + OV, H - 0.3, H - 0.16, z + ud * 0.02, z + ud * 0.16, F.rende, "tynd");                   // tagrende
  for (let x = 0.4; x < W; x += 1.0) {                                                                    // knægte under udhænget
    const zm = z - ud * OV;
    flade([[x, H - 0.18, zm], [x, H - 0.18, z - ud * 0.05], [x, H - 0.55, zm]], F.hvid);
  }
}
for (const [x, ud] of [[W, 1], [0, -1]]) {
  const xv = x + ud * OV;
  // vindskeder i to stykker, med lidt tykkelse
  flade([[xv, H - 0.1, -OV], [xv, H + R, D / 2], [xv, H + R - 0.4, D / 2], [xv, H - 0.5, -OV]], F.hvid);
  flade([[xv, H + R, D / 2], [xv, H - 0.1, D + OV], [xv, H - 0.5, D + OV], [xv, H + R - 0.4, D / 2]], F.hvid);
  flade([[xv - ud * 0.12, H + R - 0.4, D / 2], [xv, H + R - 0.4, D / 2], [xv, H - 0.5, -OV], [xv - ud * 0.12, H - 0.5, -OV]], F.hvid);
  flade([[xv - ud * 0.12, H + R - 0.4, D / 2], [xv, H + R - 0.4, D / 2], [xv, H - 0.5, D + OV], [xv - ud * 0.12, H - 0.5, D + OV]], F.hvid);
  for (const z of [1.2, 2.6, 4.0, 7.0, 8.4, 9.8]) {                                                       // knægte under vindskeden
    const y = tagGavl(z) - 0.45;
    flade([[x, y, z], [xv, y, z], [x, y - 0.4, z]], F.hvid);
  }
}
// nedløbsrør på forsiden
for (const x of [7.05, W - 0.15]) kasse(x - 0.05, x + 0.05, 0.1, H - 0.25, -0.16, -0.06, F.rende, "graa");

// ---------- Skorsten på bagsiden ----------
kasse(7.0, 7.8, H + R - 1.4, H + R + 0.9, 6.3, 7.1, F.skorsten);   // skorstenen sidder ca. x 7,0 til 7,8 (Street View 5 og 14)
kasse(6.93, 7.87, H + R + 0.9, H + R + 1.0, 6.23, 7.17, F.beton);

// ---------- Forsiden (Street View 1 lige på, 13 tæt på). Se Vinduesliste Hovedgaden 70 ----------
const fFor = facadeZ(0, -1);
// stuen: fire vinduer på række i samme højde, uden tværsprosse
for (const [a1, a2, fag] of [[0.93, 3.0, 3], [3.6, 5.65, 3], [7.1, 8.4, 2], [9.3, 11.1, 3]]) {
  vindue(fFor, a1, a2, 0.65, 2.0, { fag });
  saalbaenk(fFor, a1, a2, 0.65);
}
// 1. sal: bredt vindue i to (bred og smal) bag altanen, glasdør ud til altanen, vindue i tre (smal, bred, smal)
vindue(fFor, 0.05, 2.4, 3.8, 5.25, { dele: [1.6, 0.75] });
doer(fFor, 4.4, 5.25, 5.15, { y1: 2.95, glasTil: 0.05 });
streg([fFor(4.49, 4.05, 0.045), fFor(5.16, 4.05, 0.045)]);
vindue(fFor, 7.9, 10.4, 3.65, 5.05, { dele: [0.55, 1.4, 0.55] });
saalbaenk(fFor, 7.9, 10.4, 3.65);

// ---------- Bagsiden mod nord (Street View 14 og 5) ----------
const fBag = facadeZ(D, 1);
doer(fBag, 6.9, 7.75, 2.2);                                              // døren ved butikkerne
kasse(7.95, 9.4, 2.75, 2.83, D, D + 0.32, F.hvid);                       // lille hylde på muren
for (const [a1, a2, fag] of [[7.15, 7.7, 1], [5.7, 6.25, 1], [4.15, 4.65, 1], [1.3, 3.1, 2]]) {
  vindue(fBag, a1, a2, 3.75, 5.05, { fag });                             // fire vinduer på række på 1. sal
  saalbaenk(fBag, a1, a2, 3.75);
}

// ---------- Østgavlen: dør, postkasser, vinduer, plakat og fransk altan (Street View 3, 6 og 10) ----------
const fOest = facadeX(W, 1);
doer(fOest, 7.0, 7.85, 2.2);
for (const [z1, z2, hoej] of [[5.55, 5.83, false], [5.88, 6.16, true], [6.21, 6.49, false], [6.54, 6.82, false]]) {
  kasse(W, W + 0.2, hoej ? 0.6 : 1.05, 1.45, z1, z2, F.postkasse);                                       // postkasser
  streg([[W + 0.205, 1.32, z1 + 0.05], [W + 0.205, 1.32, z2 - 0.05]]);
}
vindue(fOest, 9.2, 9.95, 2.7, 3.2, { fag: 1 });
vindue(fOest, 6.8, 7.95, 3.85, 5.2, { fag: 2 });
doer(fOest, 7.0, 7.7, 7.85, { y1: 6.35, glasTil: 0.1 });            // døren til den franske altan

(() => {                                                              // den franske altan: betonplade og tremmegelænder
  const ax = W + 0.85, ay = 6.0, t = 0.35, ah = 7.3, z1 = 6.35, z2 = 8.35;
  kasse(W, ax, ay, ay + t, z1, z2, F.beton);
  for (let i = 0; i <= 10; i++) { const z = z1 + (z2 - z1) * i / 10; streg([[ax, ay + t, z], [ax, ah, z]]); }
  for (const x of [W + 0.21, W + 0.42, W + 0.63]) { streg([[x, ay + t, z1], [x, ah, z1]]); streg([[x, ay + t, z2], [x, ah, z2]]); }
  streg([[W, ah, z1], [ax, ah, z1], [ax, ah, z2], [W, ah, z2]], "tyk");
  streg([[ax, ay + t + 0.12, z1], [ax, ay + t + 0.12, z2]]);
})();

// Plakaten på gavlen: et butiksreklamebanner. Ingen lejernavne på siden
(() => {
  const c = document.createElement("canvas");
  c.width = 640; c.height = 880;
  const g = c.getContext("2d");
  const groen = "#2f6f49", lys = "#f3f5ea";
  g.fillStyle = lys; g.fillRect(0, 0, c.width, c.height);
  // øverste del: tegning af en butiksfacade med markise
  g.fillStyle = "#dfe8d3"; g.fillRect(0, 0, c.width, 430);
  const mx = 90, mb = c.width - 180, my = 120;
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#ffffff" : groen; g.fillRect(mx + i * mb / 8, my, mb / 8 + 1, 70); }
  g.fillStyle = groen;
  for (let i = 0; i < 8; i++) { g.beginPath(); g.arc(mx + (i + 0.5) * mb / 8, my + 70, mb / 16, 0, Math.PI); g.fill(); }
  g.fillStyle = "#ffffff"; g.fillRect(mx + 10, 215, mb - 20, 175);
  g.fillStyle = "#cfdde3"; g.fillRect(mx + 30, 235, 230, 135); g.fillRect(mx + 300, 235, 150, 155);
  g.strokeStyle = groen; g.lineWidth = 6; g.strokeRect(mx + 10, 215, mb - 20, 175);
  // tekst (uden pil, Benjamin 21-10)
  g.fillStyle = groen; g.textAlign = "center";
  g.font = "800 96px 'DM Sans', Arial, sans-serif"; g.fillText("BUTIKKER", c.width / 2, 610);
  g.font = "600 46px 'DM Sans', Arial, sans-serif"; g.fillText("Indgang fra Drosselvej", c.width / 2, 700);
  g.strokeStyle = "#c9d1b5"; g.lineWidth = 12; g.strokeRect(6, 6, c.width - 12, c.height - 12);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const bz1 = 2.3, bz2 = 5.2, by1 = 2.9, by2 = 6.9;
  const plade = new THREE.Mesh(new THREE.PlaneGeometry(bz2 - bz1, by2 - by1), new THREE.MeshBasicMaterial({ map: tex, polygonOffset: true, polygonOffsetFactor: -1 }));
  plade.position.copy(V(W + 0.04, (by1 + by2) / 2, (bz1 + bz2) / 2));
  plade.rotation.y = Math.PI / 2;
  scene.add(plade);
  const kant = [[W + 0.05, by1, bz1], [W + 0.05, by1, bz2], [W + 0.05, by2, bz2], [W + 0.05, by2, bz1]];
  for (let i = 0; i < 4; i++) streger.tynd.push(V(...kant[i]), V(...kant[(i + 1) % 4]));
})();

// ---------- Vestgavlen: rund rude højt oppe og et vindue mod bagsiden (Street View 8 og 9) ----------
(() => {
  const fVest = facadeX(0, -1);
  const cy = 7.9, cz = D / 2, r = 0.32, n = 24, ring = [], glas = [];
  for (let i = 0; i < n; i++) {
    const v = (i / n) * Math.PI * 2;
    ring.push(fVest(cz + Math.cos(v) * r, cy + Math.sin(v) * r, 0.02));
    glas.push(fVest(cz + Math.cos(v) * (r - 0.07), cy + Math.sin(v) * (r - 0.07), 0.035));
  }
  flade(ring, F.hvid);
  flade(glas, F.glas);
  streg([fVest(cz - r + 0.07, cy, 0.04), fVest(cz + r - 0.07, cy, 0.04)]);
  streg([fVest(cz, cy - r + 0.07, 0.04), fVest(cz, cy + r - 0.07, 0.04)]);
  // vinduer: to i stuen (stuen tv) og to på 1. sal. Placeringen er skønnet, gavlen ses kun delvist på billederne
  vindue(fVest, 4.6, 5.8, 0.9, 2.1, { fag: 2, tvaer: 0.72 });
  vindue(fVest, 7.6, 8.8, 0.9, 2.1, { fag: 2, tvaer: 0.72 });
  vindue(fVest, 5.0, 6.0, 3.4, 4.4, { fag: 1 });
  // døren ind til stuen tv, med en hvid trætrappe og repos ved hjørnet (Street View 8)
  doer(fVest, 2.0, 2.9, 2.65, { y1: 0.45, glasTil: 0.45 });
  const trae = 0xf4f1ea, rx = -1.3;
  kasse(rx, 0, 0.3, 0.45, 1.6, 3.4, trae);                       // repos
  kasse(rx, 0, 0.15, 0.3, 1.3, 1.6, trae);                       // trin
  kasse(rx, 0, 0, 0.15, 1.0, 1.3, trae);
  for (const z of [1.0, 1.6, 2.5, 3.4]) streg([[rx, z <= 1.3 ? 0.15 : 0.45, z], [rx, 1.35, z]]);
  streg([[rx, 1.05, 1.0], [rx, 1.35, 1.6], [rx, 1.35, 3.4], [-0.02, 1.35, 3.4]], "tyk");   // håndliste
  streg([[rx, 0.75, 1.6], [rx, 0.75, 3.4]]);
})();

// ---------- Kvistene: samme form og symmetriske om midten. Forgavlen står i flugt med muren lige over tagkanten.
// Vestlig: tre høje glasdøre ud til den øverste altan og én stor rude i gavlen. Østlig: to høje vinduer delt på midten
// og to ruder i gavlen med en lodret sprosse (Street View 1, 10 og 13) ----------
function kvist(x1, x2, altan = false) {
  const xm = (x1 + x2) / 2, zF = 0, top = H + 2.6, spids = H + 3.7, o = 0.3;
  const dz = y => (y - H) / R * (D / 2 + OV) - OV;
  const zT = dz(top), zS = dz(spids) + 0.3, zO = zF - o;
  for (const x of [x1, x2]) {
    flade([[x, tagFor(zF), zF], [x, top, zF], [x, top, zT]], F.hvid);
    for (let y = tagFor(zF) + 0.22; y < top; y += 0.22) streg([[x, y, zF], [x, y, Math.max(zF, dz(y))]]);   // vandret beklædning
  }
  const fod = altan ? 6.45 : H;                                    // bag altanen starter kvisten ved altangulvet
  flade([[x1, fod, zF], [x2, fod, zF], [x2, top, zF], [xm, spids, zF], [x1, top, zF]], F.hvid);
  const f = (a, y, u = 0) => [a, y, zF - u];
  const gy = top + 0.16, gs = spids - 0.38;
  if (altan) {
    flade([f(x1 + 0.55, gy, 0.035), f(x2 - 0.55, gy, 0.035), f(xm, gs, 0.035)], F.glas);                 // én stor rude
    vindue(f, x1 + 0.3, x2 - 0.3, 6.75, top - 0.06, { fag: 3, tvaer: 0.82, ramme: 0.09, sprosse: 0.09 }); // tre glasdøre
  } else {
    flade([f(x1 + 0.7, gy, 0.035), f(xm - 0.05, gy, 0.035), f(xm - 0.05, gs - 0.06, 0.035)], F.glas);    // to ruder
    flade([f(xm + 0.05, gy, 0.035), f(x2 - 0.7, gy, 0.035), f(xm + 0.05, gs - 0.06, 0.035)], F.glas);
    vindue(f, xm - 1.25, xm + 1.25, H + 0.45, top - 0.06, { fag: 2, tvaer: 0.5, ramme: 0.11, sprosse: 0.13 });
  }
  streg([f(x1, top + 0.05, 0.03), f(x2, top + 0.05, 0.03)]);                                                // bjælke under trekanten
  flade([[x1 - o, top - 0.1, zO], [xm, spids + 0.15, zO], [xm, spids + 0.15, zS], [x1 - o, top - 0.1, zT]], F.tag, { kant: "tyk" });
  flade([[x2 + o, top - 0.1, zO], [xm, spids + 0.15, zO], [xm, spids + 0.15, zS], [x2 + o, top - 0.1, zT]], F.tag, { kant: "tyk" });
  flade([[x1 - o, top - 0.1, zO], [xm, spids + 0.15, zO], [xm, spids - 0.15, zO], [x1 - o, top - 0.4, zO]], F.hvid);
  flade([[x2 + o, top - 0.1, zO], [xm, spids + 0.15, zO], [xm, spids - 0.15, zO], [x2 + o, top - 0.4, zO]], F.hvid);
}
kvist(1.3, 4.9, true);
kvist(7.1, 10.7);

// ---------- Bagsidens tag: lille kvist og fire ovenlysvinduer (Street View 5) ----------
(() => {
  const xm = 7.4, b = 1.0, ind = 0.5, top = H + 2.15, spids = H + 2.95;   // lille kvist med to ruder lige under skorstenen (Street View 5 og 14)
  const zF = D - ind, bund = tagBag(zF);
  const dzb = y => D + OV - (y - H) / R * (D / 2 + OV);
  const zT = dzb(top), zS = dzb(spids);
  for (const x of [xm - b, xm + b]) flade([[x, bund, zF], [x, top, zF], [x, top, zT]], F.hvid);
  flade([[xm - b, bund, zF], [xm + b, bund, zF], [xm + b, top, zF], [xm, spids, zF], [xm - b, top, zF]], F.hvid);
  vindue((a, y, u = 0) => [a, y, zF + u], xm - b + 0.22, xm + b - 0.22, bund + 0.12, top - 0.08, { fag: 2 });
  flade([[xm - b - 0.22, top - 0.05, zF + 0.22], [xm, spids + 0.12, zF + 0.22], [xm, spids + 0.12, zS], [xm - b - 0.22, top - 0.05, zT]], F.tag, { kant: "tyk" });
  flade([[xm + b + 0.22, top - 0.05, zF + 0.22], [xm, spids + 0.12, zF + 0.22], [xm, spids + 0.12, zS], [xm + b + 0.22, top - 0.05, zT]], F.tag, { kant: "tyk" });
  // tre ovenlysvinduer (x fra-til, afstand op ad taget fra-til), lyse grå rammer og lyst glas (Vinduesliste, tagvinduer)
  const p = (xx, zz, ll) => [xx, tagBag(zz) + ll, zz];
  for (const [x1, x2, d1, d2] of [[9.6, 10.9, 1.75, 2.9], [4.5, 5.6, 1.0, 2.0], [2.0, 3.05, 0.95, 1.85]]) {
    const z1 = D + OV - d1, z2 = D + OV - d2, l = 0.08, i = 0.08;
    flade([p(x1, z1, l), p(x2, z1, l), p(x2, z2, l), p(x1, z2, l)], 0xb9bcbe, { kant: "tyk" });          // ramme
    flade([p(x2, z1, 0), p(x2, z1, l), p(x2, z2, l), p(x2, z2, 0)], 0x9a9da0);
    flade([p(x1, z1, 0), p(x1, z1, l), p(x1, z2, l), p(x1, z2, 0)], 0x9a9da0);
    flade([p(x1, z1, 0), p(x2, z1, 0), p(x2, z1, l), p(x1, z1, l)], 0x9a9da0);
    flade([p(x1 - 0.05, z2 - 0.08, 0.02), p(x2 + 0.05, z2 - 0.08, 0.02), p(x2 + 0.05, z2, l), p(x1 - 0.05, z2, l)], 0x6f7275);   // inddækning foroven
    flade([p(x1 + i, z1 - i, l + 0.01), p(x2 - i, z1 - i, l + 0.01), p(x2 - i, z2 + i, l + 0.01), p(x1 + i, z2 + i, l + 0.01)], 0xe6ecef);   // glas
  }
  // udluftning: to små rør højt oppe mod øst og et lille rør under det midterste vindue
  for (const [x, d, hoej] of [[9.8, 4.0, 0.55], [10.15, 3.85, 0.45], [5.0, 0.55, 0.35]]) {
    const z = D + OV - d, y = tagBag(z);
    kasse(x - 0.09, x + 0.09, y - 0.2, y + hoej, z - 0.09, z + 0.09, 0xa9acae);
    kasse(x - 0.13, x + 0.13, y + hoej, y + hoej + 0.06, z - 0.13, z + 0.13, 0x8d9093);
  }
})();

// ---------- Butikkerne: lav tilbygning bag huset, facaden mod Drosselvej (Street View 14 lige på, 10 og 12). Se Vinduesliste ----------
(() => {
  const fx = BFX, x0 = BX0, h = 3.35, z1 = D, z2 = BZ2, k = 0.3;
  flade([[x0, h, z1], [fx, h, z1], [fx, h, z2], [x0, h, z2]], F.tag);
  flade([[fx, 0, z1], [fx, 0, z2], [fx, h, z2], [fx, h, z1]], F.murFront);
  flade([[x0, 0, z2], [fx, 0, z2], [fx, h, z2], [x0, h, z2]], F.murGavl);
  flade([[x0, 0, z1], [x0, 0, z2], [x0, h, z2], [x0, h, z1]], F.murGavl);
  flade([[x0, 0, z1], [0, 0, z1], [0, h, z1], [x0, h, z1]], F.murBag);
  for (const t of [                                                                     // lys, høj tagkant (3,05 til 3,7)
    [[fx, h - 0.3, z1], [fx + k, h - 0.3, z1], [fx + k, h + 0.35, z1], [fx, h + 0.35, z1]],
    [[fx + k, h - 0.3, z1], [fx + k, h - 0.3, z2 + k], [fx + k, h + 0.35, z2 + k], [fx + k, h + 0.35, z1]],
    [[x0 - k, h - 0.3, z2 + k], [fx + k, h - 0.3, z2 + k], [fx + k, h + 0.35, z2 + k], [x0 - k, h + 0.35, z2 + k]],
  ]) flade(t, 0xe4e1db, { kant: "tyk" });
  const f = facadeX(fx, 1), Z = a => z1 + a;
  vindue(f, Z(0.45), Z(1.2), 1.05, 2.05, { fag: 2 });                                   // vindue A
  flade([f(Z(1.65), 2.35, 0.04), f(Z(3.85), 2.35, 0.04), f(Z(3.85), 3.0, 0.04), f(Z(1.65), 3.0, 0.04)], F.skilt);   // skilt uden navn
  vindue(f, Z(1.85), Z(2.5), 0.8, 2.25, { fag: 1 });                                    // butik 1: vindue, dør, vindue
  doer(f, Z(2.5), Z(3.2), 2.25, { glasTil: 0.1 });
  vindue(f, Z(3.25), Z(3.95), 0.8, 2.25, { fag: 1 });
  vindue(f, Z(4.4), Z(5.75), 0.65, 2.3, { fag: 2, tvaer: 0.88 });                       // butik 2: vindue med overvindue
  doer(f, Z(5.8), Z(6.7), 2.3, { y1: 0.25, glasTil: 0.1 });                              // dør på repos
  vindue(f, Z(6.7), Z(7.1), 0.25, 2.3, { fag: 1 });                                     // sidevindue
  vindue(f, Z(7.65), Z(11.0), 0.3, 2.35, { fag: 3, ramme: 0.09, sprosse: 0.09 });       // stort vindue i tre
  kasse(fx, fx + 0.6, 2.42, 2.56, Z(4.0), Z(11.8), F.halvtag);                          // halvtag over butik 2
  flade([f(Z(12.3), 0, 0.02), f(Z(14.5), 0, 0.02), f(Z(14.5), 2.2, 0.02), f(Z(12.3), 2.2, 0.02)], F.hvid);   // hvid dobbeltdør
  streg([f(Z(13.4), 0, 0.04), f(Z(13.4), 2.2, 0.04)]);
  kasse(fx, fx + 0.8, 0, 0.1, Z(12.2), Z(14.7), F.beton);
  // repos med et trin foran døren til butik 2. Rampen er fjernet (Benjamin 22-10: "Fjern lige den rampe, der står foran")
  kasse(fx, fx + 1.1, 0, 0.25, Z(5.6), Z(7.2), F.beton);
  kasse(fx + 1.1, fx + 1.45, 0, 0.12, Z(5.6), Z(7.2), F.beton);
})();

// ---------- Altaner i stål: gulv, stålkant, klart glas forneden og mørkt glas foroven, tre stolper ----------
(() => {
  const bx1 = -0.36, bx2 = 6.86, bz = -1.6;
  for (const [bund, top, glas, zbag] of [[2.7, 2.95, [0xdce8ec, 0.45], 0], [6.45, 6.75, [0x464a4e, 0.6], 0]]) {
    const vt = top + 1.4;
    kasse(bx1, bx2, bund, top, bz, zbag, F.staal);
    flade([[bx1, top + 0.001, zbag], [bx2, top + 0.001, zbag], [bx2, top + 0.001, bz], [bx1, top + 0.001, bz]], F.gulv, { kant: null });
    for (const ramme of [
      [[bx1, top, bz], [bx2, top, bz], [bx2, vt, bz], [bx1, vt, bz]],
      [[bx2, top, bz], [bx2, top, zbag], [bx2, vt, zbag], [bx2, vt, bz]],
      [[bx1, top, bz], [bx1, top, zbag], [bx1, vt, zbag], [bx1, vt, bz]],
    ]) flade(ramme, glas[0], { glas: glas[1] });
    for (const x of [1.4, 3.3, 5.1]) streg([[x, top, bz], [x, vt, bz]]);
    for (const z of [bz / 2]) { streg([[bx1, top, z], [bx1, vt, z]]); streg([[bx2, top, z], [bx2, vt, z]]); }
    streg([[bx1, vt, zbag], [bx1, vt, bz], [bx2, vt, bz], [bx2, vt, zbag]], "tyk");
  }
  for (const x of [bx1, 3.3, bx2]) kasse(x - 0.06, x + 0.06, 0, 6.75, bz - 0.06, bz + 0.06, F.staal, "graa");
})();

// ---------- Stregerne samles i tre lag med fast tykkelse på skærmen ----------
const lagMat = [];
for (const [navn, farve, bredde] of [["tyk", 0x1d1b19, 1.8], ["tynd", 0x1d1b19, 0.9], ["graa", 0x6f6b66, 1.1]]) {
  if (!streger[navn].length) continue;
  const g = new LineSegmentsGeometry();
  g.setPositions(streger[navn].flatMap(p => p.toArray()));
  const m = new LineMaterial({ color: farve, linewidth: bredde, worldUnits: false });
  lagMat.push(m);
  scene.add(new LineSegments2(g, m));
}

// ---------- Lejemålene: data, rum der lyser op inde i huset, og billeder. Ingen oplysninger om lejerne ----------
const STUEN_TV_BILLEDER = ["stuen-tv-05-stue", "stuen-tv-02-koekken-alrum", "stuen-tv-03-koekken", "stuen-tv-01-vaerelse", "stuen-tv-04-bad"];
const STUEN_TH_BILLEDER = ["stuen-th-06-stue", "stuen-th-07-koekken", "stuen-th-08-stue-2", "stuen-th-09-gang", "stuen-th-10-vaerelse", "stuen-th-11-bad"];
const tagProfil = [[0.1, H + 0.05], [D - 0.1, H + 0.05], [D - 0.1, tagBag(D - 0.1) - 0.15], [D / 2, H + R - 0.35], [0.1, tagFor(0.1) - 0.15]];
const kasseProfil = (y1, y2, z1, z2) => [[z1, y1], [z2, y1], [z2, y2], [z1, y2]];
const ENHEDER = [
  { id: "2-sal", navn: "2. sal", type: "Lejlighed", m2: 105, status: "Udlejet", hvor: "Øverste etage under taget, med altan mod forsiden", vinkel: 25, hoejde: 24,
    tekst: "Lejligheden under taget, med de to kviste og den store altan mod forsiden.",
    pin: [9.0, 7.4, 0.1], x: [0.1, W - 0.1], profil: tagProfil, billeder: [] },
  { id: "1-sal", navn: "1. sal", type: "Lejlighed", m2: 117, status: "Udlejet", hvor: "Hele 1. sal, med altan mod forsiden", vinkel: 30, hoejde: 18,
    tekst: "Hele 1. sal, med altan mod forsiden og vinduer til tre sider.",
    pin: [9.1, 4.35, -0.1], x: [0.05, W - 0.05], profil: kasseProfil(2.85, 5.55, 0.05, D - 0.05), billeder: [] },
  { id: "stuen-tv", navn: "Stuen tv", type: "Lejlighed", m2: 63, vaer: 2, status: "Ledig 1. november 2026", ledig: true, hvor: "Stueetagen mod vest, med egen indgang fra gavlen", vinkel: -28, hoejde: 14,
    tekst: "Lys 2-værelses lejlighed i stueetagen mod vest. Sat i stand i januar 2026 og nymalet overalt. Køkkenet har nyt gulv, nyt loft og ny bordplade.",
    fakta: [["Husleje", "5.500 kr. om måneden"], ["Aconto varme og vand", "400 kr. + 300 kr."], ["I alt", "6.200 kr. om måneden"],
            ["Depositum", "16.500 kr. (3 måneders husleje)"], ["Ledig fra", "1. november 2026"], ["Lejeperiode", "Ubegrænset"],
            ["Husdyr og rygning", "Røgfri bolig, ingen husdyr"]],
    pin: [2.6, 1.45, -0.1], x: [0.05, 6.0], profil: kasseProfil(0.05, 2.75, 0.05, D - 0.05), billeder: STUEN_TV_BILLEDER },
  { id: "stuen-th", navn: "Stuen th", type: "Lejlighed", m2: 69, vaer: 2, status: "Udlejet", hvor: "Stueetagen mod øst, ud mod Drosselvej", vinkel: 42, hoejde: 14,
    tekst: "2-værelses lejlighed i stueetagen mod øst, ud mod Drosselvej.",
    pin: [9.7, 1.45, -0.1], x: [6.0, W - 0.05], profil: kasseProfil(0.05, 2.75, 0.05, D - 0.05), billeder: STUEN_TH_BILLEDER },
  { id: "erhverv-syd", navn: "Erhverv syd", type: "Erhverv", m2: 50, status: "Udlejet", hvor: "Den lave bygning ved Drosselvej, nærmest huset", vinkel: 100, hoejde: 16,
    tekst: "Erhvervslokale i den lave bygning mod Drosselvej, nærmest huset.",
    pin: [BFX + 0.2, 1.7, D + 2.6], x: [BX0 + 0.05, BFX - 0.05], profil: kasseProfil(0.05, 3.3, D + 0.05, D + 6.0), billeder: [] },
  { id: "erhverv-nord", navn: "Erhverv nord", type: "Erhverv", m2: 80, status: "Udlejet", hvor: "Den lave bygning ved Drosselvej, den nordlige del", vinkel: 108, hoejde: 16,
    tekst: "Erhvervslokale med store vinduer mod Drosselvej og egen indgang fra reposen.",
    pin: [BFX + 0.2, 1.7, D + 9.8], x: [BX0 + 0.05, BFX - 0.05], profil: kasseProfil(0.05, 3.3, D + 6.0, BZ2 - 0.05), billeder: [] },
];
const lysMat = new THREE.MeshBasicMaterial({ color: 0xee8a43, transparent: true, opacity: 0.3, depthTest: false, depthWrite: false, side: THREE.DoubleSide });
const lysKant = new LineMaterial({ color: 0xc8622a, linewidth: 2.4, worldUnits: false, depthTest: false, transparent: true });
lagMat.push(lysKant);
for (const e of ENHEDER) {
  // rummet er profilen trukket ud langs x, så det passer i huset, også under taget
  const [x1, x2] = e.x, pr = e.profil, pos = [], kant = [];
  const P = (x, [z, y]) => V(x, y, z);
  for (let i = 1; i < pr.length - 1; i++) for (const x of [x1, x2]) pos.push(...P(x, pr[0]).toArray(), ...P(x, pr[i]).toArray(), ...P(x, pr[i + 1]).toArray());
  for (let i = 0; i < pr.length; i++) {
    const a = pr[i], b = pr[(i + 1) % pr.length];
    pos.push(...P(x1, a).toArray(), ...P(x2, a).toArray(), ...P(x2, b).toArray(), ...P(x1, a).toArray(), ...P(x2, b).toArray(), ...P(x1, b).toArray());
    kant.push(...P(x1, a).toArray(), ...P(x1, b).toArray(), ...P(x2, a).toArray(), ...P(x2, b).toArray(), ...P(x1, a).toArray(), ...P(x2, a).toArray());
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  e.rum = new THREE.Mesh(g, lysMat);
  e.rum.renderOrder = 10;
  e.rum.visible = false;
  e.rum.userData.id = e.id;
  const kg = new LineSegmentsGeometry();
  kg.setPositions(kant);
  e.rumKant = new LineSegments2(kg, lysKant);
  e.rumKant.renderOrder = 11;
  e.rumKant.visible = false;
  scene.add(e.rum, e.rumKant);
}
const enhed = id => ENHEDER.find(e => e.id === id);
const billedSti = n => `billeder/${n}.jpg`;

// ---------- Kamera, der kredser om huset ----------
const kamera = new THREE.PerspectiveCamera(28, 2, 1, 400);
const maal = new THREE.Vector3(0.5, 3.4, -2.5);
let vinkel = 58, hoejde = 22, afstand = 50;
const START = 58, UDSVING = 32;
// ?vinkel=0&hoejde=8&afstand=30 i adressen låser kameraet, så en bestemt side kan tjekkes mod billederne
const fast = new URLSearchParams(location.search);
const laast = fast.has("vinkel");
if (laast) { vinkel = +fast.get("vinkel"); hoejde = +(fast.get("hoejde") || hoejde); }          // drejer roligt mellem ca. 26 og 90 grader (forside og gavl, gavl og butikker)
function stilKamera() {
  const a = THREE.MathUtils.degToRad(vinkel), b = THREE.MathUtils.degToRad(hoejde);
  kamera.position.set(maal.x + afstand * Math.sin(a) * Math.cos(b), maal.y + afstand * Math.sin(b), maal.z + afstand * Math.cos(a) * Math.cos(b));
  kamera.lookAt(maal);
}

let valgt = null, harTreD = false;
let visKort = () => {}, skjulKort = () => {};
function vaelg(id) {
  const e = id ? enhed(id) : null;
  if (!harTreD) { if (e) aabnSide(e.id); return; }
  for (const x of ENHEDER) { x.rum.visible = x === e; x.rumKant.visible = x === e; }
  document.querySelectorAll(".enhed-knap").forEach(k => k.classList.toggle("aktiv", !!e && k.dataset.enhed === e.id));
  if (e) {
    valgt = e; visKort(e);
    // på telefonen rulles huset frem, så man ser det lyse op, og infofeltet ligger lige under
    const t = document.querySelector(".tegning");
    if (window.innerWidth < 640 && t && t.getBoundingClientRect().top < 0) t.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  else {
    if (valgt) fase = Math.asin(THREE.MathUtils.clamp((vinkel - START) / UDSVING, -1, 1));
    valgt = null; skjulKort();
  }
}
let fase = 0;

// Lejemålets egen side: billeder, fakta og kontakt
const side = document.createElement("div");
side.className = "lejemaal-side";
side.hidden = true;
side.setAttribute("role", "dialog");
side.setAttribute("aria-modal", "true");
document.body.appendChild(side);
function aabnSide(id) {
  const e = enhed(id);
  const fotos = e.billeder.length
    ? e.billeder.map((n, i) => `<a class="foto${i === 0 ? " stor" : ""}" href="${billedSti(n)}" target="_blank" rel="noopener"><img src="${billedSti(n)}" alt="${e.navn}" loading="lazy"></a>`).join("")
    : [0, 1, 2].map(i => `<div class="pladsholder${i === 0 ? " stor" : ""}"><span>${i === 0 ? "Billeder af " + e.navn.toLowerCase() + " kommer" : ""}</span></div>`).join("");
  const fakta = [["Hvor", e.hvor], ["Type", e.type], ["Størrelse", `${e.m2} m²${e.vaer ? `, ${e.vaer} værelser` : ""}`], ["Status", e.status], ...(e.fakta || [])]
    .map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join("");
  side.innerHTML = `
    <div class="side-top"><div class="wrap"><button type="button" class="tilbage">← Tilbage til huset</button></div></div>
    <div class="wrap side-indhold">
      <div class="side-info">
        <span class="chip${e.ledig ? "" : " graa"}"><i></i>${e.status}</span>
        <h2>${e.navn}</h2>
        <p class="ind">${e.tekst}</p>
        <dl class="fakta">${fakta}</dl>
        <div class="knapper">
          <a class="pill sort" href="mailto:info@dokaejendomme.dk?subject=${encodeURIComponent(e.navn + ", Hovedgaden 70")}">Skriv til os <span class="pil">→</span></a>
          ${e.ledig ? `<a class="pill kant" href="#ledig" data-luk>Se hele annoncen</a>` : ""}
        </div>
        ${e.ledig ? "" : `<p class="lille-tekst">Lejemålet er udlejet. Skriv alligevel, så gemmer vi din henvendelse, til der bliver noget ledigt.</p>`}
      </div>
      <div class="galleri">${fotos}</div>
    </div>`;
  side.hidden = false;
  document.body.classList.add("laast");
  side.scrollTop = 0;
  side.querySelector(".tilbage").addEventListener("click", lukSide);
  side.querySelectorAll("[data-luk]").forEach(a => a.addEventListener("click", lukSide));
  side.querySelector(".tilbage").focus();
}
function lukSide() { side.hidden = true; document.body.classList.remove("laast"); }
document.addEventListener("keydown", ev => {
  if (ev.key !== "Escape") return;
  if (!side.hidden) lukSide(); else vaelg(null);
});
document.querySelectorAll(".enhed-knap").forEach(k => k.addEventListener("click", () => vaelg(k.dataset.enhed)));

let renderer = null;
try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { renderer = null; }

if (boks && renderer) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  boks.appendChild(renderer.domElement);
  tegning.classList.add("er-3d");

  function tilpas() {
    const b = boks.clientWidth, h = Math.round(b * (window.innerWidth < 640 ? 0.6 : 0.5));
    renderer.setSize(b, h, false);
    renderer.domElement.style.width = b + "px";
    renderer.domElement.style.height = h + "px";
    kamera.aspect = b / h;
    afstand = laast && fast.has("afstand") ? +fast.get("afstand") : (window.innerWidth < 640 ? 54 : 50);
    kamera.updateProjectionMatrix();
    const s = new THREE.Vector2();
    renderer.getDrawingBufferSize(s);
    lagMat.forEach(m => m.resolution.set(s.x, s.y));
  }
  window.addEventListener("resize", tilpas);
  tilpas();

  // Træk for at dreje. Efter et træk venter den lidt og drejer så videre af sig selv
  const rolig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let traekker = false, sidstX = 0, sidstY = 0, pause = 0, sidstTid = performance.now();
  const flade3d = renderer.domElement;
  flade3d.addEventListener("pointerdown", e => { traekker = true; sidstX = e.clientX; sidstY = e.clientY; flade3d.setPointerCapture(e.pointerId); boks.classList.add("traekker"); });
  flade3d.addEventListener("pointermove", e => {
    if (!traekker) return;
    vinkel -= (e.clientX - sidstX) * 0.35;
    hoejde = THREE.MathUtils.clamp(hoejde + (e.clientY - sidstY) * 0.2, 6, 55);
    sidstX = e.clientX; sidstY = e.clientY;
  });
  const slip = () => {
    traekker = false; pause = 2.5; boks.classList.remove("traekker");
    fase = Math.asin(THREE.MathUtils.clamp((vinkel - START) / UDSVING, -1, 1));
  };
  flade3d.addEventListener("pointerup", slip);
  flade3d.addEventListener("pointercancel", slip);

  // Infovinduet ligger under knapperne, så det ikke dækker huset (Benjamin 22-10: markørerne fyldte for meget og er fjernet)
  const kort = document.getElementById("enhedInfo");
  visKort = e => {
    const fotos = e.billeder.slice(0, 5);
    const stor = fotos.length ? `<img class="forh-stor" src="${billedSti(fotos[0])}" alt="${e.navn}">` : `<div class="forh-stor pladsholder"><span>Billeder kommer</span></div>`;
    const smaa = (fotos.length ? fotos.slice(1, 5) : [null, null, null, null])
      .map((n, i) => n ? `<button type="button" class="forh-lille" data-billede="${n}" aria-label="Vis billede ${i + 2}"><img src="${billedSti(n)}" alt=""></button>` : `<div class="forh-lille pladsholder"></div>`).join("");
    const ledigTekst = e.ledig ? e.status : "Udlejet";
    kort.innerHTML = `
      <button type="button" class="luk" aria-label="Luk">×</button>
      <div class="forh-billeder">${stor}<div class="forh-smaa">${smaa}</div></div>
      <div class="info-tekst">
        <span class="chip${e.ledig ? "" : " graa"}"><i></i>${e.ledig ? "Ledig" : "Udlejet"}</span>
        <h3>${e.navn}</h3>
        <dl class="forh-fakta">
          <dt>Hvor</dt><dd>${e.hvor}</dd>
          <dt>Type</dt><dd>${e.type}, ${e.m2} m²${e.vaer ? `, ${e.vaer} værelser` : ""}</dd>
          <dt>${e.ledig ? "Ledig" : "Status"}</dt><dd>${e.ledig ? "Fra 1. november 2026" : "Udlejet"}</dd>
        </dl>
        <button type="button" class="pill sort lille-pill">Se lejemålet <span class="pil">→</span></button>
      </div>`;
    kort.hidden = false;
    kort.setAttribute("aria-label", `${e.navn}: ${ledigTekst}`);
    kort.querySelector(".luk").addEventListener("click", ev => { ev.stopPropagation(); vaelg(null); });
    kort.querySelector(".lille-pill").addEventListener("click", ev => { ev.stopPropagation(); aabnSide(e.id); });
    kort.querySelectorAll(".forh-lille[data-billede]").forEach(k => k.addEventListener("click", () => {   // lille billede bytter med det store
      const big = kort.querySelector("img.forh-stor"), ny = k.dataset.billede, gammel = big.getAttribute("src").replace(/^billeder\/|\.jpg$/g, "");
      big.src = billedSti(ny); k.dataset.billede = gammel; k.querySelector("img").src = billedSti(gammel);
    }));
  };
  skjulKort = () => { kort.hidden = true; };
  harTreD = true;

  // Klik direkte på huset: find det lejemål, man rammer
  const straale = new THREE.Raycaster(), mus = new THREE.Vector2();
  let flyttet = 0;
  flade3d.addEventListener("pointerdown", () => { flyttet = 0; });
  flade3d.addEventListener("pointermove", e => { if (traekker) flyttet += Math.abs(e.movementX) + Math.abs(e.movementY); });
  flade3d.addEventListener("pointerup", e => {
    if (flyttet > 6) return;
    const r = flade3d.getBoundingClientRect();
    mus.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    straale.setFromCamera(mus, kamera);
    const hit = straale.intersectObjects(ENHEDER.map(x => x.rum))[0];
    vaelg(hit ? hit.object.userData.id : null);
  });

  let synlig = true;
  new IntersectionObserver(([e]) => { synlig = e.isIntersecting; }).observe(boks);

  function tik(nu) {
    const dt = Math.min((nu - sidstTid) / 1000, 0.05);
    sidstTid = nu;
    if (valgt && !traekker) {
      vinkel += (valgt.vinkel - vinkel) * Math.min(1, dt * 2.5);
      hoejde += (valgt.hoejde - hoejde) * Math.min(1, dt * 2.5);
    } else if (!traekker && !rolig && !laast) {
      if (pause > 0) pause -= dt;
      else { fase += dt * 0.22; vinkel += (START + UDSVING * Math.sin(fase) - vinkel) * Math.min(1, dt * 1.5); }
    }
    if (synlig) { stilKamera(); renderer.render(scene, kamera); }
    requestAnimationFrame(tik);
  }
  stilKamera();
  requestAnimationFrame(tik);
}

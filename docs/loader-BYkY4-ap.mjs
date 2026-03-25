var g = /* @__PURE__ */ ((l) => (l[l.Left = 0] = "Left", l[l.Center = 1] = "Center", l[l.Right = 2] = "Right", l[l.Aligned = 3] = "Aligned", l[l.Middle = 4] = "Middle", l[l.Fit = 5] = "Fit", l[l.TopLeft = 6] = "TopLeft", l[l.TopCenter = 7] = "TopCenter", l[l.TopRight = 8] = "TopRight", l[l.MiddleLeft = 9] = "MiddleLeft", l[l.MiddleCenter = 10] = "MiddleCenter", l[l.MiddleRight = 11] = "MiddleRight", l[l.BottomLeft = 12] = "BottomLeft", l[l.BottomCenter = 13] = "BottomCenter", l[l.BottomRight = 14] = "BottomRight", l))(g || {});
const z = {
  1: g.TopLeft,
  2: g.TopCenter,
  3: g.TopRight,
  4: g.MiddleLeft,
  5: g.MiddleCenter,
  6: g.MiddleRight,
  7: g.BottomLeft,
  8: g.BottomCenter,
  9: g.BottomRight
};
class T {
  constructor(i, t) {
    this.drawing = i, this.output = t, this.layers = {}, this.flattenZ = !0, this.targetZ = 0, this.explodeAttributesOnly = !1, this.db = null, this.processedBlocks = /* @__PURE__ */ new Set();
  }
  setFlattenZ(i, t = 0) {
    this.flattenZ = i, this.targetZ = t;
  }
  setExplodeAttributesOnly(i) {
    this.explodeAttributesOnly = i;
  }
  getZ(i) {
    return this.flattenZ ? this.targetZ : i ?? 0;
  }
  async load(i) {
    this.db = i, this.processedBlocks.clear(), await this.initializeDefaults(), await this.loadLayers(i), await this.loadEntities(i);
  }
  async initializeDefaults() {
    this.layers[0] = this.drawing.layers.layer0;
  }
  async loadLayers(i) {
    const t = i.tables.LAYER;
    if (!(!t || !t.entries)) {
      await this.drawing.layers.beginUpdate();
      try {
        for (const r of t.entries)
          if (r.name === "0")
            this.layers[r.name] = this.drawing.layers.layer0;
          else {
            const o = {
              name: r.name,
              color: r.colorIndex ?? 7,
              hidden: r.off ?? !1
            };
            this.layers[r.name] = await this.drawing.layers.add(o);
          }
      } finally {
        await this.drawing.layers.endUpdate();
      }
      this.output.info("Загружено слоёв: {0}", Object.keys(this.layers).length);
    }
  }
  async loadEntities(i) {
    const t = this.drawing.layouts.model;
    if (!t) {
      this.output.warn("Model space not found");
      return;
    }
    const r = t.editor(), o = await this.explodeAllBlocks(i.entities, 3);
    this.output.info("После взрыва блоков: {0} объектов", o.length), await r.beginEdit();
    try {
      for (const n of o)
        await this.processEntity(r, n);
    } finally {
      await r.endEdit();
    }
    this.output.info("Обработано {0} объектов", o.length);
  }
  async explodeAllBlocks(i, t) {
    let r = [];
    for (let o = 0; o < t; o++) {
      const n = o === 0 ? i : r, a = [];
      let f = !1;
      for (const h of n)
        if (h.type === "INSERT") {
          f = !0;
          const P = this.explodeBlock(h);
          a.push(...P);
        } else if (h.type === "ACAD_TABLE") {
          const P = this.explodeTable(h);
          a.push(...P);
        } else
          a.push(h);
      if (r = a, !f) {
        this.output.info("Взрыв завершен на глубине {0}", o + 1);
        break;
      }
      this.output.info("Проход {0}: {1} объектов", o + 1, r.length);
    }
    return r;
  }
  explodeBlock(i) {
    var x, u;
    if (!this.db || !i.name) return [i];
    const t = (u = (x = this.db.tables.BLOCK_RECORD) == null ? void 0 : x.entries) == null ? void 0 : u.find(
      (p) => p.name === i.name
    );
    if (!t || !t.entities || t.entities.length === 0)
      return [];
    const r = i.insertionPoint || { x: 0, y: 0, z: 0 }, o = t.basePoint || { x: 0, y: 0, z: 0 }, n = i.xScale || 1, a = i.yScale || 1, f = i.zScale || 1, h = (i.rotation || 0) * Math.PI / 180, P = Math.cos(h), c = Math.sin(h), e = [], s = i, d = Array.isArray(s.attributes) ? s.attributes : [], w = this.explodeAttributesOnly ? [
      ...t.entities.filter((p) => p.type === "ATTRIB"),
      ...d.filter((p) => p.type === "ATTRIB")
    ] : t.entities;
    for (const p of w) {
      const y = this.transformEntityData(
        p,
        r,
        o,
        n,
        a,
        f,
        P,
        c,
        i.rotation || 0
      );
      y && (!y.layer && i.layer && (y.layer = i.layer), e.push(y));
    }
    return e;
  }
  explodeTable(i) {
    const t = i;
    return t.entities && Array.isArray(t.entities) ? (this.output.info("TABLE: взрываем {0} вложенных объектов", t.entities.length), t.entities) : [i];
  }
  transformEntityData(i, t, r, o, n, a, f, h, P) {
    const c = (s, d, w) => {
      const x = (s - r.x) * o, u = (d - r.y) * n, p = (w - r.z) * a;
      return {
        x: t.x + x * f - u * h,
        y: t.y + x * h + u * f,
        z: t.z + p
      };
    }, e = JSON.parse(JSON.stringify(
      i,
      (s, d) => typeof d == "bigint" ? Number(d) : d
    ));
    if (i.type === "INSERT") {
      const s = e.insertionPoint || { x: 0, y: 0, z: 0 };
      return e.insertionPoint = c(s.x, s.y, s.z || 0), e.xScale = (e.xScale || 1) * o, e.yScale = (e.yScale || 1) * n, e.zScale = (e.zScale || 1) * a, e.rotation = (e.rotation || 0) + P, e;
    }
    switch (i.type) {
      case "LINE":
        return e.startPoint = c(e.startPoint.x, e.startPoint.y, e.startPoint.z || 0), e.endPoint = c(e.endPoint.x, e.endPoint.y, e.endPoint.z || 0), e;
      case "CIRCLE":
        return e.center = c(e.center.x, e.center.y, e.center.z || 0), e.radius *= Math.abs(o), e;
      case "ARC":
        return e.center = c(e.center.x, e.center.y, e.center.z || 0), e.radius *= Math.abs(o), e;
      case "TEXT":
      case "MTEXT": {
        const s = e.startPoint || e.insertionPoint || e.position || { x: 0, y: 0, z: 0 }, d = c(s.x, s.y, s.z || 0);
        return e.startPoint = d, e.insertionPoint = d, e.position = d, e.height && (e.height *= Math.abs(n)), e.textHeight && (e.textHeight *= Math.abs(n)), e;
      }
      case "LWPOLYLINE":
        return e.points && (e.points = e.points.map((s) => {
          const d = c(s.x, s.y, 0);
          return { ...s, x: d.x, y: d.y };
        })), e.vertices && (e.vertices = e.vertices.map((s) => {
          var w, x;
          const d = c(s.x || ((w = s.point) == null ? void 0 : w.x) || 0, s.y || ((x = s.point) == null ? void 0 : x.y) || 0, 0);
          return { ...s, x: d.x, y: d.y, point: d };
        })), e;
      case "POLYLINE2D":
      case "POLYLINE3D":
        return e.vertices && (e.vertices = e.vertices.map((s) => {
          var p, y, E;
          const d = ((p = s.point) == null ? void 0 : p.x) ?? s.x ?? 0, w = ((y = s.point) == null ? void 0 : y.y) ?? s.y ?? 0, x = ((E = s.point) == null ? void 0 : E.z) ?? s.z ?? 0, u = c(d, w, x);
          return { ...s, point: u, x: u.x, y: u.y, z: u.z };
        })), e;
      case "SPLINE":
        return e.controlPoints && (e.controlPoints = e.controlPoints.map((s) => c(s.x, s.y, s.z || 0))), e.fitPoints && (e.fitPoints = e.fitPoints.map((s) => c(s.x, s.y, s.z || 0))), e;
      case "ATTRIB":
      case "ATTDEF": {
        const s = e.insertionPoint || e.position || { x: 0, y: 0, z: 0 }, d = c(s.x, s.y, s.z || 0);
        return e.insertionPoint = d, e.position = d, e.height && (e.height *= Math.abs(n)), e.type = "TEXT", e;
      }
      default:
        return e;
    }
  }
  getLayer(i) {
    return this.layers[i.layer] ?? this.layers[0];
  }
  getEntityColor(i) {
    const t = i, r = ["color", "colorIndex", "colorValue", "trueColor", "rgb", "aci", "colorRef"], o = [];
    for (const n of r)
      t[n] !== void 0 && o.push(`${n}=${t[n]}`);
    if (o.length > 0 && this.output.info("COLOR {0}: {1}", i.type, o.join(", ")), t.colorIndex !== void 0 && t.colorIndex !== 256 && t.colorIndex !== 0)
      return t.colorIndex;
    if (t.color !== void 0 && t.color !== 256 && t.color !== 0) {
      if (typeof t.color == "number")
        return t.color;
      if (t.color.r !== void 0)
        return 255 << 24 | t.color.r << 16 | t.color.g << 8 | t.color.b;
    }
    if (t.trueColor !== void 0) {
      if (typeof t.trueColor == "number")
        return t.trueColor | 255 << 24;
      if (t.trueColor.r !== void 0)
        return 255 << 24 | t.trueColor.r << 16 | t.trueColor.g << 8 | t.trueColor.b;
    }
    if (t.colorValue !== void 0 && t.colorValue !== 0)
      return t.colorValue | 255 << 24;
    if (t.rgb !== void 0)
      return t.rgb | 255 << 24;
  }
  async applyEntityProperties(i, t, r) {
    await i.setx("$layer", t);
    const o = this.getEntityColor(r);
    o !== void 0 && await i.setx("color", o);
  }
  async processEntity(i, t) {
    const r = this.getLayer(t);
    try {
      switch (t.type) {
        case "LINE":
          await this.addLine(i, t, r);
          break;
        case "CIRCLE":
          await this.addCircle(i, t, r);
          break;
        case "ARC":
          await this.addArc(i, t, r);
          break;
        case "LWPOLYLINE":
          await this.addLwPolyline(i, t, r);
          break;
        case "TEXT":
          await this.addText(i, t, r);
          break;
        case "MTEXT":
          await this.addMText(i, t, r);
          break;
        case "POLYLINE2D":
          await this.addPolyline2d(i, t, r);
          break;
        case "POLYLINE3D":
          await this.addPolyline3d(i, t, r);
          break;
        case "SPLINE":
          await this.addSpline(i, t, r);
          break;
        case "ACAD_TABLE":
          await this.addTable(i, t, r);
          break;
        default:
          break;
      }
    } catch (o) {
      this.output.warn("Ошибка обработки {0}: {1}", t.type, o.message);
    }
  }
  async addLine(i, t, r) {
    await i.addLine({
      a: [t.startPoint.x, t.startPoint.y, this.getZ(t.startPoint.z)],
      b: [t.endPoint.x, t.endPoint.y, this.getZ(t.endPoint.z)],
      layer: r,
      color: this.getEntityColor(t)
    });
  }
  async addCircle(i, t, r) {
    await i.addCircle({
      center: [t.center.x, t.center.y, this.getZ(t.center.z)],
      radius: t.radius,
      layer: r,
      color: this.getEntityColor(t)
    });
  }
  async addArc(i, t, r) {
    const o = t.startAngle ?? 0;
    let a = (t.endAngle ?? Math.PI * 2) - o;
    a < 0 && (a += Math.PI * 2), await i.addArc({
      center: [t.center.x, t.center.y, this.getZ(t.center.z)],
      radius: t.radius,
      angle: o,
      span: a,
      layer: r,
      color: this.getEntityColor(t)
    });
  }
  async addLwPolyline(i, t, r) {
    if (!t.vertices || t.vertices.length < 2) return;
    const o = t, n = this.getZ(o.elevation), a = o.constantWidth || o.startWidth || o.globalWidth || void 0;
    if (a) {
      const f = t.vertices.map((h) => [h.x, h.y, h.bulge || 0]);
      await i.addPolyline({
        vertices: f,
        flags: (t.flag & 1) === 1 ? 1 : void 0,
        width: a,
        elevation: n,
        layer: r,
        color: this.getEntityColor(t)
      });
    } else {
      const f = t.vertices.map((h) => [h.x, h.y, n]);
      await i.addPolyline3d({
        vertices: f,
        flags: (t.flag & 1) === 1 ? 1 : void 0,
        layer: r,
        color: this.getEntityColor(t)
      });
    }
  }
  async addText(i, t, r) {
    var x, u;
    const o = t, n = o.startPoint || o.insertionPoint || o.position || { x: 0, y: 0, z: 0 }, a = o.text || o.textValue || o.content || "", f = o.textHeight || o.height || 2.5, h = ["rotation", "angle", "direction", "horizontalAlignment", "verticalAlignment", "halign", "valign", "alignment", "justify"], P = [];
    for (const p of h)
      if (o[p] !== void 0) {
        const y = o[p];
        P.push(`${p}=${typeof y == "object" ? JSON.stringify(y) : y}`);
      }
    this.output.info("TEXT fields: {0}", P.join(", ") || "none");
    let c = 0;
    if (o.direction && (o.direction.x !== 1 || o.direction.y !== 0) ? c = Math.atan2(o.direction.y, o.direction.x) : o.rotation ? c = o.rotation : o.angle && (c = o.angle), this.output.info(
      'TEXT: pos=({0},{1}), h={2}, rot={3}rad ({4}deg), text="{5}"',
      (x = n.x) == null ? void 0 : x.toFixed(2),
      (u = n.y) == null ? void 0 : u.toFixed(2),
      f,
      c == null ? void 0 : c.toFixed(3),
      (c * 180 / Math.PI).toFixed(1),
      a == null ? void 0 : a.substring(0, 30)
    ), !a) {
      this.output.warn("TEXT: пустой текст, пропуск");
      return;
    }
    const e = o.horizontalAlignment || 0, s = o.verticalAlignment || 0, w = {
      "0_0": g.Left,
      // baseline left
      "1_0": g.Center,
      // baseline center
      "2_0": g.Right,
      // baseline right
      "0_1": g.BottomLeft,
      "1_1": g.BottomCenter,
      "2_1": g.BottomRight,
      "0_2": g.MiddleLeft,
      "1_2": g.MiddleCenter,
      "2_2": g.MiddleRight,
      "0_3": g.TopLeft,
      "1_3": g.TopCenter,
      "2_3": g.TopRight
    }[`${e}_${s}`] || g.Left;
    await i.addText({
      position: [n.x, n.y, this.getZ(n.z)],
      height: f,
      content: a,
      rotation: c,
      justify: w,
      layer: r,
      color: this.getEntityColor(t)
    });
  }
  async addMText(i, t, r) {
    var s, d;
    const o = t, n = o.insertionPoint || o.position || { x: 0, y: 0, z: 0 };
    let a = o.text || o.textValue || o.content || "";
    const f = o.textHeight || o.height || 2.5, h = ["rotation", "angle", "direction", "attachment", "attachmentPoint", "drawingDirection", "flowDirection"], P = [];
    for (const w of h)
      if (o[w] !== void 0) {
        const x = o[w];
        P.push(`${w}=${typeof x == "object" ? JSON.stringify(x) : x}`);
      }
    this.output.info("MTEXT fields: {0}", P.join(", ") || "none");
    let c = 0;
    if (o.direction && (o.direction.x !== 1 || o.direction.y !== 0) ? c = Math.atan2(o.direction.y, o.direction.x) : o.xAxisDirection && (o.xAxisDirection.x !== 1 || o.xAxisDirection.y !== 0) ? c = Math.atan2(o.xAxisDirection.y, o.xAxisDirection.x) : o.rotation && (c = o.rotation), this.output.info(
      'MTEXT: pos=({0},{1}), h={2}, rot={3}rad ({4}deg), raw="{5}"',
      (s = n.x) == null ? void 0 : s.toFixed(2),
      (d = n.y) == null ? void 0 : d.toFixed(2),
      f,
      c == null ? void 0 : c.toFixed(3),
      (c * 180 / Math.PI).toFixed(1),
      a == null ? void 0 : a.substring(0, 30)
    ), a = a.replace(/\\[A-Za-z][^;]*;/g, "").replace(/\{|\}/g, "").replace(/\\P/g, `
`).replace(/\\/g, ""), !a.trim()) {
      this.output.warn("MTEXT: пустой текст после очистки");
      return;
    }
    const e = z[o.attachmentPoint] || g.Left;
    await i.addText({
      position: [n.x, n.y, this.getZ(n.z)],
      height: f,
      content: a.trim(),
      rotation: c,
      justify: e,
      layer: r,
      color: this.getEntityColor(t)
    });
  }
  async addPolyline2d(i, t, r) {
    if (!t.vertices || t.vertices.length < 2) return;
    const o = this.getZ(t.elevation), n = t.vertices.map((a) => [a.point.x, a.point.y, o]);
    await i.addPolyline3d({
      vertices: n,
      flags: (t.flag & 1) === 1 ? 1 : void 0,
      layer: r,
      color: this.getEntityColor(t)
    });
  }
  async addPolyline3d(i, t, r) {
    if (!t.vertices || t.vertices.length < 2) return;
    const o = t.vertices.map((n) => [n.point.x, n.point.y, this.getZ(n.point.z)]);
    await i.addPolyline3d({
      vertices: o,
      flags: (t.flag & 1) === 1 ? 1 : void 0,
      layer: r,
      color: this.getEntityColor(t)
    });
  }
  async addSpline(i, t, r) {
    var a;
    const o = ((a = t.fitPoints) == null ? void 0 : a.length) > 0 ? t.fitPoints : t.controlPoints;
    if (!o || o.length < 2) return;
    const n = o.map((f) => [f.x, f.y, this.getZ(f.z)]);
    await i.addPolyline3d({
      vertices: n,
      layer: r,
      color: this.getEntityColor(t)
    });
  }
  async addTable(i, t, r) {
    var s, d, w, x;
    if (this.output.info(
      "TABLE: name={0}, rows={1}, cols={2}, cells={3}",
      t.name,
      t.rowCount,
      t.columnCount,
      ((s = t.cells) == null ? void 0 : s.length) ?? 0
    ), !t.cells || t.cells.length === 0) {
      this.output.warn("TABLE: пустая таблица, пропускаем");
      return;
    }
    if (!t.rowHeightArr || !t.columnWidthArr) {
      this.output.warn("TABLE: нет данных о размерах строк/столбцов");
      return;
    }
    const o = ((d = t.startPoint) == null ? void 0 : d.x) ?? 0, n = ((w = t.startPoint) == null ? void 0 : w.y) ?? 0, a = this.getZ((x = t.startPoint) == null ? void 0 : x.z);
    this.output.info(
      "TABLE: startPoint=({0}, {1}), rowHeights={2}, colWidths={3}",
      o,
      n,
      t.rowHeightArr.length,
      t.columnWidthArr.length
    );
    let f = n, h = 0, P = 0;
    for (let u = 0; u < t.rowCount && u < t.rowHeightArr.length; u++) {
      let p = o;
      const y = t.rowHeightArr[u] || 10;
      for (let E = 0; E < t.columnCount && E < t.columnWidthArr.length && !(h >= t.cells.length); E++) {
        const L = t.cells[h], b = t.columnWidthArr[E] || 50;
        if (L && L.text && L.text.trim()) {
          const C = L.textHeight || Math.min(y * 0.6, 2.5);
          await (await i.addText({
            position: [p + 2, f - y / 2, a],
            height: C,
            content: L.text.trim()
          })).setx("$layer", r), P++;
        }
        p += b, h++;
      }
      f -= y;
    }
    const c = t.columnWidthArr.reduce((u, p) => u + (p || 0), 0), e = t.rowHeightArr.reduce((u, p) => u + (p || 0), 0);
    if (c > 0 && e > 0) {
      const u = [
        [o, n, a],
        [o + c, n, a],
        [o + c, n - e, a],
        [o, n - e, a]
      ];
      await (await i.addPolyline3d({
        vertices: u,
        flags: 1
      })).setx("$layer", r);
      let y = n;
      for (let L = 0; L < t.rowHeightArr.length; L++)
        y -= t.rowHeightArr[L] || 0, L < t.rowHeightArr.length - 1 && await (await i.addLine({
          a: [o, y, a],
          b: [o + c, y, a]
        })).setx("$layer", r);
      let E = o;
      for (let L = 0; L < t.columnWidthArr.length; L++)
        E += t.columnWidthArr[L] || 0, L < t.columnWidthArr.length - 1 && await (await i.addLine({
          a: [E, n, a],
          b: [E, n - e, a]
        })).setx("$layer", r);
    }
    this.output.info("TABLE: загружено {0} текстовых ячеек", P);
  }
}
export {
  T as default
};

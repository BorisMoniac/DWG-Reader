var u = /* @__PURE__ */ ((l) => (l[l.Left = 0] = "Left", l[l.Center = 1] = "Center", l[l.Right = 2] = "Right", l[l.Aligned = 3] = "Aligned", l[l.Middle = 4] = "Middle", l[l.Fit = 5] = "Fit", l[l.TopLeft = 6] = "TopLeft", l[l.TopCenter = 7] = "TopCenter", l[l.TopRight = 8] = "TopRight", l[l.MiddleLeft = 9] = "MiddleLeft", l[l.MiddleCenter = 10] = "MiddleCenter", l[l.MiddleRight = 11] = "MiddleRight", l[l.BottomLeft = 12] = "BottomLeft", l[l.BottomCenter = 13] = "BottomCenter", l[l.BottomRight = 14] = "BottomRight", l))(u || {});
const z = {
  1: u.TopLeft,
  2: u.TopCenter,
  3: u.TopRight,
  4: u.MiddleLeft,
  5: u.MiddleCenter,
  6: u.MiddleRight,
  7: u.BottomLeft,
  8: u.BottomCenter,
  9: u.BottomRight
};
class m {
  constructor(i, t) {
    this.drawing = i, this.output = t, this.layers = {}, this.flattenZ = !0, this.targetZ = 0, this.db = null, this.processedBlocks = /* @__PURE__ */ new Set();
  }
  setFlattenZ(i, t = 0) {
    this.flattenZ = i, this.targetZ = t;
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
      for (const a of o)
        await this.processEntity(r, a);
    } finally {
      await r.endEdit();
    }
    this.output.info("Обработано {0} объектов", o.length);
  }
  async explodeAllBlocks(i, t) {
    let r = [];
    for (let o = 0; o < t; o++) {
      const a = o === 0 ? i : r, n = [];
      let f = !1;
      for (const h of a)
        if (h.type === "INSERT") {
          f = !0;
          const y = this.explodeBlock(h);
          n.push(...y);
        } else if (h.type === "ACAD_TABLE") {
          const y = this.explodeTable(h);
          n.push(...y);
        } else
          n.push(h);
      if (r = n, !f) {
        this.output.info("Взрыв завершен на глубине {0}", o + 1);
        break;
      }
      this.output.info("Проход {0}: {1} объектов", o + 1, r.length);
    }
    return r;
  }
  explodeBlock(i) {
    var s, d;
    if (!this.db || !i.name) return [i];
    const t = (d = (s = this.db.tables.BLOCK_RECORD) == null ? void 0 : s.entries) == null ? void 0 : d.find(
      (x) => x.name === i.name
    );
    if (!t || !t.entities || t.entities.length === 0)
      return [];
    const r = i.insertionPoint || { x: 0, y: 0, z: 0 }, o = t.basePoint || { x: 0, y: 0, z: 0 }, a = i.xScale || 1, n = i.yScale || 1, f = i.zScale || 1, h = (i.rotation || 0) * Math.PI / 180, y = Math.cos(h), c = Math.sin(h), e = [];
    for (const x of t.entities) {
      const g = this.transformEntityData(
        x,
        r,
        o,
        a,
        n,
        f,
        y,
        c,
        i.rotation || 0
      );
      g && (!g.layer && i.layer && (g.layer = i.layer), e.push(g));
    }
    return e;
  }
  explodeTable(i) {
    const t = i;
    return t.entities && Array.isArray(t.entities) ? (this.output.info("TABLE: взрываем {0} вложенных объектов", t.entities.length), t.entities) : [i];
  }
  transformEntityData(i, t, r, o, a, n, f, h, y) {
    const c = (s, d, x) => {
      const g = (s - r.x) * o, p = (d - r.y) * a, w = (x - r.z) * n;
      return {
        x: t.x + g * f - p * h,
        y: t.y + g * h + p * f,
        z: t.z + w
      };
    }, e = JSON.parse(JSON.stringify(
      i,
      (s, d) => typeof d == "bigint" ? Number(d) : d
    ));
    if (i.type === "INSERT") {
      const s = e.insertionPoint || { x: 0, y: 0, z: 0 };
      return e.insertionPoint = c(s.x, s.y, s.z || 0), e.xScale = (e.xScale || 1) * o, e.yScale = (e.yScale || 1) * a, e.zScale = (e.zScale || 1) * n, e.rotation = (e.rotation || 0) + y, e;
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
        return e.startPoint = d, e.insertionPoint = d, e.position = d, e.height && (e.height *= Math.abs(a)), e.textHeight && (e.textHeight *= Math.abs(a)), e;
      }
      case "LWPOLYLINE":
        return e.points && (e.points = e.points.map((s) => {
          const d = c(s.x, s.y, 0);
          return { ...s, x: d.x, y: d.y };
        })), e.vertices && (e.vertices = e.vertices.map((s) => {
          var x, g;
          const d = c(s.x || ((x = s.point) == null ? void 0 : x.x) || 0, s.y || ((g = s.point) == null ? void 0 : g.y) || 0, 0);
          return { ...s, x: d.x, y: d.y, point: d };
        })), e;
      case "POLYLINE2D":
      case "POLYLINE3D":
        return e.vertices && (e.vertices = e.vertices.map((s) => {
          var w, L, E;
          const d = ((w = s.point) == null ? void 0 : w.x) ?? s.x ?? 0, x = ((L = s.point) == null ? void 0 : L.y) ?? s.y ?? 0, g = ((E = s.point) == null ? void 0 : E.z) ?? s.z ?? 0, p = c(d, x, g);
          return { ...s, point: p, x: p.x, y: p.y, z: p.z };
        })), e;
      case "SPLINE":
        return e.controlPoints && (e.controlPoints = e.controlPoints.map((s) => c(s.x, s.y, s.z || 0))), e.fitPoints && (e.fitPoints = e.fitPoints.map((s) => c(s.x, s.y, s.z || 0))), e;
      case "ATTRIB":
      case "ATTDEF": {
        const s = e.insertionPoint || e.position || { x: 0, y: 0, z: 0 }, d = c(s.x, s.y, s.z || 0);
        return e.insertionPoint = d, e.position = d, e.height && (e.height *= Math.abs(a)), e.type = "TEXT", e;
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
    for (const a of r)
      t[a] !== void 0 && o.push(`${a}=${t[a]}`);
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
    let n = (t.endAngle ?? Math.PI * 2) - o;
    n < 0 && (n += Math.PI * 2), await i.addArc({
      center: [t.center.x, t.center.y, this.getZ(t.center.z)],
      radius: t.radius,
      angle: o,
      span: n,
      layer: r,
      color: this.getEntityColor(t)
    });
  }
  async addLwPolyline(i, t, r) {
    if (!t.vertices || t.vertices.length < 2) return;
    const o = t, a = this.getZ(o.elevation), n = o.constantWidth || o.startWidth || o.globalWidth || void 0;
    if (n) {
      const f = t.vertices.map((h) => [h.x, h.y, h.bulge || 0]);
      await i.addPolyline({
        vertices: f,
        flags: (t.flag & 1) === 1 ? 1 : void 0,
        width: n,
        elevation: a,
        layer: r,
        color: this.getEntityColor(t)
      });
    } else {
      const f = t.vertices.map((h) => [h.x, h.y, a]);
      await i.addPolyline3d({
        vertices: f,
        flags: (t.flag & 1) === 1 ? 1 : void 0,
        layer: r,
        color: this.getEntityColor(t)
      });
    }
  }
  async addText(i, t, r) {
    var g, p;
    const o = t, a = o.startPoint || o.insertionPoint || o.position || { x: 0, y: 0, z: 0 }, n = o.text || o.textValue || o.content || "", f = o.textHeight || o.height || 2.5, h = ["rotation", "angle", "direction", "horizontalAlignment", "verticalAlignment", "halign", "valign", "alignment", "justify"], y = [];
    for (const w of h)
      if (o[w] !== void 0) {
        const L = o[w];
        y.push(`${w}=${typeof L == "object" ? JSON.stringify(L) : L}`);
      }
    this.output.info("TEXT fields: {0}", y.join(", ") || "none");
    let c = 0;
    if (o.direction && (o.direction.x !== 1 || o.direction.y !== 0) ? c = Math.atan2(o.direction.y, o.direction.x) : o.rotation ? c = o.rotation : o.angle && (c = o.angle), this.output.info(
      'TEXT: pos=({0},{1}), h={2}, rot={3}rad ({4}deg), text="{5}"',
      (g = a.x) == null ? void 0 : g.toFixed(2),
      (p = a.y) == null ? void 0 : p.toFixed(2),
      f,
      c == null ? void 0 : c.toFixed(3),
      (c * 180 / Math.PI).toFixed(1),
      n == null ? void 0 : n.substring(0, 30)
    ), !n) {
      this.output.warn("TEXT: пустой текст, пропуск");
      return;
    }
    const e = o.horizontalAlignment || 0, s = o.verticalAlignment || 0, x = {
      "0_0": u.Left,
      // baseline left
      "1_0": u.Center,
      // baseline center
      "2_0": u.Right,
      // baseline right
      "0_1": u.BottomLeft,
      "1_1": u.BottomCenter,
      "2_1": u.BottomRight,
      "0_2": u.MiddleLeft,
      "1_2": u.MiddleCenter,
      "2_2": u.MiddleRight,
      "0_3": u.TopLeft,
      "1_3": u.TopCenter,
      "2_3": u.TopRight
    }[`${e}_${s}`] || u.Left;
    await i.addText({
      position: [a.x, a.y, this.getZ(a.z)],
      height: f,
      content: n,
      rotation: c,
      justify: x,
      layer: r,
      color: this.getEntityColor(t)
    });
  }
  async addMText(i, t, r) {
    var s, d;
    const o = t, a = o.insertionPoint || o.position || { x: 0, y: 0, z: 0 };
    let n = o.text || o.textValue || o.content || "";
    const f = o.textHeight || o.height || 2.5, h = ["rotation", "angle", "direction", "attachment", "attachmentPoint", "drawingDirection", "flowDirection"], y = [];
    for (const x of h)
      if (o[x] !== void 0) {
        const g = o[x];
        y.push(`${x}=${typeof g == "object" ? JSON.stringify(g) : g}`);
      }
    this.output.info("MTEXT fields: {0}", y.join(", ") || "none");
    let c = 0;
    if (o.direction && (o.direction.x !== 1 || o.direction.y !== 0) ? c = Math.atan2(o.direction.y, o.direction.x) : o.xAxisDirection && (o.xAxisDirection.x !== 1 || o.xAxisDirection.y !== 0) ? c = Math.atan2(o.xAxisDirection.y, o.xAxisDirection.x) : o.rotation && (c = o.rotation), this.output.info(
      'MTEXT: pos=({0},{1}), h={2}, rot={3}rad ({4}deg), raw="{5}"',
      (s = a.x) == null ? void 0 : s.toFixed(2),
      (d = a.y) == null ? void 0 : d.toFixed(2),
      f,
      c == null ? void 0 : c.toFixed(3),
      (c * 180 / Math.PI).toFixed(1),
      n == null ? void 0 : n.substring(0, 30)
    ), n = n.replace(/\\[A-Za-z][^;]*;/g, "").replace(/\{|\}/g, "").replace(/\\P/g, `
`).replace(/\\/g, ""), !n.trim()) {
      this.output.warn("MTEXT: пустой текст после очистки");
      return;
    }
    const e = z[o.attachmentPoint] || u.Left;
    await i.addText({
      position: [a.x, a.y, this.getZ(a.z)],
      height: f,
      content: n.trim(),
      rotation: c,
      justify: e,
      layer: r,
      color: this.getEntityColor(t)
    });
  }
  async addPolyline2d(i, t, r) {
    if (!t.vertices || t.vertices.length < 2) return;
    const o = this.getZ(t.elevation), a = t.vertices.map((n) => [n.point.x, n.point.y, o]);
    await i.addPolyline3d({
      vertices: a,
      flags: (t.flag & 1) === 1 ? 1 : void 0,
      layer: r,
      color: this.getEntityColor(t)
    });
  }
  async addPolyline3d(i, t, r) {
    if (!t.vertices || t.vertices.length < 2) return;
    const o = t.vertices.map((a) => [a.point.x, a.point.y, this.getZ(a.point.z)]);
    await i.addPolyline3d({
      vertices: o,
      flags: (t.flag & 1) === 1 ? 1 : void 0,
      layer: r,
      color: this.getEntityColor(t)
    });
  }
  async addSpline(i, t, r) {
    var n;
    const o = ((n = t.fitPoints) == null ? void 0 : n.length) > 0 ? t.fitPoints : t.controlPoints;
    if (!o || o.length < 2) return;
    const a = o.map((f) => [f.x, f.y, this.getZ(f.z)]);
    await i.addPolyline3d({
      vertices: a,
      layer: r,
      color: this.getEntityColor(t)
    });
  }
  async addTable(i, t, r) {
    var s, d, x, g;
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
    const o = ((d = t.startPoint) == null ? void 0 : d.x) ?? 0, a = ((x = t.startPoint) == null ? void 0 : x.y) ?? 0, n = this.getZ((g = t.startPoint) == null ? void 0 : g.z);
    this.output.info(
      "TABLE: startPoint=({0}, {1}), rowHeights={2}, colWidths={3}",
      o,
      a,
      t.rowHeightArr.length,
      t.columnWidthArr.length
    );
    let f = a, h = 0, y = 0;
    for (let p = 0; p < t.rowCount && p < t.rowHeightArr.length; p++) {
      let w = o;
      const L = t.rowHeightArr[p] || 10;
      for (let E = 0; E < t.columnCount && E < t.columnWidthArr.length && !(h >= t.cells.length); E++) {
        const P = t.cells[h], C = t.columnWidthArr[E] || 50;
        if (P && P.text && P.text.trim()) {
          const b = P.textHeight || Math.min(L * 0.6, 2.5);
          await (await i.addText({
            position: [w + 2, f - L / 2, n],
            height: b,
            content: P.text.trim()
          })).setx("$layer", r), y++;
        }
        w += C, h++;
      }
      f -= L;
    }
    const c = t.columnWidthArr.reduce((p, w) => p + (w || 0), 0), e = t.rowHeightArr.reduce((p, w) => p + (w || 0), 0);
    if (c > 0 && e > 0) {
      const p = [
        [o, a, n],
        [o + c, a, n],
        [o + c, a - e, n],
        [o, a - e, n]
      ];
      await (await i.addPolyline3d({
        vertices: p,
        flags: 1
      })).setx("$layer", r);
      let L = a;
      for (let P = 0; P < t.rowHeightArr.length; P++)
        L -= t.rowHeightArr[P] || 0, P < t.rowHeightArr.length - 1 && await (await i.addLine({
          a: [o, L, n],
          b: [o + c, L, n]
        })).setx("$layer", r);
      let E = o;
      for (let P = 0; P < t.columnWidthArr.length; P++)
        E += t.columnWidthArr[P] || 0, P < t.columnWidthArr.length - 1 && await (await i.addLine({
          a: [E, a, n],
          b: [E, a - e, n]
        })).setx("$layer", r);
    }
    this.output.info("TABLE: загружено {0} текстовых ячеек", y);
  }
}
export {
  m as default
};

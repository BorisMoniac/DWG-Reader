const A = ["LINE", "CIRCLE", "ARC", "LWPOLYLINE", "POLYLINE2D", "POLYLINE3D", "SPLINE", "TEXT", "MTEXT"], T = ["ACAD_TABLE", "TEXT", "MTEXT"];
class I {
  constructor(a, t) {
    this.drawing = a, this.output = t, this.layers = {}, this.flattenZ = !0, this.targetZ = 0, this.importMode = "all", this.db = null, this.processedBlocks = /* @__PURE__ */ new Set();
  }
  setFlattenZ(a, t = 0) {
    this.flattenZ = a, this.targetZ = t;
  }
  setImportMode(a) {
    this.importMode = a;
  }
  shouldImport(a) {
    switch (this.importMode) {
      case "geometry":
        return A.includes(a);
      case "tables":
        return T.includes(a);
      case "all":
      default:
        return !0;
    }
  }
  getZ(a) {
    return this.flattenZ ? this.targetZ : a ?? 0;
  }
  async load(a) {
    this.db = a, this.processedBlocks.clear(), await this.initializeDefaults(), await this.loadLayers(a), await this.loadEntities(a);
  }
  async initializeDefaults() {
    this.layers[0] = this.drawing.layers.layer0;
  }
  async loadLayers(a) {
    const t = a.tables.LAYER;
    if (!(!t || !t.entries)) {
      await this.drawing.layers.beginUpdate();
      try {
        for (const s of t.entries)
          if (s.name === "0")
            this.layers[s.name] = this.drawing.layers.layer0;
          else {
            const n = {
              name: s.name,
              color: s.colorIndex ?? 7,
              hidden: s.off ?? !1
            };
            this.layers[s.name] = await this.drawing.layers.add(n);
          }
      } finally {
        await this.drawing.layers.endUpdate();
      }
      this.output.info("Загружено слоёв: {0}", Object.keys(this.layers).length);
    }
  }
  async loadEntities(a) {
    const t = this.drawing.layouts.model;
    if (!t) {
      this.output.warn("Model space not found");
      return;
    }
    const s = t.editor();
    await s.beginEdit();
    try {
      for (const n of a.entities)
        await this.processEntity(s, n);
    } finally {
      await s.endEdit();
    }
    this.output.info("Processed {0} entities", a.entities.length);
  }
  getLayer(a) {
    return this.layers[a.layer] ?? this.layers[0];
  }
  async processEntity(a, t) {
    if (!this.shouldImport(t.type)) return;
    const s = this.getLayer(t);
    try {
      switch (t.type) {
        case "LINE":
          await this.addLine(a, t, s);
          break;
        case "CIRCLE":
          await this.addCircle(a, t, s);
          break;
        case "ARC":
          await this.addArc(a, t, s);
          break;
        case "LWPOLYLINE":
          await this.addLwPolyline(a, t, s);
          break;
        case "TEXT":
          await this.addText(a, t, s);
          break;
        case "MTEXT":
          await this.addMText(a, t, s);
          break;
        case "POLYLINE2D":
          await this.addPolyline2d(a, t, s);
          break;
        case "POLYLINE3D":
          await this.addPolyline3d(a, t, s);
          break;
        case "SPLINE":
          await this.addSpline(a, t, s);
          break;
        case "ACAD_TABLE":
          await this.addTable(a, t, s);
          break;
        case "INSERT":
          await this.addInsert(a, t, s);
          break;
        default:
          break;
      }
    } catch (n) {
      this.output.warn("Ошибка обработки {0}: {1}", t.type, n.message);
    }
  }
  async addLine(a, t, s) {
    await (await a.addLine({
      a: [t.startPoint.x, t.startPoint.y, this.getZ(t.startPoint.z)],
      b: [t.endPoint.x, t.endPoint.y, this.getZ(t.endPoint.z)]
    })).setx("$layer", s);
  }
  async addCircle(a, t, s) {
    await (await a.addCircle({
      center: [t.center.x, t.center.y, this.getZ(t.center.z)],
      radius: t.radius
    })).setx("$layer", s);
  }
  async addArc(a, t, s) {
    const n = t.startAngle ?? 0;
    let o = (t.endAngle ?? Math.PI * 2) - n;
    o < 0 && (o += Math.PI * 2), await (await a.addArc({
      center: [t.center.x, t.center.y, this.getZ(t.center.z)],
      radius: t.radius,
      angle: n,
      span: o
    })).setx("$layer", s);
  }
  async addLwPolyline(a, t, s) {
    if (!t.vertices || t.vertices.length < 2) return;
    const n = this.getZ(void 0), r = t.vertices.map((h) => [h.x, h.y, n]);
    await (await a.addPolyline3d({
      vertices: r,
      flags: (t.flag & 1) === 1 ? 1 : void 0
    })).setx("$layer", s);
  }
  async addText(a, t, s) {
    await (await a.addText({
      position: [t.startPoint.x, t.startPoint.y, this.getZ(void 0)],
      height: t.textHeight ?? 2.5,
      content: t.text ?? "",
      rotation: t.rotation ? t.rotation * Math.PI / 180 : 0
    })).setx("$layer", s);
  }
  async addMText(a, t, s) {
    await (await a.addText({
      position: [t.insertionPoint.x, t.insertionPoint.y, this.getZ(t.insertionPoint.z)],
      height: t.textHeight ?? 2.5,
      content: t.text ?? "",
      rotation: t.rotation ? t.rotation * Math.PI / 180 : 0
    })).setx("$layer", s);
  }
  async addPolyline2d(a, t, s) {
    if (!t.vertices || t.vertices.length < 2) return;
    const n = this.getZ(t.elevation), r = t.vertices.map((h) => [h.point.x, h.point.y, n]);
    await (await a.addPolyline3d({
      vertices: r,
      flags: (t.flag & 1) === 1 ? 1 : void 0
    })).setx("$layer", s);
  }
  async addPolyline3d(a, t, s) {
    if (!t.vertices || t.vertices.length < 2) return;
    const n = t.vertices.map((o) => [o.point.x, o.point.y, this.getZ(o.point.z)]);
    await (await a.addPolyline3d({
      vertices: n,
      flags: (t.flag & 1) === 1 ? 1 : void 0
    })).setx("$layer", s);
  }
  async addSpline(a, t, s) {
    var h;
    const n = ((h = t.fitPoints) == null ? void 0 : h.length) > 0 ? t.fitPoints : t.controlPoints;
    if (!n || n.length < 2) return;
    const r = n.map((f) => [f.x, f.y, this.getZ(f.z)]);
    await (await a.addPolyline3d({
      vertices: r
    })).setx("$layer", s);
  }
  async addTable(a, t, s) {
    var c, x, w, u;
    if (this.output.info(
      "TABLE: name={0}, rows={1}, cols={2}, cells={3}",
      t.name,
      t.rowCount,
      t.columnCount,
      ((c = t.cells) == null ? void 0 : c.length) ?? 0
    ), !t.cells || t.cells.length === 0) {
      this.output.warn("TABLE: пустая таблица, пропускаем");
      return;
    }
    if (!t.rowHeightArr || !t.columnWidthArr) {
      this.output.warn("TABLE: нет данных о размерах строк/столбцов");
      return;
    }
    const n = ((x = t.startPoint) == null ? void 0 : x.x) ?? 0, r = ((w = t.startPoint) == null ? void 0 : w.y) ?? 0, o = this.getZ((u = t.startPoint) == null ? void 0 : u.z);
    this.output.info(
      "TABLE: startPoint=({0}, {1}), rowHeights={2}, colWidths={3}",
      n,
      r,
      t.rowHeightArr.length,
      t.columnWidthArr.length
    );
    let h = r, f = 0, d = 0;
    for (let l = 0; l < t.rowCount && l < t.rowHeightArr.length; l++) {
      let P = n;
      const p = t.rowHeightArr[l] || 10;
      for (let L = 0; L < t.columnCount && L < t.columnWidthArr.length && !(f >= t.cells.length); L++) {
        const g = t.cells[f], E = t.columnWidthArr[L] || 50;
        if (g && g.text && g.text.trim()) {
          const m = g.textHeight || Math.min(p * 0.6, 2.5);
          await (await a.addText({
            position: [P + 2, h - p / 2, o],
            height: m,
            content: g.text.trim()
          })).setx("$layer", s), d++;
        }
        P += E, f++;
      }
      h -= p;
    }
    const e = t.columnWidthArr.reduce((l, P) => l + (P || 0), 0), i = t.rowHeightArr.reduce((l, P) => l + (P || 0), 0);
    if (e > 0 && i > 0) {
      const l = [
        [n, r, o],
        [n + e, r, o],
        [n + e, r - i, o],
        [n, r - i, o]
      ];
      await (await a.addPolyline3d({
        vertices: l,
        flags: 1
      })).setx("$layer", s);
      let p = r;
      for (let g = 0; g < t.rowHeightArr.length; g++)
        p -= t.rowHeightArr[g] || 0, g < t.rowHeightArr.length - 1 && await (await a.addLine({
          a: [n, p, o],
          b: [n + e, p, o]
        })).setx("$layer", s);
      let L = n;
      for (let g = 0; g < t.columnWidthArr.length; g++)
        L += t.columnWidthArr[g] || 0, g < t.columnWidthArr.length - 1 && await (await a.addLine({
          a: [L, r, o],
          b: [L, r - i, o]
        })).setx("$layer", s);
    }
    this.output.info("TABLE: загружено {0} текстовых ячеек", d);
  }
  async addInsert(a, t, s) {
    var x, w;
    if (!this.db || !t.name) return;
    const n = (w = (x = this.db.tables.BLOCK_RECORD) == null ? void 0 : x.entries) == null ? void 0 : w.find(
      (u) => u.name === t.name
    );
    if (!n || !n.entities || n.entities.length === 0) {
      this.output.warn('INSERT: блок "{0}" не найден или пуст', t.name);
      return;
    }
    this.output.info('INSERT: взрываем блок "{0}" ({1} объектов)', t.name, n.entities.length);
    const r = t.insertionPoint, o = n.basePoint || { x: 0, y: 0, z: 0 }, h = t.xScale || 1, f = t.yScale || 1, d = t.zScale || 1, e = (t.rotation || 0) * Math.PI / 180, i = Math.cos(e), c = Math.sin(e);
    for (const u of n.entities)
      try {
        const l = this.transformEntity(u, r, o, h, f, d, i, c);
        l && await this.processEntity(a, l);
      } catch (l) {
        this.output.warn("INSERT: ошибка обработки {0}: {1}", u.type, l.message);
      }
  }
  transformEntity(a, t, s, n, r, o, h, f) {
    const d = (i, c, x) => {
      const w = (i - s.x) * n, u = (c - s.y) * r, l = (x - s.z) * o;
      return {
        x: t.x + w * h - u * f,
        y: t.y + w * f + u * h,
        z: t.z + l
      };
    }, e = JSON.parse(JSON.stringify(a));
    switch (a.type) {
      case "LINE": {
        const i = d(e.startPoint.x, e.startPoint.y, e.startPoint.z || 0), c = d(e.endPoint.x, e.endPoint.y, e.endPoint.z || 0);
        return e.startPoint = i, e.endPoint = c, e;
      }
      case "CIRCLE": {
        const i = d(e.center.x, e.center.y, e.center.z || 0);
        return e.center = i, e.radius *= Math.abs(n), e;
      }
      case "ARC": {
        const i = d(e.center.x, e.center.y, e.center.z || 0);
        return e.center = i, e.radius *= Math.abs(n), e;
      }
      case "TEXT": {
        const i = e.insertionPoint || e.position || { x: 0, y: 0, z: 0 }, c = d(i.x, i.y, i.z || 0);
        return e.insertionPoint = c, e.position = c, e.height && (e.height *= Math.abs(r)), e.textHeight && (e.textHeight *= Math.abs(r)), e;
      }
      case "MTEXT": {
        const i = e.insertionPoint || e.position || { x: 0, y: 0, z: 0 }, c = d(i.x, i.y, i.z || 0);
        return e.insertionPoint = c, e.position = c, e.height && (e.height *= Math.abs(r)), e.textHeight && (e.textHeight *= Math.abs(r)), e;
      }
      case "LWPOLYLINE":
        return e.points && (e.points = e.points.map((i) => {
          const c = d(i.x, i.y, 0);
          return { ...i, x: c.x, y: c.y };
        })), e.vertices && (e.vertices = e.vertices.map((i) => {
          var x, w;
          const c = d(i.x || ((x = i.point) == null ? void 0 : x.x) || 0, i.y || ((w = i.point) == null ? void 0 : w.y) || 0, 0);
          return { ...i, x: c.x, y: c.y, point: c };
        })), e;
      case "POLYLINE2D":
      case "POLYLINE3D":
        return e.vertices && (e.vertices = e.vertices.map((i) => {
          var l, P, p;
          const c = ((l = i.point) == null ? void 0 : l.x) ?? i.x ?? 0, x = ((P = i.point) == null ? void 0 : P.y) ?? i.y ?? 0, w = ((p = i.point) == null ? void 0 : p.z) ?? i.z ?? 0, u = d(c, x, w);
          return { ...i, point: u, x: u.x, y: u.y, z: u.z };
        })), e;
      case "SPLINE":
        return e.controlPoints && (e.controlPoints = e.controlPoints.map((i) => d(i.x, i.y, i.z || 0))), e.fitPoints && (e.fitPoints = e.fitPoints.map((i) => d(i.x, i.y, i.z || 0))), e;
      default:
        return null;
    }
  }
}
export {
  I as default
};

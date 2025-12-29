const z = ["LINE", "CIRCLE", "ARC", "LWPOLYLINE", "POLYLINE2D", "POLYLINE3D", "SPLINE", "TEXT", "MTEXT"], T = ["ACAD_TABLE", "TEXT", "MTEXT"];
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
        return z.includes(a);
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
            const i = {
              name: s.name,
              color: s.colorIndex ?? 7,
              hidden: s.off ?? !1
            };
            this.layers[s.name] = await this.drawing.layers.add(i);
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
      for (const i of a.entities)
        await this.processEntity(s, i);
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
    } catch (i) {
      this.output.warn("Ошибка обработки {0}: {1}", t.type, i.message);
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
    const i = t.startAngle ?? 0;
    let c = (t.endAngle ?? Math.PI * 2) - i;
    c < 0 && (c += Math.PI * 2), await (await a.addArc({
      center: [t.center.x, t.center.y, this.getZ(t.center.z)],
      radius: t.radius,
      angle: i,
      span: c
    })).setx("$layer", s);
  }
  async addLwPolyline(a, t, s) {
    if (!t.vertices || t.vertices.length < 2) return;
    const i = this.getZ(void 0), o = t.vertices.map((h) => [h.x, h.y, i]);
    await (await a.addPolyline3d({
      vertices: o,
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
    const i = this.getZ(t.elevation), o = t.vertices.map((h) => [h.point.x, h.point.y, i]);
    await (await a.addPolyline3d({
      vertices: o,
      flags: (t.flag & 1) === 1 ? 1 : void 0
    })).setx("$layer", s);
  }
  async addPolyline3d(a, t, s) {
    if (!t.vertices || t.vertices.length < 2) return;
    const i = t.vertices.map((c) => [c.point.x, c.point.y, this.getZ(c.point.z)]);
    await (await a.addPolyline3d({
      vertices: i,
      flags: (t.flag & 1) === 1 ? 1 : void 0
    })).setx("$layer", s);
  }
  async addSpline(a, t, s) {
    var h;
    const i = ((h = t.fitPoints) == null ? void 0 : h.length) > 0 ? t.fitPoints : t.controlPoints;
    if (!i || i.length < 2) return;
    const o = i.map((w) => [w.x, w.y, this.getZ(w.z)]);
    await (await a.addPolyline3d({
      vertices: o
    })).setx("$layer", s);
  }
  async addTable(a, t, s) {
    var l, p, f, u;
    if (this.output.info(
      "TABLE: name={0}, rows={1}, cols={2}, cells={3}",
      t.name,
      t.rowCount,
      t.columnCount,
      ((l = t.cells) == null ? void 0 : l.length) ?? 0
    ), !t.cells || t.cells.length === 0) {
      this.output.warn("TABLE: пустая таблица, пропускаем");
      return;
    }
    if (!t.rowHeightArr || !t.columnWidthArr) {
      this.output.warn("TABLE: нет данных о размерах строк/столбцов");
      return;
    }
    const i = ((p = t.startPoint) == null ? void 0 : p.x) ?? 0, o = ((f = t.startPoint) == null ? void 0 : f.y) ?? 0, c = this.getZ((u = t.startPoint) == null ? void 0 : u.z);
    this.output.info(
      "TABLE: startPoint=({0}, {1}), rowHeights={2}, colWidths={3}",
      i,
      o,
      t.rowHeightArr.length,
      t.columnWidthArr.length
    );
    let h = o, w = 0, d = 0;
    for (let r = 0; r < t.rowCount && r < t.rowHeightArr.length; r++) {
      let x = i;
      const P = t.rowHeightArr[r] || 10;
      for (let E = 0; E < t.columnCount && E < t.columnWidthArr.length && !(w >= t.cells.length); E++) {
        const g = t.cells[w], L = t.columnWidthArr[E] || 50;
        if (g && g.text && g.text.trim()) {
          const m = g.textHeight || Math.min(P * 0.6, 2.5);
          await (await a.addText({
            position: [x + 2, h - P / 2, c],
            height: m,
            content: g.text.trim()
          })).setx("$layer", s), d++;
        }
        x += L, w++;
      }
      h -= P;
    }
    const e = t.columnWidthArr.reduce((r, x) => r + (x || 0), 0), n = t.rowHeightArr.reduce((r, x) => r + (x || 0), 0);
    if (e > 0 && n > 0) {
      const r = [
        [i, o, c],
        [i + e, o, c],
        [i + e, o - n, c],
        [i, o - n, c]
      ];
      await (await a.addPolyline3d({
        vertices: r,
        flags: 1
      })).setx("$layer", s);
      let P = o;
      for (let g = 0; g < t.rowHeightArr.length; g++)
        P -= t.rowHeightArr[g] || 0, g < t.rowHeightArr.length - 1 && await (await a.addLine({
          a: [i, P, c],
          b: [i + e, P, c]
        })).setx("$layer", s);
      let E = i;
      for (let g = 0; g < t.columnWidthArr.length; g++)
        E += t.columnWidthArr[g] || 0, g < t.columnWidthArr.length - 1 && await (await a.addLine({
          a: [E, o, c],
          b: [E, o - n, c]
        })).setx("$layer", s);
    }
    this.output.info("TABLE: загружено {0} текстовых ячеек", d);
  }
  async addInsert(a, t, s) {
    var p, f;
    if (!this.db || !t.name) return;
    const i = (f = (p = this.db.tables.BLOCK_RECORD) == null ? void 0 : p.entries) == null ? void 0 : f.find(
      (u) => u.name === t.name
    );
    if (!i || !i.entities || i.entities.length === 0) {
      this.output.warn('INSERT: блок "{0}" не найден или пуст', t.name);
      return;
    }
    this.output.info('INSERT: взрываем блок "{0}" ({1} объектов)', t.name, i.entities.length);
    const o = t.insertionPoint, c = i.basePoint || { x: 0, y: 0, z: 0 }, h = t.xScale || 1, w = t.yScale || 1, d = t.zScale || 1, e = (t.rotation || 0) * Math.PI / 180, n = Math.cos(e), l = Math.sin(e);
    for (const u of i.entities)
      try {
        if (u.type === "INSERT") {
          const r = u, x = r.insertionPoint || { x: 0, y: 0, z: 0 }, P = (x.x - c.x) * h, E = (x.y - c.y) * w, g = (x.z - c.z) * d, L = {
            ...r,
            insertionPoint: {
              x: o.x + P * n - E * l,
              y: o.y + P * l + E * n,
              z: o.z + g
            },
            xScale: (r.xScale || 1) * h,
            yScale: (r.yScale || 1) * w,
            zScale: (r.zScale || 1) * d,
            rotation: (r.rotation || 0) + (t.rotation || 0)
          };
          this.output.info('INSERT: вложенный блок "{0}"', r.name), await this.addInsert(a, L, s);
        } else {
          const r = this.transformEntity(u, o, c, h, w, d, n, l);
          r && await this.processEntity(a, r);
        }
      } catch (r) {
        this.output.warn("INSERT: ошибка обработки {0}: {1}", u.type, r.message);
      }
  }
  transformEntity(a, t, s, i, o, c, h, w) {
    const d = (n, l, p) => {
      const f = (n - s.x) * i, u = (l - s.y) * o, r = (p - s.z) * c;
      return {
        x: t.x + f * h - u * w,
        y: t.y + f * w + u * h,
        z: t.z + r
      };
    }, e = JSON.parse(JSON.stringify(a));
    switch (a.type) {
      case "LINE": {
        const n = d(e.startPoint.x, e.startPoint.y, e.startPoint.z || 0), l = d(e.endPoint.x, e.endPoint.y, e.endPoint.z || 0);
        return e.startPoint = n, e.endPoint = l, e;
      }
      case "CIRCLE": {
        const n = d(e.center.x, e.center.y, e.center.z || 0);
        return e.center = n, e.radius *= Math.abs(i), e;
      }
      case "ARC": {
        const n = d(e.center.x, e.center.y, e.center.z || 0);
        return e.center = n, e.radius *= Math.abs(i), e;
      }
      case "TEXT": {
        const n = e.insertionPoint || e.position || { x: 0, y: 0, z: 0 }, l = d(n.x, n.y, n.z || 0);
        return e.insertionPoint = l, e.position = l, e.height && (e.height *= Math.abs(o)), e.textHeight && (e.textHeight *= Math.abs(o)), e;
      }
      case "MTEXT": {
        const n = e.insertionPoint || e.position || { x: 0, y: 0, z: 0 }, l = d(n.x, n.y, n.z || 0);
        return e.insertionPoint = l, e.position = l, e.height && (e.height *= Math.abs(o)), e.textHeight && (e.textHeight *= Math.abs(o)), e;
      }
      case "LWPOLYLINE":
        return e.points && (e.points = e.points.map((n) => {
          const l = d(n.x, n.y, 0);
          return { ...n, x: l.x, y: l.y };
        })), e.vertices && (e.vertices = e.vertices.map((n) => {
          var p, f;
          const l = d(n.x || ((p = n.point) == null ? void 0 : p.x) || 0, n.y || ((f = n.point) == null ? void 0 : f.y) || 0, 0);
          return { ...n, x: l.x, y: l.y, point: l };
        })), e;
      case "POLYLINE2D":
      case "POLYLINE3D":
        return e.vertices && (e.vertices = e.vertices.map((n) => {
          var r, x, P;
          const l = ((r = n.point) == null ? void 0 : r.x) ?? n.x ?? 0, p = ((x = n.point) == null ? void 0 : x.y) ?? n.y ?? 0, f = ((P = n.point) == null ? void 0 : P.z) ?? n.z ?? 0, u = d(l, p, f);
          return { ...n, point: u, x: u.x, y: u.y, z: u.z };
        })), e;
      case "SPLINE":
        return e.controlPoints && (e.controlPoints = e.controlPoints.map((n) => d(n.x, n.y, n.z || 0))), e.fitPoints && (e.fitPoints = e.fitPoints.map((n) => d(n.x, n.y, n.z || 0))), e;
      default:
        return null;
    }
  }
}
export {
  I as default
};

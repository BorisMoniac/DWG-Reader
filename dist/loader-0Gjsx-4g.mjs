const E = ["LINE", "CIRCLE", "ARC", "LWPOLYLINE", "POLYLINE2D", "POLYLINE3D", "SPLINE", "TEXT", "MTEXT"], T = ["ACAD_TABLE"];
class Z {
  constructor(a, t) {
    this.drawing = a, this.output = t, this.layers = {}, this.flattenZ = !0, this.targetZ = 0, this.importMode = "all";
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
        return E.includes(a);
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
    await this.initializeDefaults(), await this.loadLayers(a), await this.loadEntities(a);
  }
  async initializeDefaults() {
    this.layers[0] = this.drawing.layers.layer0;
  }
  async loadLayers(a) {
    const t = a.tables.LAYER;
    if (!(!t || !t.entries)) {
      await this.drawing.layers.beginUpdate();
      try {
        for (const e of t.entries)
          if (e.name === "0")
            this.layers[e.name] = this.drawing.layers.layer0;
          else {
            const s = {
              name: e.name,
              color: e.colorIndex ?? 7,
              hidden: e.off ?? !1
            };
            this.layers[e.name] = await this.drawing.layers.add(s);
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
    const e = t.editor();
    await e.beginEdit();
    try {
      for (const s of a.entities)
        await this.processEntity(e, s);
    } finally {
      await e.endEdit();
    }
    this.output.info("Processed {0} entities", a.entities.length);
  }
  getLayer(a) {
    return this.layers[a.layer] ?? this.layers[0];
  }
  async processEntity(a, t) {
    if (!this.shouldImport(t.type)) return;
    const e = this.getLayer(t);
    try {
      switch (t.type) {
        case "LINE":
          await this.addLine(a, t, e);
          break;
        case "CIRCLE":
          await this.addCircle(a, t, e);
          break;
        case "ARC":
          await this.addArc(a, t, e);
          break;
        case "LWPOLYLINE":
          await this.addLwPolyline(a, t, e);
          break;
        case "TEXT":
          await this.addText(a, t, e);
          break;
        case "MTEXT":
          await this.addMText(a, t, e);
          break;
        case "POLYLINE2D":
          await this.addPolyline2d(a, t, e);
          break;
        case "POLYLINE3D":
          await this.addPolyline3d(a, t, e);
          break;
        case "SPLINE":
          await this.addSpline(a, t, e);
          break;
        case "ACAD_TABLE":
          await this.addTable(a, t, e);
          break;
        case "INSERT":
          await this.addInsert(a, t, e);
          break;
        default:
          break;
      }
    } catch (s) {
      this.output.warn("Ошибка обработки {0}: {1}", t.type, s.message);
    }
  }
  async addLine(a, t, e) {
    await (await a.addLine({
      a: [t.startPoint.x, t.startPoint.y, this.getZ(t.startPoint.z)],
      b: [t.endPoint.x, t.endPoint.y, this.getZ(t.endPoint.z)]
    })).setx("$layer", e);
  }
  async addCircle(a, t, e) {
    await (await a.addCircle({
      center: [t.center.x, t.center.y, this.getZ(t.center.z)],
      radius: t.radius
    })).setx("$layer", e);
  }
  async addArc(a, t, e) {
    const s = t.startAngle ?? 0;
    let r = (t.endAngle ?? Math.PI * 2) - s;
    r < 0 && (r += Math.PI * 2), await (await a.addArc({
      center: [t.center.x, t.center.y, this.getZ(t.center.z)],
      radius: t.radius,
      angle: s,
      span: r
    })).setx("$layer", e);
  }
  async addLwPolyline(a, t, e) {
    if (!t.vertices || t.vertices.length < 2) return;
    const s = this.getZ(void 0), i = t.vertices.map((o) => [o.x, o.y, s]);
    await (await a.addPolyline3d({
      vertices: i,
      flags: (t.flag & 1) === 1 ? 1 : void 0
    })).setx("$layer", e);
  }
  async addText(a, t, e) {
    await (await a.addText({
      position: [t.startPoint.x, t.startPoint.y, this.getZ(void 0)],
      height: t.textHeight ?? 2.5,
      content: t.text ?? "",
      rotation: t.rotation ? t.rotation * Math.PI / 180 : 0
    })).setx("$layer", e);
  }
  async addMText(a, t, e) {
    await (await a.addText({
      position: [t.insertionPoint.x, t.insertionPoint.y, this.getZ(t.insertionPoint.z)],
      height: t.textHeight ?? 2.5,
      content: t.text ?? "",
      rotation: t.rotation ? t.rotation * Math.PI / 180 : 0
    })).setx("$layer", e);
  }
  async addPolyline2d(a, t, e) {
    if (!t.vertices || t.vertices.length < 2) return;
    const s = this.getZ(t.elevation), i = t.vertices.map((o) => [o.point.x, o.point.y, s]);
    await (await a.addPolyline3d({
      vertices: i,
      flags: (t.flag & 1) === 1 ? 1 : void 0
    })).setx("$layer", e);
  }
  async addPolyline3d(a, t, e) {
    if (!t.vertices || t.vertices.length < 2) return;
    const s = t.vertices.map((r) => [r.point.x, r.point.y, this.getZ(r.point.z)]);
    await (await a.addPolyline3d({
      vertices: s,
      flags: (t.flag & 1) === 1 ? 1 : void 0
    })).setx("$layer", e);
  }
  async addSpline(a, t, e) {
    var o;
    const s = ((o = t.fitPoints) == null ? void 0 : o.length) > 0 ? t.fitPoints : t.controlPoints;
    if (!s || s.length < 2) return;
    const i = s.map((c) => [c.x, c.y, this.getZ(c.z)]);
    await (await a.addPolyline3d({
      vertices: i
    })).setx("$layer", e);
  }
  async addTable(a, t, e) {
    var L, P, p, A;
    if (this.output.info(
      "TABLE: name={0}, rows={1}, cols={2}, cells={3}",
      t.name,
      t.rowCount,
      t.columnCount,
      ((L = t.cells) == null ? void 0 : L.length) ?? 0
    ), !t.cells || t.cells.length === 0) {
      this.output.warn("TABLE: пустая таблица, пропускаем");
      return;
    }
    if (!t.rowHeightArr || !t.columnWidthArr) {
      this.output.warn("TABLE: нет данных о размерах строк/столбцов");
      return;
    }
    const s = ((P = t.startPoint) == null ? void 0 : P.x) ?? 0, i = ((p = t.startPoint) == null ? void 0 : p.y) ?? 0, r = this.getZ((A = t.startPoint) == null ? void 0 : A.z);
    this.output.info(
      "TABLE: startPoint=({0}, {1}), rowHeights={2}, colWidths={3}",
      s,
      i,
      t.rowHeightArr.length,
      t.columnWidthArr.length
    );
    let o = i, c = 0, x = 0;
    for (let l = 0; l < t.rowCount && l < t.rowHeightArr.length; l++) {
      let h = s;
      const w = t.rowHeightArr[l] || 10;
      for (let d = 0; d < t.columnCount && d < t.columnWidthArr.length && !(c >= t.cells.length); d++) {
        const n = t.cells[c], f = t.columnWidthArr[d] || 50;
        if (n && n.text && n.text.trim()) {
          const m = n.textHeight || Math.min(w * 0.6, 2.5);
          await (await a.addText({
            position: [h + 2, o - w / 2, r],
            height: m,
            content: n.text.trim()
          })).setx("$layer", e), x++;
        }
        h += f, c++;
      }
      o -= w;
    }
    const g = t.columnWidthArr.reduce((l, h) => l + (h || 0), 0), u = t.rowHeightArr.reduce((l, h) => l + (h || 0), 0);
    if (g > 0 && u > 0) {
      const l = [
        [s, i, r],
        [s + g, i, r],
        [s + g, i - u, r],
        [s, i - u, r]
      ];
      await (await a.addPolyline3d({
        vertices: l,
        flags: 1
      })).setx("$layer", e);
      let w = i;
      for (let n = 0; n < t.rowHeightArr.length; n++)
        w -= t.rowHeightArr[n] || 0, n < t.rowHeightArr.length - 1 && await (await a.addLine({
          a: [s, w, r],
          b: [s + g, w, r]
        })).setx("$layer", e);
      let d = s;
      for (let n = 0; n < t.columnWidthArr.length; n++)
        d += t.columnWidthArr[n] || 0, n < t.columnWidthArr.length - 1 && await (await a.addLine({
          a: [d, i, r],
          b: [d, i - u, r]
        })).setx("$layer", e);
    }
    this.output.info("TABLE: загружено {0} текстовых ячеек", x);
  }
  async addInsert(a, t, e) {
    const s = t.insertionPoint, i = this.getZ(s.z), o = Math.max(t.xScale, t.yScale, t.zScale) * 10 || 10;
    await (await a.addLine({
      a: [s.x - o, s.y, i],
      b: [s.x + o, s.y, i]
    })).setx("$layer", e), await (await a.addLine({
      a: [s.x, s.y - o, i],
      b: [s.x, s.y + o, i]
    })).setx("$layer", e), t.name && await (await a.addText({
      position: [s.x + o, s.y + o, i],
      height: o / 2,
      content: `[${t.name}]`
    })).setx("$layer", e);
  }
}
export {
  Z as default
};

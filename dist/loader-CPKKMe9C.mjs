class p {
  constructor(t, a) {
    this.drawing = t, this.output = a, this.layers = {}, this.flattenZ = !0, this.targetZ = 0;
  }
  setFlattenZ(t, a = 0) {
    this.flattenZ = t, this.targetZ = a;
  }
  getZ(t) {
    return this.flattenZ ? this.targetZ : t ?? 0;
  }
  async load(t) {
    await this.initializeDefaults(), await this.loadLayers(t), await this.loadEntities(t);
  }
  async initializeDefaults() {
    this.layers[0] = this.drawing.layers.layer0;
  }
  async loadLayers(t) {
    const a = t.tables.LAYER;
    if (!(!a || !a.entries)) {
      await this.drawing.layers.beginUpdate();
      try {
        for (const e of a.entries)
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
  async loadEntities(t) {
    const a = this.drawing.layouts.model;
    if (!a) {
      this.output.warn("Model space not found");
      return;
    }
    const e = a.editor();
    await e.beginEdit();
    try {
      for (const s of t.entities)
        await this.processEntity(e, s);
    } finally {
      await e.endEdit();
    }
    this.output.info("Processed {0} entities", t.entities.length);
  }
  getLayer(t) {
    return this.layers[t.layer] ?? this.layers[0];
  }
  async processEntity(t, a) {
    const e = this.getLayer(a);
    try {
      switch (a.type) {
        case "LINE":
          await this.addLine(t, a, e);
          break;
        case "CIRCLE":
          await this.addCircle(t, a, e);
          break;
        case "ARC":
          await this.addArc(t, a, e);
          break;
        case "LWPOLYLINE":
          await this.addLwPolyline(t, a, e);
          break;
        case "TEXT":
          await this.addText(t, a, e);
          break;
        case "MTEXT":
          await this.addMText(t, a, e);
          break;
        case "POLYLINE2D":
          await this.addPolyline2d(t, a, e);
          break;
        case "POLYLINE3D":
          await this.addPolyline3d(t, a, e);
          break;
        case "SPLINE":
          await this.addSpline(t, a, e);
          break;
        case "ACAD_TABLE":
          await this.addTable(t, a, e);
          break;
        case "INSERT":
          await this.addInsert(t, a, e);
          break;
        default:
          break;
      }
    } catch (s) {
      this.output.warn("Ошибка обработки {0}: {1}", a.type, s.message);
    }
  }
  async addLine(t, a, e) {
    await (await t.addLine({
      a: [a.startPoint.x, a.startPoint.y, this.getZ(a.startPoint.z)],
      b: [a.endPoint.x, a.endPoint.y, this.getZ(a.endPoint.z)]
    })).setx("$layer", e);
  }
  async addCircle(t, a, e) {
    await (await t.addCircle({
      center: [a.center.x, a.center.y, this.getZ(a.center.z)],
      radius: a.radius
    })).setx("$layer", e);
  }
  async addArc(t, a, e) {
    const s = a.startAngle ?? 0;
    let n = (a.endAngle ?? Math.PI * 2) - s;
    n < 0 && (n += Math.PI * 2), await (await t.addArc({
      center: [a.center.x, a.center.y, this.getZ(a.center.z)],
      radius: a.radius,
      angle: s,
      span: n
    })).setx("$layer", e);
  }
  async addLwPolyline(t, a, e) {
    if (!a.vertices || a.vertices.length < 2) return;
    const s = this.getZ(void 0), r = a.vertices.map((i) => [i.x, i.y, s]);
    await (await t.addPolyline3d({
      vertices: r,
      flags: (a.flag & 1) === 1 ? 1 : void 0
    })).setx("$layer", e);
  }
  async addText(t, a, e) {
    await (await t.addText({
      position: [a.startPoint.x, a.startPoint.y, this.getZ(void 0)],
      height: a.textHeight ?? 2.5,
      content: a.text ?? "",
      rotation: a.rotation ? a.rotation * Math.PI / 180 : 0
    })).setx("$layer", e);
  }
  async addMText(t, a, e) {
    await (await t.addText({
      position: [a.insertionPoint.x, a.insertionPoint.y, this.getZ(a.insertionPoint.z)],
      height: a.textHeight ?? 2.5,
      content: a.text ?? "",
      rotation: a.rotation ? a.rotation * Math.PI / 180 : 0
    })).setx("$layer", e);
  }
  async addPolyline2d(t, a, e) {
    if (!a.vertices || a.vertices.length < 2) return;
    const s = this.getZ(a.elevation), r = a.vertices.map((i) => [i.point.x, i.point.y, s]);
    await (await t.addPolyline3d({
      vertices: r,
      flags: (a.flag & 1) === 1 ? 1 : void 0
    })).setx("$layer", e);
  }
  async addPolyline3d(t, a, e) {
    if (!a.vertices || a.vertices.length < 2) return;
    const s = a.vertices.map((n) => [n.point.x, n.point.y, this.getZ(n.point.z)]);
    await (await t.addPolyline3d({
      vertices: s,
      flags: (a.flag & 1) === 1 ? 1 : void 0
    })).setx("$layer", e);
  }
  async addSpline(t, a, e) {
    var i;
    const s = ((i = a.fitPoints) == null ? void 0 : i.length) > 0 ? a.fitPoints : a.controlPoints;
    if (!s || s.length < 2) return;
    const r = s.map((o) => [o.x, o.y, this.getZ(o.z)]);
    await (await t.addPolyline3d({
      vertices: r
    })).setx("$layer", e);
  }
  async addTable(t, a, e) {
    if (!a.cells || a.cells.length === 0) return;
    const s = a.startPoint.x, r = a.startPoint.y, n = this.getZ(a.startPoint.z);
    let i = r, o = 0;
    for (let l = 0; l < a.rowCount; l++) {
      let c = s;
      for (let g = 0; g < a.columnCount && !(o >= a.cells.length); g++) {
        const d = a.cells[o];
        d.text && d.text.trim() && await (await t.addText({
          position: [c + 2, i - a.rowHeightArr[l] / 2, n],
          height: d.textHeight || 2.5,
          content: d.text
        })).setx("$layer", e), c += a.columnWidthArr[g], o++;
      }
      i -= a.rowHeightArr[l];
    }
    const h = a.columnWidthArr.reduce((l, c) => l + c, 0), w = a.rowHeightArr.reduce((l, c) => l + c, 0), x = [
      [s, r, n],
      [s + h, r, n],
      [s + h, r - w, n],
      [s, r - w, n]
    ];
    await (await t.addPolyline3d({
      vertices: x,
      flags: 1
    })).setx("$layer", e);
  }
  async addInsert(t, a, e) {
    const s = a.insertionPoint, r = this.getZ(s.z), i = Math.max(a.xScale, a.yScale, a.zScale) * 10 || 10;
    await (await t.addLine({
      a: [s.x - i, s.y, r],
      b: [s.x + i, s.y, r]
    })).setx("$layer", e), await (await t.addLine({
      a: [s.x, s.y - i, r],
      b: [s.x, s.y + i, r]
    })).setx("$layer", e), a.name && await (await t.addText({
      position: [s.x + i, s.y + i, r],
      height: i / 2,
      content: `[${a.name}]`
    })).setx("$layer", e);
  }
}
export {
  p as default
};

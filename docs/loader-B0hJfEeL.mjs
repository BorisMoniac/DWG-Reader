class d {
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
    let i = (a.endAngle ?? Math.PI * 2) - s;
    i < 0 && (i += Math.PI * 2), await (await t.addArc({
      center: [a.center.x, a.center.y, this.getZ(a.center.z)],
      radius: a.radius,
      angle: s,
      span: i
    })).setx("$layer", e);
  }
  async addLwPolyline(t, a, e) {
    if (!a.vertices || a.vertices.length < 2) return;
    const s = this.getZ(void 0), n = a.vertices.map((r) => [r.x, r.y, s]);
    await (await t.addPolyline3d({
      vertices: n,
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
    const s = this.getZ(a.elevation), n = a.vertices.map((r) => [r.point.x, r.point.y, s]);
    await (await t.addPolyline3d({
      vertices: n,
      flags: (a.flag & 1) === 1 ? 1 : void 0
    })).setx("$layer", e);
  }
  async addPolyline3d(t, a, e) {
    if (!a.vertices || a.vertices.length < 2) return;
    const s = a.vertices.map((i) => [i.point.x, i.point.y, this.getZ(i.point.z)]);
    await (await t.addPolyline3d({
      vertices: s,
      flags: (a.flag & 1) === 1 ? 1 : void 0
    })).setx("$layer", e);
  }
  async addSpline(t, a, e) {
    var r;
    const s = ((r = a.fitPoints) == null ? void 0 : r.length) > 0 ? a.fitPoints : a.controlPoints;
    if (!s || s.length < 2) return;
    const n = s.map((o) => [o.x, o.y, this.getZ(o.z)]);
    await (await t.addPolyline3d({
      vertices: n
    })).setx("$layer", e);
  }
}
export {
  d as default
};

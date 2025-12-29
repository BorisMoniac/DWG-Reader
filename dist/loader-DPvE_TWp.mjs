class d {
  constructor(e, a) {
    this.drawing = e, this.output = a, this.layers = {};
  }
  async load(e) {
    await this.initializeDefaults(), await this.loadLayers(e), await this.loadEntities(e);
  }
  async initializeDefaults() {
    this.layers[0] = this.drawing.layers.layer0;
  }
  async loadLayers(e) {
    const a = e.tables.LAYER;
    if (!(!a || !a.entries)) {
      await this.drawing.layers.beginUpdate();
      try {
        for (const t of a.entries)
          if (t.name === "0")
            this.layers[t.name] = this.drawing.layers.layer0;
          else {
            const s = {
              name: t.name,
              color: t.colorIndex ?? 7,
              hidden: t.off ?? !1
            };
            this.layers[t.name] = await this.drawing.layers.add(s);
          }
      } finally {
        await this.drawing.layers.endUpdate();
      }
      this.output.info("Загружено слоёв: {0}", Object.keys(this.layers).length);
    }
  }
  async loadEntities(e) {
    const a = this.drawing.layouts.model;
    if (!a) {
      this.output.warn("Model space not found");
      return;
    }
    const t = a.editor();
    await t.beginEdit();
    try {
      for (const s of e.entities)
        await this.processEntity(t, s);
    } finally {
      await t.endEdit();
    }
    this.output.info("Processed {0} entities", e.entities.length);
  }
  getLayer(e) {
    return this.layers[e.layer] ?? this.layers[0];
  }
  async processEntity(e, a) {
    const t = this.getLayer(a);
    try {
      switch (a.type) {
        case "LINE":
          await this.addLine(e, a, t);
          break;
        case "CIRCLE":
          await this.addCircle(e, a, t);
          break;
        case "ARC":
          await this.addArc(e, a, t);
          break;
        case "LWPOLYLINE":
          await this.addLwPolyline(e, a, t);
          break;
        case "TEXT":
          await this.addText(e, a, t);
          break;
        case "MTEXT":
          await this.addMText(e, a, t);
          break;
        default:
          break;
      }
    } catch (s) {
      this.output.warn("Ошибка обработки {0}: {1}", a.type, s.message);
    }
  }
  async addLine(e, a, t) {
    await (await e.addLine({
      a: [a.startPoint.x, a.startPoint.y, a.startPoint.z ?? 0],
      b: [a.endPoint.x, a.endPoint.y, a.endPoint.z ?? 0]
    })).setx("$layer", t);
  }
  async addCircle(e, a, t) {
    await (await e.addCircle({
      center: [a.center.x, a.center.y, a.center.z ?? 0],
      radius: a.radius
    })).setx("$layer", t);
  }
  async addArc(e, a, t) {
    const s = a.startAngle ?? 0;
    let i = (a.endAngle ?? Math.PI * 2) - s;
    i < 0 && (i += Math.PI * 2), await (await e.addArc({
      center: [a.center.x, a.center.y, a.center.z ?? 0],
      radius: a.radius,
      angle: s,
      span: i
    })).setx("$layer", t);
  }
  async addLwPolyline(e, a, t) {
    if (!a.vertices || a.vertices.length < 2) return;
    const s = a.vertices.map((i) => [i.x, i.y, 0]);
    await (await e.addPolyline3d({
      vertices: s,
      flags: (a.flag & 1) === 1 ? 1 : void 0
    })).setx("$layer", t);
  }
  async addText(e, a, t) {
    await (await e.addText({
      position: [a.startPoint.x, a.startPoint.y, 0],
      height: a.textHeight ?? 2.5,
      content: a.text ?? "",
      rotation: a.rotation ? a.rotation * Math.PI / 180 : 0
    })).setx("$layer", t);
  }
  async addMText(e, a, t) {
    await (await e.addText({
      position: [a.insertionPoint.x, a.insertionPoint.y, a.insertionPoint.z ?? 0],
      height: a.textHeight ?? 2.5,
      content: a.text ?? "",
      rotation: a.rotation ? a.rotation * Math.PI / 180 : 0
    })).setx("$layer", t);
  }
}
export {
  d as default
};

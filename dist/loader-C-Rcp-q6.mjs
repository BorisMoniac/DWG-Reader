const A = ["LINE", "CIRCLE", "ARC", "LWPOLYLINE", "POLYLINE2D", "POLYLINE3D", "SPLINE", "TEXT", "MTEXT"], T = ["ACAD_TABLE", "TEXT", "MTEXT"];
class b {
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
    const s = t.editor(), i = await this.explodeAllBlocks(a.entities, 3);
    this.output.info("После взрыва блоков: {0} объектов", i.length), await s.beginEdit();
    try {
      for (const r of i)
        await this.processEntity(s, r);
    } finally {
      await s.endEdit();
    }
    this.output.info("Обработано {0} объектов", i.length);
  }
  async explodeAllBlocks(a, t) {
    let s = [];
    for (let i = 0; i < t; i++) {
      const r = i === 0 ? a : s, n = [];
      let l = !1;
      for (const h of r)
        if (h.type === "INSERT") {
          l = !0;
          const P = this.explodeBlock(h);
          n.push(...P);
        } else if (h.type === "ACAD_TABLE") {
          const P = this.explodeTable(h);
          n.push(...P);
        } else
          n.push(h);
      if (s = n, !l) {
        this.output.info("Взрыв завершен на глубине {0}", i + 1);
        break;
      }
      this.output.info("Проход {0}: {1} объектов", i + 1, s.length);
    }
    return s;
  }
  explodeBlock(a) {
    var o, c;
    if (!this.db || !a.name) return [a];
    const t = (c = (o = this.db.tables.BLOCK_RECORD) == null ? void 0 : o.entries) == null ? void 0 : c.find(
      (x) => x.name === a.name
    );
    if (!t || !t.entities || t.entities.length === 0)
      return [];
    const s = a.insertionPoint || { x: 0, y: 0, z: 0 }, i = t.basePoint || { x: 0, y: 0, z: 0 }, r = a.xScale || 1, n = a.yScale || 1, l = a.zScale || 1, h = (a.rotation || 0) * Math.PI / 180, P = Math.cos(h), d = Math.sin(h), e = [];
    for (const x of t.entities) {
      const f = this.transformEntityData(
        x,
        s,
        i,
        r,
        n,
        l,
        P,
        d,
        a.rotation || 0
      );
      f && (!f.layer && a.layer && (f.layer = a.layer), e.push(f));
    }
    return e;
  }
  explodeTable(a) {
    const t = a;
    return t.entities && Array.isArray(t.entities) ? (this.output.info("TABLE: взрываем {0} вложенных объектов", t.entities.length), t.entities) : [a];
  }
  transformEntityData(a, t, s, i, r, n, l, h, P) {
    const d = (o, c, x) => {
      const f = (o - s.x) * i, u = (c - s.y) * r, p = (x - s.z) * n;
      return {
        x: t.x + f * l - u * h,
        y: t.y + f * h + u * l,
        z: t.z + p
      };
    }, e = JSON.parse(JSON.stringify(
      a,
      (o, c) => typeof c == "bigint" ? Number(c) : c
    ));
    if (a.type === "INSERT") {
      const o = e.insertionPoint || { x: 0, y: 0, z: 0 };
      return e.insertionPoint = d(o.x, o.y, o.z || 0), e.xScale = (e.xScale || 1) * i, e.yScale = (e.yScale || 1) * r, e.zScale = (e.zScale || 1) * n, e.rotation = (e.rotation || 0) + P, e;
    }
    switch (a.type) {
      case "LINE":
        return e.startPoint = d(e.startPoint.x, e.startPoint.y, e.startPoint.z || 0), e.endPoint = d(e.endPoint.x, e.endPoint.y, e.endPoint.z || 0), e;
      case "CIRCLE":
        return e.center = d(e.center.x, e.center.y, e.center.z || 0), e.radius *= Math.abs(i), e;
      case "ARC":
        return e.center = d(e.center.x, e.center.y, e.center.z || 0), e.radius *= Math.abs(i), e;
      case "TEXT":
      case "MTEXT": {
        const o = e.insertionPoint || e.position || { x: 0, y: 0, z: 0 }, c = d(o.x, o.y, o.z || 0);
        return e.insertionPoint = c, e.position = c, e.height && (e.height *= Math.abs(r)), e.textHeight && (e.textHeight *= Math.abs(r)), e;
      }
      case "LWPOLYLINE":
        return e.points && (e.points = e.points.map((o) => {
          const c = d(o.x, o.y, 0);
          return { ...o, x: c.x, y: c.y };
        })), e.vertices && (e.vertices = e.vertices.map((o) => {
          var x, f;
          const c = d(o.x || ((x = o.point) == null ? void 0 : x.x) || 0, o.y || ((f = o.point) == null ? void 0 : f.y) || 0, 0);
          return { ...o, x: c.x, y: c.y, point: c };
        })), e;
      case "POLYLINE2D":
      case "POLYLINE3D":
        return e.vertices && (e.vertices = e.vertices.map((o) => {
          var p, L, w;
          const c = ((p = o.point) == null ? void 0 : p.x) ?? o.x ?? 0, x = ((L = o.point) == null ? void 0 : L.y) ?? o.y ?? 0, f = ((w = o.point) == null ? void 0 : w.z) ?? o.z ?? 0, u = d(c, x, f);
          return { ...o, point: u, x: u.x, y: u.y, z: u.z };
        })), e;
      case "SPLINE":
        return e.controlPoints && (e.controlPoints = e.controlPoints.map((o) => d(o.x, o.y, o.z || 0))), e.fitPoints && (e.fitPoints = e.fitPoints.map((o) => d(o.x, o.y, o.z || 0))), e;
      case "ATTRIB":
      case "ATTDEF": {
        const o = e.insertionPoint || e.position || { x: 0, y: 0, z: 0 }, c = d(o.x, o.y, o.z || 0);
        return e.insertionPoint = c, e.position = c, e.height && (e.height *= Math.abs(r)), e.type = "TEXT", e;
      }
      default:
        return e;
    }
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
    let n = (t.endAngle ?? Math.PI * 2) - i;
    n < 0 && (n += Math.PI * 2), await (await a.addArc({
      center: [t.center.x, t.center.y, this.getZ(t.center.z)],
      radius: t.radius,
      angle: i,
      span: n
    })).setx("$layer", s);
  }
  async addLwPolyline(a, t, s) {
    if (!t.vertices || t.vertices.length < 2) return;
    const i = this.getZ(void 0), r = t.vertices.map((l) => [l.x, l.y, i]);
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
    const i = this.getZ(t.elevation), r = t.vertices.map((l) => [l.point.x, l.point.y, i]);
    await (await a.addPolyline3d({
      vertices: r,
      flags: (t.flag & 1) === 1 ? 1 : void 0
    })).setx("$layer", s);
  }
  async addPolyline3d(a, t, s) {
    if (!t.vertices || t.vertices.length < 2) return;
    const i = t.vertices.map((n) => [n.point.x, n.point.y, this.getZ(n.point.z)]);
    await (await a.addPolyline3d({
      vertices: i,
      flags: (t.flag & 1) === 1 ? 1 : void 0
    })).setx("$layer", s);
  }
  async addSpline(a, t, s) {
    var l;
    const i = ((l = t.fitPoints) == null ? void 0 : l.length) > 0 ? t.fitPoints : t.controlPoints;
    if (!i || i.length < 2) return;
    const r = i.map((h) => [h.x, h.y, this.getZ(h.z)]);
    await (await a.addPolyline3d({
      vertices: r
    })).setx("$layer", s);
  }
  async addTable(a, t, s) {
    var o, c, x, f;
    if (this.output.info(
      "TABLE: name={0}, rows={1}, cols={2}, cells={3}",
      t.name,
      t.rowCount,
      t.columnCount,
      ((o = t.cells) == null ? void 0 : o.length) ?? 0
    ), !t.cells || t.cells.length === 0) {
      this.output.warn("TABLE: пустая таблица, пропускаем");
      return;
    }
    if (!t.rowHeightArr || !t.columnWidthArr) {
      this.output.warn("TABLE: нет данных о размерах строк/столбцов");
      return;
    }
    const i = ((c = t.startPoint) == null ? void 0 : c.x) ?? 0, r = ((x = t.startPoint) == null ? void 0 : x.y) ?? 0, n = this.getZ((f = t.startPoint) == null ? void 0 : f.z);
    this.output.info(
      "TABLE: startPoint=({0}, {1}), rowHeights={2}, colWidths={3}",
      i,
      r,
      t.rowHeightArr.length,
      t.columnWidthArr.length
    );
    let l = r, h = 0, P = 0;
    for (let u = 0; u < t.rowCount && u < t.rowHeightArr.length; u++) {
      let p = i;
      const L = t.rowHeightArr[u] || 10;
      for (let w = 0; w < t.columnCount && w < t.columnWidthArr.length && !(h >= t.cells.length); w++) {
        const g = t.cells[h], y = t.columnWidthArr[w] || 50;
        if (g && g.text && g.text.trim()) {
          const E = g.textHeight || Math.min(L * 0.6, 2.5);
          await (await a.addText({
            position: [p + 2, l - L / 2, n],
            height: E,
            content: g.text.trim()
          })).setx("$layer", s), P++;
        }
        p += y, h++;
      }
      l -= L;
    }
    const d = t.columnWidthArr.reduce((u, p) => u + (p || 0), 0), e = t.rowHeightArr.reduce((u, p) => u + (p || 0), 0);
    if (d > 0 && e > 0) {
      const u = [
        [i, r, n],
        [i + d, r, n],
        [i + d, r - e, n],
        [i, r - e, n]
      ];
      await (await a.addPolyline3d({
        vertices: u,
        flags: 1
      })).setx("$layer", s);
      let L = r;
      for (let g = 0; g < t.rowHeightArr.length; g++)
        L -= t.rowHeightArr[g] || 0, g < t.rowHeightArr.length - 1 && await (await a.addLine({
          a: [i, L, n],
          b: [i + d, L, n]
        })).setx("$layer", s);
      let w = i;
      for (let g = 0; g < t.columnWidthArr.length; g++)
        w += t.columnWidthArr[g] || 0, g < t.columnWidthArr.length - 1 && await (await a.addLine({
          a: [w, r, n],
          b: [w, r - e, n]
        })).setx("$layer", s);
    }
    this.output.info("TABLE: загружено {0} текстовых ячеек", P);
  }
}
export {
  b as default
};

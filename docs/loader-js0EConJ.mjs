const A = ["LINE", "CIRCLE", "ARC", "LWPOLYLINE", "POLYLINE2D", "POLYLINE3D", "SPLINE", "TEXT", "MTEXT"], m = ["ACAD_TABLE", "TEXT", "MTEXT"];
class b {
  constructor(e, t) {
    this.drawing = e, this.output = t, this.layers = {}, this.flattenZ = !0, this.targetZ = 0, this.importMode = "all", this.db = null, this.processedBlocks = /* @__PURE__ */ new Set();
  }
  setFlattenZ(e, t = 0) {
    this.flattenZ = e, this.targetZ = t;
  }
  setImportMode(e) {
    this.importMode = e;
  }
  shouldImport(e) {
    switch (this.importMode) {
      case "geometry":
        return A.includes(e);
      case "tables":
        return m.includes(e);
      case "all":
      default:
        return !0;
    }
  }
  getZ(e) {
    return this.flattenZ ? this.targetZ : e ?? 0;
  }
  async load(e) {
    this.db = e, this.processedBlocks.clear(), await this.initializeDefaults(), await this.loadLayers(e), await this.loadEntities(e);
  }
  async initializeDefaults() {
    this.layers[0] = this.drawing.layers.layer0;
  }
  async loadLayers(e) {
    const t = e.tables.LAYER;
    if (!(!t || !t.entries)) {
      await this.drawing.layers.beginUpdate();
      try {
        for (const i of t.entries)
          if (i.name === "0")
            this.layers[i.name] = this.drawing.layers.layer0;
          else {
            const a = {
              name: i.name,
              color: i.colorIndex ?? 7,
              hidden: i.off ?? !1
            };
            this.layers[i.name] = await this.drawing.layers.add(a);
          }
      } finally {
        await this.drawing.layers.endUpdate();
      }
      this.output.info("Загружено слоёв: {0}", Object.keys(this.layers).length);
    }
  }
  async loadEntities(e) {
    const t = this.drawing.layouts.model;
    if (!t) {
      this.output.warn("Model space not found");
      return;
    }
    const i = t.editor(), a = await this.explodeAllBlocks(e.entities, 3);
    this.output.info("После взрыва блоков: {0} объектов", a.length), await i.beginEdit();
    try {
      for (const r of a)
        await this.processEntity(i, r);
    } finally {
      await i.endEdit();
    }
    this.output.info("Обработано {0} объектов", a.length);
  }
  async explodeAllBlocks(e, t) {
    let i = [];
    for (let a = 0; a < t; a++) {
      const r = a === 0 ? e : i, n = [];
      let l = !1;
      for (const h of r)
        if (h.type === "INSERT") {
          l = !0;
          const f = this.explodeBlock(h);
          n.push(...f);
        } else if (h.type === "ACAD_TABLE") {
          const f = this.explodeTable(h);
          n.push(...f);
        } else
          n.push(h);
      if (i = n, !l) {
        this.output.info("Взрыв завершен на глубине {0}", a + 1);
        break;
      }
      this.output.info("Проход {0}: {1} объектов", a + 1, i.length);
    }
    return i;
  }
  explodeBlock(e) {
    var o, c;
    if (!this.db || !e.name) return [e];
    const t = (c = (o = this.db.tables.BLOCK_RECORD) == null ? void 0 : o.entries) == null ? void 0 : c.find(
      (x) => x.name === e.name
    );
    if (!t || !t.entities || t.entities.length === 0)
      return [];
    const i = e.insertionPoint || { x: 0, y: 0, z: 0 }, a = t.basePoint || { x: 0, y: 0, z: 0 }, r = e.xScale || 1, n = e.yScale || 1, l = e.zScale || 1, h = (e.rotation || 0) * Math.PI / 180, f = Math.cos(h), d = Math.sin(h), s = [];
    for (const x of t.entities) {
      const u = this.transformEntityData(
        x,
        i,
        a,
        r,
        n,
        l,
        f,
        d,
        e.rotation || 0
      );
      u && (!u.layer && e.layer && (u.layer = e.layer), s.push(u));
    }
    return s;
  }
  explodeTable(e) {
    const t = e;
    return t.entities && Array.isArray(t.entities) ? (this.output.info("TABLE: взрываем {0} вложенных объектов", t.entities.length), t.entities) : [e];
  }
  transformEntityData(e, t, i, a, r, n, l, h, f) {
    const d = (o, c, x) => {
      const u = (o - i.x) * a, p = (c - i.y) * r, w = (x - i.z) * n;
      return {
        x: t.x + u * l - p * h,
        y: t.y + u * h + p * l,
        z: t.z + w
      };
    }, s = JSON.parse(JSON.stringify(
      e,
      (o, c) => typeof c == "bigint" ? Number(c) : c
    ));
    if (e.type === "INSERT") {
      const o = s.insertionPoint || { x: 0, y: 0, z: 0 };
      return s.insertionPoint = d(o.x, o.y, o.z || 0), s.xScale = (s.xScale || 1) * a, s.yScale = (s.yScale || 1) * r, s.zScale = (s.zScale || 1) * n, s.rotation = (s.rotation || 0) + f, s;
    }
    switch (e.type) {
      case "LINE":
        return s.startPoint = d(s.startPoint.x, s.startPoint.y, s.startPoint.z || 0), s.endPoint = d(s.endPoint.x, s.endPoint.y, s.endPoint.z || 0), s;
      case "CIRCLE":
        return s.center = d(s.center.x, s.center.y, s.center.z || 0), s.radius *= Math.abs(a), s;
      case "ARC":
        return s.center = d(s.center.x, s.center.y, s.center.z || 0), s.radius *= Math.abs(a), s;
      case "TEXT":
      case "MTEXT": {
        const o = s.insertionPoint || s.position || { x: 0, y: 0, z: 0 }, c = d(o.x, o.y, o.z || 0);
        return s.insertionPoint = c, s.position = c, s.height && (s.height *= Math.abs(r)), s.textHeight && (s.textHeight *= Math.abs(r)), s;
      }
      case "LWPOLYLINE":
        return s.points && (s.points = s.points.map((o) => {
          const c = d(o.x, o.y, 0);
          return { ...o, x: c.x, y: c.y };
        })), s.vertices && (s.vertices = s.vertices.map((o) => {
          var x, u;
          const c = d(o.x || ((x = o.point) == null ? void 0 : x.x) || 0, o.y || ((u = o.point) == null ? void 0 : u.y) || 0, 0);
          return { ...o, x: c.x, y: c.y, point: c };
        })), s;
      case "POLYLINE2D":
      case "POLYLINE3D":
        return s.vertices && (s.vertices = s.vertices.map((o) => {
          var w, y, P;
          const c = ((w = o.point) == null ? void 0 : w.x) ?? o.x ?? 0, x = ((y = o.point) == null ? void 0 : y.y) ?? o.y ?? 0, u = ((P = o.point) == null ? void 0 : P.z) ?? o.z ?? 0, p = d(c, x, u);
          return { ...o, point: p, x: p.x, y: p.y, z: p.z };
        })), s;
      case "SPLINE":
        return s.controlPoints && (s.controlPoints = s.controlPoints.map((o) => d(o.x, o.y, o.z || 0))), s.fitPoints && (s.fitPoints = s.fitPoints.map((o) => d(o.x, o.y, o.z || 0))), s;
      case "ATTRIB":
      case "ATTDEF": {
        const o = s.insertionPoint || s.position || { x: 0, y: 0, z: 0 }, c = d(o.x, o.y, o.z || 0);
        return s.insertionPoint = c, s.position = c, s.height && (s.height *= Math.abs(r)), s.type = "TEXT", s;
      }
      default:
        return s;
    }
  }
  getLayer(e) {
    return this.layers[e.layer] ?? this.layers[0];
  }
  getEntityColor(e) {
    const t = e;
    if (t.color !== void 0 && t.color !== 256)
      return t.color;
    if (t.colorValue !== void 0)
      return t.colorValue | 255 << 24;
  }
  async applyEntityProperties(e, t, i) {
    await e.setx("$layer", t);
    const a = this.getEntityColor(i);
    a !== void 0 && await e.setx("color", a);
  }
  async processEntity(e, t) {
    if (!this.shouldImport(t.type)) return;
    const i = this.getLayer(t);
    try {
      switch (t.type) {
        case "LINE":
          await this.addLine(e, t, i);
          break;
        case "CIRCLE":
          await this.addCircle(e, t, i);
          break;
        case "ARC":
          await this.addArc(e, t, i);
          break;
        case "LWPOLYLINE":
          await this.addLwPolyline(e, t, i);
          break;
        case "TEXT":
          await this.addText(e, t, i);
          break;
        case "MTEXT":
          await this.addMText(e, t, i);
          break;
        case "POLYLINE2D":
          await this.addPolyline2d(e, t, i);
          break;
        case "POLYLINE3D":
          await this.addPolyline3d(e, t, i);
          break;
        case "SPLINE":
          await this.addSpline(e, t, i);
          break;
        case "ACAD_TABLE":
          await this.addTable(e, t, i);
          break;
        default:
          break;
      }
    } catch (a) {
      this.output.warn("Ошибка обработки {0}: {1}", t.type, a.message);
    }
  }
  async addLine(e, t, i) {
    const a = await e.addLine({
      a: [t.startPoint.x, t.startPoint.y, this.getZ(t.startPoint.z)],
      b: [t.endPoint.x, t.endPoint.y, this.getZ(t.endPoint.z)]
    });
    await this.applyEntityProperties(a, i, t);
  }
  async addCircle(e, t, i) {
    const a = await e.addCircle({
      center: [t.center.x, t.center.y, this.getZ(t.center.z)],
      radius: t.radius
    });
    await this.applyEntityProperties(a, i, t);
  }
  async addArc(e, t, i) {
    const a = t.startAngle ?? 0;
    let n = (t.endAngle ?? Math.PI * 2) - a;
    n < 0 && (n += Math.PI * 2);
    const l = await e.addArc({
      center: [t.center.x, t.center.y, this.getZ(t.center.z)],
      radius: t.radius,
      angle: a,
      span: n
    });
    await this.applyEntityProperties(l, i, t);
  }
  async addLwPolyline(e, t, i) {
    if (!t.vertices || t.vertices.length < 2) return;
    const a = this.getZ(void 0), r = t.vertices.map((l) => [l.x, l.y, a]), n = await e.addPolyline3d({
      vertices: r,
      flags: (t.flag & 1) === 1 ? 1 : void 0
    });
    await this.applyEntityProperties(n, i, t);
  }
  async addText(e, t, i) {
    const a = t, r = a.startPoint || a.insertionPoint || a.position || { x: 0, y: 0, z: 0 }, n = a.text || a.textValue || a.content || "", l = a.textHeight || a.height || 2.5, h = a.rotation ? a.rotation * Math.PI / 180 : 0;
    if (!n) return;
    const f = await e.addText({
      position: [r.x, r.y, this.getZ(r.z)],
      height: l,
      content: n,
      rotation: h
    });
    await this.applyEntityProperties(f, i, t);
  }
  async addMText(e, t, i) {
    const a = t, r = a.insertionPoint || a.position || { x: 0, y: 0, z: 0 };
    let n = a.text || a.textValue || a.content || "";
    const l = a.textHeight || a.height || 2.5, h = a.rotation ? a.rotation * Math.PI / 180 : 0;
    if (n = n.replace(/\\[A-Za-z][^;]*;/g, "").replace(/\{|\}/g, "").replace(/\\P/g, `
`).replace(/\\/g, ""), !n.trim()) return;
    const f = await e.addText({
      position: [r.x, r.y, this.getZ(r.z)],
      height: l,
      content: n.trim(),
      rotation: h
    });
    await this.applyEntityProperties(f, i, t);
  }
  async addPolyline2d(e, t, i) {
    if (!t.vertices || t.vertices.length < 2) return;
    const a = this.getZ(t.elevation), r = t.vertices.map((l) => [l.point.x, l.point.y, a]), n = await e.addPolyline3d({
      vertices: r,
      flags: (t.flag & 1) === 1 ? 1 : void 0
    });
    await this.applyEntityProperties(n, i, t);
  }
  async addPolyline3d(e, t, i) {
    if (!t.vertices || t.vertices.length < 2) return;
    const a = t.vertices.map((n) => [n.point.x, n.point.y, this.getZ(n.point.z)]), r = await e.addPolyline3d({
      vertices: a,
      flags: (t.flag & 1) === 1 ? 1 : void 0
    });
    await this.applyEntityProperties(r, i, t);
  }
  async addSpline(e, t, i) {
    var l;
    const a = ((l = t.fitPoints) == null ? void 0 : l.length) > 0 ? t.fitPoints : t.controlPoints;
    if (!a || a.length < 2) return;
    const r = a.map((h) => [h.x, h.y, this.getZ(h.z)]), n = await e.addPolyline3d({
      vertices: r
    });
    await this.applyEntityProperties(n, i, t);
  }
  async addTable(e, t, i) {
    var o, c, x, u;
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
    const a = ((c = t.startPoint) == null ? void 0 : c.x) ?? 0, r = ((x = t.startPoint) == null ? void 0 : x.y) ?? 0, n = this.getZ((u = t.startPoint) == null ? void 0 : u.z);
    this.output.info(
      "TABLE: startPoint=({0}, {1}), rowHeights={2}, colWidths={3}",
      a,
      r,
      t.rowHeightArr.length,
      t.columnWidthArr.length
    );
    let l = r, h = 0, f = 0;
    for (let p = 0; p < t.rowCount && p < t.rowHeightArr.length; p++) {
      let w = a;
      const y = t.rowHeightArr[p] || 10;
      for (let P = 0; P < t.columnCount && P < t.columnWidthArr.length && !(h >= t.cells.length); P++) {
        const g = t.cells[h], E = t.columnWidthArr[P] || 50;
        if (g && g.text && g.text.trim()) {
          const L = g.textHeight || Math.min(y * 0.6, 2.5);
          await (await e.addText({
            position: [w + 2, l - y / 2, n],
            height: L,
            content: g.text.trim()
          })).setx("$layer", i), f++;
        }
        w += E, h++;
      }
      l -= y;
    }
    const d = t.columnWidthArr.reduce((p, w) => p + (w || 0), 0), s = t.rowHeightArr.reduce((p, w) => p + (w || 0), 0);
    if (d > 0 && s > 0) {
      const p = [
        [a, r, n],
        [a + d, r, n],
        [a + d, r - s, n],
        [a, r - s, n]
      ];
      await (await e.addPolyline3d({
        vertices: p,
        flags: 1
      })).setx("$layer", i);
      let y = r;
      for (let g = 0; g < t.rowHeightArr.length; g++)
        y -= t.rowHeightArr[g] || 0, g < t.rowHeightArr.length - 1 && await (await e.addLine({
          a: [a, y, n],
          b: [a + d, y, n]
        })).setx("$layer", i);
      let P = a;
      for (let g = 0; g < t.columnWidthArr.length; g++)
        P += t.columnWidthArr[g] || 0, g < t.columnWidthArr.length - 1 && await (await e.addLine({
          a: [P, r, n],
          b: [P, r - s, n]
        })).setx("$layer", i);
    }
    this.output.info("TABLE: загружено {0} текстовых ячеек", f);
  }
}
export {
  b as default
};

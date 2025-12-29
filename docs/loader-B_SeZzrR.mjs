const T = ["LINE", "CIRCLE", "ARC", "LWPOLYLINE", "POLYLINE2D", "POLYLINE3D", "SPLINE", "TEXT", "MTEXT"], A = ["ACAD_TABLE", "TEXT", "MTEXT"];
class b {
  constructor(s, t) {
    this.drawing = s, this.output = t, this.layers = {}, this.flattenZ = !0, this.targetZ = 0, this.importMode = "all", this.db = null, this.processedBlocks = /* @__PURE__ */ new Set();
  }
  setFlattenZ(s, t = 0) {
    this.flattenZ = s, this.targetZ = t;
  }
  setImportMode(s) {
    this.importMode = s;
  }
  shouldImport(s) {
    switch (this.importMode) {
      case "geometry":
        return T.includes(s);
      case "tables":
        return A.includes(s);
      case "all":
      default:
        return !0;
    }
  }
  getZ(s) {
    return this.flattenZ ? this.targetZ : s ?? 0;
  }
  async load(s) {
    this.db = s, this.processedBlocks.clear(), await this.initializeDefaults(), await this.loadLayers(s), await this.loadEntities(s);
  }
  async initializeDefaults() {
    this.layers[0] = this.drawing.layers.layer0;
  }
  async loadLayers(s) {
    const t = s.tables.LAYER;
    if (!(!t || !t.entries)) {
      await this.drawing.layers.beginUpdate();
      try {
        for (const a of t.entries)
          if (a.name === "0")
            this.layers[a.name] = this.drawing.layers.layer0;
          else {
            const i = {
              name: a.name,
              color: a.colorIndex ?? 7,
              hidden: a.off ?? !1
            };
            this.layers[a.name] = await this.drawing.layers.add(i);
          }
      } finally {
        await this.drawing.layers.endUpdate();
      }
      this.output.info("Загружено слоёв: {0}", Object.keys(this.layers).length);
    }
  }
  async loadEntities(s) {
    const t = this.drawing.layouts.model;
    if (!t) {
      this.output.warn("Model space not found");
      return;
    }
    const a = t.editor(), i = await this.explodeAllBlocks(s.entities, 3);
    this.output.info("После взрыва блоков: {0} объектов", i.length), await a.beginEdit();
    try {
      for (const r of i)
        await this.processEntity(a, r);
    } finally {
      await a.endEdit();
    }
    this.output.info("Обработано {0} объектов", i.length);
  }
  async explodeAllBlocks(s, t) {
    let a = [];
    for (let i = 0; i < t; i++) {
      const r = i === 0 ? s : a, o = [];
      let c = !1;
      for (const l of r)
        if (l.type === "INSERT") {
          c = !0;
          const u = this.explodeBlock(l);
          o.push(...u);
        } else if (l.type === "ACAD_TABLE") {
          const u = this.explodeTable(l);
          o.push(...u);
        } else
          o.push(l);
      if (a = o, !c) {
        this.output.info("Взрыв завершен на глубине {0}", i + 1);
        break;
      }
      this.output.info("Проход {0}: {1} объектов", i + 1, a.length);
    }
    return a;
  }
  explodeBlock(s) {
    var n, h;
    if (!this.db || !s.name) return [s];
    const t = (h = (n = this.db.tables.BLOCK_RECORD) == null ? void 0 : n.entries) == null ? void 0 : h.find(
      (x) => x.name === s.name
    );
    if (!t || !t.entities || t.entities.length === 0)
      return [];
    const a = s.insertionPoint || { x: 0, y: 0, z: 0 }, i = t.basePoint || { x: 0, y: 0, z: 0 }, r = s.xScale || 1, o = s.yScale || 1, c = s.zScale || 1, l = (s.rotation || 0) * Math.PI / 180, u = Math.cos(l), d = Math.sin(l), e = [];
    for (const x of t.entities) {
      const g = this.transformEntityData(
        x,
        a,
        i,
        r,
        o,
        c,
        u,
        d,
        s.rotation || 0
      );
      g && (!g.layer && s.layer && (g.layer = s.layer), e.push(g));
    }
    return e;
  }
  explodeTable(s) {
    const t = s;
    return t.entities && Array.isArray(t.entities) ? (this.output.info("TABLE: взрываем {0} вложенных объектов", t.entities.length), t.entities) : [s];
  }
  transformEntityData(s, t, a, i, r, o, c, l, u) {
    const d = (n, h, x) => {
      const g = (n - a.x) * i, p = (h - a.y) * r, w = (x - a.z) * o;
      return {
        x: t.x + g * c - p * l,
        y: t.y + g * l + p * c,
        z: t.z + w
      };
    }, e = JSON.parse(JSON.stringify(
      s,
      (n, h) => typeof h == "bigint" ? Number(h) : h
    ));
    if (s.type === "INSERT") {
      const n = e.insertionPoint || { x: 0, y: 0, z: 0 };
      return e.insertionPoint = d(n.x, n.y, n.z || 0), e.xScale = (e.xScale || 1) * i, e.yScale = (e.yScale || 1) * r, e.zScale = (e.zScale || 1) * o, e.rotation = (e.rotation || 0) + u, e;
    }
    switch (s.type) {
      case "LINE":
        return e.startPoint = d(e.startPoint.x, e.startPoint.y, e.startPoint.z || 0), e.endPoint = d(e.endPoint.x, e.endPoint.y, e.endPoint.z || 0), e;
      case "CIRCLE":
        return e.center = d(e.center.x, e.center.y, e.center.z || 0), e.radius *= Math.abs(i), e;
      case "ARC":
        return e.center = d(e.center.x, e.center.y, e.center.z || 0), e.radius *= Math.abs(i), e;
      case "TEXT":
      case "MTEXT": {
        const n = e.startPoint || e.insertionPoint || e.position || { x: 0, y: 0, z: 0 }, h = d(n.x, n.y, n.z || 0);
        return e.startPoint = h, e.insertionPoint = h, e.position = h, e.height && (e.height *= Math.abs(r)), e.textHeight && (e.textHeight *= Math.abs(r)), e;
      }
      case "LWPOLYLINE":
        return e.points && (e.points = e.points.map((n) => {
          const h = d(n.x, n.y, 0);
          return { ...n, x: h.x, y: h.y };
        })), e.vertices && (e.vertices = e.vertices.map((n) => {
          var x, g;
          const h = d(n.x || ((x = n.point) == null ? void 0 : x.x) || 0, n.y || ((g = n.point) == null ? void 0 : g.y) || 0, 0);
          return { ...n, x: h.x, y: h.y, point: h };
        })), e;
      case "POLYLINE2D":
      case "POLYLINE3D":
        return e.vertices && (e.vertices = e.vertices.map((n) => {
          var w, y, P;
          const h = ((w = n.point) == null ? void 0 : w.x) ?? n.x ?? 0, x = ((y = n.point) == null ? void 0 : y.y) ?? n.y ?? 0, g = ((P = n.point) == null ? void 0 : P.z) ?? n.z ?? 0, p = d(h, x, g);
          return { ...n, point: p, x: p.x, y: p.y, z: p.z };
        })), e;
      case "SPLINE":
        return e.controlPoints && (e.controlPoints = e.controlPoints.map((n) => d(n.x, n.y, n.z || 0))), e.fitPoints && (e.fitPoints = e.fitPoints.map((n) => d(n.x, n.y, n.z || 0))), e;
      case "ATTRIB":
      case "ATTDEF": {
        const n = e.insertionPoint || e.position || { x: 0, y: 0, z: 0 }, h = d(n.x, n.y, n.z || 0);
        return e.insertionPoint = h, e.position = h, e.height && (e.height *= Math.abs(r)), e.type = "TEXT", e;
      }
      default:
        return e;
    }
  }
  getLayer(s) {
    return this.layers[s.layer] ?? this.layers[0];
  }
  getEntityColor(s) {
    const t = s;
    if (t.color !== void 0 && t.color !== 256)
      return t.color;
    if (t.colorValue !== void 0)
      return t.colorValue | 255 << 24;
  }
  async applyEntityProperties(s, t, a) {
    await s.setx("$layer", t);
    const i = this.getEntityColor(a);
    i !== void 0 && await s.setx("color", i);
  }
  async processEntity(s, t) {
    if (!this.shouldImport(t.type)) return;
    const a = this.getLayer(t);
    try {
      switch (t.type) {
        case "LINE":
          await this.addLine(s, t, a);
          break;
        case "CIRCLE":
          await this.addCircle(s, t, a);
          break;
        case "ARC":
          await this.addArc(s, t, a);
          break;
        case "LWPOLYLINE":
          await this.addLwPolyline(s, t, a);
          break;
        case "TEXT":
          await this.addText(s, t, a);
          break;
        case "MTEXT":
          await this.addMText(s, t, a);
          break;
        case "POLYLINE2D":
          await this.addPolyline2d(s, t, a);
          break;
        case "POLYLINE3D":
          await this.addPolyline3d(s, t, a);
          break;
        case "SPLINE":
          await this.addSpline(s, t, a);
          break;
        case "ACAD_TABLE":
          await this.addTable(s, t, a);
          break;
        default:
          break;
      }
    } catch (i) {
      this.output.warn("Ошибка обработки {0}: {1}", t.type, i.message);
    }
  }
  async addLine(s, t, a) {
    const i = await s.addLine({
      a: [t.startPoint.x, t.startPoint.y, this.getZ(t.startPoint.z)],
      b: [t.endPoint.x, t.endPoint.y, this.getZ(t.endPoint.z)]
    });
    await this.applyEntityProperties(i, a, t);
  }
  async addCircle(s, t, a) {
    const i = await s.addCircle({
      center: [t.center.x, t.center.y, this.getZ(t.center.z)],
      radius: t.radius
    });
    await this.applyEntityProperties(i, a, t);
  }
  async addArc(s, t, a) {
    const i = t.startAngle ?? 0;
    let o = (t.endAngle ?? Math.PI * 2) - i;
    o < 0 && (o += Math.PI * 2);
    const c = await s.addArc({
      center: [t.center.x, t.center.y, this.getZ(t.center.z)],
      radius: t.radius,
      angle: i,
      span: o
    });
    await this.applyEntityProperties(c, a, t);
  }
  async addLwPolyline(s, t, a) {
    if (!t.vertices || t.vertices.length < 2) return;
    const i = t, r = this.getZ(i.elevation), o = i.constantWidth || i.startWidth || i.globalWidth || void 0;
    if (o) {
      const c = t.vertices.map((u) => [u.x, u.y, u.bulge || 0]), l = await s.addPolyline({
        vertices: c,
        flags: (t.flag & 1) === 1 ? 1 : void 0,
        width: o,
        elevation: r
      });
      await this.applyEntityProperties(l, a, t);
    } else {
      const c = t.vertices.map((u) => [u.x, u.y, r]), l = await s.addPolyline3d({
        vertices: c,
        flags: (t.flag & 1) === 1 ? 1 : void 0
      });
      await this.applyEntityProperties(l, a, t);
    }
  }
  async addText(s, t, a) {
    var d, e;
    const i = t, r = i.startPoint || i.insertionPoint || i.position || { x: 0, y: 0, z: 0 }, o = i.text || i.textValue || i.content || "", c = i.textHeight || i.height || 2.5, l = i.rotation ? i.rotation * Math.PI / 180 : 0;
    if (this.output.info('TEXT: pos=({0},{1}), h={2}, text="{3}"', (d = r.x) == null ? void 0 : d.toFixed(2), (e = r.y) == null ? void 0 : e.toFixed(2), c, o == null ? void 0 : o.substring(0, 30)), !o) {
      this.output.warn("TEXT: пустой текст, пропуск");
      return;
    }
    const u = await s.addText({
      position: [r.x, r.y, this.getZ(r.z)],
      height: c,
      content: o,
      rotation: l
    });
    await this.applyEntityProperties(u, a, t);
  }
  async addMText(s, t, a) {
    var d, e;
    const i = t, r = i.insertionPoint || i.position || { x: 0, y: 0, z: 0 };
    let o = i.text || i.textValue || i.content || "";
    const c = i.textHeight || i.height || 2.5, l = i.rotation ? i.rotation * Math.PI / 180 : 0;
    if (this.output.info('MTEXT: pos=({0},{1}), h={2}, raw="{3}"', (d = r.x) == null ? void 0 : d.toFixed(2), (e = r.y) == null ? void 0 : e.toFixed(2), c, o == null ? void 0 : o.substring(0, 30)), o = o.replace(/\\[A-Za-z][^;]*;/g, "").replace(/\{|\}/g, "").replace(/\\P/g, `
`).replace(/\\/g, ""), !o.trim()) {
      this.output.warn("MTEXT: пустой текст после очистки");
      return;
    }
    const u = await s.addText({
      position: [r.x, r.y, this.getZ(r.z)],
      height: c,
      content: o.trim(),
      rotation: l
    });
    await this.applyEntityProperties(u, a, t);
  }
  async addPolyline2d(s, t, a) {
    if (!t.vertices || t.vertices.length < 2) return;
    const i = this.getZ(t.elevation), r = t.vertices.map((c) => [c.point.x, c.point.y, i]), o = await s.addPolyline3d({
      vertices: r,
      flags: (t.flag & 1) === 1 ? 1 : void 0
    });
    await this.applyEntityProperties(o, a, t);
  }
  async addPolyline3d(s, t, a) {
    if (!t.vertices || t.vertices.length < 2) return;
    const i = t.vertices.map((o) => [o.point.x, o.point.y, this.getZ(o.point.z)]), r = await s.addPolyline3d({
      vertices: i,
      flags: (t.flag & 1) === 1 ? 1 : void 0
    });
    await this.applyEntityProperties(r, a, t);
  }
  async addSpline(s, t, a) {
    var c;
    const i = ((c = t.fitPoints) == null ? void 0 : c.length) > 0 ? t.fitPoints : t.controlPoints;
    if (!i || i.length < 2) return;
    const r = i.map((l) => [l.x, l.y, this.getZ(l.z)]), o = await s.addPolyline3d({
      vertices: r
    });
    await this.applyEntityProperties(o, a, t);
  }
  async addTable(s, t, a) {
    var n, h, x, g;
    if (this.output.info(
      "TABLE: name={0}, rows={1}, cols={2}, cells={3}",
      t.name,
      t.rowCount,
      t.columnCount,
      ((n = t.cells) == null ? void 0 : n.length) ?? 0
    ), !t.cells || t.cells.length === 0) {
      this.output.warn("TABLE: пустая таблица, пропускаем");
      return;
    }
    if (!t.rowHeightArr || !t.columnWidthArr) {
      this.output.warn("TABLE: нет данных о размерах строк/столбцов");
      return;
    }
    const i = ((h = t.startPoint) == null ? void 0 : h.x) ?? 0, r = ((x = t.startPoint) == null ? void 0 : x.y) ?? 0, o = this.getZ((g = t.startPoint) == null ? void 0 : g.z);
    this.output.info(
      "TABLE: startPoint=({0}, {1}), rowHeights={2}, colWidths={3}",
      i,
      r,
      t.rowHeightArr.length,
      t.columnWidthArr.length
    );
    let c = r, l = 0, u = 0;
    for (let p = 0; p < t.rowCount && p < t.rowHeightArr.length; p++) {
      let w = i;
      const y = t.rowHeightArr[p] || 10;
      for (let P = 0; P < t.columnCount && P < t.columnWidthArr.length && !(l >= t.cells.length); P++) {
        const f = t.cells[l], E = t.columnWidthArr[P] || 50;
        if (f && f.text && f.text.trim()) {
          const L = f.textHeight || Math.min(y * 0.6, 2.5);
          await (await s.addText({
            position: [w + 2, c - y / 2, o],
            height: L,
            content: f.text.trim()
          })).setx("$layer", a), u++;
        }
        w += E, l++;
      }
      c -= y;
    }
    const d = t.columnWidthArr.reduce((p, w) => p + (w || 0), 0), e = t.rowHeightArr.reduce((p, w) => p + (w || 0), 0);
    if (d > 0 && e > 0) {
      const p = [
        [i, r, o],
        [i + d, r, o],
        [i + d, r - e, o],
        [i, r - e, o]
      ];
      await (await s.addPolyline3d({
        vertices: p,
        flags: 1
      })).setx("$layer", a);
      let y = r;
      for (let f = 0; f < t.rowHeightArr.length; f++)
        y -= t.rowHeightArr[f] || 0, f < t.rowHeightArr.length - 1 && await (await s.addLine({
          a: [i, y, o],
          b: [i + d, y, o]
        })).setx("$layer", a);
      let P = i;
      for (let f = 0; f < t.columnWidthArr.length; f++)
        P += t.columnWidthArr[f] || 0, f < t.columnWidthArr.length - 1 && await (await s.addLine({
          a: [P, r, o],
          b: [P, r - e, o]
        })).setx("$layer", a);
    }
    this.output.info("TABLE: загружено {0} текстовых ячеек", u);
  }
}
export {
  b as default
};

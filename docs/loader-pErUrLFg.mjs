const T = ["LINE", "CIRCLE", "ARC", "LWPOLYLINE", "POLYLINE2D", "POLYLINE3D", "SPLINE", "TEXT", "MTEXT"], A = ["ACAD_TABLE", "TEXT", "MTEXT"];
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
        return T.includes(e);
      case "tables":
        return A.includes(e);
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
            const s = {
              name: i.name,
              color: i.colorIndex ?? 7,
              hidden: i.off ?? !1
            };
            this.layers[i.name] = await this.drawing.layers.add(s);
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
    const i = t.editor(), s = await this.explodeAllBlocks(e.entities, 3);
    this.output.info("После взрыва блоков: {0} объектов", s.length), await i.beginEdit();
    try {
      for (const r of s)
        await this.processEntity(i, r);
    } finally {
      await i.endEdit();
    }
    this.output.info("Обработано {0} объектов", s.length);
  }
  async explodeAllBlocks(e, t) {
    let i = [];
    for (let s = 0; s < t; s++) {
      const r = s === 0 ? e : i, a = [];
      let d = !1;
      for (const c of r)
        if (c.type === "INSERT") {
          d = !0;
          const g = this.explodeBlock(c);
          a.push(...g);
        } else if (c.type === "ACAD_TABLE") {
          const g = this.explodeTable(c);
          a.push(...g);
        } else
          a.push(c);
      if (i = a, !d) {
        this.output.info("Взрыв завершен на глубине {0}", s + 1);
        break;
      }
      this.output.info("Проход {0}: {1} объектов", s + 1, i.length);
    }
    return i;
  }
  explodeBlock(e) {
    var n, l;
    if (!this.db || !e.name) return [e];
    const t = (l = (n = this.db.tables.BLOCK_RECORD) == null ? void 0 : n.entries) == null ? void 0 : l.find(
      (x) => x.name === e.name
    );
    if (!t || !t.entities || t.entities.length === 0)
      return [];
    const i = e.insertionPoint || { x: 0, y: 0, z: 0 }, s = t.basePoint || { x: 0, y: 0, z: 0 }, r = e.xScale || 1, a = e.yScale || 1, d = e.zScale || 1, c = (e.rotation || 0) * Math.PI / 180, g = Math.cos(c), h = Math.sin(c), o = [];
    for (const x of t.entities) {
      const f = this.transformEntityData(
        x,
        i,
        s,
        r,
        a,
        d,
        g,
        h,
        e.rotation || 0
      );
      f && (!f.layer && e.layer && (f.layer = e.layer), o.push(f));
    }
    return o;
  }
  explodeTable(e) {
    const t = e;
    return t.entities && Array.isArray(t.entities) ? (this.output.info("TABLE: взрываем {0} вложенных объектов", t.entities.length), t.entities) : [e];
  }
  transformEntityData(e, t, i, s, r, a, d, c, g) {
    const h = (n, l, x) => {
      const f = (n - i.x) * s, u = (l - i.y) * r, w = (x - i.z) * a;
      return {
        x: t.x + f * d - u * c,
        y: t.y + f * c + u * d,
        z: t.z + w
      };
    }, o = JSON.parse(JSON.stringify(
      e,
      (n, l) => typeof l == "bigint" ? Number(l) : l
    ));
    if (e.type === "INSERT") {
      const n = o.insertionPoint || { x: 0, y: 0, z: 0 };
      return o.insertionPoint = h(n.x, n.y, n.z || 0), o.xScale = (o.xScale || 1) * s, o.yScale = (o.yScale || 1) * r, o.zScale = (o.zScale || 1) * a, o.rotation = (o.rotation || 0) + g, o;
    }
    switch (e.type) {
      case "LINE":
        return o.startPoint = h(o.startPoint.x, o.startPoint.y, o.startPoint.z || 0), o.endPoint = h(o.endPoint.x, o.endPoint.y, o.endPoint.z || 0), o;
      case "CIRCLE":
        return o.center = h(o.center.x, o.center.y, o.center.z || 0), o.radius *= Math.abs(s), o;
      case "ARC":
        return o.center = h(o.center.x, o.center.y, o.center.z || 0), o.radius *= Math.abs(s), o;
      case "TEXT":
      case "MTEXT": {
        const n = o.startPoint || o.insertionPoint || o.position || { x: 0, y: 0, z: 0 }, l = h(n.x, n.y, n.z || 0);
        return o.startPoint = l, o.insertionPoint = l, o.position = l, o.height && (o.height *= Math.abs(r)), o.textHeight && (o.textHeight *= Math.abs(r)), o;
      }
      case "LWPOLYLINE":
        return o.points && (o.points = o.points.map((n) => {
          const l = h(n.x, n.y, 0);
          return { ...n, x: l.x, y: l.y };
        })), o.vertices && (o.vertices = o.vertices.map((n) => {
          var x, f;
          const l = h(n.x || ((x = n.point) == null ? void 0 : x.x) || 0, n.y || ((f = n.point) == null ? void 0 : f.y) || 0, 0);
          return { ...n, x: l.x, y: l.y, point: l };
        })), o;
      case "POLYLINE2D":
      case "POLYLINE3D":
        return o.vertices && (o.vertices = o.vertices.map((n) => {
          var w, P, E;
          const l = ((w = n.point) == null ? void 0 : w.x) ?? n.x ?? 0, x = ((P = n.point) == null ? void 0 : P.y) ?? n.y ?? 0, f = ((E = n.point) == null ? void 0 : E.z) ?? n.z ?? 0, u = h(l, x, f);
          return { ...n, point: u, x: u.x, y: u.y, z: u.z };
        })), o;
      case "SPLINE":
        return o.controlPoints && (o.controlPoints = o.controlPoints.map((n) => h(n.x, n.y, n.z || 0))), o.fitPoints && (o.fitPoints = o.fitPoints.map((n) => h(n.x, n.y, n.z || 0))), o;
      case "ATTRIB":
      case "ATTDEF": {
        const n = o.insertionPoint || o.position || { x: 0, y: 0, z: 0 }, l = h(n.x, n.y, n.z || 0);
        return o.insertionPoint = l, o.position = l, o.height && (o.height *= Math.abs(r)), o.type = "TEXT", o;
      }
      default:
        return o;
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
    const s = this.getEntityColor(i);
    s !== void 0 && await e.setx("color", s);
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
    } catch (s) {
      this.output.warn("Ошибка обработки {0}: {1}", t.type, s.message);
    }
  }
  async addLine(e, t, i) {
    await e.addLine({
      a: [t.startPoint.x, t.startPoint.y, this.getZ(t.startPoint.z)],
      b: [t.endPoint.x, t.endPoint.y, this.getZ(t.endPoint.z)],
      layer: i,
      color: this.getEntityColor(t)
    });
  }
  async addCircle(e, t, i) {
    await e.addCircle({
      center: [t.center.x, t.center.y, this.getZ(t.center.z)],
      radius: t.radius,
      layer: i,
      color: this.getEntityColor(t)
    });
  }
  async addArc(e, t, i) {
    const s = t.startAngle ?? 0;
    let a = (t.endAngle ?? Math.PI * 2) - s;
    a < 0 && (a += Math.PI * 2), await e.addArc({
      center: [t.center.x, t.center.y, this.getZ(t.center.z)],
      radius: t.radius,
      angle: s,
      span: a,
      layer: i,
      color: this.getEntityColor(t)
    });
  }
  async addLwPolyline(e, t, i) {
    if (!t.vertices || t.vertices.length < 2) return;
    const s = t, r = this.getZ(s.elevation), a = s.constantWidth || s.startWidth || s.globalWidth || void 0;
    if (a) {
      const d = t.vertices.map((c) => [c.x, c.y, c.bulge || 0]);
      await e.addPolyline({
        vertices: d,
        flags: (t.flag & 1) === 1 ? 1 : void 0,
        width: a,
        elevation: r,
        layer: i,
        color: this.getEntityColor(t)
      });
    } else {
      const d = t.vertices.map((c) => [c.x, c.y, r]);
      await e.addPolyline3d({
        vertices: d,
        flags: (t.flag & 1) === 1 ? 1 : void 0,
        layer: i,
        color: this.getEntityColor(t)
      });
    }
  }
  async addText(e, t, i) {
    var g, h;
    const s = t, r = s.startPoint || s.insertionPoint || s.position || { x: 0, y: 0, z: 0 }, a = s.text || s.textValue || s.content || "", d = s.textHeight || s.height || 2.5, c = s.rotation ? s.rotation * Math.PI / 180 : 0;
    if (this.output.info('TEXT: pos=({0},{1}), h={2}, text="{3}"', (g = r.x) == null ? void 0 : g.toFixed(2), (h = r.y) == null ? void 0 : h.toFixed(2), d, a == null ? void 0 : a.substring(0, 30)), !a) {
      this.output.warn("TEXT: пустой текст, пропуск");
      return;
    }
    await e.addText({
      position: [r.x, r.y, this.getZ(r.z)],
      height: d,
      content: a,
      rotation: c,
      layer: i,
      color: this.getEntityColor(t)
    });
  }
  async addMText(e, t, i) {
    var g, h;
    const s = t, r = s.insertionPoint || s.position || { x: 0, y: 0, z: 0 };
    let a = s.text || s.textValue || s.content || "";
    const d = s.textHeight || s.height || 2.5, c = s.rotation ? s.rotation * Math.PI / 180 : 0;
    if (this.output.info('MTEXT: pos=({0},{1}), h={2}, raw="{3}"', (g = r.x) == null ? void 0 : g.toFixed(2), (h = r.y) == null ? void 0 : h.toFixed(2), d, a == null ? void 0 : a.substring(0, 30)), a = a.replace(/\\[A-Za-z][^;]*;/g, "").replace(/\{|\}/g, "").replace(/\\P/g, `
`).replace(/\\/g, ""), !a.trim()) {
      this.output.warn("MTEXT: пустой текст после очистки");
      return;
    }
    await e.addText({
      position: [r.x, r.y, this.getZ(r.z)],
      height: d,
      content: a.trim(),
      rotation: c,
      layer: i,
      color: this.getEntityColor(t)
    });
  }
  async addPolyline2d(e, t, i) {
    if (!t.vertices || t.vertices.length < 2) return;
    const s = this.getZ(t.elevation), r = t.vertices.map((a) => [a.point.x, a.point.y, s]);
    await e.addPolyline3d({
      vertices: r,
      flags: (t.flag & 1) === 1 ? 1 : void 0,
      layer: i,
      color: this.getEntityColor(t)
    });
  }
  async addPolyline3d(e, t, i) {
    if (!t.vertices || t.vertices.length < 2) return;
    const s = t.vertices.map((r) => [r.point.x, r.point.y, this.getZ(r.point.z)]);
    await e.addPolyline3d({
      vertices: s,
      flags: (t.flag & 1) === 1 ? 1 : void 0,
      layer: i,
      color: this.getEntityColor(t)
    });
  }
  async addSpline(e, t, i) {
    var a;
    const s = ((a = t.fitPoints) == null ? void 0 : a.length) > 0 ? t.fitPoints : t.controlPoints;
    if (!s || s.length < 2) return;
    const r = s.map((d) => [d.x, d.y, this.getZ(d.z)]);
    await e.addPolyline3d({
      vertices: r,
      layer: i,
      color: this.getEntityColor(t)
    });
  }
  async addTable(e, t, i) {
    var n, l, x, f;
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
    const s = ((l = t.startPoint) == null ? void 0 : l.x) ?? 0, r = ((x = t.startPoint) == null ? void 0 : x.y) ?? 0, a = this.getZ((f = t.startPoint) == null ? void 0 : f.z);
    this.output.info(
      "TABLE: startPoint=({0}, {1}), rowHeights={2}, colWidths={3}",
      s,
      r,
      t.rowHeightArr.length,
      t.columnWidthArr.length
    );
    let d = r, c = 0, g = 0;
    for (let u = 0; u < t.rowCount && u < t.rowHeightArr.length; u++) {
      let w = s;
      const P = t.rowHeightArr[u] || 10;
      for (let E = 0; E < t.columnCount && E < t.columnWidthArr.length && !(c >= t.cells.length); E++) {
        const p = t.cells[c], y = t.columnWidthArr[E] || 50;
        if (p && p.text && p.text.trim()) {
          const L = p.textHeight || Math.min(P * 0.6, 2.5);
          await (await e.addText({
            position: [w + 2, d - P / 2, a],
            height: L,
            content: p.text.trim()
          })).setx("$layer", i), g++;
        }
        w += y, c++;
      }
      d -= P;
    }
    const h = t.columnWidthArr.reduce((u, w) => u + (w || 0), 0), o = t.rowHeightArr.reduce((u, w) => u + (w || 0), 0);
    if (h > 0 && o > 0) {
      const u = [
        [s, r, a],
        [s + h, r, a],
        [s + h, r - o, a],
        [s, r - o, a]
      ];
      await (await e.addPolyline3d({
        vertices: u,
        flags: 1
      })).setx("$layer", i);
      let P = r;
      for (let p = 0; p < t.rowHeightArr.length; p++)
        P -= t.rowHeightArr[p] || 0, p < t.rowHeightArr.length - 1 && await (await e.addLine({
          a: [s, P, a],
          b: [s + h, P, a]
        })).setx("$layer", i);
      let E = s;
      for (let p = 0; p < t.columnWidthArr.length; p++)
        E += t.columnWidthArr[p] || 0, p < t.columnWidthArr.length - 1 && await (await e.addLine({
          a: [E, r, a],
          b: [E, r - o, a]
        })).setx("$layer", i);
    }
    this.output.info("TABLE: загружено {0} текстовых ячеек", g);
  }
}
export {
  b as default
};

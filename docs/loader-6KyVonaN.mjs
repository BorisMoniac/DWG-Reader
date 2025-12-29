const T = ["LINE", "CIRCLE", "ARC", "LWPOLYLINE", "POLYLINE2D", "POLYLINE3D", "SPLINE", "TEXT", "MTEXT"], m = ["ACAD_TABLE", "TEXT", "MTEXT"];
class z {
  constructor(o, t) {
    this.drawing = o, this.output = t, this.layers = {}, this.flattenZ = !0, this.targetZ = 0, this.importMode = "all", this.db = null, this.processedBlocks = /* @__PURE__ */ new Set();
  }
  setFlattenZ(o, t = 0) {
    this.flattenZ = o, this.targetZ = t;
  }
  setImportMode(o) {
    this.importMode = o;
  }
  shouldImport(o) {
    switch (this.importMode) {
      case "geometry":
        return T.includes(o);
      case "tables":
        return m.includes(o);
      case "all":
      default:
        return !0;
    }
  }
  getZ(o) {
    return this.flattenZ ? this.targetZ : o ?? 0;
  }
  async load(o) {
    this.db = o, this.processedBlocks.clear(), await this.initializeDefaults(), await this.loadLayers(o), await this.loadEntities(o);
  }
  async initializeDefaults() {
    this.layers[0] = this.drawing.layers.layer0;
  }
  async loadLayers(o) {
    const t = o.tables.LAYER;
    if (!(!t || !t.entries)) {
      await this.drawing.layers.beginUpdate();
      try {
        for (const i of t.entries)
          if (i.name === "0")
            this.layers[i.name] = this.drawing.layers.layer0;
          else {
            const r = {
              name: i.name,
              color: i.colorIndex ?? 7,
              hidden: i.off ?? !1
            };
            this.layers[i.name] = await this.drawing.layers.add(r);
          }
      } finally {
        await this.drawing.layers.endUpdate();
      }
      this.output.info("Загружено слоёв: {0}", Object.keys(this.layers).length);
    }
  }
  async loadEntities(o) {
    const t = this.drawing.layouts.model;
    if (!t) {
      this.output.warn("Model space not found");
      return;
    }
    const i = t.editor(), r = await this.explodeAllBlocks(o.entities, 3);
    this.output.info("После взрыва блоков: {0} объектов", r.length), await i.beginEdit();
    try {
      for (const s of r)
        await this.processEntity(i, s);
    } finally {
      await i.endEdit();
    }
    this.output.info("Обработано {0} объектов", r.length);
  }
  async explodeAllBlocks(o, t) {
    let i = [];
    for (let r = 0; r < t; r++) {
      const s = r === 0 ? o : i, n = [];
      let d = !1;
      for (const c of s)
        if (c.type === "INSERT") {
          d = !0;
          const g = this.explodeBlock(c);
          n.push(...g);
        } else if (c.type === "ACAD_TABLE") {
          const g = this.explodeTable(c);
          n.push(...g);
        } else
          n.push(c);
      if (i = n, !d) {
        this.output.info("Взрыв завершен на глубине {0}", r + 1);
        break;
      }
      this.output.info("Проход {0}: {1} объектов", r + 1, i.length);
    }
    return i;
  }
  explodeBlock(o) {
    var a, l;
    if (!this.db || !o.name) return [o];
    const t = (l = (a = this.db.tables.BLOCK_RECORD) == null ? void 0 : a.entries) == null ? void 0 : l.find(
      (x) => x.name === o.name
    );
    if (!t || !t.entities || t.entities.length === 0)
      return [];
    const i = o.insertionPoint || { x: 0, y: 0, z: 0 }, r = t.basePoint || { x: 0, y: 0, z: 0 }, s = o.xScale || 1, n = o.yScale || 1, d = o.zScale || 1, c = (o.rotation || 0) * Math.PI / 180, g = Math.cos(c), h = Math.sin(c), e = [];
    for (const x of t.entities) {
      const f = this.transformEntityData(
        x,
        i,
        r,
        s,
        n,
        d,
        g,
        h,
        o.rotation || 0
      );
      f && (!f.layer && o.layer && (f.layer = o.layer), e.push(f));
    }
    return e;
  }
  explodeTable(o) {
    const t = o;
    return t.entities && Array.isArray(t.entities) ? (this.output.info("TABLE: взрываем {0} вложенных объектов", t.entities.length), t.entities) : [o];
  }
  transformEntityData(o, t, i, r, s, n, d, c, g) {
    const h = (a, l, x) => {
      const f = (a - i.x) * r, u = (l - i.y) * s, w = (x - i.z) * n;
      return {
        x: t.x + f * d - u * c,
        y: t.y + f * c + u * d,
        z: t.z + w
      };
    }, e = JSON.parse(JSON.stringify(
      o,
      (a, l) => typeof l == "bigint" ? Number(l) : l
    ));
    if (o.type === "INSERT") {
      const a = e.insertionPoint || { x: 0, y: 0, z: 0 };
      return e.insertionPoint = h(a.x, a.y, a.z || 0), e.xScale = (e.xScale || 1) * r, e.yScale = (e.yScale || 1) * s, e.zScale = (e.zScale || 1) * n, e.rotation = (e.rotation || 0) + g, e;
    }
    switch (o.type) {
      case "LINE":
        return e.startPoint = h(e.startPoint.x, e.startPoint.y, e.startPoint.z || 0), e.endPoint = h(e.endPoint.x, e.endPoint.y, e.endPoint.z || 0), e;
      case "CIRCLE":
        return e.center = h(e.center.x, e.center.y, e.center.z || 0), e.radius *= Math.abs(r), e;
      case "ARC":
        return e.center = h(e.center.x, e.center.y, e.center.z || 0), e.radius *= Math.abs(r), e;
      case "TEXT":
      case "MTEXT": {
        const a = e.startPoint || e.insertionPoint || e.position || { x: 0, y: 0, z: 0 }, l = h(a.x, a.y, a.z || 0);
        return e.startPoint = l, e.insertionPoint = l, e.position = l, e.height && (e.height *= Math.abs(s)), e.textHeight && (e.textHeight *= Math.abs(s)), e;
      }
      case "LWPOLYLINE":
        return e.points && (e.points = e.points.map((a) => {
          const l = h(a.x, a.y, 0);
          return { ...a, x: l.x, y: l.y };
        })), e.vertices && (e.vertices = e.vertices.map((a) => {
          var x, f;
          const l = h(a.x || ((x = a.point) == null ? void 0 : x.x) || 0, a.y || ((f = a.point) == null ? void 0 : f.y) || 0, 0);
          return { ...a, x: l.x, y: l.y, point: l };
        })), e;
      case "POLYLINE2D":
      case "POLYLINE3D":
        return e.vertices && (e.vertices = e.vertices.map((a) => {
          var w, P, E;
          const l = ((w = a.point) == null ? void 0 : w.x) ?? a.x ?? 0, x = ((P = a.point) == null ? void 0 : P.y) ?? a.y ?? 0, f = ((E = a.point) == null ? void 0 : E.z) ?? a.z ?? 0, u = h(l, x, f);
          return { ...a, point: u, x: u.x, y: u.y, z: u.z };
        })), e;
      case "SPLINE":
        return e.controlPoints && (e.controlPoints = e.controlPoints.map((a) => h(a.x, a.y, a.z || 0))), e.fitPoints && (e.fitPoints = e.fitPoints.map((a) => h(a.x, a.y, a.z || 0))), e;
      case "ATTRIB":
      case "ATTDEF": {
        const a = e.insertionPoint || e.position || { x: 0, y: 0, z: 0 }, l = h(a.x, a.y, a.z || 0);
        return e.insertionPoint = l, e.position = l, e.height && (e.height *= Math.abs(s)), e.type = "TEXT", e;
      }
      default:
        return e;
    }
  }
  getLayer(o) {
    return this.layers[o.layer] ?? this.layers[0];
  }
  getEntityColor(o) {
    const t = o, i = ["color", "colorIndex", "colorValue", "trueColor", "rgb", "aci", "colorRef"], r = [];
    for (const s of i)
      t[s] !== void 0 && r.push(`${s}=${t[s]}`);
    if (r.length > 0 && this.output.info("COLOR {0}: {1}", o.type, r.join(", ")), t.colorIndex !== void 0 && t.colorIndex !== 256 && t.colorIndex !== 0)
      return t.colorIndex;
    if (t.color !== void 0 && t.color !== 256 && t.color !== 0) {
      if (typeof t.color == "number")
        return t.color;
      if (t.color.r !== void 0)
        return 255 << 24 | t.color.r << 16 | t.color.g << 8 | t.color.b;
    }
    if (t.trueColor !== void 0) {
      if (typeof t.trueColor == "number")
        return t.trueColor | 255 << 24;
      if (t.trueColor.r !== void 0)
        return 255 << 24 | t.trueColor.r << 16 | t.trueColor.g << 8 | t.trueColor.b;
    }
    if (t.colorValue !== void 0 && t.colorValue !== 0)
      return t.colorValue | 255 << 24;
    if (t.rgb !== void 0)
      return t.rgb | 255 << 24;
  }
  async applyEntityProperties(o, t, i) {
    await o.setx("$layer", t);
    const r = this.getEntityColor(i);
    r !== void 0 && await o.setx("color", r);
  }
  async processEntity(o, t) {
    if (!this.shouldImport(t.type)) return;
    const i = this.getLayer(t);
    try {
      switch (t.type) {
        case "LINE":
          await this.addLine(o, t, i);
          break;
        case "CIRCLE":
          await this.addCircle(o, t, i);
          break;
        case "ARC":
          await this.addArc(o, t, i);
          break;
        case "LWPOLYLINE":
          await this.addLwPolyline(o, t, i);
          break;
        case "TEXT":
          await this.addText(o, t, i);
          break;
        case "MTEXT":
          await this.addMText(o, t, i);
          break;
        case "POLYLINE2D":
          await this.addPolyline2d(o, t, i);
          break;
        case "POLYLINE3D":
          await this.addPolyline3d(o, t, i);
          break;
        case "SPLINE":
          await this.addSpline(o, t, i);
          break;
        case "ACAD_TABLE":
          await this.addTable(o, t, i);
          break;
        default:
          break;
      }
    } catch (r) {
      this.output.warn("Ошибка обработки {0}: {1}", t.type, r.message);
    }
  }
  async addLine(o, t, i) {
    await o.addLine({
      a: [t.startPoint.x, t.startPoint.y, this.getZ(t.startPoint.z)],
      b: [t.endPoint.x, t.endPoint.y, this.getZ(t.endPoint.z)],
      layer: i,
      color: this.getEntityColor(t)
    });
  }
  async addCircle(o, t, i) {
    await o.addCircle({
      center: [t.center.x, t.center.y, this.getZ(t.center.z)],
      radius: t.radius,
      layer: i,
      color: this.getEntityColor(t)
    });
  }
  async addArc(o, t, i) {
    const r = t.startAngle ?? 0;
    let n = (t.endAngle ?? Math.PI * 2) - r;
    n < 0 && (n += Math.PI * 2), await o.addArc({
      center: [t.center.x, t.center.y, this.getZ(t.center.z)],
      radius: t.radius,
      angle: r,
      span: n,
      layer: i,
      color: this.getEntityColor(t)
    });
  }
  async addLwPolyline(o, t, i) {
    if (!t.vertices || t.vertices.length < 2) return;
    const r = t, s = this.getZ(r.elevation), n = r.constantWidth || r.startWidth || r.globalWidth || void 0;
    if (n) {
      const d = t.vertices.map((c) => [c.x, c.y, c.bulge || 0]);
      await o.addPolyline({
        vertices: d,
        flags: (t.flag & 1) === 1 ? 1 : void 0,
        width: n,
        elevation: s,
        layer: i,
        color: this.getEntityColor(t)
      });
    } else {
      const d = t.vertices.map((c) => [c.x, c.y, s]);
      await o.addPolyline3d({
        vertices: d,
        flags: (t.flag & 1) === 1 ? 1 : void 0,
        layer: i,
        color: this.getEntityColor(t)
      });
    }
  }
  async addText(o, t, i) {
    var g, h;
    const r = t, s = r.startPoint || r.insertionPoint || r.position || { x: 0, y: 0, z: 0 }, n = r.text || r.textValue || r.content || "", d = r.textHeight || r.height || 2.5, c = r.rotation ? r.rotation * Math.PI / 180 : 0;
    if (this.output.info('TEXT: pos=({0},{1}), h={2}, text="{3}"', (g = s.x) == null ? void 0 : g.toFixed(2), (h = s.y) == null ? void 0 : h.toFixed(2), d, n == null ? void 0 : n.substring(0, 30)), !n) {
      this.output.warn("TEXT: пустой текст, пропуск");
      return;
    }
    await o.addText({
      position: [s.x, s.y, this.getZ(s.z)],
      height: d,
      content: n,
      rotation: c,
      layer: i,
      color: this.getEntityColor(t)
    });
  }
  async addMText(o, t, i) {
    var g, h;
    const r = t, s = r.insertionPoint || r.position || { x: 0, y: 0, z: 0 };
    let n = r.text || r.textValue || r.content || "";
    const d = r.textHeight || r.height || 2.5, c = r.rotation ? r.rotation * Math.PI / 180 : 0;
    if (this.output.info('MTEXT: pos=({0},{1}), h={2}, raw="{3}"', (g = s.x) == null ? void 0 : g.toFixed(2), (h = s.y) == null ? void 0 : h.toFixed(2), d, n == null ? void 0 : n.substring(0, 30)), n = n.replace(/\\[A-Za-z][^;]*;/g, "").replace(/\{|\}/g, "").replace(/\\P/g, `
`).replace(/\\/g, ""), !n.trim()) {
      this.output.warn("MTEXT: пустой текст после очистки");
      return;
    }
    await o.addText({
      position: [s.x, s.y, this.getZ(s.z)],
      height: d,
      content: n.trim(),
      rotation: c,
      layer: i,
      color: this.getEntityColor(t)
    });
  }
  async addPolyline2d(o, t, i) {
    if (!t.vertices || t.vertices.length < 2) return;
    const r = this.getZ(t.elevation), s = t.vertices.map((n) => [n.point.x, n.point.y, r]);
    await o.addPolyline3d({
      vertices: s,
      flags: (t.flag & 1) === 1 ? 1 : void 0,
      layer: i,
      color: this.getEntityColor(t)
    });
  }
  async addPolyline3d(o, t, i) {
    if (!t.vertices || t.vertices.length < 2) return;
    const r = t.vertices.map((s) => [s.point.x, s.point.y, this.getZ(s.point.z)]);
    await o.addPolyline3d({
      vertices: r,
      flags: (t.flag & 1) === 1 ? 1 : void 0,
      layer: i,
      color: this.getEntityColor(t)
    });
  }
  async addSpline(o, t, i) {
    var n;
    const r = ((n = t.fitPoints) == null ? void 0 : n.length) > 0 ? t.fitPoints : t.controlPoints;
    if (!r || r.length < 2) return;
    const s = r.map((d) => [d.x, d.y, this.getZ(d.z)]);
    await o.addPolyline3d({
      vertices: s,
      layer: i,
      color: this.getEntityColor(t)
    });
  }
  async addTable(o, t, i) {
    var a, l, x, f;
    if (this.output.info(
      "TABLE: name={0}, rows={1}, cols={2}, cells={3}",
      t.name,
      t.rowCount,
      t.columnCount,
      ((a = t.cells) == null ? void 0 : a.length) ?? 0
    ), !t.cells || t.cells.length === 0) {
      this.output.warn("TABLE: пустая таблица, пропускаем");
      return;
    }
    if (!t.rowHeightArr || !t.columnWidthArr) {
      this.output.warn("TABLE: нет данных о размерах строк/столбцов");
      return;
    }
    const r = ((l = t.startPoint) == null ? void 0 : l.x) ?? 0, s = ((x = t.startPoint) == null ? void 0 : x.y) ?? 0, n = this.getZ((f = t.startPoint) == null ? void 0 : f.z);
    this.output.info(
      "TABLE: startPoint=({0}, {1}), rowHeights={2}, colWidths={3}",
      r,
      s,
      t.rowHeightArr.length,
      t.columnWidthArr.length
    );
    let d = s, c = 0, g = 0;
    for (let u = 0; u < t.rowCount && u < t.rowHeightArr.length; u++) {
      let w = r;
      const P = t.rowHeightArr[u] || 10;
      for (let E = 0; E < t.columnCount && E < t.columnWidthArr.length && !(c >= t.cells.length); E++) {
        const p = t.cells[c], y = t.columnWidthArr[E] || 50;
        if (p && p.text && p.text.trim()) {
          const L = p.textHeight || Math.min(P * 0.6, 2.5);
          await (await o.addText({
            position: [w + 2, d - P / 2, n],
            height: L,
            content: p.text.trim()
          })).setx("$layer", i), g++;
        }
        w += y, c++;
      }
      d -= P;
    }
    const h = t.columnWidthArr.reduce((u, w) => u + (w || 0), 0), e = t.rowHeightArr.reduce((u, w) => u + (w || 0), 0);
    if (h > 0 && e > 0) {
      const u = [
        [r, s, n],
        [r + h, s, n],
        [r + h, s - e, n],
        [r, s - e, n]
      ];
      await (await o.addPolyline3d({
        vertices: u,
        flags: 1
      })).setx("$layer", i);
      let P = s;
      for (let p = 0; p < t.rowHeightArr.length; p++)
        P -= t.rowHeightArr[p] || 0, p < t.rowHeightArr.length - 1 && await (await o.addLine({
          a: [r, P, n],
          b: [r + h, P, n]
        })).setx("$layer", i);
      let E = r;
      for (let p = 0; p < t.columnWidthArr.length; p++)
        E += t.columnWidthArr[p] || 0, p < t.columnWidthArr.length - 1 && await (await o.addLine({
          a: [E, s, n],
          b: [E, s - e, n]
        })).setx("$layer", i);
    }
    this.output.info("TABLE: загружено {0} текстовых ячеек", g);
  }
}
export {
  z as default
};

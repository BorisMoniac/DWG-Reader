class m {
  constructor(o, t) {
    this.drawing = o, this.output = t, this.layers = {}, this.flattenZ = !0, this.targetZ = 0, this.db = null, this.processedBlocks = /* @__PURE__ */ new Set();
  }
  setFlattenZ(o, t = 0) {
    this.flattenZ = o, this.targetZ = t;
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
        for (const r of t.entries)
          if (r.name === "0")
            this.layers[r.name] = this.drawing.layers.layer0;
          else {
            const i = {
              name: r.name,
              color: r.colorIndex ?? 7,
              hidden: r.off ?? !1
            };
            this.layers[r.name] = await this.drawing.layers.add(i);
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
    const r = t.editor(), i = await this.explodeAllBlocks(o.entities, 3);
    this.output.info("После взрыва блоков: {0} объектов", i.length), await r.beginEdit();
    try {
      for (const s of i)
        await this.processEntity(r, s);
    } finally {
      await r.endEdit();
    }
    this.output.info("Обработано {0} объектов", i.length);
  }
  async explodeAllBlocks(o, t) {
    let r = [];
    for (let i = 0; i < t; i++) {
      const s = i === 0 ? o : r, n = [];
      let d = !1;
      for (const l of s)
        if (l.type === "INSERT") {
          d = !0;
          const g = this.explodeBlock(l);
          n.push(...g);
        } else if (l.type === "ACAD_TABLE") {
          const g = this.explodeTable(l);
          n.push(...g);
        } else
          n.push(l);
      if (r = n, !d) {
        this.output.info("Взрыв завершен на глубине {0}", i + 1);
        break;
      }
      this.output.info("Проход {0}: {1} объектов", i + 1, r.length);
    }
    return r;
  }
  explodeBlock(o) {
    var a, c;
    if (!this.db || !o.name) return [o];
    const t = (c = (a = this.db.tables.BLOCK_RECORD) == null ? void 0 : a.entries) == null ? void 0 : c.find(
      (x) => x.name === o.name
    );
    if (!t || !t.entities || t.entities.length === 0)
      return [];
    const r = o.insertionPoint || { x: 0, y: 0, z: 0 }, i = t.basePoint || { x: 0, y: 0, z: 0 }, s = o.xScale || 1, n = o.yScale || 1, d = o.zScale || 1, l = (o.rotation || 0) * Math.PI / 180, g = Math.cos(l), h = Math.sin(l), e = [];
    for (const x of t.entities) {
      const f = this.transformEntityData(
        x,
        r,
        i,
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
  transformEntityData(o, t, r, i, s, n, d, l, g) {
    const h = (a, c, x) => {
      const f = (a - r.x) * i, u = (c - r.y) * s, w = (x - r.z) * n;
      return {
        x: t.x + f * d - u * l,
        y: t.y + f * l + u * d,
        z: t.z + w
      };
    }, e = JSON.parse(JSON.stringify(
      o,
      (a, c) => typeof c == "bigint" ? Number(c) : c
    ));
    if (o.type === "INSERT") {
      const a = e.insertionPoint || { x: 0, y: 0, z: 0 };
      return e.insertionPoint = h(a.x, a.y, a.z || 0), e.xScale = (e.xScale || 1) * i, e.yScale = (e.yScale || 1) * s, e.zScale = (e.zScale || 1) * n, e.rotation = (e.rotation || 0) + g, e;
    }
    switch (o.type) {
      case "LINE":
        return e.startPoint = h(e.startPoint.x, e.startPoint.y, e.startPoint.z || 0), e.endPoint = h(e.endPoint.x, e.endPoint.y, e.endPoint.z || 0), e;
      case "CIRCLE":
        return e.center = h(e.center.x, e.center.y, e.center.z || 0), e.radius *= Math.abs(i), e;
      case "ARC":
        return e.center = h(e.center.x, e.center.y, e.center.z || 0), e.radius *= Math.abs(i), e;
      case "TEXT":
      case "MTEXT": {
        const a = e.startPoint || e.insertionPoint || e.position || { x: 0, y: 0, z: 0 }, c = h(a.x, a.y, a.z || 0);
        return e.startPoint = c, e.insertionPoint = c, e.position = c, e.height && (e.height *= Math.abs(s)), e.textHeight && (e.textHeight *= Math.abs(s)), e;
      }
      case "LWPOLYLINE":
        return e.points && (e.points = e.points.map((a) => {
          const c = h(a.x, a.y, 0);
          return { ...a, x: c.x, y: c.y };
        })), e.vertices && (e.vertices = e.vertices.map((a) => {
          var x, f;
          const c = h(a.x || ((x = a.point) == null ? void 0 : x.x) || 0, a.y || ((f = a.point) == null ? void 0 : f.y) || 0, 0);
          return { ...a, x: c.x, y: c.y, point: c };
        })), e;
      case "POLYLINE2D":
      case "POLYLINE3D":
        return e.vertices && (e.vertices = e.vertices.map((a) => {
          var w, P, y;
          const c = ((w = a.point) == null ? void 0 : w.x) ?? a.x ?? 0, x = ((P = a.point) == null ? void 0 : P.y) ?? a.y ?? 0, f = ((y = a.point) == null ? void 0 : y.z) ?? a.z ?? 0, u = h(c, x, f);
          return { ...a, point: u, x: u.x, y: u.y, z: u.z };
        })), e;
      case "SPLINE":
        return e.controlPoints && (e.controlPoints = e.controlPoints.map((a) => h(a.x, a.y, a.z || 0))), e.fitPoints && (e.fitPoints = e.fitPoints.map((a) => h(a.x, a.y, a.z || 0))), e;
      case "ATTRIB":
      case "ATTDEF": {
        const a = e.insertionPoint || e.position || { x: 0, y: 0, z: 0 }, c = h(a.x, a.y, a.z || 0);
        return e.insertionPoint = c, e.position = c, e.height && (e.height *= Math.abs(s)), e.type = "TEXT", e;
      }
      default:
        return e;
    }
  }
  getLayer(o) {
    return this.layers[o.layer] ?? this.layers[0];
  }
  getEntityColor(o) {
    const t = o, r = ["color", "colorIndex", "colorValue", "trueColor", "rgb", "aci", "colorRef"], i = [];
    for (const s of r)
      t[s] !== void 0 && i.push(`${s}=${t[s]}`);
    if (i.length > 0 && this.output.info("COLOR {0}: {1}", o.type, i.join(", ")), t.colorIndex !== void 0 && t.colorIndex !== 256 && t.colorIndex !== 0)
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
  async applyEntityProperties(o, t, r) {
    await o.setx("$layer", t);
    const i = this.getEntityColor(r);
    i !== void 0 && await o.setx("color", i);
  }
  async processEntity(o, t) {
    const r = this.getLayer(t);
    try {
      switch (t.type) {
        case "LINE":
          await this.addLine(o, t, r);
          break;
        case "CIRCLE":
          await this.addCircle(o, t, r);
          break;
        case "ARC":
          await this.addArc(o, t, r);
          break;
        case "LWPOLYLINE":
          await this.addLwPolyline(o, t, r);
          break;
        case "TEXT":
          await this.addText(o, t, r);
          break;
        case "MTEXT":
          await this.addMText(o, t, r);
          break;
        case "POLYLINE2D":
          await this.addPolyline2d(o, t, r);
          break;
        case "POLYLINE3D":
          await this.addPolyline3d(o, t, r);
          break;
        case "SPLINE":
          await this.addSpline(o, t, r);
          break;
        case "ACAD_TABLE":
          await this.addTable(o, t, r);
          break;
        default:
          break;
      }
    } catch (i) {
      this.output.warn("Ошибка обработки {0}: {1}", t.type, i.message);
    }
  }
  async addLine(o, t, r) {
    await o.addLine({
      a: [t.startPoint.x, t.startPoint.y, this.getZ(t.startPoint.z)],
      b: [t.endPoint.x, t.endPoint.y, this.getZ(t.endPoint.z)],
      layer: r,
      color: this.getEntityColor(t)
    });
  }
  async addCircle(o, t, r) {
    await o.addCircle({
      center: [t.center.x, t.center.y, this.getZ(t.center.z)],
      radius: t.radius,
      layer: r,
      color: this.getEntityColor(t)
    });
  }
  async addArc(o, t, r) {
    const i = t.startAngle ?? 0;
    let n = (t.endAngle ?? Math.PI * 2) - i;
    n < 0 && (n += Math.PI * 2), await o.addArc({
      center: [t.center.x, t.center.y, this.getZ(t.center.z)],
      radius: t.radius,
      angle: i,
      span: n,
      layer: r,
      color: this.getEntityColor(t)
    });
  }
  async addLwPolyline(o, t, r) {
    if (!t.vertices || t.vertices.length < 2) return;
    const i = t, s = this.getZ(i.elevation), n = i.constantWidth || i.startWidth || i.globalWidth || void 0;
    if (n) {
      const d = t.vertices.map((l) => [l.x, l.y, l.bulge || 0]);
      await o.addPolyline({
        vertices: d,
        flags: (t.flag & 1) === 1 ? 1 : void 0,
        width: n,
        elevation: s,
        layer: r,
        color: this.getEntityColor(t)
      });
    } else {
      const d = t.vertices.map((l) => [l.x, l.y, s]);
      await o.addPolyline3d({
        vertices: d,
        flags: (t.flag & 1) === 1 ? 1 : void 0,
        layer: r,
        color: this.getEntityColor(t)
      });
    }
  }
  async addText(o, t, r) {
    var g, h;
    const i = t, s = i.startPoint || i.insertionPoint || i.position || { x: 0, y: 0, z: 0 }, n = i.text || i.textValue || i.content || "", d = i.textHeight || i.height || 2.5, l = i.rotation || 0;
    if (this.output.info('TEXT: pos=({0},{1}), h={2}, rot={3}, text="{4}"', (g = s.x) == null ? void 0 : g.toFixed(2), (h = s.y) == null ? void 0 : h.toFixed(2), d, l == null ? void 0 : l.toFixed(3), n == null ? void 0 : n.substring(0, 30)), !n) {
      this.output.warn("TEXT: пустой текст, пропуск");
      return;
    }
    await o.addText({
      position: [s.x, s.y, this.getZ(s.z)],
      height: d,
      content: n,
      rotation: l,
      layer: r,
      color: this.getEntityColor(t)
    });
  }
  async addMText(o, t, r) {
    var g, h;
    const i = t, s = i.insertionPoint || i.position || { x: 0, y: 0, z: 0 };
    let n = i.text || i.textValue || i.content || "";
    const d = i.textHeight || i.height || 2.5, l = i.rotation || 0;
    if (this.output.info('MTEXT: pos=({0},{1}), h={2}, rot={3}, raw="{4}"', (g = s.x) == null ? void 0 : g.toFixed(2), (h = s.y) == null ? void 0 : h.toFixed(2), d, l == null ? void 0 : l.toFixed(3), n == null ? void 0 : n.substring(0, 30)), n = n.replace(/\\[A-Za-z][^;]*;/g, "").replace(/\{|\}/g, "").replace(/\\P/g, `
`).replace(/\\/g, ""), !n.trim()) {
      this.output.warn("MTEXT: пустой текст после очистки");
      return;
    }
    await o.addText({
      position: [s.x, s.y, this.getZ(s.z)],
      height: d,
      content: n.trim(),
      rotation: l,
      layer: r,
      color: this.getEntityColor(t)
    });
  }
  async addPolyline2d(o, t, r) {
    if (!t.vertices || t.vertices.length < 2) return;
    const i = this.getZ(t.elevation), s = t.vertices.map((n) => [n.point.x, n.point.y, i]);
    await o.addPolyline3d({
      vertices: s,
      flags: (t.flag & 1) === 1 ? 1 : void 0,
      layer: r,
      color: this.getEntityColor(t)
    });
  }
  async addPolyline3d(o, t, r) {
    if (!t.vertices || t.vertices.length < 2) return;
    const i = t.vertices.map((s) => [s.point.x, s.point.y, this.getZ(s.point.z)]);
    await o.addPolyline3d({
      vertices: i,
      flags: (t.flag & 1) === 1 ? 1 : void 0,
      layer: r,
      color: this.getEntityColor(t)
    });
  }
  async addSpline(o, t, r) {
    var n;
    const i = ((n = t.fitPoints) == null ? void 0 : n.length) > 0 ? t.fitPoints : t.controlPoints;
    if (!i || i.length < 2) return;
    const s = i.map((d) => [d.x, d.y, this.getZ(d.z)]);
    await o.addPolyline3d({
      vertices: s,
      layer: r,
      color: this.getEntityColor(t)
    });
  }
  async addTable(o, t, r) {
    var a, c, x, f;
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
    const i = ((c = t.startPoint) == null ? void 0 : c.x) ?? 0, s = ((x = t.startPoint) == null ? void 0 : x.y) ?? 0, n = this.getZ((f = t.startPoint) == null ? void 0 : f.z);
    this.output.info(
      "TABLE: startPoint=({0}, {1}), rowHeights={2}, colWidths={3}",
      i,
      s,
      t.rowHeightArr.length,
      t.columnWidthArr.length
    );
    let d = s, l = 0, g = 0;
    for (let u = 0; u < t.rowCount && u < t.rowHeightArr.length; u++) {
      let w = i;
      const P = t.rowHeightArr[u] || 10;
      for (let y = 0; y < t.columnCount && y < t.columnWidthArr.length && !(l >= t.cells.length); y++) {
        const p = t.cells[l], E = t.columnWidthArr[y] || 50;
        if (p && p.text && p.text.trim()) {
          const b = p.textHeight || Math.min(P * 0.6, 2.5);
          await (await o.addText({
            position: [w + 2, d - P / 2, n],
            height: b,
            content: p.text.trim()
          })).setx("$layer", r), g++;
        }
        w += E, l++;
      }
      d -= P;
    }
    const h = t.columnWidthArr.reduce((u, w) => u + (w || 0), 0), e = t.rowHeightArr.reduce((u, w) => u + (w || 0), 0);
    if (h > 0 && e > 0) {
      const u = [
        [i, s, n],
        [i + h, s, n],
        [i + h, s - e, n],
        [i, s - e, n]
      ];
      await (await o.addPolyline3d({
        vertices: u,
        flags: 1
      })).setx("$layer", r);
      let P = s;
      for (let p = 0; p < t.rowHeightArr.length; p++)
        P -= t.rowHeightArr[p] || 0, p < t.rowHeightArr.length - 1 && await (await o.addLine({
          a: [i, P, n],
          b: [i + h, P, n]
        })).setx("$layer", r);
      let y = i;
      for (let p = 0; p < t.columnWidthArr.length; p++)
        y += t.columnWidthArr[p] || 0, p < t.columnWidthArr.length - 1 && await (await o.addLine({
          a: [y, s, n],
          b: [y, s - e, n]
        })).setx("$layer", r);
    }
    this.output.info("TABLE: загружено {0} текстовых ячеек", g);
  }
}
export {
  m as default
};

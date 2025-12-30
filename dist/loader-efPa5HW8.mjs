class L {
  constructor(i, t) {
    this.drawing = i, this.output = t, this.layers = {}, this.flattenZ = !0, this.targetZ = 0, this.db = null, this.processedBlocks = /* @__PURE__ */ new Set();
  }
  setFlattenZ(i, t = 0) {
    this.flattenZ = i, this.targetZ = t;
  }
  getZ(i) {
    return this.flattenZ ? this.targetZ : i ?? 0;
  }
  async load(i) {
    this.db = i, this.processedBlocks.clear(), await this.initializeDefaults(), await this.loadLayers(i), await this.loadEntities(i);
  }
  async initializeDefaults() {
    this.layers[0] = this.drawing.layers.layer0;
  }
  async loadLayers(i) {
    const t = i.tables.LAYER;
    if (!(!t || !t.entries)) {
      await this.drawing.layers.beginUpdate();
      try {
        for (const n of t.entries)
          if (n.name === "0")
            this.layers[n.name] = this.drawing.layers.layer0;
          else {
            const o = {
              name: n.name,
              color: n.colorIndex ?? 7,
              hidden: n.off ?? !1
            };
            this.layers[n.name] = await this.drawing.layers.add(o);
          }
      } finally {
        await this.drawing.layers.endUpdate();
      }
      this.output.info("Загружено слоёв: {0}", Object.keys(this.layers).length);
    }
  }
  async loadEntities(i) {
    const t = this.drawing.layouts.model;
    if (!t) {
      this.output.warn("Model space not found");
      return;
    }
    const n = t.editor(), o = await this.explodeAllBlocks(i.entities, 3);
    this.output.info("После взрыва блоков: {0} объектов", o.length), await n.beginEdit();
    try {
      for (const s of o)
        await this.processEntity(n, s);
    } finally {
      await n.endEdit();
    }
    this.output.info("Обработано {0} объектов", o.length);
  }
  async explodeAllBlocks(i, t) {
    let n = [];
    for (let o = 0; o < t; o++) {
      const s = o === 0 ? i : n, a = [];
      let h = !1;
      for (const d of s)
        if (d.type === "INSERT") {
          h = !0;
          const g = this.explodeBlock(d);
          a.push(...g);
        } else if (d.type === "ACAD_TABLE") {
          const g = this.explodeTable(d);
          a.push(...g);
        } else
          a.push(d);
      if (n = a, !h) {
        this.output.info("Взрыв завершен на глубине {0}", o + 1);
        break;
      }
      this.output.info("Проход {0}: {1} объектов", o + 1, n.length);
    }
    return n;
  }
  explodeBlock(i) {
    var r, c;
    if (!this.db || !i.name) return [i];
    const t = (c = (r = this.db.tables.BLOCK_RECORD) == null ? void 0 : r.entries) == null ? void 0 : c.find(
      (f) => f.name === i.name
    );
    if (!t || !t.entities || t.entities.length === 0)
      return [];
    const n = i.insertionPoint || { x: 0, y: 0, z: 0 }, o = t.basePoint || { x: 0, y: 0, z: 0 }, s = i.xScale || 1, a = i.yScale || 1, h = i.zScale || 1, d = (i.rotation || 0) * Math.PI / 180, g = Math.cos(d), l = Math.sin(d), e = [];
    for (const f of t.entities) {
      const x = this.transformEntityData(
        f,
        n,
        o,
        s,
        a,
        h,
        g,
        l,
        i.rotation || 0
      );
      x && (!x.layer && i.layer && (x.layer = i.layer), e.push(x));
    }
    return e;
  }
  explodeTable(i) {
    const t = i;
    return t.entities && Array.isArray(t.entities) ? (this.output.info("TABLE: взрываем {0} вложенных объектов", t.entities.length), t.entities) : [i];
  }
  transformEntityData(i, t, n, o, s, a, h, d, g) {
    const l = (r, c, f) => {
      const x = (r - n.x) * o, u = (c - n.y) * s, w = (f - n.z) * a;
      return {
        x: t.x + x * h - u * d,
        y: t.y + x * d + u * h,
        z: t.z + w
      };
    }, e = JSON.parse(JSON.stringify(
      i,
      (r, c) => typeof c == "bigint" ? Number(c) : c
    ));
    if (i.type === "INSERT") {
      const r = e.insertionPoint || { x: 0, y: 0, z: 0 };
      return e.insertionPoint = l(r.x, r.y, r.z || 0), e.xScale = (e.xScale || 1) * o, e.yScale = (e.yScale || 1) * s, e.zScale = (e.zScale || 1) * a, e.rotation = (e.rotation || 0) + g, e;
    }
    switch (i.type) {
      case "LINE":
        return e.startPoint = l(e.startPoint.x, e.startPoint.y, e.startPoint.z || 0), e.endPoint = l(e.endPoint.x, e.endPoint.y, e.endPoint.z || 0), e;
      case "CIRCLE":
        return e.center = l(e.center.x, e.center.y, e.center.z || 0), e.radius *= Math.abs(o), e;
      case "ARC":
        return e.center = l(e.center.x, e.center.y, e.center.z || 0), e.radius *= Math.abs(o), e;
      case "TEXT":
      case "MTEXT": {
        const r = e.startPoint || e.insertionPoint || e.position || { x: 0, y: 0, z: 0 }, c = l(r.x, r.y, r.z || 0);
        return e.startPoint = c, e.insertionPoint = c, e.position = c, e.height && (e.height *= Math.abs(s)), e.textHeight && (e.textHeight *= Math.abs(s)), e;
      }
      case "LWPOLYLINE":
        return e.points && (e.points = e.points.map((r) => {
          const c = l(r.x, r.y, 0);
          return { ...r, x: c.x, y: c.y };
        })), e.vertices && (e.vertices = e.vertices.map((r) => {
          var f, x;
          const c = l(r.x || ((f = r.point) == null ? void 0 : f.x) || 0, r.y || ((x = r.point) == null ? void 0 : x.y) || 0, 0);
          return { ...r, x: c.x, y: c.y, point: c };
        })), e;
      case "POLYLINE2D":
      case "POLYLINE3D":
        return e.vertices && (e.vertices = e.vertices.map((r) => {
          var w, P, y;
          const c = ((w = r.point) == null ? void 0 : w.x) ?? r.x ?? 0, f = ((P = r.point) == null ? void 0 : P.y) ?? r.y ?? 0, x = ((y = r.point) == null ? void 0 : y.z) ?? r.z ?? 0, u = l(c, f, x);
          return { ...r, point: u, x: u.x, y: u.y, z: u.z };
        })), e;
      case "SPLINE":
        return e.controlPoints && (e.controlPoints = e.controlPoints.map((r) => l(r.x, r.y, r.z || 0))), e.fitPoints && (e.fitPoints = e.fitPoints.map((r) => l(r.x, r.y, r.z || 0))), e;
      case "ATTRIB":
      case "ATTDEF": {
        const r = e.insertionPoint || e.position || { x: 0, y: 0, z: 0 }, c = l(r.x, r.y, r.z || 0);
        return e.insertionPoint = c, e.position = c, e.height && (e.height *= Math.abs(s)), e.type = "TEXT", e;
      }
      default:
        return e;
    }
  }
  getLayer(i) {
    return this.layers[i.layer] ?? this.layers[0];
  }
  getEntityColor(i) {
    const t = i, n = ["color", "colorIndex", "colorValue", "trueColor", "rgb", "aci", "colorRef"], o = [];
    for (const s of n)
      t[s] !== void 0 && o.push(`${s}=${t[s]}`);
    if (o.length > 0 && this.output.info("COLOR {0}: {1}", i.type, o.join(", ")), t.colorIndex !== void 0 && t.colorIndex !== 256 && t.colorIndex !== 0)
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
  async applyEntityProperties(i, t, n) {
    await i.setx("$layer", t);
    const o = this.getEntityColor(n);
    o !== void 0 && await i.setx("color", o);
  }
  async processEntity(i, t) {
    const n = this.getLayer(t);
    try {
      switch (t.type) {
        case "LINE":
          await this.addLine(i, t, n);
          break;
        case "CIRCLE":
          await this.addCircle(i, t, n);
          break;
        case "ARC":
          await this.addArc(i, t, n);
          break;
        case "LWPOLYLINE":
          await this.addLwPolyline(i, t, n);
          break;
        case "TEXT":
          await this.addText(i, t, n);
          break;
        case "MTEXT":
          await this.addMText(i, t, n);
          break;
        case "POLYLINE2D":
          await this.addPolyline2d(i, t, n);
          break;
        case "POLYLINE3D":
          await this.addPolyline3d(i, t, n);
          break;
        case "SPLINE":
          await this.addSpline(i, t, n);
          break;
        case "ACAD_TABLE":
          await this.addTable(i, t, n);
          break;
        default:
          break;
      }
    } catch (o) {
      this.output.warn("Ошибка обработки {0}: {1}", t.type, o.message);
    }
  }
  async addLine(i, t, n) {
    await i.addLine({
      a: [t.startPoint.x, t.startPoint.y, this.getZ(t.startPoint.z)],
      b: [t.endPoint.x, t.endPoint.y, this.getZ(t.endPoint.z)],
      layer: n,
      color: this.getEntityColor(t)
    });
  }
  async addCircle(i, t, n) {
    await i.addCircle({
      center: [t.center.x, t.center.y, this.getZ(t.center.z)],
      radius: t.radius,
      layer: n,
      color: this.getEntityColor(t)
    });
  }
  async addArc(i, t, n) {
    const o = t.startAngle ?? 0;
    let a = (t.endAngle ?? Math.PI * 2) - o;
    a < 0 && (a += Math.PI * 2), await i.addArc({
      center: [t.center.x, t.center.y, this.getZ(t.center.z)],
      radius: t.radius,
      angle: o,
      span: a,
      layer: n,
      color: this.getEntityColor(t)
    });
  }
  async addLwPolyline(i, t, n) {
    if (!t.vertices || t.vertices.length < 2) return;
    const o = t, s = this.getZ(o.elevation), a = o.constantWidth || o.startWidth || o.globalWidth || void 0;
    if (a) {
      const h = t.vertices.map((d) => [d.x, d.y, d.bulge || 0]);
      await i.addPolyline({
        vertices: h,
        flags: (t.flag & 1) === 1 ? 1 : void 0,
        width: a,
        elevation: s,
        layer: n,
        color: this.getEntityColor(t)
      });
    } else {
      const h = t.vertices.map((d) => [d.x, d.y, s]);
      await i.addPolyline3d({
        vertices: h,
        flags: (t.flag & 1) === 1 ? 1 : void 0,
        layer: n,
        color: this.getEntityColor(t)
      });
    }
  }
  async addText(i, t, n) {
    var e, r;
    const o = t, s = o.startPoint || o.insertionPoint || o.position || { x: 0, y: 0, z: 0 }, a = o.text || o.textValue || o.content || "", h = o.textHeight || o.height || 2.5, d = ["rotation", "angle", "rotationAngle", "textRotation", "oblique"], g = [];
    for (const c of d)
      o[c] !== void 0 && g.push(`${c}=${o[c]}`);
    this.output.info("TEXT ROT fields: {0}", g.join(", ") || "none");
    let l = 0;
    if (o.direction && (o.direction.x !== 1 || o.direction.y !== 0) ? l = Math.atan2(o.direction.y, o.direction.x) : o.rotation ? l = o.rotation : o.angle && (l = o.angle), this.output.info(
      'TEXT: pos=({0},{1}), h={2}, rot={3}rad ({4}deg), text="{5}"',
      (e = s.x) == null ? void 0 : e.toFixed(2),
      (r = s.y) == null ? void 0 : r.toFixed(2),
      h,
      l == null ? void 0 : l.toFixed(3),
      (l * 180 / Math.PI).toFixed(1),
      a == null ? void 0 : a.substring(0, 30)
    ), !a) {
      this.output.warn("TEXT: пустой текст, пропуск");
      return;
    }
    await i.addText({
      position: [s.x, s.y, this.getZ(s.z)],
      height: h,
      content: a,
      rotation: l,
      layer: n,
      color: this.getEntityColor(t)
    });
  }
  async addMText(i, t, n) {
    var e, r;
    const o = t, s = o.insertionPoint || o.position || { x: 0, y: 0, z: 0 };
    let a = o.text || o.textValue || o.content || "";
    const h = o.textHeight || o.height || 2.5, d = ["rotation", "angle", "rotationAngle", "textRotation", "direction", "xAxisDirection"], g = [];
    for (const c of d)
      if (o[c] !== void 0) {
        const f = o[c];
        g.push(`${c}=${typeof f == "object" ? JSON.stringify(f) : f}`);
      }
    this.output.info("MTEXT ROT fields: {0}", g.join(", ") || "none");
    let l = 0;
    if (o.direction && (o.direction.x !== 1 || o.direction.y !== 0) ? l = Math.atan2(o.direction.y, o.direction.x) : o.xAxisDirection && (o.xAxisDirection.x !== 1 || o.xAxisDirection.y !== 0) ? l = Math.atan2(o.xAxisDirection.y, o.xAxisDirection.x) : o.rotation && (l = o.rotation), this.output.info(
      'MTEXT: pos=({0},{1}), h={2}, rot={3}rad ({4}deg), raw="{5}"',
      (e = s.x) == null ? void 0 : e.toFixed(2),
      (r = s.y) == null ? void 0 : r.toFixed(2),
      h,
      l == null ? void 0 : l.toFixed(3),
      (l * 180 / Math.PI).toFixed(1),
      a == null ? void 0 : a.substring(0, 30)
    ), a = a.replace(/\\[A-Za-z][^;]*;/g, "").replace(/\{|\}/g, "").replace(/\\P/g, `
`).replace(/\\/g, ""), !a.trim()) {
      this.output.warn("MTEXT: пустой текст после очистки");
      return;
    }
    await i.addText({
      position: [s.x, s.y, this.getZ(s.z)],
      height: h,
      content: a.trim(),
      rotation: l,
      layer: n,
      color: this.getEntityColor(t)
    });
  }
  async addPolyline2d(i, t, n) {
    if (!t.vertices || t.vertices.length < 2) return;
    const o = this.getZ(t.elevation), s = t.vertices.map((a) => [a.point.x, a.point.y, o]);
    await i.addPolyline3d({
      vertices: s,
      flags: (t.flag & 1) === 1 ? 1 : void 0,
      layer: n,
      color: this.getEntityColor(t)
    });
  }
  async addPolyline3d(i, t, n) {
    if (!t.vertices || t.vertices.length < 2) return;
    const o = t.vertices.map((s) => [s.point.x, s.point.y, this.getZ(s.point.z)]);
    await i.addPolyline3d({
      vertices: o,
      flags: (t.flag & 1) === 1 ? 1 : void 0,
      layer: n,
      color: this.getEntityColor(t)
    });
  }
  async addSpline(i, t, n) {
    var a;
    const o = ((a = t.fitPoints) == null ? void 0 : a.length) > 0 ? t.fitPoints : t.controlPoints;
    if (!o || o.length < 2) return;
    const s = o.map((h) => [h.x, h.y, this.getZ(h.z)]);
    await i.addPolyline3d({
      vertices: s,
      layer: n,
      color: this.getEntityColor(t)
    });
  }
  async addTable(i, t, n) {
    var r, c, f, x;
    if (this.output.info(
      "TABLE: name={0}, rows={1}, cols={2}, cells={3}",
      t.name,
      t.rowCount,
      t.columnCount,
      ((r = t.cells) == null ? void 0 : r.length) ?? 0
    ), !t.cells || t.cells.length === 0) {
      this.output.warn("TABLE: пустая таблица, пропускаем");
      return;
    }
    if (!t.rowHeightArr || !t.columnWidthArr) {
      this.output.warn("TABLE: нет данных о размерах строк/столбцов");
      return;
    }
    const o = ((c = t.startPoint) == null ? void 0 : c.x) ?? 0, s = ((f = t.startPoint) == null ? void 0 : f.y) ?? 0, a = this.getZ((x = t.startPoint) == null ? void 0 : x.z);
    this.output.info(
      "TABLE: startPoint=({0}, {1}), rowHeights={2}, colWidths={3}",
      o,
      s,
      t.rowHeightArr.length,
      t.columnWidthArr.length
    );
    let h = s, d = 0, g = 0;
    for (let u = 0; u < t.rowCount && u < t.rowHeightArr.length; u++) {
      let w = o;
      const P = t.rowHeightArr[u] || 10;
      for (let y = 0; y < t.columnCount && y < t.columnWidthArr.length && !(d >= t.cells.length); y++) {
        const p = t.cells[d], E = t.columnWidthArr[y] || 50;
        if (p && p.text && p.text.trim()) {
          const A = p.textHeight || Math.min(P * 0.6, 2.5);
          await (await i.addText({
            position: [w + 2, h - P / 2, a],
            height: A,
            content: p.text.trim()
          })).setx("$layer", n), g++;
        }
        w += E, d++;
      }
      h -= P;
    }
    const l = t.columnWidthArr.reduce((u, w) => u + (w || 0), 0), e = t.rowHeightArr.reduce((u, w) => u + (w || 0), 0);
    if (l > 0 && e > 0) {
      const u = [
        [o, s, a],
        [o + l, s, a],
        [o + l, s - e, a],
        [o, s - e, a]
      ];
      await (await i.addPolyline3d({
        vertices: u,
        flags: 1
      })).setx("$layer", n);
      let P = s;
      for (let p = 0; p < t.rowHeightArr.length; p++)
        P -= t.rowHeightArr[p] || 0, p < t.rowHeightArr.length - 1 && await (await i.addLine({
          a: [o, P, a],
          b: [o + l, P, a]
        })).setx("$layer", n);
      let y = o;
      for (let p = 0; p < t.columnWidthArr.length; p++)
        y += t.columnWidthArr[p] || 0, p < t.columnWidthArr.length - 1 && await (await i.addLine({
          a: [y, s, a],
          b: [y, s - e, a]
        })).setx("$layer", n);
    }
    this.output.info("TABLE: загружено {0} текстовых ячеек", g);
  }
}
export {
  L as default
};

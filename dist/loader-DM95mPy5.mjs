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
        for (const s of t.entries)
          if (s.name === "0")
            this.layers[s.name] = this.drawing.layers.layer0;
          else {
            const e = {
              name: s.name,
              color: s.colorIndex ?? 7,
              hidden: s.off ?? !1
            };
            this.layers[s.name] = await this.drawing.layers.add(e);
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
    const s = t.editor(), e = await this.explodeAllBlocks(i.entities, 3);
    this.output.info("После взрыва блоков: {0} объектов", e.length), await s.beginEdit();
    try {
      for (const r of e)
        await this.processEntity(s, r);
    } finally {
      await s.endEdit();
    }
    this.output.info("Обработано {0} объектов", e.length);
  }
  async explodeAllBlocks(i, t) {
    let s = [];
    for (let e = 0; e < t; e++) {
      const r = e === 0 ? i : s, a = [];
      let h = !1;
      for (const d of r)
        if (d.type === "INSERT") {
          h = !0;
          const g = this.explodeBlock(d);
          a.push(...g);
        } else if (d.type === "ACAD_TABLE") {
          const g = this.explodeTable(d);
          a.push(...g);
        } else
          a.push(d);
      if (s = a, !h) {
        this.output.info("Взрыв завершен на глубине {0}", e + 1);
        break;
      }
      this.output.info("Проход {0}: {1} объектов", e + 1, s.length);
    }
    return s;
  }
  explodeBlock(i) {
    var n, l;
    if (!this.db || !i.name) return [i];
    const t = (l = (n = this.db.tables.BLOCK_RECORD) == null ? void 0 : n.entries) == null ? void 0 : l.find(
      (f) => f.name === i.name
    );
    if (!t || !t.entities || t.entities.length === 0)
      return [];
    const s = i.insertionPoint || { x: 0, y: 0, z: 0 }, e = t.basePoint || { x: 0, y: 0, z: 0 }, r = i.xScale || 1, a = i.yScale || 1, h = i.zScale || 1, d = (i.rotation || 0) * Math.PI / 180, g = Math.cos(d), c = Math.sin(d), o = [];
    for (const f of t.entities) {
      const x = this.transformEntityData(
        f,
        s,
        e,
        r,
        a,
        h,
        g,
        c,
        i.rotation || 0
      );
      x && (!x.layer && i.layer && (x.layer = i.layer), o.push(x));
    }
    return o;
  }
  explodeTable(i) {
    const t = i;
    return t.entities && Array.isArray(t.entities) ? (this.output.info("TABLE: взрываем {0} вложенных объектов", t.entities.length), t.entities) : [i];
  }
  transformEntityData(i, t, s, e, r, a, h, d, g) {
    const c = (n, l, f) => {
      const x = (n - s.x) * e, u = (l - s.y) * r, w = (f - s.z) * a;
      return {
        x: t.x + x * h - u * d,
        y: t.y + x * d + u * h,
        z: t.z + w
      };
    }, o = JSON.parse(JSON.stringify(
      i,
      (n, l) => typeof l == "bigint" ? Number(l) : l
    ));
    if (i.type === "INSERT") {
      const n = o.insertionPoint || { x: 0, y: 0, z: 0 };
      return o.insertionPoint = c(n.x, n.y, n.z || 0), o.xScale = (o.xScale || 1) * e, o.yScale = (o.yScale || 1) * r, o.zScale = (o.zScale || 1) * a, o.rotation = (o.rotation || 0) + g, o;
    }
    switch (i.type) {
      case "LINE":
        return o.startPoint = c(o.startPoint.x, o.startPoint.y, o.startPoint.z || 0), o.endPoint = c(o.endPoint.x, o.endPoint.y, o.endPoint.z || 0), o;
      case "CIRCLE":
        return o.center = c(o.center.x, o.center.y, o.center.z || 0), o.radius *= Math.abs(e), o;
      case "ARC":
        return o.center = c(o.center.x, o.center.y, o.center.z || 0), o.radius *= Math.abs(e), o;
      case "TEXT":
      case "MTEXT": {
        const n = o.startPoint || o.insertionPoint || o.position || { x: 0, y: 0, z: 0 }, l = c(n.x, n.y, n.z || 0);
        return o.startPoint = l, o.insertionPoint = l, o.position = l, o.height && (o.height *= Math.abs(r)), o.textHeight && (o.textHeight *= Math.abs(r)), o;
      }
      case "LWPOLYLINE":
        return o.points && (o.points = o.points.map((n) => {
          const l = c(n.x, n.y, 0);
          return { ...n, x: l.x, y: l.y };
        })), o.vertices && (o.vertices = o.vertices.map((n) => {
          var f, x;
          const l = c(n.x || ((f = n.point) == null ? void 0 : f.x) || 0, n.y || ((x = n.point) == null ? void 0 : x.y) || 0, 0);
          return { ...n, x: l.x, y: l.y, point: l };
        })), o;
      case "POLYLINE2D":
      case "POLYLINE3D":
        return o.vertices && (o.vertices = o.vertices.map((n) => {
          var w, P, y;
          const l = ((w = n.point) == null ? void 0 : w.x) ?? n.x ?? 0, f = ((P = n.point) == null ? void 0 : P.y) ?? n.y ?? 0, x = ((y = n.point) == null ? void 0 : y.z) ?? n.z ?? 0, u = c(l, f, x);
          return { ...n, point: u, x: u.x, y: u.y, z: u.z };
        })), o;
      case "SPLINE":
        return o.controlPoints && (o.controlPoints = o.controlPoints.map((n) => c(n.x, n.y, n.z || 0))), o.fitPoints && (o.fitPoints = o.fitPoints.map((n) => c(n.x, n.y, n.z || 0))), o;
      case "ATTRIB":
      case "ATTDEF": {
        const n = o.insertionPoint || o.position || { x: 0, y: 0, z: 0 }, l = c(n.x, n.y, n.z || 0);
        return o.insertionPoint = l, o.position = l, o.height && (o.height *= Math.abs(r)), o.type = "TEXT", o;
      }
      default:
        return o;
    }
  }
  getLayer(i) {
    return this.layers[i.layer] ?? this.layers[0];
  }
  getEntityColor(i) {
    const t = i, s = ["color", "colorIndex", "colorValue", "trueColor", "rgb", "aci", "colorRef"], e = [];
    for (const r of s)
      t[r] !== void 0 && e.push(`${r}=${t[r]}`);
    if (e.length > 0 && this.output.info("COLOR {0}: {1}", i.type, e.join(", ")), t.colorIndex !== void 0 && t.colorIndex !== 256 && t.colorIndex !== 0)
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
  async applyEntityProperties(i, t, s) {
    await i.setx("$layer", t);
    const e = this.getEntityColor(s);
    e !== void 0 && await i.setx("color", e);
  }
  async processEntity(i, t) {
    const s = this.getLayer(t);
    try {
      switch (t.type) {
        case "LINE":
          await this.addLine(i, t, s);
          break;
        case "CIRCLE":
          await this.addCircle(i, t, s);
          break;
        case "ARC":
          await this.addArc(i, t, s);
          break;
        case "LWPOLYLINE":
          await this.addLwPolyline(i, t, s);
          break;
        case "TEXT":
          await this.addText(i, t, s);
          break;
        case "MTEXT":
          await this.addMText(i, t, s);
          break;
        case "POLYLINE2D":
          await this.addPolyline2d(i, t, s);
          break;
        case "POLYLINE3D":
          await this.addPolyline3d(i, t, s);
          break;
        case "SPLINE":
          await this.addSpline(i, t, s);
          break;
        case "ACAD_TABLE":
          await this.addTable(i, t, s);
          break;
        default:
          break;
      }
    } catch (e) {
      this.output.warn("Ошибка обработки {0}: {1}", t.type, e.message);
    }
  }
  async addLine(i, t, s) {
    await i.addLine({
      a: [t.startPoint.x, t.startPoint.y, this.getZ(t.startPoint.z)],
      b: [t.endPoint.x, t.endPoint.y, this.getZ(t.endPoint.z)],
      layer: s,
      color: this.getEntityColor(t)
    });
  }
  async addCircle(i, t, s) {
    await i.addCircle({
      center: [t.center.x, t.center.y, this.getZ(t.center.z)],
      radius: t.radius,
      layer: s,
      color: this.getEntityColor(t)
    });
  }
  async addArc(i, t, s) {
    const e = t.startAngle ?? 0;
    let a = (t.endAngle ?? Math.PI * 2) - e;
    a < 0 && (a += Math.PI * 2), await i.addArc({
      center: [t.center.x, t.center.y, this.getZ(t.center.z)],
      radius: t.radius,
      angle: e,
      span: a,
      layer: s,
      color: this.getEntityColor(t)
    });
  }
  async addLwPolyline(i, t, s) {
    if (!t.vertices || t.vertices.length < 2) return;
    const e = t, r = this.getZ(e.elevation), a = e.constantWidth || e.startWidth || e.globalWidth || void 0;
    if (a) {
      const h = t.vertices.map((d) => [d.x, d.y, d.bulge || 0]);
      await i.addPolyline({
        vertices: h,
        flags: (t.flag & 1) === 1 ? 1 : void 0,
        width: a,
        elevation: r,
        layer: s,
        color: this.getEntityColor(t)
      });
    } else {
      const h = t.vertices.map((d) => [d.x, d.y, r]);
      await i.addPolyline3d({
        vertices: h,
        flags: (t.flag & 1) === 1 ? 1 : void 0,
        layer: s,
        color: this.getEntityColor(t)
      });
    }
  }
  async addText(i, t, s) {
    var o, n;
    const e = t, r = e.startPoint || e.insertionPoint || e.position || { x: 0, y: 0, z: 0 }, a = e.text || e.textValue || e.content || "", h = e.textHeight || e.height || 2.5, d = ["rotation", "angle", "rotationAngle", "textRotation", "oblique"], g = [];
    for (const l of d)
      e[l] !== void 0 && g.push(`${l}=${e[l]}`);
    this.output.info("TEXT ROT fields: {0}", g.join(", ") || "none");
    const c = e.rotation ?? e.angle ?? e.rotationAngle ?? 0;
    if (this.output.info('TEXT: pos=({0},{1}), h={2}, rot={3}, text="{4}"', (o = r.x) == null ? void 0 : o.toFixed(2), (n = r.y) == null ? void 0 : n.toFixed(2), h, c == null ? void 0 : c.toFixed(3), a == null ? void 0 : a.substring(0, 30)), !a) {
      this.output.warn("TEXT: пустой текст, пропуск");
      return;
    }
    await i.addText({
      position: [r.x, r.y, this.getZ(r.z)],
      height: h,
      content: a,
      rotation: c,
      layer: s,
      color: this.getEntityColor(t)
    });
  }
  async addMText(i, t, s) {
    var o, n;
    const e = t, r = e.insertionPoint || e.position || { x: 0, y: 0, z: 0 };
    let a = e.text || e.textValue || e.content || "";
    const h = e.textHeight || e.height || 2.5, d = ["rotation", "angle", "rotationAngle", "textRotation", "direction", "xAxisDirection"], g = [];
    for (const l of d)
      if (e[l] !== void 0) {
        const f = e[l];
        g.push(`${l}=${typeof f == "object" ? JSON.stringify(f) : f}`);
      }
    this.output.info("MTEXT ROT fields: {0}", g.join(", ") || "none");
    let c = e.rotation ?? e.angle ?? 0;
    if (c === 0 && e.xAxisDirection && (c = Math.atan2(e.xAxisDirection.y, e.xAxisDirection.x)), this.output.info('MTEXT: pos=({0},{1}), h={2}, rot={3}, raw="{4}"', (o = r.x) == null ? void 0 : o.toFixed(2), (n = r.y) == null ? void 0 : n.toFixed(2), h, c == null ? void 0 : c.toFixed(3), a == null ? void 0 : a.substring(0, 30)), a = a.replace(/\\[A-Za-z][^;]*;/g, "").replace(/\{|\}/g, "").replace(/\\P/g, `
`).replace(/\\/g, ""), !a.trim()) {
      this.output.warn("MTEXT: пустой текст после очистки");
      return;
    }
    await i.addText({
      position: [r.x, r.y, this.getZ(r.z)],
      height: h,
      content: a.trim(),
      rotation: c,
      layer: s,
      color: this.getEntityColor(t)
    });
  }
  async addPolyline2d(i, t, s) {
    if (!t.vertices || t.vertices.length < 2) return;
    const e = this.getZ(t.elevation), r = t.vertices.map((a) => [a.point.x, a.point.y, e]);
    await i.addPolyline3d({
      vertices: r,
      flags: (t.flag & 1) === 1 ? 1 : void 0,
      layer: s,
      color: this.getEntityColor(t)
    });
  }
  async addPolyline3d(i, t, s) {
    if (!t.vertices || t.vertices.length < 2) return;
    const e = t.vertices.map((r) => [r.point.x, r.point.y, this.getZ(r.point.z)]);
    await i.addPolyline3d({
      vertices: e,
      flags: (t.flag & 1) === 1 ? 1 : void 0,
      layer: s,
      color: this.getEntityColor(t)
    });
  }
  async addSpline(i, t, s) {
    var a;
    const e = ((a = t.fitPoints) == null ? void 0 : a.length) > 0 ? t.fitPoints : t.controlPoints;
    if (!e || e.length < 2) return;
    const r = e.map((h) => [h.x, h.y, this.getZ(h.z)]);
    await i.addPolyline3d({
      vertices: r,
      layer: s,
      color: this.getEntityColor(t)
    });
  }
  async addTable(i, t, s) {
    var n, l, f, x;
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
    const e = ((l = t.startPoint) == null ? void 0 : l.x) ?? 0, r = ((f = t.startPoint) == null ? void 0 : f.y) ?? 0, a = this.getZ((x = t.startPoint) == null ? void 0 : x.z);
    this.output.info(
      "TABLE: startPoint=({0}, {1}), rowHeights={2}, colWidths={3}",
      e,
      r,
      t.rowHeightArr.length,
      t.columnWidthArr.length
    );
    let h = r, d = 0, g = 0;
    for (let u = 0; u < t.rowCount && u < t.rowHeightArr.length; u++) {
      let w = e;
      const P = t.rowHeightArr[u] || 10;
      for (let y = 0; y < t.columnCount && y < t.columnWidthArr.length && !(d >= t.cells.length); y++) {
        const p = t.cells[d], E = t.columnWidthArr[y] || 50;
        if (p && p.text && p.text.trim()) {
          const A = p.textHeight || Math.min(P * 0.6, 2.5);
          await (await i.addText({
            position: [w + 2, h - P / 2, a],
            height: A,
            content: p.text.trim()
          })).setx("$layer", s), g++;
        }
        w += E, d++;
      }
      h -= P;
    }
    const c = t.columnWidthArr.reduce((u, w) => u + (w || 0), 0), o = t.rowHeightArr.reduce((u, w) => u + (w || 0), 0);
    if (c > 0 && o > 0) {
      const u = [
        [e, r, a],
        [e + c, r, a],
        [e + c, r - o, a],
        [e, r - o, a]
      ];
      await (await i.addPolyline3d({
        vertices: u,
        flags: 1
      })).setx("$layer", s);
      let P = r;
      for (let p = 0; p < t.rowHeightArr.length; p++)
        P -= t.rowHeightArr[p] || 0, p < t.rowHeightArr.length - 1 && await (await i.addLine({
          a: [e, P, a],
          b: [e + c, P, a]
        })).setx("$layer", s);
      let y = e;
      for (let p = 0; p < t.columnWidthArr.length; p++)
        y += t.columnWidthArr[p] || 0, p < t.columnWidthArr.length - 1 && await (await i.addLine({
          a: [y, r, a],
          b: [y, r - o, a]
        })).setx("$layer", s);
    }
    this.output.info("TABLE: загружено {0} текстовых ячеек", g);
  }
}
export {
  L as default
};

class m {
  constructor(l, s) {
    this.output = l, this.context = s;
  }
  async import(l, s) {
    const h = await l.root.get(), g = s, u = await this.context.showQuickPick([
      { label: "Все объекты", description: "Геометрия + таблицы + блоки", value: "all" },
      { label: "Только геометрия", description: "Линии, полилинии, круги, дуги, текст", value: "geometry" },
      { label: "Только таблицы", description: "Импортировать только таблицы (ACAD_TABLE)", value: "tables" }
    ], {
      title: "Импорт DWG - Выбор объектов",
      placeHolder: "Что импортировать из DWG файла?"
    });
    if (!u) {
      this.output.info("Import cancelled");
      return;
    }
    const i = await this.context.showQuickPick([
      { label: "Исходные координаты", description: "Сохранить Z из DWG файла", value: "original" },
      { label: "Установить отметку 0", description: "Все объекты на Z=0", value: "zero" },
      { label: "Указать отметку...", description: "Ввести своё значение Z", value: "custom" }
    ], {
      title: "Импорт DWG - Отметка Z",
      placeHolder: "Выберите режим обработки Z-координат"
    });
    if (!i) {
      this.output.info("Import cancelled");
      return;
    }
    let c = !1, a = 0;
    if (i.value === "zero")
      c = !0, a = 0;
    else if (i.value === "custom") {
      const t = await this.context.showInputBox({
        title: "Отметка Z",
        prompt: "Введите значение Z для всех объектов",
        value: "0",
        validateInput: (p) => {
          const e = parseFloat(p);
          if (isNaN(e)) return "Введите число";
        }
      });
      if (t === void 0) {
        this.output.info("Import cancelled");
        return;
      }
      c = !0, a = parseFloat(t);
    }
    this.output.info("DWG import started (mode: {0}, Z: {1}, target: {2})", u.value, i.value, a);
    try {
      this.output.info("Loading WASM module...");
      const { Dwg_File_Type: t, LibreDwg: p } = await import("./libredwg-web-DdQoNFeJ.mjs"), e = await p.create();
      this.output.info("Reading DWG file...");
      const d = e.dwg_read_data(h.buffer, t.DWG);
      if (!d)
        throw new Error("Failed to read DWG file");
      this.output.info("Converting DWG data...");
      const f = e.convert(d), r = {};
      for (const o of f.entities)
        r[o.type] = (r[o.type] || 0) + 1;
      this.output.info("Найдено объектов: {0}", f.entities.length);
      for (const o in r)
        this.output.info("  - {0}: {1}", o, r[o]);
      const { default: v } = await import("./loader-0Gjsx-4g.mjs"), w = new v(g, this.output);
      w.setFlattenZ(c, a), w.setImportMode(u.value), await w.load(f), e.dwg_free(d), this.output.info("DWG loaded successfully!");
    } catch (t) {
      throw this.output.error(t), t;
    }
  }
}
const D = {
  dwg: (n) => new m(n.createOutputChannel("dwg"), n)
}, b = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null
}, Symbol.toStringTag, { value: "Module" }));
export {
  b as _,
  D as i
};

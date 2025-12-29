class D {
  constructor(n, s) {
    this.output = n, this.context = s;
  }
  async import(n, s) {
    const w = await n.root.get(), g = s, l = await this.context.showQuickPick([
      { label: "Все объекты", description: "Геометрия + таблицы + блоки", value: "all" },
      { label: "Только геометрия", description: "Линии, полилинии, круги, дуги, текст", value: "geometry" },
      { label: "Таблицы + текст", description: "Таблицы и текстовые объекты рядом", value: "tables" }
    ], {
      title: "Импорт DWG - Выбор объектов",
      placeHolder: "Что импортировать из DWG файла?"
    });
    if (!l) {
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
    let c = !1, r = 0;
    if (i.value === "zero")
      c = !0, r = 0;
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
      c = !0, r = parseFloat(t);
    }
    this.output.info("DWG import started (mode: {0}, Z: {1}, target: {2})", l.value, i.value, r);
    try {
      this.output.info("Loading WASM module...");
      const { Dwg_File_Type: t, LibreDwg: p } = await import("./libredwg-web-KaVtifxc.mjs"), e = await p.create();
      this.output.info("Reading DWG file...");
      const d = e.dwg_read_data(w.buffer, t.DWG);
      if (!d)
        throw this.output.error("Не удалось прочитать DWG файл. Возможные причины:"), this.output.error("  - Неподдерживаемая версия AutoCAD (2018+)"), this.output.error("  - Поврежденный файл"), this.output.error("  - Попробуйте пересохранить в AutoCAD как DWG 2013 или ниже"), new Error("Failed to read DWG file - unsupported version or corrupted");
      this.output.info("Converting DWG data...");
      const f = e.convert(d), a = {};
      for (const o of f.entities)
        a[o.type] = (a[o.type] || 0) + 1;
      this.output.info("Найдено объектов: {0}", f.entities.length);
      for (const o in a)
        this.output.info("  - {0}: {1}", o, a[o]);
      const { default: v } = await import("./loader-C-Rcp-q6.mjs"), h = new v(g, this.output);
      h.setFlattenZ(c, r), h.setImportMode(l.value), await h.load(f), e.dwg_free(d), this.output.info("DWG loaded successfully!");
    } catch (t) {
      throw this.output.error(t), t;
    }
  }
}
const m = {
  dwg: (u) => new D(u.createOutputChannel("dwg"), u)
}, b = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null
}, Symbol.toStringTag, { value: "Module" }));
export {
  b as _,
  m as i
};

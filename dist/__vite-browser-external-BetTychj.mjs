class D {
  constructor(u, s) {
    this.output = u, this.context = s;
  }
  async import(u, s) {
    const h = await u.root.get(), w = s, r = await this.context.showQuickPick([
      { label: "Исходные координаты", description: "Сохранить Z из DWG файла", value: "original" },
      { label: "Установить отметку 0", description: "Все объекты на Z=0", value: "zero" },
      { label: "Указать отметку...", description: "Ввести своё значение Z", value: "custom" }
    ], {
      title: "Импорт DWG - Отметка Z",
      placeHolder: "Выберите режим обработки Z-координат"
    });
    if (!r) {
      this.output.info("Import cancelled");
      return;
    }
    let l = !1, i = 0;
    if (r.value === "zero")
      l = !0, i = 0;
    else if (r.value === "custom") {
      const t = await this.context.showInputBox({
        title: "Отметка Z",
        prompt: "Введите значение Z для всех объектов",
        value: "0",
        validateInput: (c) => {
          const e = parseFloat(c);
          if (isNaN(e)) return "Введите число";
        }
      });
      if (t === void 0) {
        this.output.info("Import cancelled");
        return;
      }
      l = !0, i = parseFloat(t);
    }
    this.output.info("DWG import started (Z: {0}, target: {1})", r.value, i);
    try {
      this.output.info("Loading WASM module...");
      const { Dwg_File_Type: t, LibreDwg: c } = await import("./libredwg-web-OkO9SznU.mjs"), e = await c.create();
      this.output.info("Reading DWG file...");
      const p = e.dwg_read_data(h.buffer, t.DWG);
      if (!p)
        throw this.output.error("Не удалось прочитать DWG файл. Возможные причины:"), this.output.error("  - Неподдерживаемая версия AutoCAD (2018+)"), this.output.error("  - Поврежденный файл"), this.output.error("  - Попробуйте пересохранить в AutoCAD как DWG 2013 или ниже"), new Error("Failed to read DWG file - unsupported version or corrupted");
      this.output.info("Converting DWG data...");
      const d = e.convert(p), a = {};
      for (const o of d.entities)
        a[o.type] = (a[o.type] || 0) + 1;
      this.output.info("Найдено объектов: {0}", d.entities.length);
      for (const o in a)
        this.output.info("  - {0}: {1}", o, a[o]);
      const { default: g } = await import("./loader-DBhSCHf8.mjs"), f = new g(w, this.output);
      f.setFlattenZ(l, i), await f.load(d), e.dwg_free(p), this.output.info("DWG loaded successfully!");
    } catch (t) {
      throw this.output.error(t), t;
    }
  }
}
const v = {
  dwg: (n) => new D(n.createOutputChannel("dwg"), n)
}, m = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null
}, Symbol.toStringTag, { value: "Module" }));
export {
  m as _,
  v as i
};

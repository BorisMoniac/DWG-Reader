class v {
  constructor(l, c) {
    this.output = l, this.context = c;
  }
  async import(l, c) {
    var w;
    const h = await l.root.get(), D = c, i = await this.context.showQuickPick([
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
    let d = !1, u = 0;
    if (i.value === "zero")
      d = !0, u = 0;
    else if (i.value === "custom") {
      const t = await this.context.showInputBox({
        title: "Отметка Z",
        prompt: "Введите значение Z для всех объектов",
        value: "0",
        validateInput: (o) => {
          const r = parseFloat(o);
          if (isNaN(r)) return "Введите число";
        }
      });
      if (t === void 0) {
        this.output.info("Import cancelled");
        return;
      }
      d = !0, u = parseFloat(t);
    }
    const f = (h.byteLength / (1024 * 1024)).toFixed(2);
    this.output.info("DWG import started (Z: {0}, target: {1}, size: {2} MB)", i.value, u, f), h.byteLength > 50 * 1024 * 1024 && this.output.warn("Внимание: файл больше 50 МБ, возможны проблемы с памятью");
    try {
      this.output.info("Loading WASM module...");
      const { Dwg_File_Type: t, LibreDwg: o } = await import("./libredwg-web-BvZpOV5B.mjs"), r = await o.create();
      this.output.info("Reading DWG file ({0} MB)...", f);
      const s = r.dwg_read_data(h.buffer, t.DWG);
      if (!s)
        throw this.output.error("Не удалось прочитать DWG файл. Возможные причины:"), this.output.error("  - Неподдерживаемая версия AutoCAD (2018+)"), this.output.error("  - Поврежденный файл"), this.output.error("  - Попробуйте пересохранить в AutoCAD как DWG 2013 или ниже"), new Error("Failed to read DWG file - unsupported version or corrupted");
      this.output.info("Converting DWG data...");
      let n;
      try {
        n = r.convert(s);
      } catch (e) {
        throw this.output.error("Ошибка при конвертации DWG данных"), this.output.error("Возможные причины:"), this.output.error("  - Файл слишком большой для обработки в браузере"), this.output.error("  - Файл содержит сложные объекты (прокси, OLE)"), this.output.error("  - Попробуйте упростить файл в AutoCAD (PURGE, AUDIT)"), this.output.error("  - Пересохраните как DWG 2010 или ниже"), r.dwg_free(s), e;
      }
      const a = {};
      for (const e of n.entities)
        a[e.type] = (a[e.type] || 0) + 1;
      this.output.info("Найдено объектов: {0}", n.entities.length);
      for (const e in a)
        this.output.info("  - {0}: {1}", e, a[e]);
      const { default: m } = await import("./loader-Btvj0rdm.mjs"), g = new m(D, this.output);
      g.setFlattenZ(d, u), await g.load(n), r.dwg_free(s), this.output.info("DWG loaded successfully!");
    } catch (t) {
      const o = t;
      throw (w = o.message) != null && w.includes("memory access out of bounds") ? (this.output.error("Ошибка памяти WASM: файл слишком сложный для обработки"), this.output.error("Рекомендации:"), this.output.error("  1. Откройте файл в AutoCAD"), this.output.error("  2. Выполните команды: PURGE, AUDIT, OVERKILL"), this.output.error("  3. Удалите ненужные слои и объекты"), this.output.error("  4. Сохраните как DWG 2010 или ниже"), this.output.error("  5. Попробуйте загрузить снова")) : this.output.error(o), t;
    }
  }
}
const G = {
  dwg: (p) => new v(p.createOutputChannel("dwg"), p)
}, W = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null
}, Symbol.toStringTag, { value: "Module" }));
export {
  W as _,
  G as i
};

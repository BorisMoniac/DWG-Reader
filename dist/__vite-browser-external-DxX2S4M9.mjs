class g {
  constructor(r, n) {
    this.output = r, this.context = n;
  }
  async import(r, n) {
    const p = await r.root.get(), f = n, o = await this.context.showQuickPick([
      { label: "Исходные координаты", description: "Сохранить Z из DWG файла", value: "original" },
      { label: "Установить отметку 0", description: "Все объекты на Z=0", value: "zero" },
      { label: "Указать отметку...", description: "Ввести своё значение Z", value: "custom" }
    ], {
      title: "Импорт DWG",
      placeHolder: "Выберите режим обработки Z-координат"
    });
    if (!o) {
      this.output.info("Import cancelled");
      return;
    }
    let s = !1, i = 0;
    if (o.value === "zero")
      s = !0, i = 0;
    else if (o.value === "custom") {
      const t = await this.context.showInputBox({
        title: "Отметка Z",
        prompt: "Введите значение Z для всех объектов",
        value: "0",
        validateInput: (u) => {
          const e = parseFloat(u);
          if (isNaN(e)) return "Введите число";
        }
      });
      if (t === void 0) {
        this.output.info("Import cancelled");
        return;
      }
      s = !0, i = parseFloat(t);
    }
    this.output.info("DWG import started (Z mode: {0}, target: {1})", o.value, i);
    try {
      this.output.info("Loading WASM module...");
      const { Dwg_File_Type: t, LibreDwg: u } = await import("./libredwg-web-BoTUIkKD.mjs"), e = await u.create();
      this.output.info("Reading DWG file...");
      const l = e.dwg_read_data(p.buffer, t.DWG);
      if (!l)
        throw new Error("Failed to read DWG file");
      this.output.info("Converting DWG data...");
      const c = e.convert(l);
      this.output.info("Processing {0} entities...", c.entities.length);
      const { default: w } = await import("./loader-B0hJfEeL.mjs"), d = new w(f, this.output);
      d.setFlattenZ(s, i), await d.load(c), e.dwg_free(l), this.output.info("DWG loaded successfully. Entities: {0}", c.entities.length);
    } catch (t) {
      throw this.output.error(t), t;
    }
  }
}
const h = {
  dwg: (a) => new g(a.createOutputChannel("dwg"), a)
}, m = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null
}, Symbol.toStringTag, { value: "Module" }));
export {
  m as _,
  h as i
};

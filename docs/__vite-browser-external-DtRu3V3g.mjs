class l {
  constructor(e) {
    this.output = e;
  }
  async import(e, a) {
    const s = await e.root.get(), u = a;
    this.output.info("DWG import started");
    try {
      this.output.info("Loading WASM module...");
      const { Dwg_File_Type: t, LibreDwg: d } = await import("./libredwg-web-CitdUaDM.mjs"), o = await d.create();
      this.output.info("Reading DWG file...");
      const i = o.dwg_read_data(s.buffer, t.DWG);
      if (!i)
        throw new Error("Failed to read DWG file");
      this.output.info("Converting DWG data...");
      const r = o.convert(i);
      this.output.info("Processing {0} entities...", r.entities.length);
      const { default: c } = await import("./loader-D15O-zPO.mjs");
      await new c(u, this.output).load(r), o.dwg_free(i), this.output.info("DWG loaded successfully. Entities: {0}", r.entities.length);
    } catch (t) {
      throw this.output.error(t), t;
    }
  }
}
const g = {
  dwg: (n) => new l(n.createOutputChannel("dwg"))
}, p = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null
}, Symbol.toStringTag, { value: "Module" }));
export {
  p as _,
  g as i
};

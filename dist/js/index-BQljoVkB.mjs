const d = [
  { id: 0, name: "", encoding: "", description: "" },
  { id: 20127, name: "ASCII", encoding: "ASCII", description: "US-ASCII (7-bit)" },
  { id: 28591, name: "8859_1", encoding: "ISO8859-1", description: "Latin 1; Western European (ISO)" },
  { id: 28592, name: "8859_2", encoding: "ISO8859-2", description: "Central European; Central European (ISO)" },
  { id: 28593, name: "8859_3", encoding: "ISO8859-3", description: "Latin 3" },
  { id: 28594, name: "8859_4", encoding: "ISO8859-4", description: "Baltic" },
  { id: 28595, name: "8859_5", encoding: "ISO8859-5", description: "Cyrillic" },
  { id: 28596, name: "8859_6", encoding: "ISO8859-6", description: "Arabic" },
  { id: 28597, name: "8859_7", encoding: "ISO8859-7", description: "Greek" },
  { id: 28598, name: "8859_8", encoding: "ISO8859-8", description: "Hebrew; Hebrew (ISO-Visual)" },
  { id: 28599, name: "8859_9", encoding: "ISO8859-9", description: "Turkish" },
  { id: 437, name: "DOS437", encoding: "IBM437", description: "OEM United States" },
  { id: 850, name: "DOS850", encoding: "IBM850", description: "OEM Multilingual Latin 1; Western European (DOS)" },
  { id: 852, name: "DOS852", encoding: "IBM852", description: "OEM Latin 2; Central European (DOS)" },
  { id: 855, name: "DOS855", encoding: "IBM855", description: "OEM Cyrillic (primarily Russian)" },
  { id: 857, name: "DOS857", encoding: "IBM857", description: "OEM Turkish; Turkish (DOS)" },
  { id: 860, name: "DOS860", encoding: "IBM860", description: "OEM Portuguese; Portuguese (DOS)" },
  { id: 861, name: "DOS861", encoding: "IBM861", description: "OEM Icelandic; Icelandic (DOS)" },
  { id: 863, name: "DOS863", encoding: "IBM863", description: "OEM French Canadian; French Canadian (DOS)" },
  { id: 864, name: "DOS864", encoding: "IBM864", description: "OEM Arabic; Arabic (DOS)" },
  { id: 865, name: "DOS865", encoding: "IBM865", description: "OEM Nordic; Nordic (DOS)" },
  { id: 869, name: "DOS869", encoding: "IBM869", description: "OEM Modern Greek; Greek, Modern (DOS)" },
  { id: 932, name: "DOS932", encoding: "IBM932", description: "ANSI/OEM Japanese; Japanese (Shift-JIS)" },
  { id: 1e4, name: "MACINTOSH", encoding: "MACINTOSH", description: "MAC Roman; Western European (Mac)" },
  { id: 950, name: "BIG5", encoding: "BIG5", description: "ANSI/OEM Traditional Chinese (Taiwan; Hong Kong SAR, PRC); Chinese Traditional (Big5)" },
  { id: 949, name: "KSC5601", encoding: "CP949", description: "ANSI/OEM Korean (Unified Hangul Code)" },
  { id: 1361, name: "JOHAB", encoding: "JOHAB", description: "Korean (Johab)" },
  { id: 866, name: "DOS866", encoding: "IBM866", description: "OEM Russian; Cyrillic (DOS)" },
  { id: 1250, name: "ANSI_1250", encoding: "CP1250", description: "ANSI Central European; Central European (Windows)" },
  { id: 1251, name: "ANSI_1251", encoding: "CP1251", description: "ANSI Cyrillic; Cyrillic (Windows)" },
  { id: 1252, name: "ANSI_1252", encoding: "CP1252", description: "ANSI Latin 1; Western European (Windows)" },
  { id: 936, name: "GB2312", encoding: "CP936", description: "ANSI/OEM Simplified Chinese (PRC, Singapore); Chinese Simplified (GB2312)" },
  { id: 1253, name: "ANSI_1253", encoding: "CP1253", description: "ANSI Greek; Greek (Windows)" },
  { id: 1254, name: "ANSI_1254", encoding: "CP1254", description: "ANSI Turkish; Turkish (Windows)" },
  { id: 1255, name: "ANSI_1255", encoding: "CP1255", description: "ANSI Hebrew; Hebrew (Windows)" },
  { id: 1256, name: "ANSI_1256", encoding: "CP1256", description: "ANSI Arabic; Arabic (Windows)" },
  { id: 1257, name: "ANSI_1257", encoding: "CP1257", description: "ANSI Baltic; Baltic (Windows)" },
  { id: 874, name: "ANSI_874", encoding: "CP874", description: "ANSI/OEM Thai (ISO 8859-11); Thai (Windows)" },
  { id: 932, name: "ANSI_932", encoding: "CP932", description: "ANSI/OEM Japanese; Japanese (Shift-JIS)" },
  { id: 936, name: "ANSI_936", encoding: "CP936", description: "ANSI/OEM Simplified Chinese (PRC, Singapore); Chinese Simplified (GB2312)" },
  { id: 949, name: "ANSI_949", encoding: "CP949", description: "ANSI/OEM Korean (Unified Hangul Code)" },
  { id: 950, name: "ANSI_950", encoding: "CP950", description: "ANSI/OEM Traditional Chinese (Taiwan; Hong Kong SAR, PRC); Chinese Traditional (Big5)" },
  { id: 1361, name: "ANSI_1361", encoding: "CP1361", description: "Korean (Johab)" },
  { id: 1200, name: "ANSI_1200", encoding: "UTF-16LE", description: "Unicode UTF-16, little endian byte order (BMP of ISO 10646)" },
  { id: 1258, name: "ANSI_1258", encoding: "CP1258", description: "ANSI/OEM Vietnamese; Vietnamese (Windows)" }
];
var c = /* @__PURE__ */ ((n) => (n[n.AC1001 = 0] = "AC1001", n[n.AC1002 = 1] = "AC1002", n[n.AC1003 = 2] = "AC1003", n[n.AC1004 = 3] = "AC1004", n[n.AC1005 = 4] = "AC1005", n[n.AC1006 = 5] = "AC1006", n[n.AC1007 = 6] = "AC1007", n[n.AC1008 = 7] = "AC1008", n[n.AC1009 = 8] = "AC1009", n[n.AC1010 = 9] = "AC1010", n[n.AC1011 = 10] = "AC1011", n[n.AC1012 = 11] = "AC1012", n[n.AC1013 = 12] = "AC1013", n[n.AC1014 = 13] = "AC1014", n[n.AC1500 = 14] = "AC1500", n[n.AC1015 = 15] = "AC1015", n[n.AC402a = 16] = "AC402a", n[n.AC402b = 17] = "AC402b", n[n.AC1018 = 18] = "AC1018", n[n.AC1021 = 19] = "AC1021", n[n.AC1024 = 20] = "AC1024", n[n.AC1027 = 21] = "AC1027", n[n.AC1032 = 22] = "AC1032", n))(c || {});
const r = {
  AC1001: 0,
  AC1002: 1,
  AC1003: 2,
  AC1004: 3,
  AC1005: 4,
  AC1006: 5,
  AC1007: 6,
  AC1008: 7,
  AC1009: 8,
  AC1010: 9,
  AC1011: 10,
  AC1012: 11,
  AC1013: 12,
  AC1014: 13,
  AC1500: 14,
  AC1015: 15,
  AC402a: 16,
  AC402b: 17,
  AC1018: 18,
  AC1021: 19,
  AC1024: 20,
  AC1027: 21,
  AC1032: 22
  /* AC1032 */
};
class u {
  constructor() {
    this.linetypes = {}, this.layers = {}, this.styles = {}, this.blocks = {}, this.layouts = {}, this.variables = {}, this.classes = {};
  }
  async readDwgFile(i) {
    const e = i.readBytes(6), t = new TextDecoder("ascii").decode(e);
    if (!t.startsWith("AC"))
      throw new Error("Invalid DWG file signature");
    const o = t.substring(0, 6), s = r[o];
    if (s === void 0)
      throw new Error(`Unsupported DWG version: ${o}`);
    i.version = s, s >= c.AC1015 ? await this.readModernDwg(i) : await this.readLegacyDwg(i);
  }
  async readModernDwg(i) {
    i.seek(6), i.readByte(), i.readByte(), i.readByte(), i.readByte();
    const e = i.readShort();
    for (let o = 0; o < d.length; o++)
      if (e === d[o].id) {
        i.encoding = d[o].encoding;
        break;
      }
    const t = i.readInt();
    i.output.info("DWG file loaded successfully"), i.output.info("Version: {0}, Sections: {1}", i.version, t), await this.initializeDefaults(i);
  }
  async readLegacyDwg(i) {
    i.output.info("Legacy DWG format detected"), await this.initializeDefaults(i);
  }
  async initializeDefaults(i) {
    this.linetypes.CONTINUOUS = i.drawing.linetypes.continuous, this.linetypes.BYLAYER = i.drawing.linetypes.bylayer, this.linetypes.BYBLOCK = i.drawing.linetypes.byblock, this.layers[0] = i.drawing.layers.layer0, this.styles.STANDARD = i.drawing.styles.standard, this.layouts["*MODEL_SPACE"] = i.drawing.layouts.model;
  }
  async readHeader(i) {
    i.output.info("Reading DWG header...");
  }
  async readClasses(i) {
    i.output.info("Reading DWG classes...");
  }
  async readObjects(i) {
    i.output.info("Reading DWG objects...");
  }
  async readEntities(i) {
    i.output.info("Reading DWG entities...");
  }
  async readTables(i) {
    i.output.info("Reading DWG tables...");
  }
  async readBlocks(i) {
    i.output.info("Reading DWG blocks...");
  }
  async readLinetype(i, e) {
    i.output.info("Reading linetype...");
  }
  async readLayer(i, e) {
    i.output.info("Reading layer...");
  }
  async readStyle(i, e) {
    i.output.info("Reading text style...");
  }
  async readBlock(i, e) {
    i.output.info("Reading block...");
  }
  async readEntity(i, e) {
    i.output.info("Reading entity type: {0}", e);
  }
  async readLine(i, e) {
    const t = [
      i.readDouble(),
      i.readDouble(),
      i.readDouble()
    ], o = [
      i.readDouble(),
      i.readDouble(),
      i.readDouble()
    ];
    e.start = t, e.end = o;
  }
  async readCircle(i, e) {
    const t = [
      i.readDouble(),
      i.readDouble(),
      i.readDouble()
    ], o = i.readDouble();
    e.center = t, e.radius = o;
  }
  async readArc(i, e) {
    const t = [
      i.readDouble(),
      i.readDouble(),
      i.readDouble()
    ], o = i.readDouble(), s = i.readDouble(), a = i.readDouble();
    e.center = t, e.radius = o, e.startAngle = s, e.endAngle = a;
  }
  async readText(i, e) {
    const t = [
      i.readDouble(),
      i.readDouble(),
      i.readDouble()
    ], o = i.readDouble(), s = i.readString();
    e.position = t, e.height = o, e.text = s;
  }
  async readPolyline(i, e) {
    i.output.info("Reading polyline...");
  }
  async readLwPolyline(i, e) {
    i.output.info("Reading lightweight polyline...");
  }
  async readInsert(i, e) {
    const t = [
      i.readDouble(),
      i.readDouble(),
      i.readDouble()
    ];
    e.position = t;
  }
  async readDimension(i, e) {
    i.output.info("Reading dimension...");
  }
  async readHatch(i, e) {
    i.output.info("Reading hatch...");
  }
  async readSpline(i, e) {
    i.output.info("Reading spline...");
  }
  async readEllipse(i, e) {
    const t = [
      i.readDouble(),
      i.readDouble(),
      i.readDouble()
    ], o = [
      i.readDouble(),
      i.readDouble(),
      i.readDouble()
    ], s = i.readDouble();
    e.center = t, e.majorAxis = o, e.minorAxisRatio = s;
  }
  async readMText(i, e) {
    const t = [
      i.readDouble(),
      i.readDouble(),
      i.readDouble()
    ], o = i.readDouble(), s = i.readString();
    e.position = t, e.height = o, e.text = s;
  }
  async readLeader(i, e) {
    i.output.info("Reading leader...");
  }
  async readSolid(i, e) {
    i.output.info("Reading solid...");
  }
  async readTrace(i, e) {
    i.output.info("Reading trace...");
  }
  async read3dFace(i, e) {
    i.output.info("Reading 3D face...");
  }
  async readViewport(i, e) {
    i.output.info("Reading viewport...");
  }
  async readImage(i, e) {
    i.output.info("Reading image...");
  }
  async readPoint(i, e) {
    const t = [
      i.readDouble(),
      i.readDouble(),
      i.readDouble()
    ];
    e.position = t;
  }
  async read3dPolyline(i, e) {
    i.output.info("Reading 3D polyline...");
  }
  async readRay(i, e) {
    i.output.info("Reading ray...");
  }
  async readXline(i, e) {
    i.output.info("Reading xline...");
  }
}
class l {
  constructor(i, e, t) {
    this.position = 0, this.bitPosition = 0, this._version = 0, this._encoding = "CP1251", this.buffer = i, this.drawing = e, this.output = t, this.decoder = new TextDecoder(this._encoding);
  }
  get version() {
    return this._version;
  }
  set version(i) {
    this._version = i, this.updateCodepage();
  }
  updateCodepage() {
    this.version >= c.AC1021 ? this.decoder = new TextDecoder("utf8") : this.decoder = new TextDecoder(this._encoding);
  }
  get encoding() {
    return this._encoding;
  }
  set encoding(i) {
    this._encoding = i, this.updateCodepage();
  }
  readBytes(i) {
    const e = new Uint8Array(this.buffer.buffer, this.position, i);
    return this.position += i, this.bitPosition = 0, e;
  }
  readBit() {
    return this.bitPosition === 0 && (this.bitPosition = 8), this.bitPosition--, this.buffer[this.position] >> this.bitPosition & 1;
  }
  readBits(i) {
    let e = 0;
    for (let t = 0; t < i; t++)
      e = e << 1 | this.readBit();
    return this.bitPosition === 0 && this.position++, e;
  }
  readByte() {
    return this.bitPosition = 0, this.buffer[this.position++];
  }
  readShort() {
    this.bitPosition = 0;
    const i = this.buffer[this.position] | this.buffer[this.position + 1] << 8;
    return this.position += 2, i;
  }
  readInt() {
    this.bitPosition = 0;
    const i = this.buffer[this.position] | this.buffer[this.position + 1] << 8 | this.buffer[this.position + 2] << 16 | this.buffer[this.position + 3] << 24;
    return this.position += 4, i;
  }
  readDouble() {
    this.bitPosition = 0;
    const i = new DataView(this.buffer.buffer, this.position, 8);
    return this.position += 8, i.getFloat64(0, !0);
  }
  readString() {
    this.bitPosition = 0;
    const i = this.readShort(), e = this.decoder.decode(new Uint8Array(this.buffer.buffer, this.position, i));
    return this.position += i, e;
  }
  readHandle() {
    this.bitPosition = 0;
    let i = "";
    const e = this.readByte();
    for (let t = 0; t < e; t++) {
      const o = this.readByte();
      i += o.toString(16).padStart(2, "0").toUpperCase();
    }
    return i;
  }
  seek(i) {
    this.position = i, this.bitPosition = 0;
  }
  tell() {
    return this.position;
  }
}
class p {
  constructor(i) {
    this.output = i;
  }
  async import(i, e) {
    const t = await i.root.get(), o = new l(t, e, this.output), s = new u();
    try {
      await s.readDwgFile(o);
    } catch (a) {
      throw this.output.error(a), a;
    }
  }
}
const g = {
  dwg: (n) => new p(n.createOutputChannel("dwg"))
};
export {
  g as default
};

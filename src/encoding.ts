declare interface EncodingInfo {
    readonly id: number;
    readonly name: string;
    readonly encoding: string;
    readonly description: string;
}

const Encodings: EncodingInfo[] = [
    { id: 0, name: '', encoding: '', description: '' },
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
    { id: 10000, name: "MACINTOSH", encoding: "MACINTOSH", description: "MAC Roman; Western European (Mac)" },
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
    { id: 1258, name: "ANSI_1258", encoding: "CP1258", description: "ANSI/OEM Vietnamese; Vietnamese (Windows)" },
];

export default Encodings;

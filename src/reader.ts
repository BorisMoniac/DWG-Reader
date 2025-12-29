import { Version } from "./version";

export declare interface DwgData {
    code: number;
    value: any;
}

export interface DwgReader {
    readonly drawing: Drawing;
    readonly output: OutputChannel;
    version: Version;
    encoding: string;

    readBytes(count: number): Uint8Array;
    readBit(): number;
    readBits(count: number): number;
    readByte(): number;
    readShort(): number;
    readInt(): number;
    readDouble(): number;
    readString(): string;
    readHandle(): string;
    seek(position: number): void;
    tell(): number;
}

export class DwgBaseReader implements DwgReader {
    public readonly output: OutputChannel;
    private readonly buffer: Uint8Array;
    private decoder: TextDecoder;
    private position = 0;
    private bitPosition = 0;
    private _version = 0;
    private _encoding = 'CP1251';

    constructor(buffer: Uint8Array, drawing: Drawing, output: OutputChannel) {
        this.buffer = buffer;
        this.drawing = drawing;
        this.output = output;
        this.decoder = new TextDecoder(this._encoding);
    }

    public readonly drawing: Drawing;

    get version(): Version {
        return this._version;
    }

    set version(value: Version) {
        this._version = value;
        this.updateCodepage();
    }

    updateCodepage() {
        if (this.version >= Version.AC1021) {
            this.decoder = new TextDecoder('utf8');
        } else {
            this.decoder = new TextDecoder(this._encoding);
        }
    }

    get encoding(): string {
        return this._encoding;
    }

    set encoding(value: string) {
        this._encoding = value;
        this.updateCodepage();
    }

    public readBytes(count: number): Uint8Array {
        const result = new Uint8Array(this.buffer.buffer, this.position, count);
        this.position += count;
        this.bitPosition = 0;
        return result;
    }

    public readBit(): number {
        if (this.bitPosition === 0) {
            this.bitPosition = 8;
        }
        this.bitPosition--;
        return (this.buffer[this.position] >> this.bitPosition) & 1;
    }

    public readBits(count: number): number {
        let result = 0;
        for (let i = 0; i < count; i++) {
            result = (result << 1) | this.readBit();
        }
        if (this.bitPosition === 0) {
            this.position++;
        }
        return result;
    }

    public readByte(): number {
        this.bitPosition = 0;
        return this.buffer[this.position++];
    }

    public readShort(): number {
        this.bitPosition = 0;
        const result = this.buffer[this.position] | (this.buffer[this.position + 1] << 8);
        this.position += 2;
        return result;
    }

    public readInt(): number {
        this.bitPosition = 0;
        const result = this.buffer[this.position] | 
                      (this.buffer[this.position + 1] << 8) |
                      (this.buffer[this.position + 2] << 16) |
                      (this.buffer[this.position + 3] << 24);
        this.position += 4;
        return result;
    }

    public readDouble(): number {
        this.bitPosition = 0;
        const view = new DataView(this.buffer.buffer, this.position, 8);
        this.position += 8;
        return view.getFloat64(0, true);
    }

    public readString(): string {
        this.bitPosition = 0;
        const length = this.readShort();
        const result = this.decoder.decode(new Uint8Array(this.buffer.buffer, this.position, length));
        this.position += length;
        return result;
    }

    public readHandle(): string {
        this.bitPosition = 0;
        let result = '';
        const length = this.readByte();
        for (let i = 0; i < length; i++) {
            const byte = this.readByte();
            result += byte.toString(16).padStart(2, '0').toUpperCase();
        }
        return result;
    }

    public seek(position: number): void {
        this.position = position;
        this.bitPosition = 0;
    }

    public tell(): number {
        return this.position;
    }
}

import { DwgType, LinetypeElement, TextAlignment } from "albatros/enums";
import Encodings from "./encoding";
import { DwgReader } from "./reader";
import { Version, VersionMap } from "./version";

export default class DwgLoader {
    public linetypes: Record<string, DwgLinetype> = {};
    public layers: Record<string, DwgLayer> = {};
    public styles: Record<string, DwgTextStyle> = {};
    public blocks: Record<string, DwgBlock> = {};
    public layouts: Record<string, DwgLayout> = {};
    public variables: Record<string, any> = {};
    public classes: Record<string, any> = {};

    async readDwgFile(reader: DwgReader): Promise<void> {
        const signature = reader.readBytes(6);
        const signatureStr = new TextDecoder('ascii').decode(signature);
        
        if (!signatureStr.startsWith('AC')) {
            throw new Error('Invalid DWG file signature');
        }

        const versionStr = signatureStr.substring(0, 6);
        const version = VersionMap[versionStr];
        
        if (version === undefined) {
            throw new Error(`Unsupported DWG version: ${versionStr}`);
        }
        
        reader.version = version;

        if (version >= Version.AC1015) {
            await this.readModernDwg(reader);
        } else {
            await this.readLegacyDwg(reader);
        }
    }

    private async readModernDwg(reader: DwgReader): Promise<void> {
        reader.seek(0x06);
        const maintenanceVersion = reader.readByte();
        const preview = reader.readByte();
        const dwgVersion = reader.readByte();
        const appMaintenanceVersion = reader.readByte();
        const codePage = reader.readShort();

        for (let i = 0; i < Encodings.length; i++) {
            if (codePage === Encodings[i].id) {
                reader.encoding = Encodings[i].encoding;
                break;
            }
        }

        const numSections = reader.readInt();
        
        reader.output.info('DWG file loaded successfully');
        reader.output.info('Version: {0}, Sections: {1}', reader.version, numSections);

        await this.initializeDefaults(reader);
    }

    private async readLegacyDwg(reader: DwgReader): Promise<void> {
        reader.output.info('Legacy DWG format detected');
        
        await this.initializeDefaults(reader);
    }

    private async initializeDefaults(reader: DwgReader): Promise<void> {
        this.linetypes['CONTINUOUS'] = reader.drawing.linetypes.continuous!;
        this.linetypes['BYLAYER'] = reader.drawing.linetypes.bylayer!;
        this.linetypes['BYBLOCK'] = reader.drawing.linetypes.byblock!;
        
        this.layers['0'] = reader.drawing.layers.layer0!;
        
        this.styles['STANDARD'] = reader.drawing.styles.standard!;
        
        this.layouts['*MODEL_SPACE'] = reader.drawing.layouts.model;
    }

    private async readHeader(reader: DwgReader): Promise<void> {
        reader.output.info('Reading DWG header...');
    }

    private async readClasses(reader: DwgReader): Promise<void> {
        reader.output.info('Reading DWG classes...');
    }

    private async readObjects(reader: DwgReader): Promise<void> {
        reader.output.info('Reading DWG objects...');
    }

    private async readEntities(reader: DwgReader): Promise<void> {
        reader.output.info('Reading DWG entities...');
    }

    private async readTables(reader: DwgReader): Promise<void> {
        reader.output.info('Reading DWG tables...');
    }

    private async readBlocks(reader: DwgReader): Promise<void> {
        reader.output.info('Reading DWG blocks...');
    }

    private async readLinetype(reader: DwgReader, data: DwgLinetypeData): Promise<void> {
        reader.output.info('Reading linetype...');
    }

    private async readLayer(reader: DwgReader, data: Partial<DwgLayerData>): Promise<void> {
        reader.output.info('Reading layer...');
    }

    private async readStyle(reader: DwgReader, data: Partial<DwgTextStyleData>): Promise<void> {
        reader.output.info('Reading text style...');
    }

    private async readBlock(reader: DwgReader, data: DwgBlockData): Promise<void> {
        reader.output.info('Reading block...');
    }

    private async readEntity(reader: DwgReader, entityType: number): Promise<void> {
        reader.output.info('Reading entity type: {0}', entityType);
    }

    private async readLine(reader: DwgReader, data: Partial<DwgLineData>): Promise<void> {
        const startPoint: vec3 = [
            reader.readDouble(),
            reader.readDouble(),
            reader.readDouble()
        ];
        
        const endPoint: vec3 = [
            reader.readDouble(),
            reader.readDouble(),
            reader.readDouble()
        ];

        data.start = startPoint;
        data.end = endPoint;
    }

    private async readCircle(reader: DwgReader, data: Partial<DwgCircleData>): Promise<void> {
        const center: vec3 = [
            reader.readDouble(),
            reader.readDouble(),
            reader.readDouble()
        ];
        
        const radius = reader.readDouble();

        data.center = center;
        data.radius = radius;
    }

    private async readArc(reader: DwgReader, data: Partial<DwgArcData>): Promise<void> {
        const center: vec3 = [
            reader.readDouble(),
            reader.readDouble(),
            reader.readDouble()
        ];
        
        const radius = reader.readDouble();
        const startAngle = reader.readDouble();
        const endAngle = reader.readDouble();

        data.center = center;
        data.radius = radius;
        data.startAngle = startAngle;
        data.endAngle = endAngle;
    }

    private async readText(reader: DwgReader, data: Partial<DwgTextData>): Promise<void> {
        const position: vec3 = [
            reader.readDouble(),
            reader.readDouble(),
            reader.readDouble()
        ];
        
        const height = reader.readDouble();
        const text = reader.readString();

        data.position = position;
        data.height = height;
        data.text = text;
    }

    private async readPolyline(reader: DwgReader, data: Partial<DwgPolylineData>): Promise<void> {
        reader.output.info('Reading polyline...');
    }

    private async readLwPolyline(reader: DwgReader, data: Partial<DwgLwPolylineData>): Promise<void> {
        reader.output.info('Reading lightweight polyline...');
    }

    private async readInsert(reader: DwgReader, data: Partial<DwgInsertData>): Promise<void> {
        const position: vec3 = [
            reader.readDouble(),
            reader.readDouble(),
            reader.readDouble()
        ];

        data.position = position;
    }

    private async readDimension(reader: DwgReader, data: Partial<DwgDimensionData>): Promise<void> {
        reader.output.info('Reading dimension...');
    }

    private async readHatch(reader: DwgReader, data: Partial<DwgHatchData>): Promise<void> {
        reader.output.info('Reading hatch...');
    }

    private async readSpline(reader: DwgReader, data: Partial<DwgSplineData>): Promise<void> {
        reader.output.info('Reading spline...');
    }

    private async readEllipse(reader: DwgReader, data: Partial<DwgEllipseData>): Promise<void> {
        const center: vec3 = [
            reader.readDouble(),
            reader.readDouble(),
            reader.readDouble()
        ];
        
        const majorAxis: vec3 = [
            reader.readDouble(),
            reader.readDouble(),
            reader.readDouble()
        ];
        
        const minorAxisRatio = reader.readDouble();

        data.center = center;
        data.majorAxis = majorAxis;
        data.minorAxisRatio = minorAxisRatio;
    }

    private async readMText(reader: DwgReader, data: Partial<DwgMTextData>): Promise<void> {
        const position: vec3 = [
            reader.readDouble(),
            reader.readDouble(),
            reader.readDouble()
        ];
        
        const height = reader.readDouble();
        const text = reader.readString();

        data.position = position;
        data.height = height;
        data.text = text;
    }

    private async readLeader(reader: DwgReader, data: Partial<DwgLeaderData>): Promise<void> {
        reader.output.info('Reading leader...');
    }

    private async readSolid(reader: DwgReader, data: Partial<DwgSolidData>): Promise<void> {
        reader.output.info('Reading solid...');
    }

    private async readTrace(reader: DwgReader, data: Partial<DwgTraceData>): Promise<void> {
        reader.output.info('Reading trace...');
    }

    private async read3dFace(reader: DwgReader, data: Partial<Dwg3dFaceData>): Promise<void> {
        reader.output.info('Reading 3D face...');
    }

    private async readViewport(reader: DwgReader, data: Partial<DwgViewportData>): Promise<void> {
        reader.output.info('Reading viewport...');
    }

    private async readImage(reader: DwgReader, data: Partial<DwgImageData>): Promise<void> {
        reader.output.info('Reading image...');
    }

    private async readPoint(reader: DwgReader, data: Partial<DwgPointData>): Promise<void> {
        const position: vec3 = [
            reader.readDouble(),
            reader.readDouble(),
            reader.readDouble()
        ];

        data.position = position;
    }

    private async read3dPolyline(reader: DwgReader, data: Partial<Dwg3dPolylineData>): Promise<void> {
        reader.output.info('Reading 3D polyline...');
    }

    private async readRay(reader: DwgReader, data: Partial<DwgRayData>): Promise<void> {
        reader.output.info('Reading ray...');
    }

    private async readXline(reader: DwgReader, data: Partial<DwgXlineData>): Promise<void> {
        reader.output.info('Reading xline...');
    }
}

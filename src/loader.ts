import { DwgType } from "albatros/enums";
import { 
    DwgDatabase, 
    DwgEntity,
    DwgLineEntity,
    DwgCircleEntity,
    DwgArcEntity,
    DwgLWPolylineEntity,
    DwgTextEntity,
    DwgMTextEntity
} from '@mlightcad/libredwg-web';

export default class DwgLoader {
    public linetypes: Record<string, DwgLinetype> = {};
    public layers: Record<string, DwgLayer> = {};
    public styles: Record<string, DwgTextStyle> = {};
    public blocks: Record<string, DwgBlock> = {};

    constructor(
        private readonly drawing: Drawing,
        private readonly output: OutputChannel
    ) {}

    async load(db: DwgDatabase): Promise<void> {
        await this.initializeDefaults();
        await this.loadLayers(db);
        await this.loadEntities(db);
    }

    private async initializeDefaults(): Promise<void> {
        this.linetypes['Continuous'] = this.drawing.linetypes.continuous!;
        this.linetypes['ByLayer'] = this.drawing.linetypes.bylayer!;
        this.linetypes['ByBlock'] = this.drawing.linetypes.byblock!;
        
        this.layers['0'] = this.drawing.layers.layer0!;
        
        this.styles['Standard'] = this.drawing.styles.standard!;
    }

    private async loadLayers(db: DwgDatabase): Promise<void> {
        const layerTable = db.tables.LAYER;
        if (!layerTable || !layerTable.entries) return;

        for (const entry of layerTable.entries) {
            if (entry.name === '0') {
                this.layers[entry.name] = this.drawing.layers.layer0!;
            } else {
                const layerData: Partial<DwgLayerData> = {
                    name: entry.name,
                    color: entry.colorIndex ?? 7,
                    hidden: entry.off ?? false,
                };
                this.layers[entry.name] = await this.drawing.layers.add(layerData);
            }
        }
        this.output.info('Loaded {0} layers', Object.keys(this.layers).length);
    }

    private async loadEntities(db: DwgDatabase): Promise<void> {
        const model = this.drawing.layouts.model;
        if (!model) {
            this.output.warn('Model space not found');
            return;
        }
        const editor = model.editor();
        
        await editor.beginEdit();
        try {
            for (const entity of db.entities) {
                await this.processEntity(editor, entity);
            }
        } finally {
            await editor.endEdit();
        }
        
        this.output.info('Processed {0} entities', db.entities.length);
    }

    private async processEntity(editor: any, entity: DwgEntity): Promise<void> {
        const baseData: Partial<DwgEntityData> = {
            layer: this.layers[entity.layer] ?? this.layers['0'],
            color: entity.colorIndex,
            lineweight: entity.lineweight,
            ltscale: entity.lineTypeScale,
        };

        if (entity.lineType && this.linetypes[entity.lineType]) {
            baseData.linetype = this.linetypes[entity.lineType];
        }

        try {
            switch (entity.type) {
                case 'LINE':
                    await this.addLine(editor, entity as DwgLineEntity, baseData);
                    break;
                case 'CIRCLE':
                    await this.addCircle(editor, entity as DwgCircleEntity, baseData);
                    break;
                case 'ARC':
                    await this.addArc(editor, entity as DwgArcEntity, baseData);
                    break;
                case 'LWPOLYLINE':
                    await this.addLwPolyline(editor, entity as DwgLWPolylineEntity, baseData);
                    break;
                case 'TEXT':
                    await this.addText(editor, entity as DwgTextEntity, baseData);
                    break;
                case 'MTEXT':
                    await this.addMText(editor, entity as DwgMTextEntity, baseData);
                    break;
                default:
                    break;
            }
        } catch (e) {
            this.output.warn('Failed to process entity {0}: {1}', entity.type, (e as Error).message);
        }
    }

    private async addLine(editor: any, entity: DwgLineEntity, baseData: Partial<DwgEntityData>): Promise<void> {
        const data: Partial<DwgLineData> = {
            ...baseData,
            a: [entity.startPoint.x, entity.startPoint.y, entity.startPoint.z ?? 0],
            b: [entity.endPoint.x, entity.endPoint.y, entity.endPoint.z ?? 0],
        };
        await editor.addEntity(DwgType.line, data);
    }

    private async addCircle(editor: any, entity: DwgCircleEntity, baseData: Partial<DwgEntityData>): Promise<void> {
        const data: Partial<DwgCircleData> = {
            ...baseData,
            center: [entity.center.x, entity.center.y, entity.center.z ?? 0],
            radius: entity.radius,
        };
        await editor.addEntity(DwgType.circle, data);
    }

    private async addArc(editor: any, entity: DwgArcEntity, baseData: Partial<DwgEntityData>): Promise<void> {
        const startAngle = entity.startAngle ?? 0;
        const endAngle = entity.endAngle ?? Math.PI * 2;
        let span = endAngle - startAngle;
        if (span < 0) span += Math.PI * 2;

        const data: Partial<DwgArcData> = {
            ...baseData,
            center: [entity.center.x, entity.center.y, entity.center.z ?? 0],
            radius: entity.radius,
            angle: startAngle,
            span: span,
        };
        await editor.addEntity(DwgType.arc, data);
    }

    private async addLwPolyline(editor: any, entity: DwgLWPolylineEntity, baseData: Partial<DwgEntityData>): Promise<void> {
        if (!entity.vertices || entity.vertices.length < 2) return;

        const vertices: vec3[] = entity.vertices.map((v: any) => [v.x, v.y, v.bulge ?? 0] as vec3);
        
        const isClosed = (entity.flag & 1) === 1;
        
        const data: Partial<DwgPolylineData> = {
            ...baseData,
            vertices: vertices,
            flags: isClosed ? 1 : 0,
            elevation: entity.elevation ?? 0,
            width: entity.constantWidth,
        };
        await editor.addEntity(DwgType.polyline, data);
    }

    private async addText(editor: any, entity: DwgTextEntity, baseData: Partial<DwgEntityData>): Promise<void> {
        const data: Partial<DwgTextData> = {
            ...baseData,
            position: [entity.startPoint.x, entity.startPoint.y, 0],
            height: entity.textHeight ?? 2.5,
            content: entity.text ?? '',
            rotation: entity.rotation ? entity.rotation * Math.PI / 180 : 0,
        };
        await editor.addEntity(DwgType.text, data);
    }

    private async addMText(editor: any, entity: DwgMTextEntity, baseData: Partial<DwgEntityData>): Promise<void> {
        const data: Partial<DwgTextData> = {
            ...baseData,
            position: [entity.insertionPoint.x, entity.insertionPoint.y, entity.insertionPoint.z ?? 0],
            height: entity.textHeight ?? 2.5,
            content: entity.text ?? '',
            rotation: entity.rotation ? entity.rotation * Math.PI / 180 : 0,
        };
        await editor.addEntity(DwgType.text, data);
    }
}

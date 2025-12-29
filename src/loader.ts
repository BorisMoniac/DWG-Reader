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
    public layers: Record<string, DwgLayer> = {};

    constructor(
        private readonly drawing: Drawing,
        private readonly output: OutputChannel
    ) {}

    async load(db: DwgDatabase, progress: WorkerProgress): Promise<void> {
        await this.initializeDefaults();
        await this.loadLayers(db);
        await this.loadEntities(db, progress);
    }

    private async initializeDefaults(): Promise<void> {
        this.layers['0'] = this.drawing.layers.layer0!;
    }

    private async loadLayers(db: DwgDatabase): Promise<void> {
        const layerTable = db.tables.LAYER;
        if (!layerTable || !layerTable.entries) return;

        await this.drawing.layers.beginUpdate();
        try {
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
        } finally {
            await this.drawing.layers.endUpdate();
        }
        this.output.info('Загружено слоёв: {0}', Object.keys(this.layers).length);
    }

    private async loadEntities(db: DwgDatabase, progress: WorkerProgress): Promise<void> {
        const model = this.drawing.layouts.model;
        if (!model) {
            this.output.warn('Model space not found');
            return;
        }
        const editor = model.editor();
        
        progress.indeterminate = false;
        const total = db.entities.length;
        
        await editor.beginEdit();
        try {
            for (let i = 0; i < total; i++) {
                const entity = db.entities[i];
                await this.processEntity(editor, entity);
                
                if (i % 100 === 0) {
                    const percent = Math.round(i * 100 / total);
                    progress.percents = percent;
                    progress.label = `${percent}%`;
                    progress.details = `Обработка объектов: ${i}/${total}`;
                }
            }
        } finally {
            await editor.endEdit();
        }
        
        this.output.info('Обработано объектов: {0}', total);
    }

    private getLayer(entity: DwgEntity): DwgLayer {
        return this.layers[entity.layer] ?? this.layers['0'];
    }

    private async processEntity(editor: DwgEntityEditor, entity: DwgEntity): Promise<void> {
        const layer = this.getLayer(entity);
        
        try {
            switch (entity.type) {
                case 'LINE':
                    await this.addLine(editor, entity as DwgLineEntity, layer);
                    break;
                case 'CIRCLE':
                    await this.addCircle(editor, entity as DwgCircleEntity, layer);
                    break;
                case 'ARC':
                    await this.addArc(editor, entity as DwgArcEntity, layer);
                    break;
                case 'LWPOLYLINE':
                    await this.addLwPolyline(editor, entity as DwgLWPolylineEntity, layer);
                    break;
                case 'TEXT':
                    await this.addText(editor, entity as DwgTextEntity, layer);
                    break;
                case 'MTEXT':
                    await this.addMText(editor, entity as DwgMTextEntity, layer);
                    break;
                default:
                    break;
            }
        } catch (e) {
            this.output.warn('Ошибка обработки {0}: {1}', entity.type, (e as Error).message);
        }
    }

    private async addLine(editor: DwgEntityEditor, entity: DwgLineEntity, layer: DwgLayer): Promise<void> {
        const e = await editor.addLine({
            a: [entity.startPoint.x, entity.startPoint.y, entity.startPoint.z ?? 0],
            b: [entity.endPoint.x, entity.endPoint.y, entity.endPoint.z ?? 0],
        });
        await e.setx('$layer', layer);
    }

    private async addCircle(editor: DwgEntityEditor, entity: DwgCircleEntity, layer: DwgLayer): Promise<void> {
        const e = await editor.addCircle({
            center: [entity.center.x, entity.center.y, entity.center.z ?? 0],
            radius: entity.radius,
        });
        await e.setx('$layer', layer);
    }

    private async addArc(editor: DwgEntityEditor, entity: DwgArcEntity, layer: DwgLayer): Promise<void> {
        const startAngle = entity.startAngle ?? 0;
        const endAngle = entity.endAngle ?? Math.PI * 2;
        let span = endAngle - startAngle;
        if (span < 0) span += Math.PI * 2;

        const e = await editor.addArc({
            center: [entity.center.x, entity.center.y, entity.center.z ?? 0],
            radius: entity.radius,
            angle: startAngle,
            span: span,
        });
        await e.setx('$layer', layer);
    }

    private async addLwPolyline(editor: DwgEntityEditor, entity: DwgLWPolylineEntity, layer: DwgLayer): Promise<void> {
        if (!entity.vertices || entity.vertices.length < 2) return;

        const vertices: vec3[] = entity.vertices.map((v: any) => [v.x, v.y, 0] as vec3);
        
        const e = await editor.addPolyline3d({
            vertices: vertices,
            flags: (entity.flag & 1) === 1 ? 1 : undefined,
        });
        await e.setx('$layer', layer);
    }

    private async addText(editor: DwgEntityEditor, entity: DwgTextEntity, layer: DwgLayer): Promise<void> {
        const e = await editor.addText({
            position: [entity.startPoint.x, entity.startPoint.y, 0],
            height: entity.textHeight ?? 2.5,
            content: entity.text ?? '',
            rotation: entity.rotation ? entity.rotation * Math.PI / 180 : 0,
        });
        await e.setx('$layer', layer);
    }

    private async addMText(editor: DwgEntityEditor, entity: DwgMTextEntity, layer: DwgLayer): Promise<void> {
        const e = await editor.addText({
            position: [entity.insertionPoint.x, entity.insertionPoint.y, entity.insertionPoint.z ?? 0],
            height: entity.textHeight ?? 2.5,
            content: entity.text ?? '',
            rotation: entity.rotation ? entity.rotation * Math.PI / 180 : 0,
        });
        await e.setx('$layer', layer);
    }
}

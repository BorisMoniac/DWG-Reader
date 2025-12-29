import { 
    DwgDatabase, 
    DwgEntity,
    DwgLineEntity,
    DwgCircleEntity,
    DwgArcEntity,
    DwgLWPolylineEntity,
    DwgTextEntity,
    DwgMTextEntity,
    DwgPolyline2dEntity,
    DwgPolyline3dEntity,
    DwgSplineEntity,
    DwgTableEntity,
    DwgInsertEntity
} from '@mlightcad/libredwg-web';

type ImportMode = 'all' | 'tables' | 'geometry';

const GEOMETRY_TYPES = ['LINE', 'CIRCLE', 'ARC', 'LWPOLYLINE', 'POLYLINE2D', 'POLYLINE3D', 'SPLINE', 'TEXT', 'MTEXT'];
const TABLE_TYPES = ['ACAD_TABLE'];
const BLOCK_TYPES = ['INSERT'];

export default class DwgLoader {
    public layers: Record<string, DwgLayer> = {};
    private flattenZ: boolean = true;
    private targetZ: number = 0;
    private importMode: ImportMode = 'all';

    constructor(
        private readonly drawing: Drawing,
        private readonly output: OutputChannel
    ) {}

    setFlattenZ(flatten: boolean, z: number = 0): void {
        this.flattenZ = flatten;
        this.targetZ = z;
    }

    setImportMode(mode: ImportMode): void {
        this.importMode = mode;
    }

    private shouldImport(entityType: string): boolean {
        switch (this.importMode) {
            case 'geometry':
                return GEOMETRY_TYPES.includes(entityType);
            case 'tables':
                return TABLE_TYPES.includes(entityType);
            case 'all':
            default:
                return true;
        }
    }

    private getZ(z: number | undefined): number {
        if (this.flattenZ) return this.targetZ;
        return z ?? 0;
    }

    async load(db: DwgDatabase): Promise<void> {
        await this.initializeDefaults();
        await this.loadLayers(db);
        await this.loadEntities(db);
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

    private getLayer(entity: DwgEntity): DwgLayer {
        return this.layers[entity.layer] ?? this.layers['0'];
    }

    private async processEntity(editor: DwgEntityEditor, entity: DwgEntity): Promise<void> {
        if (!this.shouldImport(entity.type)) return;
        
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
                case 'POLYLINE2D':
                    await this.addPolyline2d(editor, entity as DwgPolyline2dEntity, layer);
                    break;
                case 'POLYLINE3D':
                    await this.addPolyline3d(editor, entity as DwgPolyline3dEntity, layer);
                    break;
                case 'SPLINE':
                    await this.addSpline(editor, entity as DwgSplineEntity, layer);
                    break;
                case 'ACAD_TABLE':
                    await this.addTable(editor, entity as DwgTableEntity, layer);
                    break;
                case 'INSERT':
                    await this.addInsert(editor, entity as DwgInsertEntity, layer);
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
            a: [entity.startPoint.x, entity.startPoint.y, this.getZ(entity.startPoint.z)],
            b: [entity.endPoint.x, entity.endPoint.y, this.getZ(entity.endPoint.z)],
        });
        await e.setx('$layer', layer);
    }

    private async addCircle(editor: DwgEntityEditor, entity: DwgCircleEntity, layer: DwgLayer): Promise<void> {
        const e = await editor.addCircle({
            center: [entity.center.x, entity.center.y, this.getZ(entity.center.z)],
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
            center: [entity.center.x, entity.center.y, this.getZ(entity.center.z)],
            radius: entity.radius,
            angle: startAngle,
            span: span,
        });
        await e.setx('$layer', layer);
    }

    private async addLwPolyline(editor: DwgEntityEditor, entity: DwgLWPolylineEntity, layer: DwgLayer): Promise<void> {
        if (!entity.vertices || entity.vertices.length < 2) return;

        const z = this.getZ(undefined);
        const vertices: vec3[] = entity.vertices.map((v: any) => [v.x, v.y, z] as vec3);
        
        const e = await editor.addPolyline3d({
            vertices: vertices,
            flags: (entity.flag & 1) === 1 ? 1 : undefined,
        });
        await e.setx('$layer', layer);
    }

    private async addText(editor: DwgEntityEditor, entity: DwgTextEntity, layer: DwgLayer): Promise<void> {
        const e = await editor.addText({
            position: [entity.startPoint.x, entity.startPoint.y, this.getZ(undefined)],
            height: entity.textHeight ?? 2.5,
            content: entity.text ?? '',
            rotation: entity.rotation ? entity.rotation * Math.PI / 180 : 0,
        });
        await e.setx('$layer', layer);
    }

    private async addMText(editor: DwgEntityEditor, entity: DwgMTextEntity, layer: DwgLayer): Promise<void> {
        const e = await editor.addText({
            position: [entity.insertionPoint.x, entity.insertionPoint.y, this.getZ(entity.insertionPoint.z)],
            height: entity.textHeight ?? 2.5,
            content: entity.text ?? '',
            rotation: entity.rotation ? entity.rotation * Math.PI / 180 : 0,
        });
        await e.setx('$layer', layer);
    }

    private async addPolyline2d(editor: DwgEntityEditor, entity: DwgPolyline2dEntity, layer: DwgLayer): Promise<void> {
        if (!entity.vertices || entity.vertices.length < 2) return;
        const z = this.getZ(entity.elevation);
        const vertices: vec3[] = entity.vertices.map((v: any) => [v.point.x, v.point.y, z] as vec3);
        const e = await editor.addPolyline3d({
            vertices: vertices,
            flags: (entity.flag & 1) === 1 ? 1 : undefined,
        });
        await e.setx('$layer', layer);
    }

    private async addPolyline3d(editor: DwgEntityEditor, entity: DwgPolyline3dEntity, layer: DwgLayer): Promise<void> {
        if (!entity.vertices || entity.vertices.length < 2) return;
        const vertices: vec3[] = entity.vertices.map((v: any) => [v.point.x, v.point.y, this.getZ(v.point.z)] as vec3);
        const e = await editor.addPolyline3d({
            vertices: vertices,
            flags: (entity.flag & 1) === 1 ? 1 : undefined,
        });
        await e.setx('$layer', layer);
    }

    private async addSpline(editor: DwgEntityEditor, entity: DwgSplineEntity, layer: DwgLayer): Promise<void> {
        const points = entity.fitPoints?.length > 0 ? entity.fitPoints : entity.controlPoints;
        if (!points || points.length < 2) return;
        const vertices: vec3[] = points.map((p: any) => [p.x, p.y, this.getZ(p.z)] as vec3);
        const e = await editor.addPolyline3d({
            vertices: vertices,
        });
        await e.setx('$layer', layer);
    }

    private async addTable(editor: DwgEntityEditor, entity: DwgTableEntity, layer: DwgLayer): Promise<void> {
        this.output.info('TABLE: name={0}, rows={1}, cols={2}, cells={3}', 
            entity.name, entity.rowCount, entity.columnCount, entity.cells?.length ?? 0);
        
        if (!entity.cells || entity.cells.length === 0) {
            this.output.warn('TABLE: пустая таблица, пропускаем');
            return;
        }
        
        if (!entity.rowHeightArr || !entity.columnWidthArr) {
            this.output.warn('TABLE: нет данных о размерах строк/столбцов');
            return;
        }
        
        const startX = entity.startPoint?.x ?? 0;
        const startY = entity.startPoint?.y ?? 0;
        const z = this.getZ(entity.startPoint?.z);
        
        this.output.info('TABLE: startPoint=({0}, {1}), rowHeights={2}, colWidths={3}', 
            startX, startY, entity.rowHeightArr.length, entity.columnWidthArr.length);
        
        let currentY = startY;
        let cellIndex = 0;
        let textCount = 0;
        
        for (let row = 0; row < entity.rowCount && row < entity.rowHeightArr.length; row++) {
            let currentX = startX;
            const rowHeight = entity.rowHeightArr[row] || 10;
            
            for (let col = 0; col < entity.columnCount && col < entity.columnWidthArr.length; col++) {
                if (cellIndex >= entity.cells.length) break;
                
                const cell = entity.cells[cellIndex];
                const colWidth = entity.columnWidthArr[col] || 50;
                
                if (cell && cell.text && cell.text.trim()) {
                    const textHeight = cell.textHeight || Math.min(rowHeight * 0.6, 2.5);
                    const e = await editor.addText({
                        position: [currentX + 2, currentY - rowHeight / 2, z],
                        height: textHeight,
                        content: cell.text.trim(),
                    });
                    await e.setx('$layer', layer);
                    textCount++;
                }
                
                currentX += colWidth;
                cellIndex++;
            }
            currentY -= rowHeight;
        }
        
        // Рисуем рамку таблицы
        const width = entity.columnWidthArr.reduce((a, b) => a + (b || 0), 0);
        const height = entity.rowHeightArr.reduce((a, b) => a + (b || 0), 0);
        
        if (width > 0 && height > 0) {
            const outline: vec3[] = [
                [startX, startY, z],
                [startX + width, startY, z],
                [startX + width, startY - height, z],
                [startX, startY - height, z]
            ];
            const e = await editor.addPolyline3d({
                vertices: outline,
                flags: 1,
            });
            await e.setx('$layer', layer);
            
            // Горизонтальные линии
            let lineY = startY;
            for (let row = 0; row < entity.rowHeightArr.length; row++) {
                lineY -= entity.rowHeightArr[row] || 0;
                if (row < entity.rowHeightArr.length - 1) {
                    const hLine = await editor.addLine({
                        a: [startX, lineY, z],
                        b: [startX + width, lineY, z],
                    });
                    await hLine.setx('$layer', layer);
                }
            }
            
            // Вертикальные линии
            let lineX = startX;
            for (let col = 0; col < entity.columnWidthArr.length; col++) {
                lineX += entity.columnWidthArr[col] || 0;
                if (col < entity.columnWidthArr.length - 1) {
                    const vLine = await editor.addLine({
                        a: [lineX, startY, z],
                        b: [lineX, startY - height, z],
                    });
                    await vLine.setx('$layer', layer);
                }
            }
        }
        
        this.output.info('TABLE: загружено {0} текстовых ячеек', textCount);
    }

    private async addInsert(editor: DwgEntityEditor, entity: DwgInsertEntity, layer: DwgLayer): Promise<void> {
        const pos = entity.insertionPoint;
        const z = this.getZ(pos.z);
        
        const size = Math.max(entity.xScale, entity.yScale, entity.zScale) * 10;
        const crossSize = size || 10;
        
        const line1 = await editor.addLine({
            a: [pos.x - crossSize, pos.y, z],
            b: [pos.x + crossSize, pos.y, z],
        });
        await line1.setx('$layer', layer);
        
        const line2 = await editor.addLine({
            a: [pos.x, pos.y - crossSize, z],
            b: [pos.x, pos.y + crossSize, z],
        });
        await line2.setx('$layer', layer);
        
        if (entity.name) {
            const text = await editor.addText({
                position: [pos.x + crossSize, pos.y + crossSize, z],
                height: crossSize / 2,
                content: `[${entity.name}]`,
            });
            await text.setx('$layer', layer);
        }
    }
}

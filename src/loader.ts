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
const TABLE_TYPES = ['ACAD_TABLE', 'TEXT', 'MTEXT'];
const BLOCK_TYPES = ['INSERT'];

export default class DwgLoader {
    public layers: Record<string, DwgLayer> = {};
    private flattenZ: boolean = true;
    private targetZ: number = 0;
    private importMode: ImportMode = 'all';
    private db: DwgDatabase | null = null;
    private processedBlocks: Set<string> = new Set();

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
        this.db = db;
        this.processedBlocks.clear();
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
        
        // Предварительно взрываем все блоки в плоский список
        const explodedEntities = await this.explodeAllBlocks(db.entities, 3);
        this.output.info('После взрыва блоков: {0} объектов', explodedEntities.length);
        
        await editor.beginEdit();
        try {
            for (const entity of explodedEntities) {
                await this.processEntity(editor, entity);
            }
        } finally {
            await editor.endEdit();
        }
        
        this.output.info('Обработано {0} объектов', explodedEntities.length);
    }
    
    private async explodeAllBlocks(entities: DwgEntity[], maxDepth: number): Promise<DwgEntity[]> {
        let result: DwgEntity[] = [];
        
        for (let depth = 0; depth < maxDepth; depth++) {
            const toProcess = depth === 0 ? entities : result;
            const newResult: DwgEntity[] = [];
            let hasInserts = false;
            
            for (const entity of toProcess) {
                if (entity.type === 'INSERT') {
                    hasInserts = true;
                    const exploded = this.explodeBlock(entity as DwgInsertEntity);
                    newResult.push(...exploded);
                } else if (entity.type === 'ACAD_TABLE') {
                    // Пробуем взорвать таблицу как блок
                    const exploded = this.explodeTable(entity as DwgTableEntity);
                    newResult.push(...exploded);
                } else {
                    newResult.push(entity);
                }
            }
            
            result = newResult;
            
            if (!hasInserts) {
                this.output.info('Взрыв завершен на глубине {0}', depth + 1);
                break;
            }
            
            this.output.info('Проход {0}: {1} объектов', depth + 1, result.length);
        }
        
        return result;
    }
    
    private explodeBlock(insert: DwgInsertEntity): DwgEntity[] {
        if (!this.db || !insert.name) return [insert];
        
        const blockRecord = this.db.tables.BLOCK_RECORD?.entries?.find(
            b => b.name === insert.name
        );
        
        if (!blockRecord || !blockRecord.entities || blockRecord.entities.length === 0) {
            return [];
        }
        
        const pos = insert.insertionPoint || { x: 0, y: 0, z: 0 };
        const basePoint = blockRecord.basePoint || { x: 0, y: 0, z: 0 };
        const scaleX = insert.xScale || 1;
        const scaleY = insert.yScale || 1;
        const scaleZ = insert.zScale || 1;
        const rotation = (insert.rotation || 0) * Math.PI / 180;
        const cosR = Math.cos(rotation);
        const sinR = Math.sin(rotation);
        
        const result: DwgEntity[] = [];
        
        for (const blockEntity of blockRecord.entities) {
            const transformed = this.transformEntityData(
                blockEntity, pos, basePoint, 
                scaleX, scaleY, scaleZ, cosR, sinR,
                insert.rotation || 0
            );
            if (transformed) {
                // Сохраняем слой от insert если у entity нет своего
                if (!transformed.layer && insert.layer) {
                    (transformed as any).layer = insert.layer;
                }
                result.push(transformed);
            }
        }
        
        return result;
    }
    
    private explodeTable(table: DwgTableEntity): DwgEntity[] {
        // Если у таблицы есть вложенные entities - взрываем их
        const tableAny = table as any;
        if (tableAny.entities && Array.isArray(tableAny.entities)) {
            this.output.info('TABLE: взрываем {0} вложенных объектов', tableAny.entities.length);
            return tableAny.entities;
        }
        // Иначе возвращаем саму таблицу для обычной обработки
        return [table];
    }
    
    private transformEntityData(
        entity: DwgEntity,
        insertPos: { x: number; y: number; z: number },
        basePoint: { x: number; y: number; z: number },
        scaleX: number, scaleY: number, scaleZ: number,
        cosR: number, sinR: number,
        rotationDeg: number
    ): DwgEntity | null {
        const transform = (x: number, y: number, z: number): { x: number; y: number; z: number } => {
            const dx = (x - basePoint.x) * scaleX;
            const dy = (y - basePoint.y) * scaleY;
            const dz = (z - basePoint.z) * scaleZ;
            return {
                x: insertPos.x + dx * cosR - dy * sinR,
                y: insertPos.y + dx * sinR + dy * cosR,
                z: insertPos.z + dz
            };
        };
        
        // Клонируем с обработкой BigInt
        const clone = JSON.parse(JSON.stringify(entity, (key, value) => 
            typeof value === 'bigint' ? Number(value) : value
        )) as any;
        
        // Для INSERT - трансформируем позицию и накапливаем масштаб/поворот
        if (entity.type === 'INSERT') {
            const nestedPos = clone.insertionPoint || { x: 0, y: 0, z: 0 };
            clone.insertionPoint = transform(nestedPos.x, nestedPos.y, nestedPos.z || 0);
            clone.xScale = (clone.xScale || 1) * scaleX;
            clone.yScale = (clone.yScale || 1) * scaleY;
            clone.zScale = (clone.zScale || 1) * scaleZ;
            clone.rotation = (clone.rotation || 0) + rotationDeg;
            return clone;
        }
        
        // Для остальных типов - обычная трансформация
        switch (entity.type) {
            case 'LINE':
                clone.startPoint = transform(clone.startPoint.x, clone.startPoint.y, clone.startPoint.z || 0);
                clone.endPoint = transform(clone.endPoint.x, clone.endPoint.y, clone.endPoint.z || 0);
                return clone;
            case 'CIRCLE':
                clone.center = transform(clone.center.x, clone.center.y, clone.center.z || 0);
                clone.radius *= Math.abs(scaleX);
                return clone;
            case 'ARC':
                clone.center = transform(clone.center.x, clone.center.y, clone.center.z || 0);
                clone.radius *= Math.abs(scaleX);
                return clone;
            case 'TEXT':
            case 'MTEXT': {
                const pt = clone.insertionPoint || clone.position || { x: 0, y: 0, z: 0 };
                const p = transform(pt.x, pt.y, pt.z || 0);
                clone.insertionPoint = p;
                clone.position = p;
                if (clone.height) clone.height *= Math.abs(scaleY);
                if (clone.textHeight) clone.textHeight *= Math.abs(scaleY);
                return clone;
            }
            case 'LWPOLYLINE':
                if (clone.points) {
                    clone.points = clone.points.map((pt: any) => {
                        const t = transform(pt.x, pt.y, 0);
                        return { ...pt, x: t.x, y: t.y };
                    });
                }
                if (clone.vertices) {
                    clone.vertices = clone.vertices.map((v: any) => {
                        const t = transform(v.x || v.point?.x || 0, v.y || v.point?.y || 0, 0);
                        return { ...v, x: t.x, y: t.y, point: t };
                    });
                }
                return clone;
            case 'POLYLINE2D':
            case 'POLYLINE3D':
                if (clone.vertices) {
                    clone.vertices = clone.vertices.map((v: any) => {
                        const vx = v.point?.x ?? v.x ?? 0;
                        const vy = v.point?.y ?? v.y ?? 0;
                        const vz = v.point?.z ?? v.z ?? 0;
                        const t = transform(vx, vy, vz);
                        return { ...v, point: t, x: t.x, y: t.y, z: t.z };
                    });
                }
                return clone;
            case 'SPLINE':
                if (clone.controlPoints) {
                    clone.controlPoints = clone.controlPoints.map((p: any) => transform(p.x, p.y, p.z || 0));
                }
                if (clone.fitPoints) {
                    clone.fitPoints = clone.fitPoints.map((p: any) => transform(p.x, p.y, p.z || 0));
                }
                return clone;
            case 'ATTRIB':
            case 'ATTDEF': {
                // Атрибуты блоков - текстовые поля
                const pt = clone.insertionPoint || clone.position || { x: 0, y: 0, z: 0 };
                const p = transform(pt.x, pt.y, pt.z || 0);
                clone.insertionPoint = p;
                clone.position = p;
                if (clone.height) clone.height *= Math.abs(scaleY);
                // Конвертируем в TEXT для отображения
                clone.type = 'TEXT';
                return clone;
            }
            default:
                return clone;
        }
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

}

type ImportMode = 'all' | 'tables' | 'geometry';

class DwgImporter implements WorkspaceImporter {
    constructor(
        private readonly output: OutputChannel,
        private readonly context: Context
    ) {}

    async import(workspace: Workspace, model: unknown): Promise<void> {
        const buffer = await workspace.root.get();
        const drawing = model as Drawing;
        
        // Показываем диалог выбора что импортировать
        const importMode = await this.context.showQuickPick([
            { label: 'Все объекты', description: 'Геометрия + таблицы + блоки', value: 'all' as ImportMode },
            { label: 'Только геометрия', description: 'Линии, полилинии, круги, дуги, текст', value: 'geometry' as ImportMode },
            { label: 'Только таблицы', description: 'Импортировать только таблицы (ACAD_TABLE)', value: 'tables' as ImportMode }
        ], {
            title: 'Импорт DWG - Выбор объектов',
            placeHolder: 'Что импортировать из DWG файла?'
        });

        if (!importMode) {
            this.output.info('Import cancelled');
            return;
        }

        // Показываем диалог выбора режима Z-координат
        const zMode = await this.context.showQuickPick([
            { label: 'Исходные координаты', description: 'Сохранить Z из DWG файла', value: 'original' },
            { label: 'Установить отметку 0', description: 'Все объекты на Z=0', value: 'zero' },
            { label: 'Указать отметку...', description: 'Ввести своё значение Z', value: 'custom' }
        ], {
            title: 'Импорт DWG - Отметка Z',
            placeHolder: 'Выберите режим обработки Z-координат'
        });

        if (!zMode) {
            this.output.info('Import cancelled');
            return;
        }

        let flattenZ = false;
        let targetZ = 0;

        if (zMode.value === 'zero') {
            flattenZ = true;
            targetZ = 0;
        } else if (zMode.value === 'custom') {
            const zInput = await this.context.showInputBox({
                title: 'Отметка Z',
                prompt: 'Введите значение Z для всех объектов',
                value: '0',
                validateInput: (v) => {
                    const num = parseFloat(v);
                    if (isNaN(num)) return 'Введите число';
                    return undefined;
                }
            });
            if (zInput === undefined) {
                this.output.info('Import cancelled');
                return;
            }
            flattenZ = true;
            targetZ = parseFloat(zInput);
        }
        
        this.output.info('DWG import started (mode: {0}, Z: {1}, target: {2})', importMode.value, zMode.value, targetZ);
        
        try {
            this.output.info('Loading WASM module...');
            const { Dwg_File_Type, LibreDwg } = await import('@mlightcad/libredwg-web');
            const libredwg = await LibreDwg.create();
            
            this.output.info('Reading DWG file...');
            const dwgData = libredwg.dwg_read_data(buffer.buffer, Dwg_File_Type.DWG);
            
            if (!dwgData) {
                throw new Error('Failed to read DWG file');
            }
            
            this.output.info('Converting DWG data...');
            const db = libredwg.convert(dwgData);
            
            // Статистика по типам объектов
            const stats: Record<string, number> = {};
            for (const entity of db.entities) {
                stats[entity.type] = (stats[entity.type] || 0) + 1;
            }
            this.output.info('Найдено объектов: {0}', db.entities.length);
            for (const type in stats) {
                this.output.info('  - {0}: {1}', type, stats[type]);
            }
            
            const { default: DwgLoader } = await import('./loader');
            const loader = new DwgLoader(drawing, this.output);
            loader.setFlattenZ(flattenZ, targetZ);
            loader.setImportMode(importMode.value as ImportMode);
            await loader.load(db);
            
            libredwg.dwg_free(dwgData);
            
            this.output.info('DWG loaded successfully!');
        } catch (e) {
            this.output.error(e as Error);
            throw e;
        }
    }
}

export default {
    dwg: (e: Context) => {
        return new DwgImporter(e.createOutputChannel('dwg'), e);
    }
}

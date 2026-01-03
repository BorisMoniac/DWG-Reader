class DwgImporter implements WorkspaceImporter {
    constructor(
        private readonly output: OutputChannel,
        private readonly context: Context
    ) {}

    async import(workspace: Workspace, model: unknown): Promise<void> {
        const buffer = await workspace.root.get();
        const drawing = model as Drawing;
        
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
        
        const fileSizeMB = (buffer.byteLength / (1024 * 1024)).toFixed(2);
        this.output.info('DWG import started (Z: {0}, target: {1}, size: {2} MB)', zMode.value, targetZ, fileSizeMB);
        
        if (buffer.byteLength > 50 * 1024 * 1024) {
            this.output.warn('Внимание: файл больше 50 МБ, возможны проблемы с памятью');
        }
        
        try {
            this.output.info('Loading WASM module...');
            const { Dwg_File_Type, LibreDwg } = await import('@mlightcad/libredwg-web');
            const libredwg = await LibreDwg.create();
            
            this.output.info('Reading DWG file ({0} MB)...', fileSizeMB);
            const dwgData = libredwg.dwg_read_data(buffer.buffer, Dwg_File_Type.DWG);
            
            if (!dwgData) {
                this.output.error('Не удалось прочитать DWG файл. Возможные причины:');
                this.output.error('  - Неподдерживаемая версия AutoCAD (2018+)');
                this.output.error('  - Поврежденный файл');
                this.output.error('  - Попробуйте пересохранить в AutoCAD как DWG 2013 или ниже');
                throw new Error('Failed to read DWG file - unsupported version or corrupted');
            }
            
            this.output.info('Converting DWG data...');
            let db;
            try {
                db = libredwg.convert(dwgData);
            } catch (convertError) {
                this.output.error('Ошибка при конвертации DWG данных');
                this.output.error('Возможные причины:');
                this.output.error('  - Файл слишком большой для обработки в браузере');
                this.output.error('  - Файл содержит сложные объекты (прокси, OLE)');
                this.output.error('  - Попробуйте упростить файл в AutoCAD (PURGE, AUDIT)');
                this.output.error('  - Пересохраните как DWG 2010 или ниже');
                libredwg.dwg_free(dwgData);
                throw convertError;
            }
            
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
            await loader.load(db);
            
            libredwg.dwg_free(dwgData);
            
            this.output.info('DWG loaded successfully!');
        } catch (e) {
            const err = e as Error;
            if (err.message?.includes('memory access out of bounds')) {
                this.output.error('Ошибка памяти WASM: файл слишком сложный для обработки');
                this.output.error('Рекомендации:');
                this.output.error('  1. Откройте файл в AutoCAD');
                this.output.error('  2. Выполните команды: PURGE, AUDIT, OVERKILL');
                this.output.error('  3. Удалите ненужные слои и объекты');
                this.output.error('  4. Сохраните как DWG 2010 или ниже');
                this.output.error('  5. Попробуйте загрузить снова');
            } else {
                this.output.error(err);
            }
            throw e;
        }
    }
}

export default {
    dwg: (e: Context) => {
        return new DwgImporter(e.createOutputChannel('dwg'), e);
    }
}

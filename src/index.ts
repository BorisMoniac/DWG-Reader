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
            title: 'Импорт DWG',
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
        // original: flattenZ = false (по умолчанию)
        
        this.output.info('DWG import started (Z mode: {0}, target: {1})', zMode.value, targetZ);
        
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
            
            this.output.info('Processing {0} entities...', db.entities.length);
            const { default: DwgLoader } = await import('./loader');
            const loader = new DwgLoader(drawing, this.output);
            loader.setFlattenZ(flattenZ, targetZ);
            await loader.load(db);
            
            libredwg.dwg_free(dwgData);
            
            this.output.info('DWG loaded successfully. Entities: {0}', db.entities.length);
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

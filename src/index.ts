import { Dwg_File_Type, LibreDwg, DwgDatabase } from '@mlightcad/libredwg-web';
import DwgLoader from "./loader";

class DwgImporter implements WorkspaceImporter {
    constructor(private readonly context: Context) {}

    async import(workspace: Workspace, model: unknown): Promise<void> {
        const progress = this.context.beginProgress();
        const output = this.context.createOutputChannel('DWG');
        
        try {
            const filename = workspace.origin ?? workspace.root.title;
            output.info('Импорт DWG из {0}', filename);
            progress.indeterminate = true;
            progress.details = 'Чтение файла';
            
            const drawing = model as Drawing;
            const layout = drawing.layouts?.model;
            if (layout === undefined) {
                output.error('Model space not found');
                return;
            }
            
            const buffer = await workspace.root.get();
            
            progress.details = 'Загрузка WASM модуля';
            output.info('Loading WASM module...');
            const libredwg = await LibreDwg.create('./');
            
            progress.details = 'Чтение DWG файла';
            output.info('Reading DWG file...');
            const dwgData = libredwg.dwg_read_data(buffer.buffer, Dwg_File_Type.DWG);
            
            if (!dwgData) {
                throw new Error('Failed to read DWG file');
            }
            
            progress.details = 'Конвертация данных';
            output.info('Converting DWG data...');
            const db: DwgDatabase = libredwg.convert(dwgData);
            
            progress.details = 'Обработка объектов';
            output.info('Processing {0} entities...', db.entities.length);
            
            const loader = new DwgLoader(drawing, output);
            await loader.load(db, progress);
            
            libredwg.dwg_free(dwgData);
            
            output.info('DWG файл успешно загружен. Объектов: {0}', db.entities.length);
        } catch (e) {
            output.error(e as Error);
            throw e;
        } finally {
            this.context.endProgress(progress);
        }
    }
}

export default {
    dwg: (ctx: Context) => {
        return new DwgImporter(ctx);
    }
}

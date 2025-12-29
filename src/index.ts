class DwgImporter implements WorkspaceImporter {
    constructor(private readonly output: OutputChannel) {}

    async import(workspace: Workspace, model: unknown): Promise<void> {
        const buffer = await workspace.root.get();
        const drawing = model as Drawing;
        
        this.output.info('DWG import started');
        
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
        return new DwgImporter(e.createOutputChannel('dwg'));
    }
}

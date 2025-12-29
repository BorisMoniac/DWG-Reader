import DwgLoader from "./loader";
import { DwgBaseReader } from "./reader";

class DwgImporter implements WorkspaceImporter {
    constructor(private readonly output: OutputChannel) {

    }

    async import(workspace: Workspace, model: unknown): Promise<void> {
        const buffer = await workspace.root.get();
        const reader = new DwgBaseReader(buffer, model as Drawing, this.output);
        const loader = new DwgLoader();
        try {
            await loader.readDwgFile(reader);
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

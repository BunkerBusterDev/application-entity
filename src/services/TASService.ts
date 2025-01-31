import Net from 'net';
import TASHandler from 'handlers/TASHandler';
import Logger from 'utils/logger';

class TASService {
    private server: Net.Server;
    private tasHandler: TASHandler;

    constructor() {
        this.tasHandler = new TASHandler();
        this.server = Net.createServer((socket: Net.Socket) => this.tasHandler.handleConnection(socket));
    }

    public async start(tasPort: number): Promise<void> {
        return new Promise((resolve) => {
            this.server.listen(tasPort, () => {
                Logger.info(`[TASService-start]: TCP Server for TAS is listening on port ${tasPort}`);
                resolve();
            });
        });
    }
}

export default TASService;

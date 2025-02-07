import Net from 'net';
import TASHandler from 'handlers/TASHandler';
import Logger from 'utils/Logger';

class TASService {
    private server: Net.Server;
    private tasHandler: TASHandler;

    constructor(private createCIN: Function) {
        this.tasHandler = new TASHandler();
        this.server = Net.createServer((socket: Net.Socket) => this.setupSocket(socket));
    }

    private setupSocket(socket: Net.Socket) {
        Logger.info('[TASService-setupSocket]: TasConnecotr is set up');
        socket.on('data', (data) => this.tasHandler.handleData(this.createCIN, socket, data));
        socket.on('end', () => {    
            Logger.info('[TASHandler-handleEnd]: TAS socket end');
            socket.destroy();
        });
        socket.on('close', () => {
            Logger.info('[TASHandler-handleClose]: TAS socket closed');
        });
        socket.on('error', (error) => {
            Logger.error(`[TASHandler-handleError]: problem with TCP server: ${error.message}`);
            socket.destroy();
        });
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

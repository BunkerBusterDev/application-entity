import Net from 'net';
import Logger from 'lib/logger';

class TASConnector {
    private server: Net.Server;
    private tasBuffer: Record<string, string> = {};

    constructor() {
        this.server = Net.createServer((socket: Net.Socket): void => {
            Logger.info('[TASConnector-initialize]: TAS connected');
            socket.on('data', (data) => {
                this.tasHandler(socket, data);
            });

            socket.on('end', () => {
                Logger.info('[TASConnector-initialize]: TAS socket end');
                socket.destroy();
            });

            socket.on('close', () => {
                Logger.info('[TASConnector-initialize]: TAS socket closed');
            });

            socket.on('error', (error) => {
                Logger.error(`[TASConnector-initialize]: problem with tcp server: ${error.message}`);
                socket.destroy();
            });
        });
    }

    private async tasHandler(socket: Net.Socket, data: Buffer): Promise<void> {
        const socketId: string = await this.createSocketId();
        this.tasBuffer[socketId] = '';

        Logger.info(`[TASHandler]: Handling data for socket ${socketId} ${socket}`);
        this.tasBuffer[socketId] += data.toString();
    }

    private async createSocketId(): Promise<string> {
        const { nanoid } = await import('nanoid');
        const id: string = nanoid();
        return id;
    }

    public async start( tasPort: number ): Promise<void> {
        return new Promise((resolve) => {
            this.server.listen(tasPort, () => {
                Logger.info(`[TASConnector-start]: Listening to port ${tasPort}`);
                resolve();
            });
            resolve();
        });
    }
}

export default TASConnector;
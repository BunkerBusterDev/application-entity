import Net from 'net';
import Logger from 'lib/logger';

class TASConnector {
    private server: Net.Server;
    private socketBuffer: Record<string, Net.Socket>;
    private tasBuffer: Record<string, string>;

    constructor() {
        this.server = Net.createServer((socket: Net.Socket): void => {
            Logger.info('[TASConnector-constructor]: TAS connected');
            socket.on('data', (data) => {
                this.tasHandler(socket, data);
            });

            socket.on('end', () => {
                Logger.info('[TASConnector-constructor]: TAS socket end');
                socket.destroy();
            });

            socket.on('close', () => {
                Logger.info('[TASConnector-constructor]: TAS socket closed');
            });

            socket.on('error', (error) => {
                Logger.error(`[TASConnector-constructor]: problem with tcp server: ${error.message}`);
                socket.destroy();
            });
        });
        this.socketBuffer = {};
        this.tasBuffer = {};
    }

    private async tasHandler(socket: Net.Socket, data: Buffer): Promise<void> {
        const socketId: string = await this.createSocketId();
        this.tasBuffer[socketId] = '';
        this.tasBuffer[socketId] += data.toString();
        const dataArray = this.tasBuffer[socketId].split('<EOF>');
        if(dataArray.length >= 2) {
            for (let i = 0; i < dataArray.length-1; i++) {
                const line = dataArray[i];
                this.tasBuffer[socketId] = this.tasBuffer[socketId].replace(line+'<EOF>', '');
                const jsonObj = JSON.parse(line);
                const containerName = jsonObj.containerName;
                const content = jsonObj.content;

                this.socketBuffer[containerName] = socket;
                Logger.info(`[TASConnector-tasHandler]: ----> Got data for [${containerName}] from tas <----`);

                if (content === 'hello') {
                    socket.write(line + '<EOF>');
                }
            }
        }
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
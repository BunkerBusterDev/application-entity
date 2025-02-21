import Net from 'net';
import Logger from 'utils/Logger';
import { nanoid } from 'nanoid';
import { applicationEntity, containerArray } from 'Conf';

class TASHandler {
    private server: Net.Server;
    private socketBuffer: Record<string, Net.Socket> = {};
    private tasBuffer: Record<string, string> = {};

    constructor(private createCIN: Function) {
        this.server = Net.createServer((socket: Net.Socket) => this.setupSocket(socket));
    }

    private setupSocket(socket: Net.Socket) {
        Logger.info('[TASService-setupSocket]: TasConnecotr is set up');
        socket.on('data', (data) => this.handleData(socket, data));
        socket.on('end', () => {    
            Logger.info('[TASHandler-setupSocket]: TAS socket is ended');
            socket.destroy();
        });
        socket.on('close', () => {
            Logger.info('[TASHandler-setupSocket]: TAS socket is closed');
        });
        socket.on('error', (error) => {
            Logger.error(`[TASHandler-setupSocket]: problem with TCP server: ${error.message}`);
            socket.destroy();
        });
    }

    private handleData(socket: Net.Socket, data: Buffer): void {
        const socketId = nanoid();
        if (!this.tasBuffer[socketId]) this.tasBuffer[socketId] = '';

        this.tasBuffer[socketId] += data.toString();
        const dataArray = this.tasBuffer[socketId].split('<EOF>');

        if (dataArray.length >= 2) {
            for (let i = 0; i < dataArray.length - 1; i++) {
                const lineData = dataArray[i];
                this.tasBuffer[socketId] = this.tasBuffer[socketId].replace(lineData + '<EOF>', '');

                try {
                    const jsonObject = JSON.parse(lineData);
                    const containerName = jsonObject.name;
                    const content = jsonObject.content;

                    this.socketBuffer[containerName] = socket;
                    Logger.info(`[TASHandler-handleData]: Got data for [${containerName}] from TAS`);

                    if (content === 'hello') {
                        socket.write(`${lineData}<EOF>`);
                    }
                    else {
                        if (applicationEntity.state === 'createtContentInstance') {
                            for (let j = 0; j < containerArray.length; j++) {
                                if (containerArray[j].name === containerName) {
                                    const parent = containerArray[j].parent + '/' + containerArray[j].name;
                                    this.createCIN(parent, content, socket);
                                    break;
                                }
                            }
                        }
                    }
                } catch (error) {
                    Logger.error(`[TASHandler-handleData]: Failed to parse data: ${lineData}`);
                }
            }
        }
    }

    public async startTASConnector(): Promise<void> {
        return new Promise((resolve) => {
            this.server.listen(applicationEntity.tasPort, () => {
                resolve();
            });
        });
    }
}

export default TASHandler;
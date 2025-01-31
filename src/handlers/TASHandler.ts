import Net from 'net';
import Logger from 'utils/Logger';
import { nanoid } from 'nanoid';

class TASHandler {
    private socketBuffer: Record<string, Net.Socket> = {};
    private tasBuffer: Record<string, string> = {};

    public async handleConnection(socket: Net.Socket): Promise<void> {
        Logger.info('[TASHandler-handleConnection]: TAS connected');

        socket.on('data', (data) => this.handleData(socket, data));
        socket.on('end', () => this.handleEnd(socket));
        socket.on('close', () => this.handleClose());
        socket.on('error', (error) => this.handleError(socket, error));
    }

    private async handleData(socket: Net.Socket, data: Buffer): Promise<void> {
        const socketId = await this.createSocketId();
        if (!this.tasBuffer[socketId]) this.tasBuffer[socketId] = '';

        this.tasBuffer[socketId] += data.toString();
        const dataArray = this.tasBuffer[socketId].split('<EOF>');

        if (dataArray.length >= 2) {
            for (let i = 0; i < dataArray.length - 1; i++) {
                const lineData = dataArray[i];
                this.tasBuffer[socketId] = this.tasBuffer[socketId].replace(lineData + '<EOF>', '');

                try {
                    const jsonObj = JSON.parse(lineData);
                    const name = jsonObj.name;
                    const content = jsonObj.content;

                    this.socketBuffer[name] = socket;
                    Logger.info(`[TASHandler-handleData]: Got data for [${name}] from TAS`);

                    if (content === 'hello') {
                        socket.write(lineData + '<EOF>');
                    }
                } catch (error) {
                    Logger.error(`[TASHandler-handleData]: Failed to parse data: ${lineData}`);
                }
            }
        }
    }

    private handleEnd(socket: Net.Socket): void {
        Logger.info('[TASHandler-handleEnd]: TAS socket end');
        socket.destroy();
    }

    private handleClose(): void {
        Logger.info('[TASHandler-handleClose]: TAS socket closed');
    }

    private handleError(socket: Net.Socket, error: Error): void {
        Logger.error(`[TASHandler-handleError]: problem with TCP server: ${error.message}`);
        socket.destroy();
    }

    private async createSocketId(): Promise<string> {
        return nanoid();
    }
}

export default TASHandler;
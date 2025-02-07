import Net from 'net';
import { nanoid } from 'nanoid';
import Config from 'Conf';
import Logger from 'utils/Logger';

class TASHandler {
    private socketBuffer: Record<string, Net.Socket> = {};
    private tasBuffer: Record<string, string> = {};

    public async handleData(createCIN: Function, socket: Net.Socket, data: Buffer): Promise<void> {
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
                    const containerContent = jsonObject.content;

                    this.socketBuffer[containerName] = socket;
                    Logger.info(`[TASHandler-handleData]: Got data for [${containerName}] from TAS`);

                    if (containerContent === 'hello') {
                        socket.write(`${lineData}<EOF>`);
                    }
                    else {
                        if (Config.applicationEntity.state === 'createtContentInstance') {
                            for (var j = 0; j < Config.containerArray.length; j++) {
                                if (Config.containerArray[j].name === containerName) {
                                    //console.log(line);
                                    // const parent = Config.containerArray[j].parent + '/' + Config.containerArray[j].name;
                                    await createCIN();
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
}

export default TASHandler;
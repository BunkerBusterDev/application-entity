import Net from 'net';
import Logger from 'utils/Logger';
import IAEHandler from 'handlers/IAEHandler';

class CINService {
    constructor(private handler: IAEHandler, private restart: Function) {}

    public async createCIN(parent: string, content: string, socket: Net.Socket): Promise<void> {
        Logger.info('[CINService-createCIN]: Running business logic for creating CIN...');
        this.handler.createCIN(parent, content, socket, (responseStatusCode: number, primitiveContent: any, to: string, socket: Net.Socket) => {
            try {
                var to_arr = to.split('/');
                var name = to_arr[to_arr.length - 1];
                var result = {
                    name: name,
                    content: responseStatusCode
                };

               Logger.info(`[CINService-createCIN]: x-m2m-rsc ${responseStatusCode} ${JSON.stringify(primitiveContent)}`);
                if (responseStatusCode == 5106 || responseStatusCode == 2001 || responseStatusCode == 4105) {
                    socket.write(JSON.stringify(result) + '<EOF>');
                }
                else if (responseStatusCode == 5000) {
                    socket.write(JSON.stringify(result) + '<EOF>');
                    this.restart('createAE');
                }
                else if (responseStatusCode == 9999) {
                    socket.write(JSON.stringify(result) + '<EOF>');
                }
                else {
                    socket.write(JSON.stringify(result) + '<EOF>');
                }
            }
            catch (error) {
                Logger.error(`[CINService-createCIN]: ${error}`);
            }
        });
        Logger.info('[CINService-createCIN]: CIN created successfully');
    }
}

export default CINService;
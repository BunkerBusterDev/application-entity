import Delay from 'utils/Delay';
import Logger from 'utils/Logger';
import { containerArray } from 'Conf';
import IAEHandler from 'handlers/IAEHandler';

class CNTService {
    constructor(private handler: IAEHandler) {}

    async createCNT(): Promise<string> {
        return new Promise(async (resolve, reject) => {
            Logger.info('[CNTService-createCNT]: Running business logic for creating CNT...');

            let count = 0;

            while(count < containerArray.length) {
                const parent = containerArray[count].parent;
                const name = containerArray[count].name;

                const responseStatusCode: number = await new Promise<number>((resolve) => {
                    this.handler.createCNT(parent, name, (responseStatusCode: number) => {
                        resolve(responseStatusCode);
                    })
                });
                
                if(responseStatusCode === 5106 || responseStatusCode === 2001 || responseStatusCode === 4105) {
                    count++;
                } else {
                    Logger.error(`[CNTService-createCNT]: ${responseStatusCode}`)
                    reject(`createCNT`);
                }
                await Delay(500);
            }
            Logger.info('[CNTService-createCNT]: CNT created successfully');
            resolve('deleteSUB');
        });
    }
}

export default CNTService;
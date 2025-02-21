import Delay from 'utils/Delay';
import Logger from 'utils/Logger';
import { subscriptionArray } from 'Conf';
import IAEHandler from 'handlers/IAEHandler';

class SUBService {
    constructor(private handler: IAEHandler) {}

    async deleteSUB(): Promise<string> {
        return new Promise(async (resolve, reject) => {
            Logger.info('[SUBService-deleteSUB]: Running business logic for deleting SUB...');

            let count = 0;

            while(count < subscriptionArray.length) {
                const parent = subscriptionArray[count].parent;
                const name = subscriptionArray[count].name;

                const responseStatusCode: number = await new Promise<number>((resolve) => {
                    this.handler.deleteSUB(parent, name, (responseStatusCode: number) => {
                        resolve(responseStatusCode);
                    })
                });
                
                if(responseStatusCode === 5106 || responseStatusCode === 2002 || responseStatusCode === 2000 || responseStatusCode === 4105 || responseStatusCode === 4004) {
                    count++;
                } else {
                    Logger.error(`[SUBService-deleteSUB]: ${responseStatusCode}`)
                    reject('deleteSUB');
                }
                await Delay(500);
            }
            Logger.info('[SUBService-deleteSUB]: SUB deleted successfully');
            resolve('createSUB');
        });
    }

    async createSUB(): Promise<string> {
        return new Promise(async (resolve, reject) => {
            Logger.info('[SUBService-createSUB]: Running business logic for creating SUB...');

            let count = 0;

            while(count < subscriptionArray.length) {
                const parent = subscriptionArray[count].parent;
                const name = subscriptionArray[count].name;
                const nu = subscriptionArray[count].nu;

                const responseStatusCode: number = await new Promise<number>((resolve) => {
                    this.handler.createSUB(parent, name, nu, (responseStatusCode: number) => {
                        resolve(responseStatusCode);
                    })
                });
                
                if(responseStatusCode === 5106 || responseStatusCode === 2001 || responseStatusCode === 4105) {
                    count++;
                } else {
                    Logger.error(`[SUBService-createSUB]: ${responseStatusCode}`)
                    reject('createSUB');
                }
                await Delay(500);
            }
            Logger.info('[SUBService-createSUB]: SUB created successfully');
            resolve('startTASConnector');
        });
    }
}

export default SUBService;
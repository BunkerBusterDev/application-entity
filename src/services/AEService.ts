import Logger from 'utils/Logger';
import { applicationEntity } from 'Conf';
import IAEHandler from 'handlers/IAEHandler';

class AEService {
    constructor(private handler: IAEHandler) {}

    createAE(): Promise<string> {
        return new Promise((resolve, reject) => {
            Logger.info('[AEService-createAE]: Running business logic for creating AE...');
            this.handler.createAE((responseStatusCode: number, primitiveContent: any) => {
                if(responseStatusCode === 2001) {
                    this.handler.aeResponseAction(responseStatusCode, primitiveContent);
                    Logger.info('[AEService-createAE]: AE created successfully');
                    resolve('createCNT');
                }
                else if(responseStatusCode === 5106 || responseStatusCode === 4105) {
                    Logger.info(`[AEService-createAE]: x-m2m-rsc : ${responseStatusCode} <----`);
                    resolve('retrieveAE');
                } else {
                    Logger.error(`[AEService-createAE]: x-m2m-rsc : ${responseStatusCode} <----`);
                    reject('createAE');
                }
            });
        });
    }

    async retrieveAE(): Promise<string> {
        return new Promise((resolve, reject) => {
            Logger.info('[AEService-retrieveAE]: Running business logic for retrieving AE...');
            
            this.handler.retrieveAE((responseStatusCode: number, primitiveContent: any) => {
                if (responseStatusCode === 2000) {
                    const applicationEntityID = primitiveContent['m2m:ae']['aei'];
                    Logger.info(`[AEService-retrieveAE]: x-m2m-rsc : ${responseStatusCode} - ${applicationEntityID} <----`);

                    if(applicationEntity.id !== applicationEntityID && applicationEntity.id !== ('/'+applicationEntityID)) {
                        Logger.error(`[AEService-retrieveAE]: AE-ID created is ${applicationEntityID} not equal to device AE-ID is ${applicationEntity.id}`);
                        reject('retrieveAE');
                    }
                    else {
                        Logger.info('[AEService-retrieveAE]: AE retrieved successfully');
                        resolve('createCNT');
                    }
                }
                else {
                    Logger.error(`[AEService-retrieveAE]: x-m2m-rsc : ${responseStatusCode} <----`);
                    reject('retrieveAE');
                }
            });
        });
    }
}

export default AEService;
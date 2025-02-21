import Logger from 'utils/Logger';
import IAEHandler from 'handlers/IAEHandler';

class CSEService {
    constructor(private handler: IAEHandler) {}

    async startCSEConnector(): Promise<string> {
        try {
            Logger.info('[CSEService-startCSEConnector]: Running business logic for starting CSEConnector...');
            await this.handler.startCSEConnector();
            Logger.info('[CSEService-startCSEConnector]: CSEConnector started successfully');
            return 'createAE';
        } catch (error) {
            return 'startCSEConnector';
        }
    }
}

export default CSEService;
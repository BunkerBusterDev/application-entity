import Logger from 'utils/Logger';
import TASHandler from 'handlers/TASHandler';

class TASService {
    private tasHandler: TASHandler;

    constructor(private createCIN: Function) {
        this.tasHandler = new TASHandler(this.createCIN);
    }

    /**
     * TCP 서버를 실행합니다.
     *
     * @returns Promise<string> (서버가 실행되면 'startUpload' resolve)
     */
    public async startTASConnector(): Promise<string> {
        try {
            Logger.info('[TASService-startTASConnector]: Running business logic for starting TASConnector...');
            await this.tasHandler.startTASConnector();
            Logger.info('[TASService-startTASConnector]: TASConnector started successfully');
            return 'createtContentInstance';
        } catch (error) {
            return 'startTASConnector'
        }
    }
}

export default TASService;

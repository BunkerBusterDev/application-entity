
import TASService from 'services/TASService';
import IAEHandler from 'handlers/IAEHandler';

import AEHandlerFactory from 'handlers/AEHandlerFactory';
import AEService from 'services/AEService';
import CNTService from 'services/CNTService';
import SUBService from 'services/SUBService';
import Logger from "utils/logger";

class App {
    private tasService: TASService
    private handlerAE: IAEHandler;
    private aeService: AEService;
    private cntService: CNTService;
    private subService: SUBService;

    constructor() {
        // SIGINT 처리
        process.on('SIGINT', this.shutdown.bind(this));

        // AE 처리
        this.handlerAE = AEHandlerFactory.createHandler('mqtt');
        this.aeService = new AEService(this.handlerAE);
        this.cntService = new CNTService(this.handlerAE);
        this.subService = new SUBService(this.handlerAE);

        // TAS 처리
        this.tasService = new TASService();
    }

    // 애플리케이션 시작
    public async start(): Promise<void> {
        await this.aeService.createAE();
        await this.aeService.retrieveAE();
        await this.cntService.createCNT();
        await this.subService.deleteSUB();
        await this.subService.createSUB();
        await this.tasService.start(3105);
    }

    // 애플리케이션 종료
    private async shutdown(): Promise<void> {
        Logger.info('[App-shutdown]: Received SIGINT. Shutting down gracefully...');
        process.exit(0);
    }
}

const app = new App();
app.start();
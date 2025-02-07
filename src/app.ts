import Logger from "utils/Logger";
import WatchdogTimer from 'utils/WatchdogTimer';

import TASService from 'services/TASService';
import IAEHandler from 'handlers/IAEHandler';

import AEHandlerFactory from 'handlers/AEHandlerFactory';
import AEService from 'services/AEService';
import CNTService from 'services/CNTService';
import SUBService from 'services/SUBService';
import CINService from "services/CINService";

class App {
    private tasService: TASService
    private handlerAE: IAEHandler;
    private aeService: AEService;
    private cntService: CNTService;
    private subService: SUBService;
    private cinService: CINService;

    constructor() {
        // SIGINT 처리
        process.on('SIGINT', this.shutdown.bind(this));

        WatchdogTimer.startWatchdog();

        // AE 처리
        this.handlerAE = AEHandlerFactory.createHandler();
        this.aeService = new AEService(this.handlerAE);
        this.cntService = new CNTService(this.handlerAE);
        this.subService = new SUBService(this.handlerAE);
        this.cinService = new CINService(this.handlerAE);

        // TAS 처리
        this.tasService = new TASService(this.cinService.createCIN.bind(this.cinService));
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
        WatchdogTimer.stopWatchdog();
        process.exit(0);
    }
}

const app = new App();
app.start();
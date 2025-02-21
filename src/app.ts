import Delay from 'utils/Delay';
import Logger from 'utils/Logger';
import { applicationEntity } from 'Conf';
import { startWatchdog, stopWatchdog, deleteAllWatchdogTimer } from 'utils/WatchdogTimer';

import TASService from 'services/TASService';
import IAEHandler from 'handlers/IAEHandler';

import AEHandlerFactory from 'handlers/AEHandlerFactory';
import AEService from 'services/AEService';
import CNTService from 'services/CNTService';
import SUBService from 'services/SUBService';
import CINService from "services/CINService";
import CSEService from 'services/CSEService';

class App {
    private tasService: TASService
    private handlerAE: IAEHandler;
    private cseService: CSEService;
    private aeService: AEService;
    private cntService: CNTService;
    private subService: SUBService;
    private cinService: CINService;
    
    private maxRetries: number;
    private retryCount: number;
    private delayTime: number;

    constructor() {
        startWatchdog();
        
        // SIGINT 처리
        process.on('SIGINT', this.shutdown.bind(this));

        // AE 처리
        this.handlerAE = AEHandlerFactory.createHandler();
        this.cseService = new CSEService(this.handlerAE);
        this.aeService = new AEService(this.handlerAE);
        this.cntService = new CNTService(this.handlerAE);
        this.subService = new SUBService(this.handlerAE);
        this.cinService = new CINService(this.handlerAE, this.restart);

        // TAS 처리
        this.tasService = new TASService(this.cinService.createCIN.bind(this.cinService));

        this.maxRetries = 5;
        this.retryCount = 0;
        this.delayTime = 1000;
    }

    // 애플리케이션 종료
    private async shutdown(): Promise<void> {
        Logger.info('[App-shutdown]: Received SIGINT. Shutting down gracefully...');
        deleteAllWatchdogTimer();
        stopWatchdog();
        process.exit(0);
    }

    private async restart(state: string): Promise<void> {
        Logger.info('[App-restart]: Restarting application...');
        applicationEntity.state = state;
        deleteAllWatchdogTimer();


        // 최대 재시도 횟수 초과 시 에러 처리
        this.retryCount++;
        if (this.retryCount > this.maxRetries) {
            Logger.warn(`[App-restart]: Maximum connection attempts (${this.maxRetries}) exceeded. Retrying in 60 seconds...`);
            
            // 1분 후 재시작
            await Delay(60000); // 60초 대기
            this.retryCount = 1;
            this.delayTime = 1000;
        }

        // 현재 지연 시간만큼 대기
        Logger.info(`[App-restart]: Retrying connection (${this.retryCount}/${this.maxRetries}) in ${this.delayTime}ms...`);
        await Delay(this.delayTime);
        
        // 지수 백오프 계산 (최대 지연 시간 제한)
        this.delayTime = Math.min(this.delayTime * 2, 30000); // 최대 지연 시간 30초
        await this.start();
    }

    // 애플리케이션 시작
    public async start(): Promise<void> {
        try {
            if(applicationEntity.state === 'startCSEConnector') {
                applicationEntity.state = await this.cseService.startCSEConnector();
                this.retryCount = 0;
            }
            if(applicationEntity.state === 'createAE') {
                applicationEntity.state = await this.aeService.createAE();
                this.retryCount = 0;
            }
            if(applicationEntity.state === 'retrieveAE') {
                applicationEntity.state = await this.aeService.retrieveAE();
                this.retryCount = 0;
            }
            if(applicationEntity.state === 'createCNT') {
                applicationEntity.state = await this.cntService.createCNT();
                this.retryCount = 0;
            }
            if(applicationEntity.state === 'deleteSUB') {
                applicationEntity.state = await this.subService.deleteSUB();
                this.retryCount = 0;
            }
            if(applicationEntity.state === 'createSUB') {
                applicationEntity.state = await this.subService.createSUB();
                this.retryCount = 0;
            }
            if(applicationEntity.state === 'startTASConnector') {
                applicationEntity.state = await this.tasService.startTASConnector();
                this.retryCount = 0;
            }
            if(applicationEntity.state === 'createtContentInstance') {
                Logger.info('[App-start]: Application Entity is creating contentinstance');
                this.retryCount = 0;
            }
        } catch (error: any) {
            Logger.error(`[App-start]: App start is failed (${error})`);
            this.restart(error);
        }
    }
}

const app = new App();
app.start();
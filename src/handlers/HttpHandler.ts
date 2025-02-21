import IAEHandler from './IAEHandler';

class HttpHandler implements IAEHandler {
    constructor() {
    }

    aeResponseAction() {
        throw new Error('Method not implemented.');
    }

    notificationAction(): void {
        throw new Error('Method not implemented.');
    }

    startCSEConnector(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    setTASNotificationFunction(): void {
        throw new Error('Method not implemented.');
    }

    createAE() {
        throw new Error('Method not implemented.');
    }

    retrieveAE() {
        throw new Error('Method not implemented.');
    }

    createCNT() {
        throw new Error('Method not implemented.');
    }

    deleteSUB() {
        throw new Error('Method not implemented.');
    }
    
    createSUB() {
        throw new Error('Method not implemented.');
    }
    
    createCIN() {
    }
}

export default HttpHandler;
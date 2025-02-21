import IAEHandler from './IAEHandler';

class HttpHandler implements IAEHandler {
    constructor() {
    }

    public aeResponseAction() {
        throw new Error('Method not implemented.');
    }

    startCSEConnector(): Promise<void> {
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
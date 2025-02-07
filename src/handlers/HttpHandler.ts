import IAEHandler from './IAEHandler';

class HttpHandler implements IAEHandler {
    constructor() {
    }

    createAE(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    retrieveAE(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    createCNT(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    deleteSUB(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    
    createSUB(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    
    createCIN(): Promise<void> {
        throw new Error('Method not implemented.');
    }
}

export default HttpHandler;
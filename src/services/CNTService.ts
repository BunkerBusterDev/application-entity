import IAEHandler from 'handlers/IAEHandler';

class CNTService {
    constructor(private handler: IAEHandler) {}

    async createCNT(): Promise<void> {
        console.log('Running business logic for creating CNT...');
        try {
            await this.handler.createCNT();
            console.log('CNT created successfully.');
        } catch (error) {
            console.error('Error while creating CNT:', error);
        }
    }
}

export default CNTService;
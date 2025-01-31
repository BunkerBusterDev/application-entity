import IAEHandler from 'handlers/IAEHandler';

class AEService {
    constructor(private handler: IAEHandler) {}

    async createAE(): Promise<void> {
        console.log('Running business logic for creating AE...');
        try {
            await this.handler.createAE();
            console.log('AE created successfully.');
        } catch (error) {
            console.error('Error while creating AE:', error);
        }
    }

    async retrieveAE(): Promise<void> {
        console.log('Running business logic for retrieving AE...');
        try {
            await this.handler.retrieveAE();
            console.log('AE retrieved successfully.');
        } catch (error) {
            console.error('Error while retrieving AE:', error);
        }
    }
}

export default AEService;
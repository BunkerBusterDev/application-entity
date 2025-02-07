import IAEHandler from 'handlers/IAEHandler';

class CINService {
    constructor(private handler: IAEHandler) {}

    async createCIN(): Promise<void> {
        console.log('Running business logic for creating CIN...');
        try {
            await this.handler.createCIN();
            console.log('CIN created successfully.');
        } catch (error) {
            console.error('Error while creating CIN:', error);
        }
    }
}

export default CINService;
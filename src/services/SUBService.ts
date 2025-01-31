import IAEHandler from 'handlers/IAEHandler';

class SUBService {
    constructor(private handler: IAEHandler) {}

    async deleteSUB(): Promise<void> {
        console.log('Running business logic for deleting SUB...');
        try {
            await this.handler.deleteSUB();
            console.log('SUB deleted successfully.');
        } catch (error) {
            console.error('Error while deleting SUB:', error);
        }
    }

    async createSUB(): Promise<void> {
        console.log('Running business logic for creating SUB...');
        try {
            await this.handler.createSUB();
            console.log('SUB created successfully.');
        } catch (error) {
            console.error('Error while creating SUB:', error);
        }
    }
}

export default SUBService;
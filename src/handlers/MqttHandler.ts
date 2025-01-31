import Mqtt, { MqttClient } from 'mqtt';
import IAEHandler from './IAEHandler';

class MqttHandler implements IAEHandler {
    private client: MqttClient;

    constructor(brokerUrl: string) {
        console.log('Initializing MQTT Handler...');
        this.client = Mqtt.connect(brokerUrl);

        this.client.on('connect', () => {
            console.log('MQTT Client connected to broker:', brokerUrl);
        });

        this.client.on('error', (error: Error) => {
            console.error('MQTT Connection Error:', error);
        });
    }

    async createAE(): Promise<void> {
        const topic: string = 'createAE';
        const message: string = JSON.stringify({ action: 'createAE', data: { name: 'exampleAE' } });

        console.log(`Publishing to topic: ${topic}, message: ${message}`);
    }

    async retrieveAE(): Promise<void> {
        const topic: string = 'retrieveAE';

        console.log(`Subscribing to topic: ${topic}`);
    }

    async createCNT(): Promise<void> {
        const topic: string = 'createCNT';
        const message: string = JSON.stringify({ action: 'createCNT', data: { name: 'exampleCNT' } });

        console.log(`Publishing to topic: ${topic}, message: ${message}`);
    }

    async deleteSUB(): Promise<void> {
        const topic: string = 'deleteSUB';
        const message: string = JSON.stringify({ action: 'deleteSUB', data: { id: 'sub123' } });

        console.log(`Publishing to topic: ${topic}, message: ${message}`);
    }

    async createSUB(): Promise<void> {
        const topic: string = 'createSUB';
        const message: string = JSON.stringify({ action: 'createSUB', data: { topic: 'exampleTopic' } });

        console.log(`Publishing to topic: ${topic}, message: ${message}`);
    }
}

export default MqttHandler;

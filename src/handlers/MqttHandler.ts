import Mqtt, { MqttClient } from 'mqtt';
import IAEHandler from './IAEHandler';

interface ErrorWithReasonCode extends Error {
    reasonCode?: number;
}

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
        this.client.publish(topic, message, {}, (err: Error | ErrorWithReasonCode | undefined) => {
            if (err) {
                console.error('Failed to publish createAE:', err);
                throw err;
            }
            console.log('Message published successfully for createAE.');
        });
    }

    async retrieveAE(): Promise<void> {
        const topic: string = 'retrieveAE';

        console.log(`Subscribing to topic: ${topic}`);
        this.client.subscribe(topic, {}, (err: Error | null) => {
            if (err) {
                console.error(`Failed to subscribe to ${topic}:`, err);
                throw err;
            }
            console.log(`Subscribed successfully to topic: ${topic}`);
        });

        this.client.on('message', (receivedTopic: string, message: Buffer) => {
            if (receivedTopic === topic) {
                console.log(`Message received on ${receivedTopic}:`, message.toString());
            }
        });
    }

    async createCNT(): Promise<void> {
        const topic: string = 'createCNT';
        const message: string = JSON.stringify({ action: 'createCNT', data: { name: 'exampleCNT' } });

        console.log(`Publishing to topic: ${topic}, message: ${message}`);
        this.client.publish(topic, message, {}, (err: Error | ErrorWithReasonCode | undefined) => {
            if (err) {
                console.error('Failed to publish createCNT:', err);
                throw err;
            }
            console.log('Message published successfully for createCNT.');
        });
    }

    async deleteSUB(): Promise<void> {
        const topic: string = 'deleteSUB';
        const message: string = JSON.stringify({ action: 'deleteSUB', data: { id: 'sub123' } });

        console.log(`Publishing to topic: ${topic}, message: ${message}`);
        this.client.publish(topic, message, {}, (err: Error | ErrorWithReasonCode | undefined) => {
            if (err) {
                console.error('Failed to publish deleteSUB:', err);
                throw err;
            }
            console.log('Message published successfully for deleteSUB.');
        });
    }

    async createSUB(): Promise<void> {
        const topic: string = 'createSUB';
        const message: string = JSON.stringify({ action: 'createSUB', data: { topic: 'exampleTopic' } });

        console.log(`Publishing to topic: ${topic}, message: ${message}`);
        this.client.publish(topic, message, {}, (err: Error | ErrorWithReasonCode | undefined) => {
            if (err) {
                console.error('Failed to publish createSUB:', err);
                throw err;
            }
            console.log('Message published successfully for createSUB.');
        });
    }
}

export default MqttHandler;

import IAEHandler from './IAEHandler';
import MqttHandler from './MqttHandler';
import HttpHandler from './HttpHandler';

class AEHandlerFactory {
    static createHandler(type: 'mqtt' | 'http'): IAEHandler {
        if (type === 'mqtt') return new MqttHandler('mqtt://test.mosquitto.org');
        if (type === 'http') return new HttpHandler();
        throw new Error('Invalid handler type');
    }
}

export default AEHandlerFactory;
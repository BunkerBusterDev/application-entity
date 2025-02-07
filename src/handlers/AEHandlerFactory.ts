import Config from 'Conf';

import IAEHandler from './IAEHandler';
import MqttHandler from './MqttHandler';
import HttpHandler from './HttpHandler';

class AEHandlerFactory {
    static createHandler(): IAEHandler {
        if (Config.commonServiceEntity.useProtocol === 'mqtt') return new MqttHandler('mqtt://test.mosquitto.org');
        if (Config.commonServiceEntity.useProtocol === 'http') return new HttpHandler();
        throw new Error('Invalid handler type');
    }
}

export default AEHandlerFactory;
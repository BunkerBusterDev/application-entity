import { commonServiceEntity } from 'Conf';

import IAEHandler from './IAEHandler';
import MqttHandler from './MqttHandler';
import HttpHandler from './HttpHandler';

class AEHandlerFactory {
    static createHandler(): IAEHandler {
        if (commonServiceEntity.useProtocol === 'mqtt') return new MqttHandler();
        if (commonServiceEntity.useProtocol === 'http') return new HttpHandler();
        throw new Error('Invalid handler type');
    }
}

export default AEHandlerFactory;
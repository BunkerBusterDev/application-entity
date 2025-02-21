import Mqtt from 'mqtt';
import Net from 'net';
import { nanoid } from 'nanoid';

import Logger from 'utils/Logger';
import { commonServiceEntity, applicationEntity } from 'Conf';
import IAEHandler from './IAEHandler';

class MqttHandler implements IAEHandler {
    private url: string;
    private client: Mqtt.MqttClient | null;
    private connectOptions: Mqtt.IClientOptions;
    
    private socketQueue: Record<string, Net.Socket>;
    private callbackQueue: Record<string, Function>;
    private responseMqttPathQueue: Record<string, string>;
    private responseMqttRequestIdentifierArray: string[];

    private requestTopic: string;
    private responseTopic: string;
    private registrationResponseTopic: string;
    private notificationTopic: string;

    constructor() {
        this.url = `${commonServiceEntity.useProtocol}://${commonServiceEntity.host}:${commonServiceEntity.mqttPort}`;
        this.client = null;
        this.connectOptions = {
            keepalive: 10,
            protocolId: 'MQTT',
            protocolVersion: 4,
            clean: true,
            reconnectPeriod: 2000,
            connectTimeout: 2000,
            rejectUnauthorized: false
        };

        this.socketQueue = {};
        this.callbackQueue = {};
        this.responseMqttPathQueue = {};
        this.responseMqttRequestIdentifierArray = [];

        this.requestTopic = `/oneM2M/req/${applicationEntity.id}${commonServiceEntity.id}/${applicationEntity.bodyType}`;
        this.responseTopic = `/oneM2M/resp/${applicationEntity.id}/+/#`;
        this.registrationResponseTopic = `/oneM2M/reg_resp/${applicationEntity.id}/+/#`;
        this.notificationTopic = `/oneM2M/req/+/${applicationEntity.id}/#`;
    }

    private callbackTimeout = (type: string, requestIdentifier: string, callback: Function) => {
        // 타임아웃 시간을 설정 (예: 5000ms)
        const timeoutDuration = 5000;

        const timeoutId = setTimeout(() => {
            if (this.callbackQueue[requestIdentifier]) {
                callback(-1);
                
                // 관련 데이터 정리
                delete this.callbackQueue[requestIdentifier];
                delete this.responseMqttPathQueue[requestIdentifier];
                if(type === 'createCIN') {
                    delete this.socketQueue[requestIdentifier];
                }

                const idx = this.responseMqttRequestIdentifierArray.indexOf(requestIdentifier);
                if (idx !== -1) {
                    this.responseMqttRequestIdentifierArray.splice(idx, 1);
                }
            }
        }, timeoutDuration);

        // 응답 콜백 등록 (타임아웃 취소 후 정상 응답 전달)
        this.callbackQueue[requestIdentifier] = (rsc: number, pc: any, to?: any, socket?: any) => {
            clearTimeout(timeoutId);
            callback(rsc, pc, to, socket);
        };
    }
    
    private mqttMessageHandler = (topic: string, message: Buffer) => {
        const topicArray = topic.split("/");

        if(topicArray[1] === 'oneM2M' && (topicArray[2] === 'resp' || topicArray[2] === 'reg_resp') && topicArray[3].replace(':', '/') === applicationEntity.id) {
            let messageToJson = JSON.parse(message.toString());

            if(messageToJson['m2m:rsp'] === undefined) {
                messageToJson['m2m:rsp'] = messageToJson;
            }

            const idx = this.responseMqttRequestIdentifierArray.indexOf(messageToJson['m2m:rsp'].rqi);
            if(idx !== -1) {
                const to = this.responseMqttPathQueue[this.responseMqttRequestIdentifierArray[idx]];
                const socket = this.socketQueue[this.responseMqttRequestIdentifierArray[idx]];
                this.callbackQueue[this.responseMqttRequestIdentifierArray[idx]](messageToJson['m2m:rsp'].rsc, messageToJson['m2m:rsp'].pc, to, socket);
                delete this.callbackQueue[this.responseMqttRequestIdentifierArray[idx]];
                delete this.responseMqttPathQueue[this.responseMqttRequestIdentifierArray[idx]];
                if(this.socketQueue[this.responseMqttRequestIdentifierArray[idx]]) {
                    delete this.socketQueue[this.responseMqttRequestIdentifierArray[idx]];
                }
                this.responseMqttRequestIdentifierArray.splice(idx, 1);
            }
        }
        else if(topicArray[1] === 'oneM2M' && topicArray[2] === 'req' && topicArray[4] === applicationEntity.id) {

            let messageToJson = JSON.parse(message.toString());

            if(messageToJson['m2m:rqp']===undefined) {
                messageToJson['m2m:rqp'] = messageToJson;
            }

            // Notification.mqttNotificationAction(topicArray, messageToJson);
        } else {
            Logger.info('[MqttHandler-mqttMessageHandler]: topic is not supported');
        }
        
    }

    public aeResponseAction(responseStatusCode: number, primitiveContent: any) {
        const aeid = primitiveContent['m2m:ae']['aei'];
    
        Logger.info(`[MqttHandler-aeResponseAction]: x-m2m-rsc : ${responseStatusCode} - ${aeid} <----`);
    
        this.client!.unsubscribe(this.registrationResponseTopic);
        this.client!.unsubscribe(this.responseTopic);
        this.client!.unsubscribe(this.notificationTopic);
    
        applicationEntity.id = aeid;
    
        this.registrationResponseTopic = `/oneM2M/reg_resp/${applicationEntity.id}/+/#`;
        this.requestTopic = `/oneM2M/req/${applicationEntity.id}/+/${applicationEntity.bodyType}`;
        this.responseTopic = `/oneM2M/resp/${applicationEntity.id}/+/#`;
        this.notificationTopic = `/oneM2M/req/+/${applicationEntity.id}/#`;
    
        this.client!.subscribe(this.registrationResponseTopic);
        this.client!.subscribe(this.responseTopic);
        this.client!.subscribe(this.notificationTopic);
    }    

    public async startCSEConnector(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                Logger.info('[MqttHandler-startConnector]: Starting mqtt connector...');
                this.client = Mqtt.connect(this.url, this.connectOptions);

                this.client.on('connect', () => {
                    this.client!.subscribe(this.registrationResponseTopic);
                    this.client!.subscribe(this.responseTopic);
                    this.client!.subscribe(this.notificationTopic);
                    Logger.info(`[MqttHandler-startConnector]: subscribe registrationResponseTopic as ${this.registrationResponseTopic}`);
                    Logger.info(`[MqttHandler-startConnector]: subscribe responseTopic as ${this.responseTopic}`);
                    Logger.info(`[MqttHandler-startConnector]: subscribe notificationTopic as ${this.notificationTopic}`);
                    resolve();
                });
                
                this.client.on('message', this.mqttMessageHandler);

                this.client.on('error', (err) => {
                    this.client?.end();
                    reject(err);
                });
            } catch (error) {
                Logger.error(`[MqttHandler-startConnector]: ${error}`);
                reject(error);
            }
        });
    }

    public createAE(callback: Function) {
        const requestIdentifier = nanoid();

        this.callbackTimeout('createAE', requestIdentifier, callback);

        this.responseMqttRequestIdentifierArray.push(requestIdentifier);
        this.responseMqttPathQueue[requestIdentifier] = applicationEntity.parent;
        let requestMessage = {
            'm2m:rqp': {
                op: '1',
                to: applicationEntity.parent,
                fr: applicationEntity.id,
                rqi: requestIdentifier,
                ty: '2', // applicationEntity
                pc: {
                    'm2m:ae': {
                        rn: applicationEntity.name,
                        api: applicationEntity.appID,
                        rr: 'true'
                    }
                }
            }
        };

        this.client!.publish(this.requestTopic, JSON.stringify(requestMessage['m2m:rqp']));
        Logger.info(`[MqttHandler-createAE]: ${this.requestTopic} (json) ${JSON.stringify(requestMessage['m2m:rqp'])} ---->`);
    }

    public retrieveAE(callback: Function) {
        const requestIdentifier = nanoid();

        this.callbackTimeout('retrieveAE', requestIdentifier, callback);

        this.responseMqttRequestIdentifierArray.push(requestIdentifier);
        this.responseMqttPathQueue[requestIdentifier] = `${applicationEntity.parent}/${applicationEntity.name}`;

        let requestMessage = {
            'm2m:rqp': {
                op: '2',
                to: `${applicationEntity.parent}/${applicationEntity.name}`,
                fr: applicationEntity.id,
                rqi: requestIdentifier,
                pc: {}
            }
        };

        this.client!.publish(this.requestTopic, JSON.stringify(requestMessage['m2m:rqp']));
        Logger.info(`[MqttHandler-retrieveAE]: ${this.requestTopic} (json) ${JSON.stringify(requestMessage['m2m:rqp'])} ---->`);
    }

    public createCNT(parent: string, name: string, callback: Function) {
        const requestIdentifier = nanoid();
    
        this.callbackTimeout('createCNT', requestIdentifier, callback);

        this.responseMqttRequestIdentifierArray.push(requestIdentifier);
        this.responseMqttPathQueue[requestIdentifier] = parent;
        
        let requestMessage = {
            'm2m:rqp': {
                op: '1',
                to: parent,
                fr: applicationEntity.id,
                rqi: requestIdentifier,
                ty: '3', // container
                pc: {
                    'm2m:cnt': {
                        rn: name,
                        lbl: [name]
                    }
                }
            }
        };
    
        this.client!.publish(this.requestTopic, JSON.stringify(requestMessage['m2m:rqp']));
        Logger.info(`[MqttHandler-createCNT]: ${this.requestTopic} (json) ${JSON.stringify(requestMessage['m2m:rqp'])} ---->`);
    }

    public deleteSUB(parent: string, name: string, callback: Function) {
        const requestIdentifier = nanoid();
    
        this.callbackTimeout('deleteSUB', requestIdentifier, callback);

        this.responseMqttRequestIdentifierArray.push(requestIdentifier);
        this.responseMqttPathQueue[requestIdentifier] = `${parent}/${name}`;

        let requestMessage = {
            'm2m:rqp': {
                op: '4',
                to: `${parent}/${name}`,
                fr: applicationEntity.id,
                rqi: requestIdentifier,
                pc: {}
            }
        };

        this.client!.publish(this.requestTopic, JSON.stringify(requestMessage['m2m:rqp']));
        Logger.info(`[MqttHandler-deleteSUB]: ${this.requestTopic} (json) ${JSON.stringify(requestMessage['m2m:rqp'])} ---->`);
    }

    public createSUB(parent: string, name: string, nu: string, callback: Function) {
        const requestIdentifier = nanoid();
    
        this.callbackTimeout('createSUB', requestIdentifier, callback);

        this.responseMqttRequestIdentifierArray.push(requestIdentifier);
        this.responseMqttPathQueue[requestIdentifier] = parent;
        
        let requestMessage = {
            'm2m:rqp': {
                op: '1',
                to: parent,
                fr: applicationEntity.id,
                rqi: requestIdentifier,
                ty: '23', // subscription
                pc: {
                    'm2m:sub': {
                        rn: name,
                        enc: {
                            net: ['3']
                        },
                        nu: [nu],
                        nct: '2'
                    }
                }
            }
        };
    
        this.client!.publish(this.requestTopic, JSON.stringify(requestMessage['m2m:rqp']));
        Logger.info(`[MqttHandler-createSUB]: ${this.requestTopic} (json) ${JSON.stringify(requestMessage['m2m:rqp'])} ---->`);
    }

    public createCIN(parent: string, content: string, socket: Net.Socket, callback: Function) {
        const requestIdentifier = nanoid();
    
        this.callbackTimeout('createCIN', requestIdentifier, callback);

        this.responseMqttRequestIdentifierArray.push(requestIdentifier);
        this.responseMqttPathQueue[requestIdentifier] = parent;
        this.socketQueue[requestIdentifier] = socket;
        
        let requestMessage = {
            'm2m:rqp': {
                op: '1',
                to: parent,
                fr: applicationEntity.id,
                rqi: requestIdentifier,
                ty: '4', // contentInstance
                pc: {
                    'm2m:cin': {
                        con: content
                    }
                }
            }
        };

        this.client!.publish(this.requestTopic, JSON.stringify(requestMessage['m2m:rqp']));
        Logger.info(`[MqttHandler-createCIN]: ${this.requestTopic} (json) ${JSON.stringify(requestMessage['m2m:rqp'])} ---->`);
    }
}

export default MqttHandler;

import Mqtt from 'mqtt';
import Net from 'net';
import { nanoid } from 'nanoid';

import Logger from 'utils/Logger';
import SgnParser from 'utils/SgnParser';
import { commonServiceEntity, applicationEntity, subscriptionArray } from 'Conf';
import IAEHandler from './IAEHandler';

interface M2MRqp {
    rqi: string;
    pc: Record<string, unknown> | null;
}

interface M2MNotification {
    'm2m:rqp': M2MRqp;
    [key: string]: unknown;
}

class MqttHandler implements IAEHandler {
    private url: string;
    private client: Mqtt.MqttClient | null;
    private connectOptions: Mqtt.IClientOptions;
    private tasNotification: Function | null;
    
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
        this.tasNotification = null;

        this.socketQueue = {};
        this.callbackQueue = {};
        this.responseMqttPathQueue = {};
        this.responseMqttRequestIdentifierArray = [];

        this.requestTopic = `/oneM2M/req/${applicationEntity.id}${commonServiceEntity.id}/${applicationEntity.bodyType}`;
        this.responseTopic = `/oneM2M/resp/${applicationEntity.id}/+/#`;
        this.registrationResponseTopic = `/oneM2M/reg_resp/${applicationEntity.id}/+/#`;
        this.notificationTopic = `/oneM2M/req/+/${applicationEntity.id}/#`;
    }

    private callbackTimeout(type: string, requestIdentifier: string, callback: Function) {
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
        this.callbackQueue[requestIdentifier] = (responseStatusCode: number, PrimitiveContent: any, to?: string, socket?: Net.Socket) => {
            clearTimeout(timeoutId);
            callback(responseStatusCode, PrimitiveContent, to, socket);
        };
    }

    private responseMqtt(responseTopic: string, responseStatusCode: number, to: string, from: string, requestIdentifier: string, inputPrimitiveContent: any) {
        const responseMessage = {
            'm2m:rsp': {
                rsc: responseStatusCode,
                to: to,
                fr: from,
                rqi: requestIdentifier,
                pc: inputPrimitiveContent
            }
        };

        this.client!.publish(responseTopic, JSON.stringify(responseMessage['m2m:rsp']));
    };

    private mqttMessageHandler(topic: string, message: Buffer) {
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

            if(messageToJson['m2m:rqp'] === undefined) {
                messageToJson['m2m:rqp'] = messageToJson;
            }

            this.notificationAction(topicArray, messageToJson);
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

    public notificationAction(topicArray: Array<string>, jsonObj: M2MNotification) {
        if (jsonObj != null) {
            let bodyType = applicationEntity.bodyType;
            if(topicArray[5] != null) {
                bodyType = topicArray[5];
            }

            // const rqi = (jsonObj['m2m:rqp']['rqi'] === null) ? '' : jsonObj['m2m:rqp']['rqi'];
            // const pc = (jsonObj['m2m:rqp']['pc'] === null) ? {} : jsonObj['m2m:rqp']['pc'];

            // if(pc['m2m:sgn']) {
            //     pc.sgn = {};
            //     pc.sgn = pc['m2m:sgn'];
            //     delete pc['m2m:sgn'];
            // }

            // 안전하게 rqi와 pc를 추출 (nullish coalescing 사용)
            const rqp = jsonObj['m2m:rqp'];
            const requestIdentifier: string = rqp.rqi ?? '';

            // pc를 Record<string, unknown>으로 처리 (기본값은 빈 객체)
            const pc: Record<string, unknown> = rqp.pc ?? {};

            // pc에 "m2m:sgn"이 있으면, 이를 sgn 속성으로 옮기고 삭제합니다.
            if (pc['m2m:sgn']) {
                pc['sgn'] = pc['m2m:sgn'];
                delete pc['m2m:sgn'];
            }

            SgnParser(requestIdentifier, pc, (pathArray: string[], cinObj, requestIdentifier) => {
                if(cinObj) {
                    if(cinObj.sud || cinObj.vrq) {
                        const responseTopic = `/oneM2M/resp/${topicArray[3]}/${topicArray[4]}/${topicArray[5]}`;
                        this.responseMqtt(responseTopic, 2001, '', applicationEntity.id, requestIdentifier, '');
                    }
                    else {
                        for (var i = 0; i < subscriptionArray.length; i++) {
                            if (subscriptionArray[i].parent.split('/')[subscriptionArray[i].parent.split('/').length - 1] === pathArray[pathArray.length - 2]) {
                                if (subscriptionArray[i].name === pathArray[pathArray.length - 1]) {
                                    Logger.info(`[MqttHandler-mqttNotificationAction]: mqtt ${bodyType} notification`);
    
                                    const responseTopic = `/oneM2M/resp/${topicArray[3]}/${topicArray[4]}/${topicArray[5]}`;
                                    this.responseMqtt(responseTopic, 2001, '', applicationEntity.id, requestIdentifier, '');
    
                                    Logger.info('[MqttHandler-mqttNotificationAction]: mqtt response - 2001');
    
                                    if (pathArray[pathArray.length - 2] === 'cnt-cam') {
                                        // tas.send_tweet(cinObj);
                                    }
                                    else {
                                        if(this.tasNotification !== null) {
                                            this.tasNotification(pathArray, cinObj);
                                        }
                                    }
                                    break;
                                }
                            }
                        }
                    }
                }

            });
        }
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
                
                this.client.on('message', this.mqttMessageHandler.bind(this));

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

    public setTASNotificationFunction(tasNotification: Function) {
        this.tasNotification = tasNotification;
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

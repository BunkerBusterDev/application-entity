import Net from 'net';

export default interface IAEHandler {
    aeResponseAction(responseStatusCode: number, primitiveContent: any): void ;
    startCSEConnector(): Promise<void>;
    createAE(callback: Function): void;
    retrieveAE(callback: Function): void;
    createCNT(parent: string, name: string, callback: Function): void;
    deleteSUB(parent: string, name: string, callback: Function): void;
    createSUB(parent: string, name: string, nu: string, callback: Function): void;
    createCIN(parent: string, content: string, socket: Net.Socket, callback: Function): void;
}
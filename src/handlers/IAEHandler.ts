export default interface IAEHandler {
    createAE(): Promise<void>;
    retrieveAE(): Promise<void>;
    createCNT(): Promise<void>;
    deleteSUB(): Promise<void>;
    createSUB(): Promise<void>;
    createCIN(): Promise<void>;
}
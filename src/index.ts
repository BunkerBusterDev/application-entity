import TasConnector from "tas/tasConnector";

const main = async () => {
    const tasConnector = new TasConnector();
    await tasConnector.start(3105);
}

main();
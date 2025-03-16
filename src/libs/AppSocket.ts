import IoInstance from "./io";


let appSocket: any;
async function AppSocket(server: any) {
    const io = await IoInstance.init(server)
    io.on("connection", (socket: any) => {
            appSocket = socket;
            console.log("Socket Connected", appSocket.id);
            // let userRoom = "";
            // let user = {};
        }
    )
    return io;
}

export default AppSocket

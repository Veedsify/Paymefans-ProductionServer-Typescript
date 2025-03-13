import IoInstance from "./io.ts";

const {VERIFICATION_URL, ADMIN_PANEL_URL, LIVESTREAM_PORT, APP_URL} = process.env

let appSocket: any;
async function AppSocket(server: any) {
    const io = await IoInstance.init(server)
    io.on("connection", (socket: any) => {
            appSocket = socket;
            let userRoom = "";
            let user = {};
        }
    )
    return io;
}

export default AppSocket
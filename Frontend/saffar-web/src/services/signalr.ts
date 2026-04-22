import * as signalR from "@microsoft/signalr";

const connection = new signalR.HubConnectionBuilder()
  .withUrl("http://localhost:5000/bookingHub", {
    skipNegotiation: true,
    transport: signalR.HttpTransportType.WebSockets,
  })
  .withAutomaticReconnect()
  .configureLogging(signalR.LogLevel.Warning)
  .build();

let startPromise: Promise<void> | null = null;

export async function startSignalR(): Promise<void> {
  if (connection.state === signalR.HubConnectionState.Connected) return;
  if (!startPromise) {
    startPromise = connection.start().catch((err) => {
      console.error("SignalR failed to connect:", err);
      startPromise = null;
    });
  }
  return startPromise;
}

export default connection;

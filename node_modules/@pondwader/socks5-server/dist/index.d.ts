import * as net from 'net';
import net__default from 'net';
import { Duplex } from 'stream';

declare class Socks5Connection {
    socket: Duplex;
    server: Socks5Server;
    username?: string;
    password?: string;
    destAddress?: string;
    destPort?: number;
    command?: keyof typeof Socks5ConnectionCommand;
    private errorHandler;
    metadata: any;
    constructor(server: Socks5Server, socket: Duplex);
    private readBytes;
    private handleGreeting;
    private handleUserPassword;
    private handleConnectionRequest;
    private connect;
}

declare enum Socks5ConnectionCommand {
    connect = 1,
    bind = 2,
    udp = 3
}
declare enum Socks5ConnectionStatus {
    REQUEST_GRANTED = 0,
    GENERAL_FAILURE = 1,
    CONNECTION_NOT_ALLOWED = 2,
    NETWORK_UNREACHABLE = 3,
    HOST_UNREACHABLE = 4,
    CONNECTION_REFUSED = 5,
    TTL_EXPIRED = 6,
    COMMAND_NOT_SUPPORTED = 7,
    ADDRESS_TYPE_NOT_SUPPORTED = 8
}
type AuthSocks5Connection = Socks5Connection & {
    username: string;
    password: string;
};
type InitialisedSocks5Connection = Socks5Connection & {
    destAddress: string;
    destPort: number;
    command: keyof typeof Socks5ConnectionCommand;
};

declare class Socks5Server {
    authHandler?: (connection: AuthSocks5Connection, accept: () => void, deny: () => void) => boolean | Promise<boolean> | any;
    rulesetValidator?: (connection: InitialisedSocks5Connection, accept: () => void, deny: () => void) => boolean | Promise<boolean> | void;
    connectionHandler: (connection: InitialisedSocks5Connection, sendStatus: (status: keyof typeof Socks5ConnectionStatus) => void) => void;
    supportedCommands: Set<keyof typeof Socks5ConnectionCommand>;
    private server;
    constructor();
    listen(port?: number, hostname?: string, backlog?: number, listeningListener?: () => void): this;
    listen(port?: number, hostname?: string, listeningListener?: () => void): this;
    listen(port?: number, backlog?: number, listeningListener?: () => void): this;
    listen(port?: number, listeningListener?: () => void): this;
    listen(path: string, backlog?: number, listeningListener?: () => void): this;
    listen(path: string, listeningListener?: () => void): this;
    listen(options: net.ListenOptions, listeningListener?: () => void): this;
    listen(handle: any, backlog?: number, listeningListener?: () => void): this;
    listen(handle: any, listeningListener?: () => void): this;
    close(callback?: ((err?: Error | undefined) => void) | undefined): this;
    setAuthHandler(handler: typeof this.authHandler): this;
    disableAuthHandler(): this;
    setRulesetValidator(handler: typeof this.rulesetValidator): this;
    disableRulesetValidator(): this;
    setConnectionHandler(handler: typeof this.connectionHandler): this;
    useDefaultConnectionHandler(): this;
    _handleConnection(socket: Duplex): this;
}

declare function export_default(connection: InitialisedSocks5Connection, sendStatus: (status: keyof typeof Socks5ConnectionStatus) => void): void | net__default.Socket;

type ServerOptions = {
    auth?: {
        username: string;
        password: string;
    };
    port?: number;
    hostname?: string;
};
declare function createServer(opts?: ServerOptions): Socks5Server;

export { Socks5Server, createServer, export_default as defaultConnectionHandler };

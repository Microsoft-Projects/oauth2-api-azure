import bunyan = require("bunyan");

class Telemetry {
    private logger;

    public getLoggerInstance(): bunyan {
        return this.logger.child({}, true);
    }

    public logResponse(id, body, statusCode) {
        const log = this.getLoggerInstance().child(
            {
                id,
                body,
                statusCode
            },
            true
        );
        log.info("response");
    }

    public async initialize() {
        this.logger = bunyan.createLogger({
            name: "APILogger",
            serializers: {
                req: require("bunyan-express-serializer"),
                res: bunyan.stdSerializers.res, // standard bunyan res serializer
                err: bunyan.stdSerializers.err // standard bunyan error serializer
            },
            level: "debug",
            streams: [
                {
                    level: "debug",
                    stream: process.stdout
                }
            ]
        });
    }

    /**
     * trackEvent
     * name: string,
     * event: string
     **/
    public trackEvent(name: string, event: string) {
        // Write log
        this.logger.info({ event: name }, event);
    }

    /**
     * trackException
     * exception: Error
     **/
    public trackException(exception: Error) {
        // Write log
        this.logger.error({ error: exception });
    }

    /**
     * trackTrace
     */
    public trackTrace(message: string) {
        // Write log
        this.logger.trace({ message });
    }
}

export const Logger = new Telemetry();

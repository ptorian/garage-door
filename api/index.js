const path = require("path");
const Hapi = require("hapi");
const jwt = require("jsonwebtoken");
const winston = require("winston");
require("winston-daily-rotate-file");

const routes = require("./routes");
const config = require("./config");
const { PiProvider } = require("./piProvider");


const appRawFileTransport = new winston.transports.DailyRotateFile({
    name: "appRawFile",
    filename: path.resolve(__dirname, config.logDir, "app.raw.log"),
    datePattern: 'yyyy-MM-dd.',
    prepend: true,
    level: config.logLevel,
    humanReadableUnhandledException: true,
    handleExceptions: true,
    json: false
});

const traceRawFileTransport = new winston.transports.DailyRotateFile({
    name: "traceRawFile",
    filename: path.resolve(__dirname, config.logDir, "trace.raw.log"),
    datePattern: 'yyyy-MM-dd.',
    prepend: true,
    level: config.logLevel,
    humanReadableUnhandledException: true,
    handleExceptions: true,
    json: false
});

const consoleTransport = new winston.transports.Console({
    prepend: true,
    level: config.logLevel,
    humanReadableUnhandledException: true,
    handleExceptions: true,
    json: false,
    colorize: true
});

const appLogger = new winston.Logger({
    transports: [
        appRawFileTransport,
        consoleTransport
    ]
});

const traceLogger = new winston.Logger({
    transports: [
        traceRawFileTransport,
        consoleTransport
    ]
});

async function registerJwt(server) {
    await server.register(require('hapi-auth-jwt2'));

    server.auth.strategy('jwt', 'jwt',
        {
            key: server.app.jwtKey,
            validate: () => ({isValid: true}),
            verifyOptions: { algorithms: [ 'HS256' ] }
        });

    server.auth.default('jwt');
}

async function registerRoutes(server) {
    await server.register(routes, {
        routes: {
            prefix: "/api"
        }
    });
}

function addExtensions(server) {
    server.ext({
        type: "onRequest",
        method: (request, h) => {
            request.app.getNewPiProvider = () => {
                return new PiProvider(request.server.app.logger);
            };

            return h.continue;
        }
    });

    server.ext({
        type: "onPreResponse",
        method: async (request, h) => {
            if (request.response.isBoom) {
                request.server.app.logger.error(request.response);
            }
            request.server.app.traceLogger.info({
                id: request.id,
                path: request.route.path,
                method: request.route.method,
                fingerprint: request.route.fingerprint,
                code: request.response.statusCode
            });

            if (request.app.isAuthenticated && request.response.header != null) {
                const tokenPayload = {};

                const token = jwt.sign(tokenPayload, request.server.app.jwtKey, {expiresIn: config.jwtValidTimespan});
                request.response.header("Authorization", `Bearer ${token}`);
            }

            return h.continue;
        }
    });
}

async function startServer() {
    const server = new Hapi.Server({
        host: "0.0.0.0",
        port: 8000,
        routes: {
            cors: {
                origin: ["*"],
                additionalExposedHeaders: ["Authorization"]
            }
        }
    });

    server.app.logger = appLogger;
    server.app.traceLogger = traceLogger;
    server.app.jwtKey = config.jwtKey;

    await registerJwt(server);
    await registerRoutes(server);
    addExtensions(server);

    server.events.on('log', (request, response) => {
        request.server.app.logger.error(response);
    });


    server.route({
        method: 'OPTIONS',
        path: '/{p*}',
        config: {
            auth: false,
            cors: true,
            handler: (request, h) => {
                const response = h.response(null);
                response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
                response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
                return response;
            }
        }
    });

    await server.start();
    appLogger.info('Server running at:', server.info.uri);
}

startServer().then(null, err => appLogger.error(err));
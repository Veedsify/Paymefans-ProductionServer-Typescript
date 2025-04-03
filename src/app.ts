import 'module-alias/register';
import express, {NextFunction} from 'express';
import path from 'path';
import http from 'http';
import api from '@routes/api';
import AppSocket from '@libs/AppSocket';
import {RegisterCloudflareStreamWebhook} from '@libs/RegisterCloudflareStreamWebhook';
import cors from 'cors';
import logger from 'morgan';
import cron from 'node-cron';
import ModelsRedisPubSub from '@libs/ModelsRedisPubSub';
import IoInstance from '@libs/io';
import TriggerModels from '@jobs/models';
import TriggerHookups from '@jobs/hookup';
import HookupRedisPubSub from '@libs/HookupRedisPubSub';
import {Request, Response} from 'express';
import EmitActiveUsers from "@jobs/EmitActiveUsers";

const {ADMIN_PANEL_URL, VERIFICATION_URL, APP_URL, LIVESTREAM_PORT} = process.env;

const app = express();
const server = http.createServer(app);
const port = 3009;


// HTTP request logging
app.use(logger('dev'));

// Cors
app.use(
    cors({
        origin: [
            VERIFICATION_URL!,
            ADMIN_PANEL_URL!,
            APP_URL!,
            LIVESTREAM_PORT!,
            'http://localhost:5173',
        ].filter(Boolean),
        credentials: true,
        optionsSuccessStatus: 200,
    })
);


let activeUsersCron: any;
// Instance of Socket.IO
IoInstance.init(server).then((instance) => {
    // Socket
    AppSocket(instance).then();
    // Active Users
    activeUsersCron = cron.schedule('* * * * * *', async () => {
        try {
            await EmitActiveUsers(instance)
        } catch (err) {
            console.log(err)
        }
    });
    // Redis Model PubSub
    ModelsRedisPubSub(instance);
    // Hookup Redis PubSub
    HookupRedisPubSub(instance);
});

// Register Cloudflare Webhook
RegisterCloudflareStreamWebhook();

// Cron Jobs
let cronJob: any;
cronJob = cron.schedule('* * * * *', async () => {
    try {
        // Trigger Model Jobs
        await TriggerModels(1);
        await TriggerHookups(1);
    } catch (err) {
        console.error(`Cron job failed: ${err}`);
    }
});

// Serve static files from the "public" directory
app.use(express.static(path.join('public')));
app.use(express.urlencoded({extended: false}));
app.use(express.json());

// Basic route
app.use('/api', api);

// Custom error-handling middleware
app.use((err: any, _: Request, res: Response, next: NextFunction) => {
    console.error(`Error occurred: ${err.message}`);
    if (res.headersSent) {
        return next(err);
    }
    res.status(err.status || 500).json({
        error: {
            message: err.message || 'Internal Server Error',
            stack: process.env.NODE_ENV === 'production' ? null : err.stack,
        },
    });
});

// Start the server
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.info(`Server started on port ${port}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down gracefully...');
    if (cronJob) {
        cronJob.stop();
        console.log('Cron job stopped.');
    }
    if (activeUsersCron) {
        activeUsersCron.stop();
        console.log('Active Cron Stopped')
    }
    server.close(() => {
        console.log('Server closed.');
        process.exit(0);
    });
});

// Handle uncaught exceptions and unhandled promise rejections
process.on('uncaughtException', (err) => {
    console.error(`Uncaught Exception: ${err.message}`);
    process.exit(1);  // Exit the process with a non-zero status code
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(`Unhandled Rejection at: ${(promise)}, reason: ${reason}`);
    process.exit(1);  // Exit the process with a non-zero status code
});


import express, { Application } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import swaggerJsDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { swaggerConfig } from './utils/swaggerConfig';
import userRoutes from './routes/user.route';

const app: Application = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Swagger Setup
const swaggerDocs = swaggerJsDoc(swaggerConfig);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
app.get('/api-docs-json', (req, res) => {
  res.json(swaggerDocs);
});

// Routes
app.use('/api/users', userRoutes);

// Default route
app.get('/', (req, res) => {
  res.send('Welcome to the CoFound!');
});

// error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
    next();
});

export default app;

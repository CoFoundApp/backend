import express, { Request, Response, NextFunction } from 'express';
import userRoutes from './routes/user.route';

const app = express();

app.use(express.json());

app.use('/api/users', userRoutes);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.message);
  res.status(500).json({ error: err.message });
});

export default app;

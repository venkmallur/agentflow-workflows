import express, { Request, Response } from 'express';
import cors from 'cors';
import triggerWorkflowRun from './handlers/trigger-workflow-run';
import approveStep from './handlers/approve-step';
import saveWorkflow from './handlers/save-workflow';
import webhookTrigger from './handlers/webhook-trigger';
import scheduledTrigger from './handlers/scheduled-trigger';
import eventTrigger from './handlers/event-trigger';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.post('/api/trigger-workflow-run', triggerWorkflowRun);
app.post('/api/approve-step', approveStep);
app.post('/api/save-workflow', saveWorkflow);
app.post('/api/webhook-trigger/:workflowId', webhookTrigger);
app.post('/api/scheduled-trigger', scheduledTrigger);
app.post('/api/event-trigger', eventTrigger);

app.get('/healthz', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

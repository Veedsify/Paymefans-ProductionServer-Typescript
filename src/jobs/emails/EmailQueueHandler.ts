import transporter from "@libs/NodemailerTransporter";
import { redis } from "@libs/RedisStore";
import RenderEmailTemplate from "@libs/RenderEmailTemplate";
import { Job, Queue, Worker } from "bullmq";
const { APP_NAME } = process.env;
import query from "@utils/prisma";

const EmailQueue = new Queue("emailQueues", {
  connection: redis,
});

const QueueWorker = new Worker(
  "emailQueues",
  async (job: Job) => {
    const { emailData, template, templateData } = job.data;
    // Render HTML
    const html = (await RenderEmailTemplate(templateData, template)) as string;

    // Send Email
    try {
      const mailOptions = {
        from: `${APP_NAME}`,
        to: emailData.email,
        subject: emailData.subject,
        html: html, // Name of the Handlebars template
      };
      await transporter.sendMail(mailOptions);
      return { message: "Email sent successfully", error: false };
    } catch (error: any) {
      throw new Error(error);
    }
  },
  {
    connection: redis,
  }
);

QueueWorker.on("completed", async (job) => {
  const logEntry = `${new Date().toISOString()} - Job ${
    job.id
  } completed - ${JSON.stringify(job.data)}`;
  await query.batchProcessLogs.create({
    data: {
      job_id: job.id as string,
      job_name: job.name,
      job_data: logEntry,
    },
  });
});

QueueWorker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed with error:`, err);
});

export { EmailQueue, QueueWorker };

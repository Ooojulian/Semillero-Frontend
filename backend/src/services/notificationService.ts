import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from '../utils/logger';

const transporter = config.SMTP_HOST
  ? nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT ?? 587,
      secure: (config.SMTP_PORT ?? 587) === 465,
      auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
    })
  : nodemailer.createTransport({ jsonTransport: true });

export const notificationService = {
  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      await transporter.sendMail({ from: config.SMTP_FROM ?? 'no-reply@semillero.app', to, subject, html });
      logger.info('Email sent', { to, subject });
    } catch (err) {
      logger.error('Failed to send email', { to, subject, error: err });
    }
  },

  async notifyCandidateCreated(candidateEmail: string, candidateName: string): Promise<void> {
    const html = `
      <h2>¡Tu candidatura fue recibida!</h2>
      <p>Hola <strong>${candidateName}</strong>, hemos recibido tu aplicación y la estamos revisando.</p>
      <p>Te contactaremos pronto.</p>
    `;
    await this.sendEmail(candidateEmail, 'Candidatura recibida – Semillero', html);
  },

  async notifyStatusChange(candidateEmail: string, candidateName: string, status: string): Promise<void> {
    const statusLabels: Record<string, string> = {
      interviewed: 'seleccionado para entrevista',
      hired: '¡contratado!',
      rejected: 'no continuará en el proceso',
    };
    const label = statusLabels[status] ?? status;
    const html = `
      <h2>Actualización de tu candidatura</h2>
      <p>Hola <strong>${candidateName}</strong>, tu estado ha cambiado a: <strong>${label}</strong>.</p>
    `;
    await this.sendEmail(candidateEmail, 'Estado actualizado – Semillero', html);
  },
};

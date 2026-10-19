const getLowTurboCreditAlertEmails = (): string[] =>
  (process.env.LOW_TURBO_CREDIT_ALERT_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);

export default getLowTurboCreditAlertEmails;

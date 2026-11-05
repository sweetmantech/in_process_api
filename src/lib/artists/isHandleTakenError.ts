const isHandleTakenError = (error: unknown): boolean => {
  const { code, message } = (error ?? {}) as {
    code?: string;
    message?: string;
  };
  return (
    code === '23505' &&
    Boolean(message?.includes('in_process_artists_handle_key'))
  );
};

export default isHandleTakenError;

type LogFields = {
  userId?: string;
  organizationId?: string;
  resourceType?: string;
  resourceId?: string;
  operationId?: string;
  status?: number | string;
  reason?: string;
  clerkUserId?: string;
  clerkOrganizationId?: string;
  mappedRole?: string;
  errorClass?: string;
  prismaCode?: string;
};

function emit(level: "info" | "warn" | "error", event: string, fields: LogFields = {}) {
  const record = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...fields,
  };
  console[level](JSON.stringify(record));
}

export const logger = {
  info: (event: string, fields?: LogFields) => emit("info", event, fields),
  warn: (event: string, fields?: LogFields) => emit("warn", event, fields),
  error: (event: string, fields?: LogFields) => emit("error", event, fields),
};

export function createOperationId() {
  return crypto.randomUUID();
}

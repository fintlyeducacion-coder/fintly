export enum OperationType {
  CREATE = 'CREATE',
  READ = 'READ',
  GET = 'GET',
  LIST = 'LIST',
  UPDATE = 'UPDATE',
  WRITE = 'WRITE',
  DELETE = 'DELETE'
}

export function handleFirestoreError(error: unknown, operation: OperationType, path: string): void {
  const errObj = error as Record<string, any>;
  const msg = errObj?.message || String(error);
  console.error(`Firestore Error [${operation}] at "${path}":`, msg, error);
}

export interface EventMessage {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  retryCount: number;
}

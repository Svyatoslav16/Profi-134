export interface EventMessage {
  id: string;
  type: string;
  payload: string;
  retryCount: number;
}

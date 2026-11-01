export interface ApiResponse<T> {
  message: string;
  data: T;
  error: string | null;
}

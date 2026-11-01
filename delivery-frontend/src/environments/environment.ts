export const environment = {
  production: true,
  get apiUrl() {
    return `${window.location.origin}/api`;
  },
  get serverUrl() {
    return `${window.location.origin}`;
  }
};

export const environment = {
  production: false,
  get apiUrl() {
    return `${window.location.origin}/api`;
  },
  get serverUrl() {
    return `${window.location.origin}`;
  }
};

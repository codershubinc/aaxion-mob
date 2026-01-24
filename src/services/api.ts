interface User {
  id: string;
  name: string;
  email: string;
}

export const api = {
  login: async (email: string, password: string): Promise<User> => {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ id: '1', name: 'Demo User', email });
      }, 1000);
    });
  },
  fetchData: async (): Promise<string[]> => {
     return new Promise((resolve) => {
      setTimeout(() => {
        resolve(['Board 1', 'Board 2', 'Board 3']);
      }, 1000);
    });
  }
};

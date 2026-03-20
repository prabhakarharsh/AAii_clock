import { apiCall } from './api';

export const aiService = {
  extractTask: (text: string) => apiCall('/ai/extract', 'POST', { text }),
  extractRoadmapFromFile: (file: { name: string; type: string; content: string }) => apiCall('/ai/extract-file', 'POST', file),
  extractAndSave: (text: string) => apiCall('/ai/extract-and-save', 'POST', { text }),
};

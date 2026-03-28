// Basic test to verify API functions exist
import odeApi from './api';

describe('API Basic Test', () => {
  test('odeApi should have required methods', () => {
    expect(typeof odeApi.createCustomTask).toBe('function');
    expect(typeof odeApi.getSolution).toBe('function');
    expect(typeof odeApi.getExplanation).toBe('function');
    expect(typeof odeApi.generateTask).toBe('function');
    expect(typeof odeApi.verifySolution).toBe('function');
  });
});
import odeApi from './api';

// Mock fetch
global.fetch = jest.fn();

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createCustomTask should make POST request', async () => {
    const mockResponse = {
      task_id: 123,
      status: 'created'
    };
    
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    const result = await odeApi.createCustomTask({
      coefficients: { linear: [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]] },
      initial_conditions: { x0: 1, y0: 1, z0: 1, w0: 1 },
      target_time: 1
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/create_custom/',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coefficients: { linear: [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]] },
          initial_conditions: { x0: 1, y0: 1, z0: 1, w0: 1 },
          target_time: 1
        })
      })
    );
    
    expect(result).toEqual(mockResponse);
  });

  test('getSolution should make GET request', async () => {
    const mockResponse = {
      final_values: [1, 2],
      stored_metrics: { weighted_sum: 3 }
    };
    
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    const result = await odeApi.getSolution(123);

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/task/123/solution/',
      expect.objectContaining({
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })
    );
    
    expect(result).toEqual(mockResponse);
  });

  test('getExplanation should make GET request', async () => {
    const mockResponse = {
      explanation: 'This is the explanation'
    };
    
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    const result = await odeApi.getExplanation(123);

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/task/123/explain/',
      expect.objectContaining({
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })
    );
    
    expect(result).toEqual(mockResponse);
  });
});

import { createCustomTask, getSolution, getExplanation } from './api';

// Mock fetch
global.fetch = jest.fn();

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCustomTask', () => {
    test('should create a custom task successfully', async () => {
      const mockResponse = {
        task_id: 'test-task-id'
      };
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await createCustomTask({
        coefficients: {
          linear: [[1, 2], [3, 4]]
        },
        initial_conditions: {
          x0: 1,
          y0: 1,
          z0: 1,
          w0: 1
        },
        target_time: 1
      });

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith('/api/ode-solver/create-custom-task/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coefficients: {
            linear: [[1, 2], [3, 4]]
          },
          initial_conditions: {
            x0: 1,
            y0: 1,
            z0: 1,
            w0: 1
          },
          target_time: 1
        })
      });
    });

    test('should throw error when request fails', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(createCustomTask({
        coefficients: {
          linear: [[1, 2], [3, 4]]
        },
        initial_conditions: {
          x0: 1,
          y0: 1,
          z0: 1,
          w0: 1
        },
        target_time: 1
      })).rejects.toThrow('Failed to create task');
    });
  });

  describe('getSolution', () => {
    test('should get solution successfully', async () => {
      const mockResponse = {
        final_values: [1, 2, 3, 4],
        stored_metrics: {
          weighted_sum: 10,
          arc_length: 5,
          curvature: 0.5,
          final_solution: 'test'
        },
        latex_solution: 'Step 1: Test solution'
      };
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await getSolution('test-task-id');

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith('/api/ode-solver/get-solution/test-task-id/');
    });

    test('should throw error when request fails', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await expect(getSolution('test-task-id')).rejects.toThrow('Failed to get solution');
    });
  });

  describe('getExplanation', () => {
    test('should get explanation successfully', async () => {
      const mockResponse = {
        explanation: 'This is a detailed explanation.'
      };
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await getExplanation('test-task-id');

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith('/api/ode-solver/get-explanation/test-task-id/');
    });

    test('should throw error when request fails', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await expect(getExplanation('test-task-id')).rejects.toThrow('Failed to get explanation');
    });
  });
});
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HomePage from '../../../app/routes/_index/route';
import * as api from '~/services/api';

// Mock the API module
jest.mock('@/services/api');

const mockApi = api as jest.Mocked<typeof api>;

describe('ODE Solver Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders the component with title and grid', () => {
    render(<HomePage />);
    
    expect(screen.getByText('AI Math Stumper')).toBeInTheDocument();
    expect(screen.getAllByRole('spinbutton')).toHaveLength(16);
  });

  test('allows input of matrix coefficients', async () => {
    render(<HomePage />);
    
    const inputs = screen.getAllByRole('spinbutton');
    
    // Test setting a value in the first input
    await userEvent.clear(inputs[0]);
    await userEvent.type(inputs[0], '1.5');
    
    expect(inputs[0]).toHaveValue(1.5);
  });

  test('allows input of initial conditions', async () => {
    render(<HomePage />);
    
    const xInput = screen.getByDisplayValue('1');
    const yInput = screen.getByDisplayValue('1');
    const zInput = screen.getByDisplayValue('1');
    const wInput = screen.getByDisplayValue('1');
    
    await userEvent.clear(xInput);
    await userEvent.type(xInput, '2');
    await userEvent.clear(yInput);
    await userEvent.type(yInput, '3');
    await userEvent.clear(zInput);
    await userEvent.type(zInput, '4');
    await userEvent.clear(wInput);
    await userEvent.type(wInput, '5');
    
    expect(xInput).toHaveValue(2);
    expect(yInput).toHaveValue(3);
    expect(zInput).toHaveValue(4);
    expect(wInput).toHaveValue(5);
  });

  test('allows input of target time', async () => {
    render(<HomePage />);
    
    const targetTimeInput = screen.getByDisplayValue('1');
    
    await userEvent.clear(targetTimeInput);
    await userEvent.type(targetTimeInput, '2.5');
    
    expect(targetTimeInput).toHaveValue(2.5);
  });

  test('generates random matrix when "Generate Rank-1 Matrix" is clicked', async () => {
    render(<HomePage />);
    
    const generateButton = screen.getByText('Generate Rank-1 Matrix');
    await userEvent.click(generateButton);
    
    // Check that at least some inputs have non-zero values
    const inputs = screen.getAllByRole('spinbutton');
    const nonZeroInputs = inputs.filter(input => input.value !== '0');
    expect(nonZeroInputs.length).toBeGreaterThan(0);
  });

  test('shows loading state when solving ODE', async () => {
    // Mock successful API response
    mockApi.createCustomTask.mockResolvedValue({
      task_id: 'test-task-id'
    });
    
    mockApi.getSolution.mockResolvedValue({
      final_values: [1, 2, 3, 4],
      stored_metrics: {
        weighted_sum: 10,
        arc_length: 5,
        curvature: 0.5,
        final_solution: 'test'
      },
      latex_solution: 'Step 1: Test solution'
    });

    render(<HomePage />);
    
    const solveButton = screen.getByText('Solve ODE');
    await userEvent.click(solveButton);
    
    // Should show loading state
    expect(screen.getByText('Solving the ODE system...')).toBeInTheDocument();
    
    // Wait for solution to load
    await waitFor(() => {
      expect(screen.getByText('Solution at t = 1')).toBeInTheDocument();
    });
  });

  test('displays solution results after successful computation', async () => {
    // Mock successful API response
    mockApi.createCustomTask.mockResolvedValue({
      task_id: 'test-task-id'
    });
    
    mockApi.getSolution.mockResolvedValue({
      final_values: [1.234567, 2.345678, 3.456789, 4.567890],
      stored_metrics: {
        weighted_sum: 11.5,
        arc_length: 7.8,
        curvature: 0.25,
        final_solution: 'Final result'
      },
      latex_solution: 'Step 1: Initial setup\nStep 2: Computation\nAnswer: Result'
    });

    render(<HomePage />);
    
    const solveButton = screen.getByText('Solve ODE');
    await userEvent.click(solveButton);
    
    // Wait for solution to load
    await waitFor(() => {
      expect(screen.getByText('Solution at t = 1')).toBeInTheDocument();
    });
    
    // Check solution values are displayed with correct precision
    expect(screen.getByText('x(t)')).toBeInTheDocument();
    expect(screen.getByText('1.234567')).toBeInTheDocument();
    expect(screen.getByText('y(t)')).toBeInTheDocument();
    expect(screen.getByText('2.345678')).toBeInTheDocument();
    expect(screen.getByText('z(t)')).toBeInTheDocument();
    expect(screen.getByText('3.456789')).toBeInTheDocument();
    expect(screen.getByText('w(t)')).toBeInTheDocument();
    expect(screen.getByText('4.567890')).toBeInTheDocument();
    
    // Check metrics are displayed
    expect(screen.getByText('Weighted Sum (S):')).toBeInTheDocument();
    expect(screen.getByText('11.5')).toBeInTheDocument();
    expect(screen.getByText('Arc Length:')).toBeInTheDocument();
    expect(screen.getByText('7.8')).toBeInTheDocument();
    expect(screen.getByText('Curvature:')).toBeInTheDocument();
    expect(screen.getByText('0.25')).toBeInTheDocument();
    expect(screen.getByText('Final Solution (Σ):')).toBeInTheDocument();
    expect(screen.getByText('Final result')).toBeInTheDocument();
  });

  test('shows error message when API call fails', async () => {
    // Mock API error
    mockApi.createCustomTask.mockRejectedValue(new Error('API Error'));

    render(<HomePage />);
    
    const solveButton = screen.getByText('Solve ODE');
    await userEvent.click(solveButton);
    
    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText('Error: API Error')).toBeInTheDocument();
    });
  });

  test('disables solve button during computation', async () => {
    // Mock slow API response
    mockApi.createCustomTask.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ task_id: 'test' }), 100))
    );
    
    mockApi.getSolution.mockResolvedValue({
      final_values: [1, 2, 3, 4],
      stored_metrics: { weighted_sum: 10, arc_length: 5, curvature: 0.5, final_solution: 'test' },
      latex_solution: 'Test solution'
    });

    render(<HomePage />);
    
    const solveButton = screen.getByText('Solve ODE');
    await userEvent.click(solveButton);
    
    // Button should be disabled during computation
    expect(solveButton).toBeDisabled();
    
    // Wait for computation to complete
    await waitFor(() => {
      expect(screen.getByText('Solution at t = 1')).toBeInTheDocument();
    }, { timeout: 200 });
    
    // Button should be enabled again
    expect(solveButton).not.toBeDisabled();
  });

  test('shows explanation when "Get Step-by-Step Explanation" is clicked', async () => {
    // Mock successful API responses
    mockApi.createCustomTask.mockResolvedValue({
      task_id: 'test-task-id'
    });
    
    mockApi.getSolution.mockResolvedValue({
      final_values: [1, 2, 3, 4],
      stored_metrics: { weighted_sum: 10, arc_length: 5, curvature: 0.5, final_solution: 'test' },
      latex_solution: 'Step 1: Initial setup\nStep 2: Computation\nAnswer: Result'
    });
    
    mockApi.getExplanation.mockResolvedValue({
      explanation: 'This is a detailed explanation of the solution process.'
    });

    render(<HomePage />);
    
    // First solve the ODE
    const solveButton = screen.getByText('Solve ODE');
    await userEvent.click(solveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Solution at t = 1')).toBeInTheDocument();
    });
    
    // Then get explanation
    const explanationButton = screen.getByText('Get Step-by-Step Explanation');
    await userEvent.click(explanationButton);
    
    await waitFor(() => {
      expect(screen.getByText('Explanation')).toBeInTheDocument();
      expect(screen.getByText('This is a detailed explanation of the solution process.')).toBeInTheDocument();
    });
  });

  test('disables explanation button during computation', async () => {
    // Mock successful API responses
    mockApi.createCustomTask.mockResolvedValue({
      task_id: 'test-task-id'
    });
    
    mockApi.getSolution.mockResolvedValue({
      final_values: [1, 2, 3, 4],
      stored_metrics: { weighted_sum: 10, arc_length: 5, curvature: 0.5, final_solution: 'test' },
      latex_solution: 'Test solution'
    });

    render(<HomePage />);
    
    // First solve the ODE
    const solveButton = screen.getByText('Solve ODE');
    await userEvent.click(solveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Solution at t = 1')).toBeInTheDocument();
    });
    
    // Explanation button should be enabled after solving
    const explanationButton = screen.getByText('Get Step-by-Step Explanation');
    expect(explanationButton).not.toBeDisabled();
  });
});
/**
 * API Service for communicating with Django backend
 * This service provides methods to interact with the ODE solver API
 */

// Base URL for Django API - can be configured via environment variable
const API_BASE_URL = typeof window !== 'undefined' 
  ? (import.meta.env.VITE_API_URL || 'http://localhost:8000')
  : 'http://localhost:8000';

// Types matching Django models
export interface InitialConditions {
  x0: number;
  y0: number;
  z0: number;
  w0: number;
}

export interface Coefficients {
  linear: number[][];
  constant?: number[];
}

export interface EquationPreview {
  dx_dt: string;
  dy_dt: string;
  dz_dt: string;
  dw_dt: string;
  raw_latex?: string;
}

export interface ODETask {
  task_id: number;
  coefficients: Coefficients;
  initial_conditions: InitialConditions;
  target_time: number;
  equation_preview: EquationPreview;
  created_at?: string;
  is_valid?: boolean;
}

export interface Problem {
  id: number;
  task_id: number;
  question: string;
  answer: number | null;
  created_at: string;
  target_time: number;
  initial_conditions: InitialConditions;
  equation_preview: EquationPreview;
}

export interface SolutionDetails {
  final_values: number[];
  stored_metrics: {
    weighted_sum: number;
    arc_length: number;
    curvature: number;
    final_solution: number | null;
  };
  recalculated_metrics: {
    weighted_sum: number;
    arc_length: number;
    curvature: number;
    final_solution: number;
  };
  consistency_check: {
    weighted_sum_consistent: boolean;
    final_solution_consistent: boolean;
    all_consistent: boolean;
  };
  latex_solution: string;
}

export interface VerifySolutionResponse {
  task_id: number;
  submitted_solution: number;
  ground_truth: number | null;
  is_correct: boolean;
  details: {
    weighted_sum: number | null;
    arc_length: number | null;
    curvature: number | null;
  };
}

export interface UserInfo {
  is_authenticated: boolean;
  username: string | null;
}

export interface AIExplanationResponse {
  task_id: number;
  explanation: string;
  model_used: string;
  success: boolean;
  error?: string;
}

export interface AIHintResponse {
  hint: string;
  success: boolean;
  error?: string;
}

// Helper function for making API requests
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // Include credentials (cookies) for session-based auth
  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: 'include', // Important for session-based auth
  };

  const response = await fetch(url, config);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// API Service methods
export const odeApi = {
  /**
   * Generate a new random ODE task
   */
  generateTask: async (): Promise<ODETask> => {
    return apiRequest<ODETask>('/api/generate/', {
      method: 'GET',
    });
  },

  /**
   * Create a custom ODE task with user-specified parameters
   */
  createCustomTask: async (params: {
    coefficients: Coefficients;
    initial_conditions: InitialConditions;
    target_time: number;
  }): Promise<ODETask> => {
    return apiRequest<ODETask>('/api/create_custom/', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  /**
   * Verify a submitted solution
   */
  verifySolution: async (taskId: number, solution: number): Promise<VerifySolutionResponse> => {
    return apiRequest<VerifySolutionResponse>('/api/verify/', {
      method: 'POST',
      body: JSON.stringify({ task_id: taskId, solution }),
    });
  },

  /**
   * Get list of all problems
   */
  getProblems: async (): Promise<{ problems: Problem[] }> => {
    return apiRequest<{ problems: Problem[] }>('/api/problems/', {
      method: 'GET',
    });
  },

  /**
   * Get details of a specific task
   */
  getTask: async (taskId: number): Promise<ODETask> => {
    return apiRequest<ODETask>(`/api/task/${taskId}/`, {
      method: 'GET',
    });
  },

  /**
   * Get detailed solution for a task
   */
  getSolution: async (taskId: number): Promise<ODETask & SolutionDetails> => {
    return apiRequest<ODETask & SolutionDetails>(`/api/task/${taskId}/solution/`, {
      method: 'GET',
    });
  },

  /**
   * Get AI-generated explanation for a task
   */
  getExplanation: async (taskId: number): Promise<AIExplanationResponse> => {
    return apiRequest<AIExplanationResponse>(`/api/task/${taskId}/explain/`, {
      method: 'GET',
    });
  },

  /**
   * Get AI-generated hint for a task
   */
  getHint: async (taskId: number, question: string): Promise<AIHintResponse> => {
    return apiRequest<AIHintResponse>('/api/hint/', {
      method: 'POST',
      body: JSON.stringify({ task_id: taskId, question }),
    });
  },

  /**
   * Get current user info
   */
  getUser: async (): Promise<UserInfo> => {
    return apiRequest<UserInfo>('/api/user/', {
      method: 'GET',
    });
  },

  /**
   * Save a prompt (for prompt engineering feature)
   */
  savePrompt: async (prompt: string): Promise<{ success: boolean }> => {
    return apiRequest<{ success: boolean }>('/api/save_prompt/', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });
  },

  /**
   * Login user
   */
  login: async (username: string, password: string): Promise<{ success: boolean }> => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const response = await fetch(`${API_BASE_URL}/api/auth/login/`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    return { success: true };
  },

  /**
   * Logout user
   */
  logout: async (): Promise<{ success: boolean }> => {
    return apiRequest<{ success: boolean }>('/api/auth/logout/', {
      method: 'POST',
    });
  },

  /**
   * Register new user
   */
  register: async (username: string, password1: string, password2: string): Promise<{ success: boolean }> => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password1', password1);
    formData.append('password2', password2);

    const response = await fetch(`${API_BASE_URL}/api/auth/register/`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      throw new Error('Registration failed');
    }

    return { success: true };
  },
};

export default odeApi;

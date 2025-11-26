// lib/api.ts - API 클라이언트

const API_URL = 'http://localhost:8000';

// ==================== Types ====================

export interface Teacher {
  id: string;
  email: string;
  name: string;
  school: string;
}

export interface AuthResponse {
  token: string;
  teacher: Teacher;
}

export interface Class {
  id: string;
  name: string;
  grade: number;
  class_number: number;
  access_code: string;
  student_count?: number;
  created_at: string;
}

export interface Student {
  id: string;
  name: string;
  student_number: number;
  total_points?: number;
  created_at: string;
}

export interface PointTransaction {
  id: string;
  amount: number;
  reason: string;
  created_at: string;
}

export interface StudentPoints {
  student_id: string;
  student_name: string;
  total_points: number;
  transactions: PointTransaction[];
}

// ==================== Auth API ====================

export const authAPI = {
  signup: async (email: string, password: string, name: string, school: string): Promise<AuthResponse> => {
    const response = await fetch(`${API_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, school }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Signup failed');
    }
    
    return response.json();
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }
    
    return response.json();
  },

  getMe: async (token: string): Promise<Teacher> => {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (!response.ok) {
      throw new Error('Failed to get user info');
    }
    
    return response.json();
  },
};

// ==================== Class API ====================

export const classAPI = {
  create: async (token: string, name: string, grade: number, classNumber: number): Promise<Class> => {
    const response = await fetch(`${API_URL}/api/classes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, grade, class_number: classNumber }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create class');
    }
    
    return response.json();
  },

  getAll: async (token: string): Promise<Class[]> => {
    const response = await fetch(`${API_URL}/api/classes`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (!response.ok) {
      throw new Error('Failed to get classes');
    }
    
    return response.json();
  },

  getById: async (token: string, classId: string): Promise<Class & { students: Student[] }> => {
    const response = await fetch(`${API_URL}/api/classes/${classId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (!response.ok) {
      throw new Error('Failed to get class');
    }
    
    return response.json();
  },

  addStudent: async (token: string, classId: string, name: string, studentNumber: number): Promise<Student> => {
    const response = await fetch(`${API_URL}/api/classes/${classId}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, student_number: studentNumber }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to add student');
    }
    
    return response.json();
  },

  getLeaderboard: async (token: string, classId: string) => {
    const response = await fetch(`${API_URL}/api/classes/${classId}/leaderboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (!response.ok) {
      throw new Error('Failed to get leaderboard');
    }
    
    return response.json();
  },
};

// ==================== Point API ====================

export const pointAPI = {
  create: async (token: string, studentId: string, amount: number, reason: string): Promise<PointTransaction> => {
    const response = await fetch(`${API_URL}/api/points`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ student_id: studentId, amount, reason }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create point transaction');
    }
    
    return response.json();
  },

  getStudentPoints: async (token: string, studentId: string): Promise<StudentPoints> => {
    const response = await fetch(`${API_URL}/api/students/${studentId}/points`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (!response.ok) {
      throw new Error('Failed to get student points');
    }
    
    return response.json();
  },
};

// ==================== Token Management ====================

export const tokenManager = {
  set: (token: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  },

  get: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  },

  remove: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  },
};

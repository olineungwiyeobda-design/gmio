// components/LoginForm.tsx
import { useState } from 'react';
import { authAPI, tokenManager } from '../lib/api';

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(email, password);
      tokenManager.set(response.token);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">교사 로그인</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">이메일</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>

        {error && (
          <div className="text-red-600 text-sm">{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </form>
    </div>
  );
}

// ==========================================

// components/SignupForm.tsx
import { useState } from 'react';
import { authAPI, tokenManager } from '../lib/api';

export function SignupForm({ onSuccess }: { onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    school: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.signup(
        formData.email,
        formData.password,
        formData.name,
        formData.school
      );
      tokenManager.set(response.token);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원가입 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">교사 회원가입</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">이메일</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">비밀번호</label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">이름</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">학교명</label>
          <input
            type="text"
            value={formData.school}
            onChange={(e) => setFormData({ ...formData, school: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>

        {error && (
          <div className="text-red-600 text-sm">{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400"
        >
          {loading ? '가입 중...' : '회원가입'}
        </button>
      </form>
    </div>
  );
}

// ==========================================

// components/ClassList.tsx
import { useEffect, useState } from 'react';
import { classAPI, tokenManager, Class } from '../lib/api';

export function ClassList({ onSelectClass }: { onSelectClass: (classId: string) => void }) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    const token = tokenManager.get();
    if (!token) return;

    try {
      const data = await classAPI.getAll(token);
      setClasses(data);
    } catch (err) {
      console.error('Failed to load classes:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center p-10">로딩 중...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">내 학급 목록</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          + 학급 만들기
        </button>
      </div>

      {showCreateForm && (
        <CreateClassForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            setShowCreateForm(false);
            loadClasses();
          }}
        />
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {classes.map((cls) => (
          <div
            key={cls.id}
            onClick={() => onSelectClass(cls.id)}
            className="p-4 border rounded-lg hover:shadow-lg cursor-pointer transition"
          >
            <h3 className="font-bold text-lg">{cls.name}</h3>
            <p className="text-gray-600">{cls.grade}학년 {cls.class_number}반</p>
            <p className="text-sm text-gray-500 mt-2">
              학생 수: {cls.student_count || 0}명
            </p>
            <p className="text-xs text-blue-600 mt-1">
              접속 코드: {cls.access_code}
            </p>
          </div>
        ))}
      </div>

      {classes.length === 0 && (
        <div className="text-center text-gray-500 mt-10">
          아직 생성된 학급이 없습니다. 새 학급을 만들어보세요!
        </div>
      )}
    </div>
  );
}

// ==========================================

// components/CreateClassForm.tsx
function CreateClassForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    grade: 1,
    classNumber: 1,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = tokenManager.get();
    if (!token) return;

    setLoading(true);
    try {
      await classAPI.create(token, formData.name, formData.grade, formData.classNumber);
      onSuccess();
    } catch (err) {
      alert('학급 생성 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg max-w-md w-full">
        <h3 className="text-xl font-bold mb-4">새 학급 만들기</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">학급 이름</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="예: 행복한 3학년 2반"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">학년</label>
              <select
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-md"
              >
                {[1, 2, 3, 4, 5, 6].map((grade) => (
                  <option key={grade} value={grade}>{grade}학년</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">반</label>
              <input
                type="number"
                value={formData.classNumber}
                onChange={(e) => setFormData({ ...formData, classNumber: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-md"
                min="1"
                required
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-md hover:bg-gray-100"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? '생성 중...' : '생성하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
